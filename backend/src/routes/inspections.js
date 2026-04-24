const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all inspections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, inspectorId, startDate, endDate, sortBy, sortOrder } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (inspectorId) where.inspectorId = inspectorId;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    const [inspections, total] = await Promise.all([
      req.prisma.inspection.findMany({
        where,
        include: {
          lead: { select: { firstName: true, lastName: true, phone: true } },
          property: { include: { customer: { select: { firstName: true, lastName: true } } } }
        },
        orderBy: sortBy && ['scheduledDate', 'status', 'createdAt'].includes(sortBy)
          ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
          : { scheduledDate: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.inspection.count({ where })
    ]);

    res.json({
      inspections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// Get inspection by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const inspection = await req.prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        property: { include: { customer: true, pestIssues: { include: { pestType: true } } } }
      }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    res.json(inspection);
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// Create inspection
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { leadId, propertyId, inspectorId, scheduledDate, status, notes } = req.body;

    const inspection = await req.prisma.inspection.create({
      data: {
        scheduledDate: new Date(scheduledDate),
        status: status || 'SCHEDULED',
        notes,
        inspectorId,
        ...(leadId && { lead: { connect: { id: leadId } } }),
        ...(propertyId && { property: { connect: { id: propertyId } } })
      },
      include: { lead: true, property: true }
    });

    // Update lead status if lead-based
    if (leadId) {
      await req.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'INSPECTION_SCHEDULED' }
      });
    }

    res.status(201).json(inspection);
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

// Update inspection
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { leadId, propertyId, inspectorId, scheduledDate, completedDate, status, notes, findings, photoUrls, reportUrl } = req.body;

    const inspection = await req.prisma.inspection.update({
      where: { id: req.params.id },
      data: {
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(completedDate && { completedDate: new Date(completedDate) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(findings !== undefined && { findings }),
        ...(photoUrls !== undefined && { photoUrls }),
        ...(reportUrl !== undefined && { reportUrl }),
        ...(inspectorId && { inspectorId }),
        ...(leadId && { lead: { connect: { id: leadId } } }),
        ...(propertyId && { property: { connect: { id: propertyId } } })
      },
      include: { lead: true, property: true }
    });
    res.json(inspection);
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({ error: 'Failed to update inspection' });
  }
});

// Delete inspection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.inspection.delete({ where: { id: req.params.id } });
    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Delete inspection error:', error);
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
});

// Start inspection
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const inspection = await req.prisma.inspection.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' }
    });
    res.json(inspection);
  } catch (error) {
    console.error('Start inspection error:', error);
    res.status(500).json({ error: 'Failed to start inspection' });
  }
});

// Complete inspection
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { findings, photoUrls, notes } = req.body;

    const inspection = await req.prisma.inspection.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        findings,
        photoUrls: photoUrls || [],
        notes
      }
    });

    // Update lead status if lead-based
    if (inspection.leadId) {
      await req.prisma.lead.update({
        where: { id: inspection.leadId },
        data: { status: 'QUALIFIED' }
      });
    }

    // Create pest issues if findings include pests
    if (findings && findings.pests && inspection.propertyId) {
      for (const pest of findings.pests) {
        // Find or create pest type
        let pestType = await req.prisma.pestType.findUnique({
          where: { name: pest.name }
        });

        if (!pestType) {
          pestType = await req.prisma.pestType.create({
            data: {
              name: pest.name,
              category: pest.category || 'General',
              description: pest.description
            }
          });
        }

        await req.prisma.pestIssue.create({
          data: {
            propertyId: inspection.propertyId,
            pestTypeId: pestType.id,
            severity: pest.severity || 'MODERATE',
            location: pest.location || 'Various',
            description: pest.notes,
            photoUrls: pest.photos || []
          }
        });
      }
    }

    res.json(inspection);
  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({ error: 'Failed to complete inspection' });
  }
});

// Add photos to inspection
router.post('/:id/photos', authMiddleware, async (req, res) => {
  try {
    const { photoUrls } = req.body;
    const inspection = await req.prisma.inspection.findUnique({
      where: { id: req.params.id }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const updated = await req.prisma.inspection.update({
      where: { id: req.params.id },
      data: {
        photoUrls: [...(inspection.photoUrls || []), ...photoUrls]
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Add photos error:', error);
    res.status(500).json({ error: 'Failed to add photos' });
  }
});

// Get today's inspections
router.get('/schedule/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const inspections = await req.prisma.inspection.findMany({
      where: {
        scheduledDate: { gte: today, lt: tomorrow },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true, addressLine1: true, city: true } },
        property: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    res.json(inspections);
  } catch (error) {
    console.error('Get today inspections error:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// Get inspection statuses for dropdown
router.get('/meta/statuses', authMiddleware, async (req, res) => {
  const statuses = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];
  res.json(statuses);
});

// Bulk delete inspections
router.post('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.inspection.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} inspections deleted` });
  } catch (error) {
    console.error('Bulk delete inspections error:', error);
    res.status(500).json({ error: 'Failed to delete inspections' });
  }
});

// Bulk update inspections
router.post('/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'No IDs provided' });
    const allowed = ['status'];
    const updateData = {};
    for (const key of allowed) { if (data[key] !== undefined) updateData[key] = data[key]; }
    await req.prisma.inspection.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${ids.length} inspections updated` });
  } catch (error) {
    console.error('Bulk update inspections error:', error);
    res.status(500).json({ error: 'Failed to update inspections' });
  }
});

module.exports = router;
