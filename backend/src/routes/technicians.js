const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all technicians
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { isAvailable, territoryId } = req.query;

    const where = {};
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    if (territoryId) where.territoryId = territoryId;

    const technicians = await req.prisma.technician.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        territory: true,
        _count: { select: { serviceOrders: true } }
      },
      orderBy: { user: { firstName: 'asc' } }
    });

    res.json(technicians);
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// Get technician by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const technician = await req.prisma.technician.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        territory: true,
        serviceOrders: {
          take: 10,
          orderBy: { scheduledDate: 'desc' },
          include: { property: true, serviceType: true }
        },
        schedules: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 14
        },
        timeEntries: {
          take: 10,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json(technician);
  } catch (error) {
    console.error('Get technician error:', error);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// Create technician (with user)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, employeeId, licenseNumber, licenseState, licenseExpiry, certifications, specializations, territoryId } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await req.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'TECHNICIAN'
        }
      });

      const technician = await prisma.technician.create({
        data: {
          userId: user.id,
          employeeId,
          licenseNumber,
          licenseState,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          certifications: certifications || [],
          specializations: specializations || [],
          territoryId
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
      });

      return technician;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create technician error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email or employee ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// Update technician
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, ...technicianData } = req.body;

    const technician = await req.prisma.technician.findUnique({
      where: { id: req.params.id }
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    // Update user data if provided
    if (firstName || lastName || phone) {
      await req.prisma.user.update({
        where: { id: technician.userId },
        data: { firstName, lastName, phone }
      });
    }

    // Update technician data
    const updated = await req.prisma.technician.update({
      where: { id: req.params.id },
      data: {
        ...technicianData,
        licenseExpiry: technicianData.licenseExpiry ? new Date(technicianData.licenseExpiry) : undefined
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update technician error:', error);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

// Delete technician
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const technician = await req.prisma.technician.findUnique({
      where: { id: req.params.id }
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    await req.prisma.user.delete({ where: { id: technician.userId } });

    res.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    console.error('Delete technician error:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

// Update technician location
router.put('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const technician = await req.prisma.technician.update({
      where: { id: req.params.id },
      data: { currentLatitude: latitude, currentLongitude: longitude }
    });
    res.json(technician);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Set technician availability
router.put('/:id/availability', authMiddleware, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const technician = await req.prisma.technician.update({
      where: { id: req.params.id },
      data: { isAvailable }
    });
    res.json(technician);
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Clock in
router.post('/:id/clock-in', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingEntry = await req.prisma.timeEntry.findFirst({
      where: {
        technicianId: req.params.id,
        date: today,
        clockOut: null
      }
    });

    if (existingEntry) {
      return res.status(400).json({ error: 'Already clocked in' });
    }

    const timeEntry = await req.prisma.timeEntry.create({
      data: {
        technicianId: req.params.id,
        date: today,
        clockIn: new Date()
      }
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/:id/clock-out', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeEntry = await req.prisma.timeEntry.findFirst({
      where: {
        technicianId: req.params.id,
        date: today,
        clockOut: null
      }
    });

    if (!timeEntry) {
      return res.status(400).json({ error: 'Not clocked in' });
    }

    const updated = await req.prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: { clockOut: new Date() }
    });

    res.json(updated);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Get technician time entries
router.get('/:id/time-entries', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { technicianId: req.params.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const timeEntries = await req.prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(timeEntries);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Get specializations for dropdown
router.get('/meta/specializations', authMiddleware, async (req, res) => {
  const specializations = [
    { value: 'General Pest Control', label: 'General Pest Control' },
    { value: 'Termite Treatment', label: 'Termite Treatment' },
    { value: 'Rodent Control', label: 'Rodent Control' },
    { value: 'Bed Bug Treatment', label: 'Bed Bug Treatment' },
    { value: 'Mosquito Control', label: 'Mosquito Control' },
    { value: 'Wildlife Removal', label: 'Wildlife Removal' },
    { value: 'Fumigation', label: 'Fumigation' },
    { value: 'Commercial Pest Control', label: 'Commercial Pest Control' },
    { value: 'Wood Destroying Insects', label: 'Wood Destroying Insects' }
  ];
  res.json(specializations);
});

module.exports = router;
