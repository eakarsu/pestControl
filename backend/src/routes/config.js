const express = require('express');
const router = express.Router();

// All enum values from Prisma schema - exposed as dropdown options
const ENUMS = {
  customerTypes: [
    { value: 'RESIDENTIAL', label: 'Residential' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'INDUSTRIAL', label: 'Industrial' }
  ],
  customerStatuses: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'PROSPECT', label: 'Prospect' }
  ],
  propertyTypes: [
    { value: 'SINGLE_FAMILY', label: 'Single Family' },
    { value: 'MULTI_FAMILY', label: 'Multi Family' },
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'CONDO', label: 'Condo' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'OTHER', label: 'Other' }
  ],
  severities: [
    { value: 'LOW', label: 'Low' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'HIGH', label: 'High' },
    { value: 'SEVERE', label: 'Severe' }
  ],
  issueStatuses: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'MONITORING', label: 'Monitoring' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'RECURRING', label: 'Recurring' }
  ],
  contractTypes: [
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'RECURRING', label: 'Recurring' },
    { value: 'ANNUAL', label: 'Annual' }
  ],
  billingFrequencies: [
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'ANNUALLY', label: 'Annually' }
  ],
  contractStatuses: [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'SUSPENDED', label: 'Suspended' }
  ],
  invoiceStatuses: [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ],
  paymentMethods: [
    { value: 'CASH', label: 'Cash' },
    { value: 'CHECK', label: 'Check' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'ACH', label: 'ACH' },
    { value: 'OTHER', label: 'Other' }
  ],
  serviceCategories: [
    { value: 'GENERAL', label: 'General' },
    { value: 'TERMITE', label: 'Termite' },
    { value: 'RODENT', label: 'Rodent' },
    { value: 'MOSQUITO', label: 'Mosquito' },
    { value: 'BED_BUG', label: 'Bed Bug' },
    { value: 'WILDLIFE', label: 'Wildlife' },
    { value: 'FUMIGATION', label: 'Fumigation' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'PREVENTION', label: 'Prevention' }
  ],
  serviceStatuses: [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RESCHEDULED', label: 'Rescheduled' },
    { value: 'NO_SHOW', label: 'No Show' }
  ],
  serviceOrderStatuses: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'EN_ROUTE', label: 'En Route' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RESCHEDULED', label: 'Rescheduled' }
  ],
  priorities: [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ],
  timeEntryStatuses: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' }
  ],
  routeStatuses: [
    { value: 'PLANNED', label: 'Planned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ],
  licenseTypes: [
    { value: 'BUSINESS', label: 'Business License' },
    { value: 'PESTICIDE_APPLICATOR', label: 'Pesticide Applicator' },
    { value: 'RESTRICTED_USE', label: 'Restricted Use' },
    { value: 'OPERATOR', label: 'Operator' },
    { value: 'COMMERCIAL', label: 'Commercial' }
  ],
  licenseStatuses: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'PENDING_RENEWAL', label: 'Pending Renewal' }
  ],
  leadSources: [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'ADVERTISING', label: 'Advertising' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'OTHER', label: 'Other' }
  ],
  leadStatuses: [
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'INSPECTION_SCHEDULED', label: 'Inspection Scheduled' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'WON', label: 'Won' },
    { value: 'LOST', label: 'Lost' }
  ],
  inspectionStatuses: [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ],
  inspectionTypes: [
    { value: 'INITIAL', label: 'Initial Inspection' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'COMPLAINT', label: 'Complaint' },
    { value: 'TERMITE', label: 'Termite Inspection' },
    { value: 'WDO', label: 'WDO Report' }
  ],
  quoteStatuses: [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'VIEWED', label: 'Viewed' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired' }
  ],
  followUpTypes: [
    { value: 'CALL', label: 'Phone Call' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'TEXT', label: 'Text Message' },
    { value: 'VISIT', label: 'In-Person Visit' },
    { value: 'SERVICE_REMINDER', label: 'Service Reminder' },
    { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
    { value: 'SATISFACTION_SURVEY', label: 'Satisfaction Survey' }
  ],
  followUpStatuses: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'RESCHEDULED', label: 'Rescheduled' }
  ],
  communicationTypes: [
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'SMS', label: 'SMS' },
    { value: 'CHAT', label: 'Chat' }
  ],
  userRoles: [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'SALES', label: 'Sales' },
    { value: 'RECEPTIONIST', label: 'Receptionist' }
  ]
};

// Get all enum values (for initial page load)
router.get('/enums', (req, res) => {
  res.json(ENUMS);
});

// Get specific enum
router.get('/enums/:name', (req, res) => {
  const { name } = req.params;
  if (ENUMS[name]) {
    res.json(ENUMS[name]);
  } else {
    res.status(404).json({ error: `Enum ${name} not found` });
  }
});

// Get all custom configurations
router.get('/custom', async (req, res) => {
  try {
    const prisma = req.prisma;
    const configs = await prisma.configuration.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    });

    // Group by category
    const grouped = configs.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push({
        value: config.value,
        label: config.label,
        isDefault: config.isDefault,
        metadata: config.metadata
      });
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get configurations by category
router.get('/custom/:category', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { category } = req.params;

    const configs = await prisma.configuration.findMany({
      where: {
        category: category.toUpperCase(),
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json(configs.map(c => ({
      value: c.value,
      label: c.label,
      isDefault: c.isDefault,
      metadata: c.metadata
    })));
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Create new configuration option
router.post('/custom', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { category, value, label, sortOrder, isDefault, metadata } = req.body;

    const config = await prisma.configuration.create({
      data: {
        category: category.toUpperCase(),
        value,
        label,
        sortOrder: sortOrder || 0,
        isDefault: isDefault || false,
        metadata
      }
    });

    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating configuration:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

// Update configuration option
router.put('/custom/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { id } = req.params;
    const { label, sortOrder, isActive, isDefault, metadata } = req.body;

    const config = await prisma.configuration.update({
      where: { id },
      data: { label, sortOrder, isActive, isDefault, metadata }
    });

    res.json(config);
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete configuration option (soft delete)
router.delete('/custom/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { id } = req.params;

    await prisma.configuration.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Configuration deleted' });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Get all dropdown data (enums + custom configs merged)
router.get('/dropdowns', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Get custom configurations
    const configs = await prisma.configuration.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    });

    // Group custom configs by category
    const customConfigs = configs.reduce((acc, config) => {
      const key = config.category.toLowerCase().replace(/_/g, '') + 's';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        value: config.value,
        label: config.label,
        isDefault: config.isDefault
      });
      return acc;
    }, {});

    // Merge with enums (custom configs override enums)
    const dropdowns = { ...ENUMS, ...customConfigs };

    res.json(dropdowns);
  } catch (error) {
    console.error('Error fetching dropdowns:', error);
    res.status(500).json({ error: 'Failed to fetch dropdowns' });
  }
});

module.exports = router;
