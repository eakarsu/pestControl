const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all leads
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, source, assignedToId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [leads, total] = await Promise.all([
      req.prisma.lead.findMany({
        where,
        include: {
          assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { inspections: true, quotes: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.lead.count({ where })
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await req.prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        assignedTo: { include: { user: true } },
        inspections: { orderBy: { scheduledDate: 'desc' } },
        quotes: { include: { lineItems: true }, orderBy: { createdAt: 'desc' } },
        followUps: { orderBy: { dueDate: 'asc' } }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create lead
router.post('/', authMiddleware, async (req, res) => {
  try {
    const lead = await req.prisma.lead.create({
      data: req.body,
      include: { assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } } }
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await req.prisma.lead.update({
      where: { id: req.params.id },
      data: req.body,
      include: { assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } } }
    });
    res.json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Convert lead to customer
router.post('/:id/convert', authMiddleware, async (req, res) => {
  try {
    const lead = await req.prisma.lead.findUnique({ where: { id: req.params.id } });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create customer
    const customer = await req.prisma.customer.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || `${lead.firstName.toLowerCase()}.${lead.lastName.toLowerCase()}@example.com`,
        phone: lead.phone,
        companyName: lead.companyName,
        status: 'ACTIVE',
        referralSource: lead.source
      }
    });

    // Create property if address provided
    if (lead.addressLine1) {
      await req.prisma.property.create({
        data: {
          customerId: customer.id,
          name: 'Primary',
          addressLine1: lead.addressLine1,
          city: lead.city || '',
          state: lead.state || '',
          zipCode: lead.zipCode || ''
        }
      });
    }

    // Update lead
    await req.prisma.lead.update({
      where: { id: req.params.id },
      data: {
        customerId: customer.id,
        status: 'WON'
      }
    });

    res.json({ customer, message: 'Lead converted to customer successfully' });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Add follow-up
router.post('/:id/follow-ups', authMiddleware, async (req, res) => {
  try {
    const followUp = await req.prisma.followUp.create({
      data: {
        leadId: req.params.id,
        ...req.body,
        dueDate: new Date(req.body.dueDate)
      }
    });
    res.status(201).json(followUp);
  } catch (error) {
    console.error('Add follow-up error:', error);
    res.status(500).json({ error: 'Failed to add follow-up' });
  }
});

// Complete follow-up
router.post('/follow-ups/:followUpId/complete', authMiddleware, async (req, res) => {
  try {
    const followUp = await req.prisma.followUp.update({
      where: { id: req.params.followUpId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        notes: req.body.notes
      }
    });
    res.json(followUp);
  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({ error: 'Failed to complete follow-up' });
  }
});

// Get pending follow-ups
router.get('/follow-ups/pending', authMiddleware, async (req, res) => {
  try {
    const followUps = await req.prisma.followUp.findMany({
      where: { status: 'PENDING' },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        serviceOrder: { include: { property: { include: { customer: true } } } }
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(followUps);
  } catch (error) {
    console.error('Get pending follow-ups error:', error);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

// Get lead sources for dropdown
router.get('/meta/sources', authMiddleware, async (req, res) => {
  const sources = [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'PHONE', label: 'Phone Call' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'ADVERTISING', label: 'Advertising' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'OTHER', label: 'Other' }
  ];
  res.json(sources);
});

// Get lead statuses for dropdown
router.get('/meta/statuses', authMiddleware, async (req, res) => {
  const statuses = [
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'INSPECTION_SCHEDULED', label: 'Inspection Scheduled' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'WON', label: 'Won' },
    { value: 'LOST', label: 'Lost' }
  ];
  res.json(statuses);
});

module.exports = router;
