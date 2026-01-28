const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== LICENSES ====================

// Get all licenses
router.get('/licenses', authMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const licenses = await req.prisma.license.findMany({
      where,
      orderBy: { expiryDate: 'asc' }
    });

    res.json(licenses);
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// Get license by ID
router.get('/licenses/:id', authMiddleware, async (req, res) => {
  try {
    const license = await req.prisma.license.findUnique({
      where: { id: req.params.id }
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json(license);
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
});

// Create license
router.post('/licenses', authMiddleware, async (req, res) => {
  try {
    const { technicianId, licenseType, licenseNumber, state, issueDate, expiryDate } = req.body;

    // Get technician name if technicianId provided
    let issuedTo = req.body.issuedTo || 'Unknown';
    if (technicianId) {
      const technician = await req.prisma.technician.findUnique({
        where: { id: technicianId },
        include: { user: true }
      });
      if (technician?.user) {
        issuedTo = `${technician.user.firstName} ${technician.user.lastName}`;
      }
    }

    const license = await req.prisma.license.create({
      data: {
        type: licenseType || 'PESTICIDE_APPLICATOR',
        licenseNumber,
        issuedBy: state ? `${state} Department of Agriculture` : 'State Authority',
        issuedTo,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });
    res.status(201).json(license);
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// Update license
router.put('/licenses/:id', authMiddleware, async (req, res) => {
  try {
    const { technicianId, licenseType, licenseNumber, state, issueDate, expiryDate, status } = req.body;

    // Get technician name if technicianId provided
    let issuedTo = undefined;
    if (technicianId) {
      const technician = await req.prisma.technician.findUnique({
        where: { id: technicianId },
        include: { user: true }
      });
      if (technician?.user) {
        issuedTo = `${technician.user.firstName} ${technician.user.lastName}`;
      }
    }

    const license = await req.prisma.license.update({
      where: { id: req.params.id },
      data: {
        ...(licenseType && { type: licenseType }),
        ...(licenseNumber && { licenseNumber }),
        ...(state && { issuedBy: `${state} Department of Agriculture` }),
        ...(issuedTo && { issuedTo }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
        ...(status && { status })
      }
    });
    res.json(license);
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

// Delete license
router.delete('/licenses/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.license.delete({ where: { id: req.params.id } });
    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ error: 'Failed to delete license' });
  }
});

// Get expiring licenses
router.get('/licenses/status/expiring', authMiddleware, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const licenses = await req.prisma.license.findMany({
      where: {
        expiryDate: { lte: thirtyDaysFromNow },
        status: { not: 'EXPIRED' }
      },
      orderBy: { expiryDate: 'asc' }
    });

    res.json(licenses);
  } catch (error) {
    console.error('Get expiring licenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expiring licenses' });
  }
});

// ==================== PRODUCT REGISTRATIONS ====================

// Get all product registrations
router.get('/registrations', authMiddleware, async (req, res) => {
  try {
    const { state, status } = req.query;

    const where = {};
    if (state) where.state = state;
    if (status) where.status = status;

    const registrations = await req.prisma.productRegistration.findMany({
      where,
      orderBy: { expiryDate: 'asc' }
    });

    res.json(registrations);
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Create product registration
router.post('/registrations', authMiddleware, async (req, res) => {
  try {
    const registration = await req.prisma.productRegistration.create({
      data: {
        ...req.body,
        registrationDate: new Date(req.body.registrationDate),
        expiryDate: new Date(req.body.expiryDate)
      }
    });
    res.status(201).json(registration);
  } catch (error) {
    console.error('Create registration error:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

// Update product registration
router.put('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    const registration = await req.prisma.productRegistration.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        registrationDate: req.body.registrationDate ? new Date(req.body.registrationDate) : undefined,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined
      }
    });
    res.json(registration);
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Delete product registration
router.delete('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.productRegistration.delete({ where: { id: req.params.id } });
    res.json({ message: 'Registration deleted successfully' });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// ==================== SAFETY DATA SHEETS ====================

// Get all safety data sheets
router.get('/sds', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }

    const sheets = await req.prisma.safetyDataSheet.findMany({
      where,
      orderBy: { productName: 'asc' }
    });

    res.json(sheets);
  } catch (error) {
    console.error('Get SDS error:', error);
    res.status(500).json({ error: 'Failed to fetch safety data sheets' });
  }
});

// Create safety data sheet
router.post('/sds', authMiddleware, async (req, res) => {
  try {
    const sheet = await req.prisma.safetyDataSheet.create({
      data: {
        ...req.body,
        revisionDate: new Date(req.body.revisionDate)
      }
    });
    res.status(201).json(sheet);
  } catch (error) {
    console.error('Create SDS error:', error);
    res.status(500).json({ error: 'Failed to create safety data sheet' });
  }
});

// Update safety data sheet
router.put('/sds/:id', authMiddleware, async (req, res) => {
  try {
    const sheet = await req.prisma.safetyDataSheet.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        revisionDate: req.body.revisionDate ? new Date(req.body.revisionDate) : undefined
      }
    });
    res.json(sheet);
  } catch (error) {
    console.error('Update SDS error:', error);
    res.status(500).json({ error: 'Failed to update safety data sheet' });
  }
});

// Delete safety data sheet
router.delete('/sds/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.safetyDataSheet.delete({ where: { id: req.params.id } });
    res.json({ message: 'Safety data sheet deleted successfully' });
  } catch (error) {
    console.error('Delete SDS error:', error);
    res.status(500).json({ error: 'Failed to delete safety data sheet' });
  }
});

// ==================== USAGE REPORTS ====================

// Get usage reports
router.get('/usage-reports', authMiddleware, async (req, res) => {
  try {
    const { period, status } = req.query;

    const where = {};
    if (period) where.reportPeriod = period;
    if (status) where.status = status;

    const reports = await req.prisma.usageReport.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    console.error('Get usage reports error:', error);
    res.status(500).json({ error: 'Failed to fetch usage reports' });
  }
});

// Create usage report
router.post('/usage-reports', authMiddleware, async (req, res) => {
  try {
    const report = await req.prisma.usageReport.create({
      data: req.body
    });
    res.status(201).json(report);
  } catch (error) {
    console.error('Create usage report error:', error);
    res.status(500).json({ error: 'Failed to create usage report' });
  }
});

// Submit usage report
router.post('/usage-reports/:id/submit', authMiddleware, async (req, res) => {
  try {
    const report = await req.prisma.usageReport.update({
      where: { id: req.params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });
    res.json(report);
  } catch (error) {
    console.error('Submit usage report error:', error);
    res.status(500).json({ error: 'Failed to submit usage report' });
  }
});

// Generate usage report from product usages
router.post('/usage-reports/generate', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, reportPeriod } = req.body;

    const productUsages = await req.prisma.productUsage.findMany({
      where: {
        usedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: { product: true }
    });

    // Aggregate by product
    const aggregated = productUsages.reduce((acc, usage) => {
      const key = usage.product.name;
      if (!acc[key]) {
        acc[key] = {
          productName: usage.product.name,
          epaNumber: usage.product.epaNumber,
          totalQuantity: 0,
          unit: usage.unit,
          applicationCount: 0
        };
      }
      acc[key].totalQuantity += usage.quantity;
      acc[key].applicationCount += 1;
      return acc;
    }, {});

    // Create reports
    const reports = await Promise.all(
      Object.values(aggregated).map(data =>
        req.prisma.usageReport.create({
          data: {
            reportPeriod,
            ...data,
            reportedBy: req.user.firstName + ' ' + req.user.lastName
          }
        })
      )
    );

    res.status(201).json(reports);
  } catch (error) {
    console.error('Generate usage reports error:', error);
    res.status(500).json({ error: 'Failed to generate usage reports' });
  }
});

// Get license types for dropdown
router.get('/meta/license-types', authMiddleware, async (req, res) => {
  const types = [
    { value: 'BUSINESS', label: 'Business License' },
    { value: 'PESTICIDE_APPLICATOR', label: 'Pesticide Applicator' },
    { value: 'RESTRICTED_USE', label: 'Restricted Use Pesticide' },
    { value: 'OPERATOR', label: 'Operator License' },
    { value: 'COMMERCIAL', label: 'Commercial Applicator' }
  ];
  res.json(types);
});

module.exports = router;
