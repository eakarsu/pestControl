const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all service types
router.get('/types', authMiddleware, async (req, res) => {
  try {
    const serviceTypes = await req.prisma.serviceType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(serviceTypes);
  } catch (error) {
    console.error('Get service types error:', error);
    res.status(500).json({ error: 'Failed to fetch service types' });
  }
});

// Create service type
router.post('/types', authMiddleware, async (req, res) => {
  try {
    const serviceType = await req.prisma.serviceType.create({
      data: req.body
    });
    res.status(201).json(serviceType);
  } catch (error) {
    console.error('Create service type error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Service type already exists' });
    }
    res.status(500).json({ error: 'Failed to create service type' });
  }
});

// Update service type
router.put('/types/:id', authMiddleware, async (req, res) => {
  try {
    const serviceType = await req.prisma.serviceType.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(serviceType);
  } catch (error) {
    console.error('Update service type error:', error);
    res.status(500).json({ error: 'Failed to update service type' });
  }
});

// Delete service type
router.delete('/types/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.serviceType.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service type deleted successfully' });
  } catch (error) {
    console.error('Delete service type error:', error);
    res.status(500).json({ error: 'Failed to delete service type' });
  }
});

// Get all services
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, propertyId, technicianId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (technicianId) where.technicianId = technicianId;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    const [services, total] = await Promise.all([
      req.prisma.service.findMany({
        where,
        include: {
          property: { include: { customer: true } },
          serviceType: true,
          technician: { include: { user: { select: { firstName: true, lastName: true } } } }
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.service.count({ where })
    ]);

    res.json({
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get service by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const service = await req.prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        property: { include: { customer: true } },
        serviceType: true,
        technician: { include: { user: true } },
        treatments: { include: { product: true } }
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Create service
router.post('/', authMiddleware, async (req, res) => {
  try {
    const service = await req.prisma.service.create({
      data: req.body,
      include: { property: true, serviceType: true }
    });
    res.status(201).json(service);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const service = await req.prisma.service.update({
      where: { id: req.params.id },
      data: req.body,
      include: { property: true, serviceType: true, technician: true }
    });
    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.service.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Add treatment record to service
router.post('/:id/treatments', authMiddleware, async (req, res) => {
  try {
    const treatment = await req.prisma.treatmentRecord.create({
      data: {
        serviceId: req.params.id,
        ...req.body
      },
      include: { product: true }
    });
    res.status(201).json(treatment);
  } catch (error) {
    console.error('Add treatment error:', error);
    res.status(500).json({ error: 'Failed to add treatment' });
  }
});

// Get service categories for dropdown
router.get('/meta/categories', authMiddleware, async (req, res) => {
  const categories = [
    { value: 'GENERAL', label: 'General Pest Control' },
    { value: 'TERMITE', label: 'Termite Control' },
    { value: 'RODENT', label: 'Rodent Control' },
    { value: 'MOSQUITO', label: 'Mosquito Control' },
    { value: 'BED_BUG', label: 'Bed Bug Treatment' },
    { value: 'WILDLIFE', label: 'Wildlife Removal' },
    { value: 'FUMIGATION', label: 'Fumigation' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'PREVENTION', label: 'Prevention' }
  ];
  res.json(categories);
});

module.exports = router;
