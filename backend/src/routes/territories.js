const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all territories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const territories = await req.prisma.territory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { technicians: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(territories);
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ error: 'Failed to fetch territories' });
  }
});

// Get territory by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const territory = await req.prisma.territory.findUnique({
      where: { id: req.params.id },
      include: {
        technicians: {
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      }
    });

    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    res.json(territory);
  } catch (error) {
    console.error('Get territory error:', error);
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
});

// Create territory
router.post('/', authMiddleware, async (req, res) => {
  try {
    const territory = await req.prisma.territory.create({
      data: req.body
    });
    res.status(201).json(territory);
  } catch (error) {
    console.error('Create territory error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Territory name already exists' });
    }
    res.status(500).json({ error: 'Failed to create territory' });
  }
});

// Update territory
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const territory = await req.prisma.territory.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(territory);
  } catch (error) {
    console.error('Update territory error:', error);
    res.status(500).json({ error: 'Failed to update territory' });
  }
});

// Delete territory
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.prisma.territory.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Territory deactivated successfully' });
  } catch (error) {
    console.error('Delete territory error:', error);
    res.status(500).json({ error: 'Failed to delete territory' });
  }
});

// Assign technician to territory
router.post('/:id/technicians', authMiddleware, async (req, res) => {
  try {
    const { technicianId } = req.body;
    const technician = await req.prisma.technician.update({
      where: { id: technicianId },
      data: { territoryId: req.params.id },
      include: { user: { select: { firstName: true, lastName: true } } }
    });
    res.json(technician);
  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({ error: 'Failed to assign technician' });
  }
});

// Remove technician from territory
router.delete('/:id/technicians/:technicianId', authMiddleware, async (req, res) => {
  try {
    await req.prisma.technician.update({
      where: { id: req.params.technicianId },
      data: { territoryId: null }
    });
    res.json({ message: 'Technician removed from territory' });
  } catch (error) {
    console.error('Remove technician error:', error);
    res.status(500).json({ error: 'Failed to remove technician' });
  }
});

// Find territory by zip code
router.get('/lookup/:zipCode', authMiddleware, async (req, res) => {
  try {
    const territory = await req.prisma.territory.findFirst({
      where: {
        zipCodes: { has: req.params.zipCode },
        isActive: true
      },
      include: {
        technicians: {
          where: { isAvailable: true },
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      }
    });

    if (!territory) {
      return res.status(404).json({ error: 'No territory found for this zip code' });
    }

    res.json(territory);
  } catch (error) {
    console.error('Territory lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup territory' });
  }
});

module.exports = router;
