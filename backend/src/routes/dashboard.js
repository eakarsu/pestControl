const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      totalProperties,
      totalServiceOrders,
      completedToday,
      scheduledToday,
      overdueInvoices,
      pendingLeads,
      activeContracts,
      revenueThisMonth,
      revenueLastMonth
    ] = await Promise.all([
      req.prisma.customer.count(),
      req.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      req.prisma.customer.count({ where: { createdAt: { gte: thisMonth } } }),
      req.prisma.property.count(),
      req.prisma.serviceOrder.count(),
      req.prisma.serviceOrder.count({
        where: { status: 'COMPLETED', completedDate: { gte: today, lt: tomorrow } }
      }),
      req.prisma.serviceOrder.count({
        where: { scheduledDate: { gte: today, lt: tomorrow }, status: { not: 'COMPLETED' } }
      }),
      req.prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      req.prisma.lead.count({ where: { status: { in: ['NEW', 'CONTACTED'] } } }),
      req.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      req.prisma.invoice.aggregate({
        where: { issueDate: { gte: thisMonth }, status: 'PAID' },
        _sum: { amountPaid: true }
      }),
      req.prisma.invoice.aggregate({
        where: { issueDate: { gte: lastMonth, lt: thisMonth }, status: 'PAID' },
        _sum: { amountPaid: true }
      })
    ]);

    const revenueChange = revenueLastMonth._sum.amountPaid
      ? ((revenueThisMonth._sum.amountPaid || 0) - revenueLastMonth._sum.amountPaid) / revenueLastMonth._sum.amountPaid * 100
      : 0;

    res.json({
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        newThisMonth: newCustomersThisMonth
      },
      properties: totalProperties,
      serviceOrders: {
        total: totalServiceOrders,
        completedToday,
        scheduledToday
      },
      invoices: {
        overdue: overdueInvoices
      },
      leads: {
        pending: pendingLeads
      },
      contracts: {
        active: activeContracts
      },
      revenue: {
        thisMonth: revenueThisMonth._sum.amountPaid || 0,
        lastMonth: revenueLastMonth._sum.amountPaid || 0,
        changePercent: Math.round(revenueChange * 10) / 10
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get today's schedule overview
router.get('/schedule-today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const serviceOrders = await req.prisma.serviceOrder.findMany({
      where: {
        scheduledDate: { gte: today, lt: tomorrow }
      },
      include: {
        property: { include: { customer: { select: { firstName: true, lastName: true } } } },
        serviceType: true,
        technician: { include: { user: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: [{ scheduledTimeStart: 'asc' }]
    });

    // Group by technician
    const byTechnician = serviceOrders.reduce((acc, order) => {
      const techName = order.technician
        ? `${order.technician.user.firstName} ${order.technician.user.lastName}`
        : 'Unassigned';
      if (!acc[techName]) acc[techName] = [];
      acc[techName].push(order);
      return acc;
    }, {});

    res.json({
      total: serviceOrders.length,
      byStatus: {
        pending: serviceOrders.filter(o => o.status === 'PENDING').length,
        confirmed: serviceOrders.filter(o => o.status === 'CONFIRMED').length,
        inProgress: serviceOrders.filter(o => o.status === 'IN_PROGRESS').length,
        completed: serviceOrders.filter(o => o.status === 'COMPLETED').length
      },
      byTechnician,
      orders: serviceOrders
    });
  } catch (error) {
    console.error('Get schedule today error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get recent activity
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const [recentOrders, recentLeads, recentInvoices] = await Promise.all([
      req.prisma.serviceOrder.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { completedDate: 'desc' },
        take: limit,
        include: {
          property: { include: { customer: { select: { firstName: true, lastName: true } } } },
          technician: { include: { user: { select: { firstName: true, lastName: true } } } }
        }
      }),
      req.prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      req.prisma.invoice.findMany({
        where: { status: 'PAID' },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: { customer: { select: { firstName: true, lastName: true } } }
      })
    ]);

    // Combine and sort by date
    const activities = [
      ...recentOrders.map(o => ({
        type: 'service_completed',
        date: o.completedDate,
        description: `Service completed for ${o.property.customer.firstName} ${o.property.customer.lastName}`,
        technician: o.technician ? `${o.technician.user.firstName} ${o.technician.user.lastName}` : null
      })),
      ...recentLeads.map(l => ({
        type: 'new_lead',
        date: l.createdAt,
        description: `New lead: ${l.firstName} ${l.lastName}`,
        source: l.source
      })),
      ...recentInvoices.map(i => ({
        type: 'payment_received',
        date: i.updatedAt,
        description: `Payment received from ${i.customer.firstName} ${i.customer.lastName}`,
        amount: i.amountPaid
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get alerts and notifications
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = [];

    // Expiring licenses
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringLicenses = await req.prisma.license.count({
      where: { expiryDate: { lte: thirtyDaysFromNow }, status: 'ACTIVE' }
    });
    if (expiringLicenses > 0) {
      alerts.push({
        type: 'warning',
        category: 'compliance',
        message: `${expiringLicenses} license(s) expiring within 30 days`,
        count: expiringLicenses
      });
    }

    // Overdue invoices
    const overdueInvoices = await req.prisma.invoice.count({
      where: { status: 'OVERDUE' }
    });
    if (overdueInvoices > 0) {
      alerts.push({
        type: 'error',
        category: 'billing',
        message: `${overdueInvoices} overdue invoice(s) require attention`,
        count: overdueInvoices
      });
    }

    // Low stock products
    const lowStockProducts = await req.prisma.product.findMany({
      where: { inStock: { lte: 10 } }
    });
    const actualLowStock = lowStockProducts.filter(p => p.inStock <= p.reorderLevel);
    if (actualLowStock.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        message: `${actualLowStock.length} product(s) below reorder level`,
        count: actualLowStock.length
      });
    }

    // Pending follow-ups
    const overduefollowUps = await req.prisma.followUp.count({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() }
      }
    });
    if (overduefollowUps > 0) {
      alerts.push({
        type: 'warning',
        category: 'sales',
        message: `${overduefollowUps} overdue follow-up(s)`,
        count: overduefollowUps
      });
    }

    // Unassigned service orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unassignedOrders = await req.prisma.serviceOrder.count({
      where: {
        technicianId: null,
        scheduledDate: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    if (unassignedOrders > 0) {
      alerts.push({
        type: 'error',
        category: 'scheduling',
        message: `${unassignedOrders} service order(s) need technician assignment`,
        count: unassignedOrders
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get technician performance
router.get('/technician-performance', authMiddleware, async (req, res) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const technicians = await req.prisma.technician.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
        serviceOrders: {
          where: { scheduledDate: { gte: thisMonth } }
        }
      }
    });

    const performance = technicians.map(tech => {
      const orders = tech.serviceOrders;
      const completed = orders.filter(o => o.status === 'COMPLETED').length;
      const total = orders.length;

      return {
        id: tech.id,
        name: `${tech.user.firstName} ${tech.user.lastName}`,
        completedJobs: completed,
        totalJobs: total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        isAvailable: tech.isAvailable
      };
    }).sort((a, b) => b.completedJobs - a.completedJobs);

    res.json(performance);
  } catch (error) {
    console.error('Get technician performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// Get revenue chart data
router.get('/revenue-chart', authMiddleware, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const revenue = await req.prisma.invoice.aggregate({
        where: {
          issueDate: { gte: startDate, lt: endDate },
          status: 'PAID'
        },
        _sum: { amountPaid: true }
      });

      data.push({
        month: startDate.toLocaleString('default', { month: 'short' }),
        year: startDate.getFullYear(),
        revenue: revenue._sum.amountPaid || 0
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get service order statistics chart
router.get('/service-chart', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [scheduled, completed] = await Promise.all([
        req.prisma.serviceOrder.count({
          where: { scheduledDate: { gte: date, lt: nextDate } }
        }),
        req.prisma.serviceOrder.count({
          where: { scheduledDate: { gte: date, lt: nextDate }, status: 'COMPLETED' }
        })
      ]);

      data.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleString('default', { weekday: 'short' }),
        scheduled,
        completed
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Get service chart error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

module.exports = router;
