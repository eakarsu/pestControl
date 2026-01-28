const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all customers with pagination and search
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;
    if (type) where.customerType = type;

    const [customers, total] = await Promise.all([
      req.prisma.customer.findMany({
        where,
        include: {
          properties: { select: { id: true, name: true, city: true } },
          _count: { select: { contracts: true, invoices: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.customer.count({ where })
    ]);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await req.prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        properties: {
          include: {
            pestIssues: { include: { pestType: true } },
            services: { include: { serviceType: true } }
          }
        },
        contracts: true,
        invoices: { include: { lineItems: true, payments: true } },
        communications: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer
router.post('/', authMiddleware, async (req, res) => {
  try {
    const customer = await req.prisma.customer.create({
      data: req.body,
      include: { properties: true }
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await req.prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
      include: { properties: true }
    });
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get customer service history
router.get('/:id/service-history', authMiddleware, async (req, res) => {
  try {
    const properties = await req.prisma.property.findMany({
      where: { customerId: req.params.id },
      select: { id: true }
    });

    const propertyIds = properties.map(p => p.id);

    const serviceOrders = await req.prisma.serviceOrder.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        property: true,
        serviceType: true,
        technician: { include: { user: { select: { firstName: true, lastName: true } } } },
        productUsages: { include: { product: true } }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    res.json(serviceOrders);
  } catch (error) {
    console.error('Get service history error:', error);
    res.status(500).json({ error: 'Failed to fetch service history' });
  }
});

// Get customer billing summary
router.get('/:id/billing', authMiddleware, async (req, res) => {
  try {
    const invoices = await req.prisma.invoice.findMany({
      where: { customerId: req.params.id },
      include: { lineItems: true, payments: true },
      orderBy: { issueDate: 'desc' }
    });

    const summary = {
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0),
      invoices
    };

    res.json(summary);
  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ error: 'Failed to fetch billing information' });
  }
});

// Add communication log
router.post('/:id/communications', authMiddleware, async (req, res) => {
  try {
    const communication = await req.prisma.communication.create({
      data: {
        customerId: req.params.id,
        ...req.body
      }
    });
    res.status(201).json(communication);
  } catch (error) {
    console.error('Add communication error:', error);
    res.status(500).json({ error: 'Failed to add communication' });
  }
});

module.exports = router;
