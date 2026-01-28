const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get routes for a date
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, technicianId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const where = { date: dateObj };
    if (technicianId) where.technicianId = technicianId;

    const routes = await req.prisma.route.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get route by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const route = await req.prisma.route.findUnique({
      where: { id: req.params.id }
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Get detailed stop information
    const stopIds = route.stops.map(stop => stop.serviceOrderId);
    const serviceOrders = await req.prisma.serviceOrder.findMany({
      where: { id: { in: stopIds } },
      include: {
        property: { include: { customer: true } },
        serviceType: true
      }
    });

    // Map service orders to stops
    const enrichedStops = route.stops.map(stop => {
      const order = serviceOrders.find(o => o.id === stop.serviceOrderId);
      return { ...stop, serviceOrder: order };
    });

    res.json({ ...route, stops: enrichedStops });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Create/optimize route
router.post('/optimize', authMiddleware, async (req, res) => {
  try {
    const { date, technicianId } = req.body;

    // Get service orders for the technician on the date
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const serviceOrders = await req.prisma.serviceOrder.findMany({
      where: {
        technicianId,
        scheduledDate: { gte: dateObj, lt: nextDay },
        status: { notIn: ['CANCELLED', 'COMPLETED'] }
      },
      include: {
        property: true
      }
    });

    if (serviceOrders.length === 0) {
      return res.status(400).json({ error: 'No service orders found for optimization' });
    }

    // Simple optimization: sort by scheduled time and then by proximity
    // In production, you'd use a proper routing algorithm or API
    const sortedOrders = serviceOrders.sort((a, b) => {
      if (a.scheduledTimeStart && b.scheduledTimeStart) {
        return a.scheduledTimeStart.localeCompare(b.scheduledTimeStart);
      }
      return 0;
    });

    // Calculate approximate distances (simplified)
    const stops = sortedOrders.map((order, index) => ({
      order: index + 1,
      serviceOrderId: order.id,
      address: `${order.property.addressLine1}, ${order.property.city}, ${order.property.state} ${order.property.zipCode}`,
      latitude: order.property.latitude,
      longitude: order.property.longitude,
      estimatedArrival: order.scheduledTimeStart,
      estimatedDuration: 45 // minutes
    }));

    // Calculate total estimated distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    for (let i = 0; i < stops.length; i++) {
      totalDuration += stops[i].estimatedDuration;
      if (i > 0 && stops[i].latitude && stops[i - 1].latitude) {
        // Simple distance calculation (would use actual routing API in production)
        const lat1 = stops[i - 1].latitude;
        const lon1 = stops[i - 1].longitude;
        const lat2 = stops[i].latitude;
        const lon2 = stops[i].longitude;
        const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 69; // Rough miles
        totalDistance += distance;
        totalDuration += Math.ceil(distance * 2); // Rough travel time in minutes
      }
    }

    // Create or update route
    const existingRoute = await req.prisma.route.findFirst({
      where: { date: dateObj, technicianId }
    });

    let route;
    if (existingRoute) {
      route = await req.prisma.route.update({
        where: { id: existingRoute.id },
        data: {
          stops,
          totalDistance,
          totalDuration,
          optimizedAt: new Date(),
          status: 'PLANNED'
        }
      });
    } else {
      route = await req.prisma.route.create({
        data: {
          date: dateObj,
          technicianId,
          stops,
          totalDistance,
          totalDuration,
          optimizedAt: new Date(),
          status: 'PLANNED'
        }
      });
    }

    res.json(route);
  } catch (error) {
    console.error('Optimize route error:', error);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});

// Update route
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const route = await req.prisma.route.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(route);
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Start route
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const route = await req.prisma.route.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' }
    });
    res.json(route);
  } catch (error) {
    console.error('Start route error:', error);
    res.status(500).json({ error: 'Failed to start route' });
  }
});

// Complete route
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const route = await req.prisma.route.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' }
    });
    res.json(route);
  } catch (error) {
    console.error('Complete route error:', error);
    res.status(500).json({ error: 'Failed to complete route' });
  }
});

// Reorder stops
router.put('/:id/reorder', authMiddleware, async (req, res) => {
  try {
    const { stops } = req.body;
    const route = await req.prisma.route.update({
      where: { id: req.params.id },
      data: { stops }
    });
    res.json(route);
  } catch (error) {
    console.error('Reorder stops error:', error);
    res.status(500).json({ error: 'Failed to reorder stops' });
  }
});

module.exports = router;
