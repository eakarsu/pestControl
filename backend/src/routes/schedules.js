const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get schedule for a date range
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, technicianId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const where = {
      scheduledDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    if (technicianId) where.technicianId = technicianId;

    const serviceOrders = await req.prisma.serviceOrder.findMany({
      where,
      include: {
        property: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
        serviceType: true,
        technician: { include: { user: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTimeStart: 'asc' }]
    });

    // Group by date
    const schedule = serviceOrders.reduce((acc, order) => {
      const dateKey = order.scheduledDate.toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    }, {});

    res.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get technician schedules
router.get('/technician/:technicianId', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { technicianId: req.params.technicianId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const schedules = await req.prisma.technicianSchedule.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get technician schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch technician schedule' });
  }
});

// Set technician schedule
router.post('/technician/:technicianId', authMiddleware, async (req, res) => {
  try {
    const { date, startTime, endTime, isAvailable, notes } = req.body;

    const schedule = await req.prisma.technicianSchedule.upsert({
      where: {
        technicianId_date: {
          technicianId: req.params.technicianId,
          date: new Date(date)
        }
      },
      update: { startTime, endTime, isAvailable, notes },
      create: {
        technicianId: req.params.technicianId,
        date: new Date(date),
        startTime,
        endTime,
        isAvailable,
        notes
      }
    });

    res.json(schedule);
  } catch (error) {
    console.error('Set technician schedule error:', error);
    res.status(500).json({ error: 'Failed to set schedule' });
  }
});

// Bulk set technician schedule
router.post('/technician/:technicianId/bulk', authMiddleware, async (req, res) => {
  try {
    const { schedules } = req.body;

    const results = await Promise.all(
      schedules.map(async (schedule) => {
        return req.prisma.technicianSchedule.upsert({
          where: {
            technicianId_date: {
              technicianId: req.params.technicianId,
              date: new Date(schedule.date)
            }
          },
          update: {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
            notes: schedule.notes
          },
          create: {
            technicianId: req.params.technicianId,
            date: new Date(schedule.date),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
            notes: schedule.notes
          }
        });
      })
    );

    res.json(results);
  } catch (error) {
    console.error('Bulk set schedule error:', error);
    res.status(500).json({ error: 'Failed to set schedules' });
  }
});

// Get available technicians for a date/time
router.get('/available', authMiddleware, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const dateObj = new Date(date);

    // Get all technicians with their schedules for the date
    const technicians = await req.prisma.technician.findMany({
      where: { isAvailable: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
        schedules: {
          where: { date: dateObj }
        }
      }
    });

    // Filter available technicians
    const availableTechnicians = technicians.filter(tech => {
      // If no schedule entry, assume available
      if (tech.schedules.length === 0) return true;
      const schedule = tech.schedules[0];
      if (!schedule.isAvailable) return false;

      // Check time overlap if times provided
      if (startTime && endTime && schedule.startTime && schedule.endTime) {
        return startTime >= schedule.startTime && endTime <= schedule.endTime;
      }
      return true;
    });

    // Get existing service orders for the date to check conflicts
    const existingOrders = await req.prisma.serviceOrder.findMany({
      where: {
        scheduledDate: dateObj,
        status: { notIn: ['CANCELLED', 'COMPLETED'] }
      }
    });

    // Add existing orders count to each technician
    const result = availableTechnicians.map(tech => ({
      ...tech,
      existingOrdersCount: existingOrders.filter(o => o.technicianId === tech.id).length
    }));

    res.json(result);
  } catch (error) {
    console.error('Get available technicians error:', error);
    res.status(500).json({ error: 'Failed to fetch available technicians' });
  }
});

// Get service windows
router.get('/windows', authMiddleware, async (req, res) => {
  const windows = [
    { value: '08:00-10:00', label: '8:00 AM - 10:00 AM' },
    { value: '10:00-12:00', label: '10:00 AM - 12:00 PM' },
    { value: '12:00-14:00', label: '12:00 PM - 2:00 PM' },
    { value: '14:00-16:00', label: '2:00 PM - 4:00 PM' },
    { value: '16:00-18:00', label: '4:00 PM - 6:00 PM' }
  ];
  res.json(windows);
});

// Create recurring schedule
router.post('/recurring', authMiddleware, async (req, res) => {
  try {
    const { propertyId, serviceTypeId, technicianId, frequency, startDate, endDate, dayOfWeek, timeStart, timeEnd } = req.body;

    // Generate dates based on frequency
    const dates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      if (dayOfWeek === undefined || current.getDay() === dayOfWeek) {
        dates.push(new Date(current));
      }

      switch (frequency) {
        case 'WEEKLY':
          current.setDate(current.getDate() + 7);
          break;
        case 'BI_WEEKLY':
          current.setDate(current.getDate() + 14);
          break;
        case 'MONTHLY':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'QUARTERLY':
          current.setMonth(current.getMonth() + 3);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }

    // Create service orders
    const orderNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `WO-${year}${month}${day}-${random}`;
    };

    const orders = await Promise.all(
      dates.map(date =>
        req.prisma.serviceOrder.create({
          data: {
            orderNumber: orderNumber(),
            propertyId,
            serviceTypeId,
            technicianId,
            scheduledDate: date,
            scheduledTimeStart: timeStart,
            scheduledTimeEnd: timeEnd,
            status: 'PENDING'
          }
        })
      )
    );

    res.status(201).json({
      message: `Created ${orders.length} scheduled service orders`,
      orders
    });
  } catch (error) {
    console.error('Create recurring schedule error:', error);
    res.status(500).json({ error: 'Failed to create recurring schedule' });
  }
});

module.exports = router;
