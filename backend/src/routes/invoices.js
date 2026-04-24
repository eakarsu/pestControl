const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

// Get all invoices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lte = new Date(endDate);
    }

    // Sorting support
    const { sortBy, sortOrder = 'desc' } = req.query;
    const validSortFields = ['invoiceNumber', 'issueDate', 'dueDate', 'total', 'amountPaid', 'status'];
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { issueDate: 'desc' };

    const [invoices, total] = await Promise.all([
      req.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
          lineItems: true,
          payments: true
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      req.prisma.invoice.count({ where })
    ]);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        contract: true,
        lineItems: true,
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { lineItems, ...invoiceData } = req.body;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = invoiceData.tax || 0;
    const total = subtotal + tax;

    const invoice = await req.prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        ...invoiceData,
        subtotal,
        total,
        lineItems: {
          create: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            serviceOrderId: item.serviceOrderId
          }))
        }
      },
      include: { customer: true, lineItems: true }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { lineItems, ...invoiceData } = req.body;

    // Calculate totals if line items provided
    let updateData = invoiceData;
    if (lineItems) {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      updateData.subtotal = subtotal;
      updateData.total = subtotal + (invoiceData.tax || 0);

      // Delete existing line items and create new ones
      await req.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: req.params.id } });
    }

    const invoice = await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(lineItems && {
          lineItems: {
            create: lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice
            }))
          }
        })
      },
      include: { customer: true, lineItems: true, payments: true }
    });

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Bulk delete invoices
router.post('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
    const result = await req.prisma.invoice.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} invoices deleted`, count: result.count });
  } catch (error) { res.status(500).json({ error: 'Failed to delete invoices' }); }
});

// Bulk update invoices
router.post('/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
    const allowedFields = ['status'];
    const updateData = {};
    for (const field of allowedFields) { if (data[field] !== undefined) updateData[field] = data[field]; }
    const result = await req.prisma.invoice.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${result.count} invoices updated`, count: result.count });
  } catch (error) { res.status(500).json({ error: 'Failed to update invoices' }); }
});

// Record payment
router.post('/:id/payments', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, notes } = req.body;

    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await req.prisma.payment.create({
      data: {
        invoiceId: req.params.id,
        amount,
        paymentMethod,
        transactionId,
        notes
      }
    });

    // Update invoice paid amount and status
    const newAmountPaid = invoice.amountPaid + amount;
    let newStatus = invoice.status;
    if (newAmountPaid >= invoice.total) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIAL';
    }

    await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: { amountPaid: newAmountPaid, status: newStatus }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Send invoice (mark as sent)
router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'SENT' }
    });
    res.json(invoice);
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

// Get overdue invoices
router.get('/status/overdue', authMiddleware, async (req, res) => {
  try {
    const invoices = await req.prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'SENT', 'PARTIAL'] },
        dueDate: { lt: new Date() }
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Update status to overdue
    await req.prisma.invoice.updateMany({
      where: {
        id: { in: invoices.map(i => i.id) }
      },
      data: { status: 'OVERDUE' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Get overdue invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue invoices' });
  }
});

// Get payment methods for dropdown
router.get('/meta/payment-methods', authMiddleware, async (req, res) => {
  const methods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CHECK', label: 'Check' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'ACH', label: 'ACH/Bank Transfer' },
    { value: 'OTHER', label: 'Other' }
  ];
  res.json(methods);
});

module.exports = router;
