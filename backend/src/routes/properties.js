const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all properties
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, customerId, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { addressLine1: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (customerId) where.customerId = customerId;
    if (type) where.propertyType = type;

    const [properties, total] = await Promise.all([
      req.prisma.property.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          _count: { select: { pestIssues: true, services: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.property.count({ where })
    ]);

    res.json({
      properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get property by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const property = await req.prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        pestIssues: { include: { pestType: true, treatments: true } },
        services: { include: { serviceType: true, technician: true } },
        serviceOrders: {
          include: { serviceType: true, technician: true },
          orderBy: { scheduledDate: 'desc' }
        },
        inspections: { orderBy: { scheduledDate: 'desc' } }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Create property
router.post('/', authMiddleware, async (req, res) => {
  try {
    const property = await req.prisma.property.create({
      data: req.body,
      include: { customer: true }
    });
    res.status(201).json(property);
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const property = await req.prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
      include: { customer: true }
    });
    res.json(property);
  } catch (error) {
    console.error('Update property error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.property.delete({ where: { id: req.params.id } });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Get property pest issues
router.get('/:id/pest-issues', authMiddleware, async (req, res) => {
  try {
    const pestIssues = await req.prisma.pestIssue.findMany({
      where: { propertyId: req.params.id },
      include: { pestType: true, treatments: true },
      orderBy: { firstReported: 'desc' }
    });
    res.json(pestIssues);
  } catch (error) {
    console.error('Get pest issues error:', error);
    res.status(500).json({ error: 'Failed to fetch pest issues' });
  }
});

// Add pest issue to property
router.post('/:id/pest-issues', authMiddleware, async (req, res) => {
  try {
    const pestIssue = await req.prisma.pestIssue.create({
      data: {
        propertyId: req.params.id,
        ...req.body
      },
      include: { pestType: true }
    });
    res.status(201).json(pestIssue);
  } catch (error) {
    console.error('Add pest issue error:', error);
    res.status(500).json({ error: 'Failed to add pest issue' });
  }
});

// Get property types for dropdown
router.get('/meta/types', authMiddleware, async (req, res) => {
  const types = [
    { value: 'SINGLE_FAMILY', label: 'Single Family Home' },
    { value: 'MULTI_FAMILY', label: 'Multi-Family' },
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'CONDO', label: 'Condo' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'OTHER', label: 'Other' }
  ];
  res.json(types);
});

module.exports = router;
