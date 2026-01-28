const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate quote number
const generateQuoteNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QT-${year}${month}-${random}`;
};

// Get all quotes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, salesRepId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (salesRepId) where.salesRepId = salesRepId;

    const [quotes, total] = await Promise.all([
      req.prisma.quote.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
          salesRep: { include: { user: { select: { firstName: true, lastName: true } } } },
          lineItems: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.quote.count({ where })
    ]);

    res.json({
      quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get quote by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const quote = await req.prisma.quote.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        lead: true,
        salesRep: { include: { user: true } },
        lineItems: true
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Create quote
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, lineItems: reqLineItems, leadId, customerId, salesRepId, title, description, validUntil, discount, tax, notes, terms } = req.body;
    const lineItems = items || reqLineItems || [];

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxAmount = parseFloat(tax) || 0;
    const total = subtotal - discountAmount + taxAmount;

    const quote = await req.prisma.quote.create({
      data: {
        quoteNumber: generateQuoteNumber(),
        notes,
        terms,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ...(customerId && { customer: { connect: { id: customerId } } }),
        ...(leadId && { lead: { connect: { id: leadId } } }),
        ...(salesRepId && { salesRep: { connect: { id: salesRepId } } }),
        lineItems: {
          create: lineItems.map(item => ({
            description: item.description || '',
            serviceType: item.serviceTypeId || item.serviceType,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            total: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
            frequency: item.frequency,
            notes: item.notes
          }))
        }
      },
      include: { lineItems: true, customer: true }
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// Update quote
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { items, lineItems: reqLineItems, leadId, customerId, salesRepId, title, description, validUntil, discount, tax, notes, terms } = req.body;
    const lineItems = items || reqLineItems || [];

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxAmount = parseFloat(tax) || 0;
    const total = subtotal - discountAmount + taxAmount;

    // Delete existing line items if new ones provided
    if (lineItems.length > 0) {
      await req.prisma.quoteLineItem.deleteMany({ where: { quoteId: req.params.id } });
    }

    const quote = await req.prisma.quote.update({
      where: { id: req.params.id },
      data: {
        notes,
        terms,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        ...(customerId && { customer: { connect: { id: customerId } } }),
        ...(leadId && { lead: { connect: { id: leadId } } }),
        ...(salesRepId && { salesRep: { connect: { id: salesRepId } } }),
        ...(lineItems.length > 0 && {
          lineItems: {
            create: lineItems.map(item => ({
              description: item.description || '',
              serviceType: item.serviceTypeId || item.serviceType,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              total: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
              frequency: item.frequency,
              notes: item.notes
            }))
          }
        })
      },
      include: { lineItems: true, customer: true }
    });

    res.json(quote);
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// Delete quote
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.quote.delete({ where: { id: req.params.id } });
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// Send quote
router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const quote = await req.prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'SENT' }
    });
    res.json(quote);
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({ error: 'Failed to send quote' });
  }
});

// Accept quote
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const quote = await req.prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { lineItems: true }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Update quote status
    await req.prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' }
    });

    // Create contract from quote
    const contractNumber = `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const contract = await req.prisma.contract.create({
      data: {
        contractNumber,
        customerId: quote.customerId,
        name: `Contract from Quote ${quote.quoteNumber}`,
        contractType: 'RECURRING',
        startDate: new Date(),
        billingFrequency: 'MONTHLY',
        contractValue: quote.total,
        status: 'ACTIVE'
      }
    });

    // Update lead if present
    if (quote.leadId) {
      await req.prisma.lead.update({
        where: { id: quote.leadId },
        data: { status: 'WON' }
      });
    }

    res.json({ quote, contract, message: 'Quote accepted and contract created' });
  } catch (error) {
    console.error('Accept quote error:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// Reject quote
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const quote = await req.prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' }
    });

    // Update lead if present
    if (quote.leadId) {
      await req.prisma.lead.update({
        where: { id: quote.leadId },
        data: { status: 'LOST' }
      });
    }

    res.json(quote);
  } catch (error) {
    console.error('Reject quote error:', error);
    res.status(500).json({ error: 'Failed to reject quote' });
  }
});

// Duplicate quote
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const original = await req.prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { lineItems: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = await req.prisma.quote.create({
      data: {
        quoteNumber: generateQuoteNumber(),
        customerId: original.customerId,
        leadId: original.leadId,
        salesRepId: original.salesRepId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: original.subtotal,
        discount: original.discount,
        tax: original.tax,
        total: original.total,
        status: 'DRAFT',
        notes: original.notes,
        terms: original.terms,
        lineItems: {
          create: original.lineItems.map(item => ({
            description: item.description,
            serviceType: item.serviceType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            frequency: item.frequency,
            notes: item.notes
          }))
        }
      },
      include: { lineItems: true }
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Duplicate quote error:', error);
    res.status(500).json({ error: 'Failed to duplicate quote' });
  }
});

// Get quote statuses for dropdown
router.get('/meta/statuses', authMiddleware, async (req, res) => {
  const statuses = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'VIEWED', label: 'Viewed' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired' }
  ];
  res.json(statuses);
});

module.exports = router;
