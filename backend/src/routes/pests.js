const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all pest types
router.get('/types', authMiddleware, async (req, res) => {
  try {
    const { category, search } = req.query;

    const where = {};
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const pestTypes = await req.prisma.pestType.findMany({
      where,
      include: {
        _count: { select: { pestIssues: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(pestTypes);
  } catch (error) {
    console.error('Get pest types error:', error);
    res.status(500).json({ error: 'Failed to fetch pest types' });
  }
});

// Get pest type by ID
router.get('/types/:id', authMiddleware, async (req, res) => {
  try {
    const pestType = await req.prisma.pestType.findUnique({
      where: { id: req.params.id },
      include: {
        treatmentRecommendations: true,
        pestIssues: {
          take: 10,
          orderBy: { firstReported: 'desc' },
          include: { property: { include: { customer: true } } }
        }
      }
    });

    if (!pestType) {
      return res.status(404).json({ error: 'Pest type not found' });
    }

    res.json(pestType);
  } catch (error) {
    console.error('Get pest type error:', error);
    res.status(500).json({ error: 'Failed to fetch pest type' });
  }
});

// Create pest type
router.post('/types', authMiddleware, async (req, res) => {
  try {
    const pestType = await req.prisma.pestType.create({
      data: req.body
    });
    res.status(201).json(pestType);
  } catch (error) {
    console.error('Create pest type error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Pest type already exists' });
    }
    res.status(500).json({ error: 'Failed to create pest type' });
  }
});

// Update pest type
router.put('/types/:id', authMiddleware, async (req, res) => {
  try {
    const pestType = await req.prisma.pestType.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(pestType);
  } catch (error) {
    console.error('Update pest type error:', error);
    res.status(500).json({ error: 'Failed to update pest type' });
  }
});

// Delete pest type
router.delete('/types/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.pestType.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pest type deleted successfully' });
  } catch (error) {
    console.error('Delete pest type error:', error);
    res.status(500).json({ error: 'Failed to delete pest type' });
  }
});

// Get all pest issues
router.get('/issues', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, severity, propertyId, pestTypeId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (propertyId) where.propertyId = propertyId;
    if (pestTypeId) where.pestTypeId = pestTypeId;

    const [issues, total] = await Promise.all([
      req.prisma.pestIssue.findMany({
        where,
        include: {
          pestType: true,
          property: { include: { customer: { select: { firstName: true, lastName: true } } } },
          treatments: { include: { product: true } }
        },
        orderBy: { firstReported: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      req.prisma.pestIssue.count({ where })
    ]);

    res.json({
      issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get pest issues error:', error);
    res.status(500).json({ error: 'Failed to fetch pest issues' });
  }
});

// Get pest issue by ID
router.get('/issues/:id', authMiddleware, async (req, res) => {
  try {
    const issue = await req.prisma.pestIssue.findUnique({
      where: { id: req.params.id },
      include: {
        pestType: true,
        property: { include: { customer: true } },
        treatments: {
          include: { product: true, appliedBy: { include: { user: true } } },
          orderBy: { appliedAt: 'desc' }
        }
      }
    });

    if (!issue) {
      return res.status(404).json({ error: 'Pest issue not found' });
    }

    res.json(issue);
  } catch (error) {
    console.error('Get pest issue error:', error);
    res.status(500).json({ error: 'Failed to fetch pest issue' });
  }
});

// Create pest issue
router.post('/issues', authMiddleware, async (req, res) => {
  try {
    const issue = await req.prisma.pestIssue.create({
      data: req.body,
      include: { pestType: true, property: true }
    });
    res.status(201).json(issue);
  } catch (error) {
    console.error('Create pest issue error:', error);
    res.status(500).json({ error: 'Failed to create pest issue' });
  }
});

// Update pest issue
router.put('/issues/:id', authMiddleware, async (req, res) => {
  try {
    const issue = await req.prisma.pestIssue.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        lastObserved: req.body.lastObserved ? new Date(req.body.lastObserved) : undefined
      },
      include: { pestType: true, property: true }
    });
    res.json(issue);
  } catch (error) {
    console.error('Update pest issue error:', error);
    res.status(500).json({ error: 'Failed to update pest issue' });
  }
});

// Delete pest issue
router.delete('/issues/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.pestIssue.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pest issue deleted successfully' });
  } catch (error) {
    console.error('Delete pest issue error:', error);
    res.status(500).json({ error: 'Failed to delete pest issue' });
  }
});

// Resolve pest issue
router.post('/issues/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const issue = await req.prisma.pestIssue.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        lastObserved: new Date()
      }
    });
    res.json(issue);
  } catch (error) {
    console.error('Resolve pest issue error:', error);
    res.status(500).json({ error: 'Failed to resolve pest issue' });
  }
});

// Get treatment recommendations
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { pestTypeId, severity, propertyType, season } = req.query;

    const where = {};
    if (pestTypeId) where.pestTypeId = pestTypeId;
    if (severity) where.severity = severity;
    if (propertyType) where.propertyType = propertyType;
    if (season) where.season = season;

    const recommendations = await req.prisma.treatmentRecommendation.findMany({
      where,
      include: { pestType: true },
      orderBy: { effectivenessScore: 'desc' }
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Create treatment recommendation
router.post('/recommendations', authMiddleware, async (req, res) => {
  try {
    const recommendation = await req.prisma.treatmentRecommendation.create({
      data: req.body,
      include: { pestType: true }
    });
    res.status(201).json(recommendation);
  } catch (error) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// Get seasonal predictions
router.get('/predictions', authMiddleware, async (req, res) => {
  try {
    const { region, zipCode, pestType, year } = req.query;

    const where = {};
    if (region) where.region = region;
    if (zipCode) where.zipCode = zipCode;
    if (pestType) where.pestType = pestType;
    if (year) where.year = parseInt(year);

    const predictions = await req.prisma.seasonalPrediction.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'asc' }]
    });

    res.json(predictions);
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Get pest categories for dropdown
router.get('/meta/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await req.prisma.pestType.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    const defaultCategories = [
      { value: 'Insects', label: 'Insects' },
      { value: 'Rodents', label: 'Rodents' },
      { value: 'Birds', label: 'Birds' },
      { value: 'Wildlife', label: 'Wildlife' },
      { value: 'Arachnids', label: 'Arachnids' },
      { value: 'Other', label: 'Other' }
    ];
    res.json(defaultCategories);
  }
});

// Get severity levels for dropdown
router.get('/meta/severities', authMiddleware, async (req, res) => {
  const severities = [
    { value: 'LOW', label: 'Low' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'HIGH', label: 'High' },
    { value: 'SEVERE', label: 'Severe' }
  ];
  res.json(severities);
});

module.exports = router;
