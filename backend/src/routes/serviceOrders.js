const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WO-${year}${month}${day}-${random}`;
};

// Get all service orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, technicianId, propertyId, date, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (propertyId) where.propertyId = propertyId;
    if (date) {
      const dateStart = new Date(date);
      const dateEnd = new Date(date);
      dateEnd.setDate(dateEnd.getDate() + 1);
      where.scheduledDate = { gte: dateStart, lt: dateEnd };
    } else if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    const [serviceOrders, total] = await Promise.all([
      req.prisma.serviceOrder.findMany({
        where,
        include: {
          property: { include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
          serviceType: true,
          technician: { include: { user: { select: { firstName: true, lastName: true } } } },
          productUsages: { include: { product: true } }
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTimeStart: 'asc' }],
        skip,
        take: parseInt(limit)
      }),
      req.prisma.serviceOrder.count({ where })
    ]);

    res.json({
      serviceOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get service orders error:', error);
    res.status(500).json({ error: 'Failed to fetch service orders' });
  }
});

// Get service order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const serviceOrder = await req.prisma.serviceOrder.findUnique({
      where: { id: req.params.id },
      include: {
        property: { include: { customer: true, pestIssues: { include: { pestType: true } } } },
        contract: true,
        serviceType: true,
        technician: { include: { user: true } },
        productUsages: { include: { product: true } },
        followUps: true
      }
    });

    if (!serviceOrder) {
      return res.status(404).json({ error: 'Service order not found' });
    }

    res.json(serviceOrder);
  } catch (error) {
    console.error('Get service order error:', error);
    res.status(500).json({ error: 'Failed to fetch service order' });
  }
});

// Create service order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const serviceOrder = await req.prisma.serviceOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        ...req.body
      },
      include: {
        property: { include: { customer: true } },
        serviceType: true,
        technician: true
      }
    });
    res.status(201).json(serviceOrder);
  } catch (error) {
    console.error('Create service order error:', error);
    res.status(500).json({ error: 'Failed to create service order' });
  }
});

// Update service order
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const serviceOrder = await req.prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        property: { include: { customer: true } },
        serviceType: true,
        technician: true
      }
    });
    res.json(serviceOrder);
  } catch (error) {
    console.error('Update service order error:', error);
    res.status(500).json({ error: 'Failed to update service order' });
  }
});

// Delete service order
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.serviceOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service order deleted successfully' });
  } catch (error) {
    console.error('Delete service order error:', error);
    res.status(500).json({ error: 'Failed to delete service order' });
  }
});

// Clock in
router.post('/:id/clock-in', authMiddleware, async (req, res) => {
  try {
    const serviceOrder = await req.prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: {
        timeIn: new Date(),
        status: 'IN_PROGRESS'
      }
    });
    res.json(serviceOrder);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/:id/clock-out', authMiddleware, async (req, res) => {
  try {
    const serviceOrder = await req.prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: {
        timeOut: new Date()
      }
    });
    res.json(serviceOrder);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Complete service order
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { technicianNotes, signatureUrl, signedBy, photoUrls } = req.body;
    const serviceOrder = await req.prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        timeOut: new Date(),
        technicianNotes,
        signatureUrl,
        signedBy,
        signedAt: signatureUrl ? new Date() : null,
        photoUrls: photoUrls || []
      },
      include: { property: true, serviceType: true }
    });
    res.json(serviceOrder);
  } catch (error) {
    console.error('Complete service order error:', error);
    res.status(500).json({ error: 'Failed to complete service order' });
  }
});

// Add product usage
router.post('/:id/products', authMiddleware, async (req, res) => {
  try {
    const productUsage = await req.prisma.productUsage.create({
      data: {
        serviceOrderId: req.params.id,
        ...req.body
      },
      include: { product: true }
    });
    res.status(201).json(productUsage);
  } catch (error) {
    console.error('Add product usage error:', error);
    res.status(500).json({ error: 'Failed to add product usage' });
  }
});

// Create re-treatment
router.post('/:id/retreatment', authMiddleware, async (req, res) => {
  try {
    const originalOrder = await req.prisma.serviceOrder.findUnique({
      where: { id: req.params.id }
    });

    if (!originalOrder) {
      return res.status(404).json({ error: 'Original service order not found' });
    }

    const retreatment = await req.prisma.serviceOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        propertyId: originalOrder.propertyId,
        contractId: originalOrder.contractId,
        serviceTypeId: originalOrder.serviceTypeId,
        technicianId: req.body.technicianId || originalOrder.technicianId,
        scheduledDate: new Date(req.body.scheduledDate),
        scheduledTimeStart: req.body.scheduledTimeStart,
        scheduledTimeEnd: req.body.scheduledTimeEnd,
        priority: 'HIGH',
        isRetreatment: true,
        originalOrderId: req.params.id,
        customerNotes: req.body.customerNotes,
        internalNotes: `Re-treatment for order ${originalOrder.orderNumber}`
      },
      include: { property: true, serviceType: true }
    });

    res.status(201).json(retreatment);
  } catch (error) {
    console.error('Create retreatment error:', error);
    res.status(500).json({ error: 'Failed to create re-treatment' });
  }
});

// Get today's orders for a technician
router.get('/technician/:technicianId/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await req.prisma.serviceOrder.findMany({
      where: {
        technicianId: req.params.technicianId,
        scheduledDate: { gte: today, lt: tomorrow }
      },
      include: {
        property: { include: { customer: true } },
        serviceType: true,
        productUsages: { include: { product: true } }
      },
      orderBy: [{ scheduledTimeStart: 'asc' }]
    });

    res.json(orders);
  } catch (error) {
    console.error('Get today orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get status options for dropdown
router.get('/meta/statuses', authMiddleware, async (req, res) => {
  const statuses = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'EN_ROUTE', label: 'En Route' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RESCHEDULED', label: 'Rescheduled' }
  ];
  res.json(statuses);
});

// Get priority options for dropdown
router.get('/meta/priorities', authMiddleware, async (req, res) => {
  const priorities = [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ];
  res.json(priorities);
});

module.exports = router;
