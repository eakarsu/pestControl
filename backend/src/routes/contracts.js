const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate contract number
const generateContractNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CTR-${year}-${random}`;
};

// Get all contracts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (type) where.contractType = type;

    // Sorting support
    const { sortBy, sortOrder = 'desc' } = req.query;
    const validSortFields = ['contractNumber', 'name', 'contractType', 'startDate', 'endDate', 'contractValue', 'status', 'createdAt'];
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' };

    const [contracts, total] = await Promise.all([
      req.prisma.contract.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          _count: { select: { serviceOrders: true, invoices: true } }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      req.prisma.contract.count({ where })
    ]);

    res.json({
      contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// Get contract by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contract = await req.prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        serviceOrders: {
          include: { property: true, serviceType: true },
          orderBy: { scheduledDate: 'desc' }
        },
        invoices: { include: { payments: true } }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// Create contract
router.post('/', authMiddleware, async (req, res) => {
  try {
    const contract = await req.prisma.contract.create({
      data: {
        contractNumber: generateContractNumber(),
        ...req.body
      },
      include: { customer: true }
    });
    res.status(201).json(contract);
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Update contract
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const contract = await req.prisma.contract.update({
      where: { id: req.params.id },
      data: req.body,
      include: { customer: true }
    });
    res.json(contract);
  } catch (error) {
    console.error('Update contract error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Delete contract
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.contract.delete({ where: { id: req.params.id } });
    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Delete contract error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// Bulk delete contracts
router.post('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
    const result = await req.prisma.contract.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} contracts deleted`, count: result.count });
  } catch (error) { res.status(500).json({ error: 'Failed to delete contracts' }); }
});

// Bulk update contracts
router.post('/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
    const allowedFields = ['status'];
    const updateData = {};
    for (const field of allowedFields) { if (data[field] !== undefined) updateData[field] = data[field]; }
    const result = await req.prisma.contract.updateMany({ where: { id: { in: ids } }, data: updateData });
    res.json({ message: `${result.count} contracts updated`, count: result.count });
  } catch (error) { res.status(500).json({ error: 'Failed to update contracts' }); }
});

// Sign contract
router.post('/:id/sign', authMiddleware, async (req, res) => {
  try {
    const { signatureUrl, signedBy } = req.body;
    const contract = await req.prisma.contract.update({
      where: { id: req.params.id },
      data: {
        signatureUrl,
        signedBy,
        signedDate: new Date(),
        status: 'ACTIVE'
      }
    });
    res.json(contract);
  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  }
});

// Renew contract
router.post('/:id/renew', authMiddleware, async (req, res) => {
  try {
    const existingContract = await req.prisma.contract.findUnique({
      where: { id: req.params.id }
    });

    if (!existingContract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const newContract = await req.prisma.contract.create({
      data: {
        contractNumber: generateContractNumber(),
        customerId: existingContract.customerId,
        name: existingContract.name,
        contractType: existingContract.contractType,
        startDate: new Date(),
        endDate: req.body.endDate,
        billingFrequency: existingContract.billingFrequency,
        contractValue: req.body.contractValue || existingContract.contractValue,
        status: 'ACTIVE',
        terms: existingContract.terms,
        autoRenew: existingContract.autoRenew
      }
    });

    // Mark old contract as expired
    await req.prisma.contract.update({
      where: { id: req.params.id },
      data: { status: 'EXPIRED' }
    });

    res.status(201).json(newContract);
  } catch (error) {
    console.error('Renew contract error:', error);
    res.status(500).json({ error: 'Failed to renew contract' });
  }
});

// Get contract types for dropdown
router.get('/meta/types', authMiddleware, async (req, res) => {
  const types = [
    { value: 'ONE_TIME', label: 'One-Time Service' },
    { value: 'RECURRING', label: 'Recurring Service' },
    { value: 'ANNUAL', label: 'Annual Contract' }
  ];
  res.json(types);
});

// Get billing frequencies for dropdown
router.get('/meta/billing-frequencies', authMiddleware, async (req, res) => {
  const frequencies = [
    { value: 'ONE_TIME', label: 'One-Time' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'ANNUALLY', label: 'Annually' }
  ];
  res.json(frequencies);
});

module.exports = router;
