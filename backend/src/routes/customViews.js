const express = require('express');
const router = express.Router();

// Seed-style fallback for properties without coordinates
function jitterCoord(seed) {
  // deterministic small jitter near a US central point (Dallas, TX)
  const baseLat = 32.7767;
  const baseLng = -96.7970;
  const hash = String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    lat: baseLat + ((hash % 100) - 50) / 100,
    lng: baseLng + (((hash * 7) % 100) - 50) / 100,
  };
}

function classifyStatus(orders, now) {
  if (!orders || orders.length === 0) return 'scheduled';
  const upcoming = orders.find(o => new Date(o.scheduledDate) >= now && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const overdue = orders.find(o => new Date(o.scheduledDate) < now && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  if (overdue) return 'overdue';
  if (upcoming) return 'scheduled';
  return 'active';
}

// VIZ 1: Service Area Map data
router.get('/service-area-map', async (req, res) => {
  try {
    const properties = await req.prisma.property.findMany({
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true, status: true } },
        serviceOrders: { select: { id: true, scheduledDate: true, status: true } },
      },
      take: 200,
    });
    const now = new Date();
    const points = properties.map((p) => {
      const coords = (p.latitude && p.longitude)
        ? { lat: p.latitude, lng: p.longitude }
        : jitterCoord(p.id);
      const status = classifyStatus(p.serviceOrders, now);
      return {
        id: p.id,
        name: p.name,
        address: `${p.addressLine1}, ${p.city}, ${p.state} ${p.zipCode}`,
        lat: coords.lat,
        lng: coords.lng,
        customer: p.customer ? `${p.customer.firstName} ${p.customer.lastName}${p.customer.companyName ? ' (' + p.customer.companyName + ')' : ''}` : 'Unknown',
        status,
        orderCount: p.serviceOrders.length,
      };
    });
    res.json({ points, total: points.length, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('service-area-map error', err);
    res.status(500).json({ error: 'Failed to load service area map', detail: err.message });
  }
});

// VIZ 2: Treatment calendar data
router.get('/treatment-calendar', async (req, res) => {
  try {
    const monthOffset = parseInt(req.query.monthOffset || '0', 10);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);

    const orders = await req.prisma.serviceOrder.findMany({
      where: { scheduledDate: { gte: start, lte: end } },
      include: {
        technician: { include: { user: { select: { firstName: true, lastName: true } } } },
        productUsages: { include: { product: { select: { name: true, category: true, activeIngredient: true } } } },
        property: { select: { name: true, addressLine1: true, city: true } },
        serviceType: { select: { name: true } },
      },
      take: 500,
    });

    const events = orders.map(o => {
      const techName = o.technician?.user
        ? `${o.technician.user.firstName} ${o.technician.user.lastName}`
        : 'Unassigned';
      const chems = o.productUsages.map(u => ({
        product: u.product?.name,
        category: u.product?.category || 'Other',
        activeIngredient: u.product?.activeIngredient,
      }));
      const primaryChemicalType = chems[0]?.category || 'General';
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        date: o.scheduledDate,
        day: new Date(o.scheduledDate).getDate(),
        status: o.status,
        technicianId: o.technicianId,
        technicianName: techName,
        serviceType: o.serviceType?.name || 'Treatment',
        property: o.property ? `${o.property.name} (${o.property.city})` : '',
        chemicalType: primaryChemicalType,
        chemicals: chems,
      };
    });

    const technicians = Array.from(new Map(events.map(e => [e.technicianId || 'unassigned', e.technicianName])).entries())
      .map(([id, name]) => ({ id, name }));

    res.json({
      monthStart: start.toISOString(),
      monthEnd: end.toISOString(),
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      events,
      technicians,
      total: events.length,
    });
  } catch (err) {
    console.error('treatment-calendar error', err);
    res.status(500).json({ error: 'Failed to load treatment calendar', detail: err.message });
  }
});

// NON-VIZ 1: Service Report PDF
router.get('/service-report-pdf', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const customerId = req.query.customerId;
    const orderId = req.query.orderId;

    let customer = null;
    let order = null;

    if (orderId) {
      order = await req.prisma.serviceOrder.findUnique({
        where: { id: orderId },
        include: {
          property: { include: { customer: true } },
          technician: { include: { user: true } },
          serviceType: true,
          productUsages: { include: { product: true } },
        },
      });
      if (order) customer = order.property?.customer;
    } else if (customerId) {
      customer = await req.prisma.customer.findUnique({ where: { id: customerId } });
      const properties = await req.prisma.property.findMany({ where: { customerId }, select: { id: true } });
      const propertyIds = properties.map(p => p.id);
      order = await req.prisma.serviceOrder.findFirst({
        where: { propertyId: { in: propertyIds } },
        orderBy: { scheduledDate: 'desc' },
        include: {
          property: { include: { customer: true } },
          technician: { include: { user: true } },
          serviceType: true,
          productUsages: { include: { product: true } },
        },
      });
    } else {
      // Pick the most recent order overall
      order = await req.prisma.serviceOrder.findFirst({
        orderBy: { scheduledDate: 'desc' },
        include: {
          property: { include: { customer: true } },
          technician: { include: { user: true } },
          serviceType: true,
          productUsages: { include: { product: true } },
        },
      });
      if (order) customer = order.property?.customer;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="service-report.pdf"');

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#15803d').text('Pest Control Service Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#000');
    if (customer) {
      doc.font('Helvetica-Bold').text('Customer');
      doc.font('Helvetica').text(`${customer.firstName} ${customer.lastName}${customer.companyName ? ' - ' + customer.companyName : ''}`);
      doc.text(`Email: ${customer.email}`);
      doc.text(`Phone: ${customer.phone}`);
      doc.moveDown(0.5);
    } else {
      doc.font('Helvetica').text('No customer selected.');
    }

    if (order) {
      doc.font('Helvetica-Bold').text('Visit');
      doc.font('Helvetica').text(`Order #: ${order.orderNumber}`);
      doc.text(`Scheduled: ${new Date(order.scheduledDate).toLocaleString()}`);
      if (order.completedDate) doc.text(`Completed: ${new Date(order.completedDate).toLocaleString()}`);
      doc.text(`Status: ${order.status}`);
      if (order.property) {
        doc.text(`Property: ${order.property.name}`);
        doc.text(`Address: ${order.property.addressLine1}, ${order.property.city}, ${order.property.state} ${order.property.zipCode}`);
      }
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Technician');
      const tech = order.technician;
      if (tech && tech.user) {
        doc.font('Helvetica').text(`${tech.user.firstName} ${tech.user.lastName}`);
        if (tech.licenseNumber) doc.text(`License: ${tech.licenseNumber}${tech.licenseState ? ' (' + tech.licenseState + ')' : ''}`);
        if (tech.employeeId) doc.text(`Employee ID: ${tech.employeeId}`);
      } else {
        doc.font('Helvetica').text('Unassigned');
      }
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Services Performed');
      doc.font('Helvetica').text(order.serviceType?.name || 'General Pest Treatment');
      if (order.technicianNotes) doc.text(`Notes: ${order.technicianNotes}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Chemicals Used');
      if (order.productUsages && order.productUsages.length > 0) {
        order.productUsages.forEach(u => {
          const p = u.product;
          doc.font('Helvetica').text(
            `- ${p?.name || 'Unknown'} | EPA Reg #: ${p?.epaNumber || 'N/A'} | Qty: ${u.quantity} ${u.unit}${u.applicationRate ? ' @ ' + u.applicationRate : ''}`
          );
          if (p?.activeIngredient) doc.fillColor('#555').text(`   Active Ingredient: ${p.activeIngredient}`).fillColor('#000');
        });
      } else {
        doc.font('Helvetica').text('No chemical applications recorded.');
      }
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Recommendations');
      const recs = [
        'Maintain clean food storage areas; seal containers tightly.',
        'Repair any moisture issues and standing water near foundation.',
        'Schedule follow-up inspection within 30 days to assess effectiveness.',
        'Contact us immediately if pest activity persists or increases.',
      ];
      doc.font('Helvetica').list(recs);
    } else {
      doc.font('Helvetica').text('No service visits available for this customer.');
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('This report is provided for compliance and customer record-keeping. Keep on file per state regulations.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('service-report-pdf error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', detail: err.message });
    }
  }
});

// NON-VIZ 2: Chemical inventory tracker
// In-memory log of applications (in addition to existing records).
const _applicationLog = [];

router.get('/chemical-inventory', async (req, res) => {
  try {
    const products = await req.prisma.product.findMany({
      where: { OR: [{ category: { contains: 'Chemical', mode: 'insensitive' } }, { activeIngredient: { not: null } }, { epaNumber: { not: null } }] },
      orderBy: { name: 'asc' },
      take: 100,
    });
    const inventory = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      activeIngredient: p.activeIngredient,
      epaNumber: p.epaNumber,
      unitOfMeasure: p.unitOfMeasure,
      inStock: p.inStock,
      reorderLevel: p.reorderLevel,
      isRestricted: p.isRestricted,
      low: p.inStock <= p.reorderLevel,
    }));
    const lowStock = inventory.filter(i => i.low);
    res.json({
      inventory,
      lowStockAlerts: lowStock,
      applicationLog: _applicationLog.slice(-50).reverse(),
      total: inventory.length,
    });
  } catch (err) {
    console.error('chemical-inventory GET error', err);
    res.status(500).json({ error: 'Failed to load chemical inventory', detail: err.message });
  }
});

router.post('/chemical-inventory', async (req, res) => {
  try {
    const { productId, quantity, areasTreated, notes, technicianName } = req.body || {};
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'productId and quantity are required' });
    }
    const product = await req.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const remaining = Math.max(0, (product.inStock || 0) - Number(quantity));
    // best-effort persistent decrement (skip on failure to keep endpoint resilient)
    try {
      await req.prisma.product.update({
        where: { id: productId },
        data: { inStock: remaining },
      });
    } catch (e) {
      console.warn('inStock update skipped:', e.message);
    }

    const entry = {
      id: 'app_' + Date.now(),
      productId,
      productName: product.name,
      epaNumber: product.epaNumber,
      quantity: Number(quantity),
      unit: product.unitOfMeasure,
      remaining,
      reorderLevel: product.reorderLevel,
      lowStock: remaining <= product.reorderLevel,
      areasTreated: Array.isArray(areasTreated) ? areasTreated : (areasTreated ? [areasTreated] : []),
      notes: notes || '',
      technicianName: technicianName || 'Unknown',
      appliedAt: new Date().toISOString(),
    };
    _applicationLog.push(entry);

    res.json({
      success: true,
      entry,
      alert: entry.lowStock ? `Stock low for ${product.name} (${remaining} ${product.unitOfMeasure} remaining)` : null,
    });
  } catch (err) {
    console.error('chemical-inventory POST error', err);
    res.status(500).json({ error: 'Failed to record application', detail: err.message });
  }
});

module.exports = router;
