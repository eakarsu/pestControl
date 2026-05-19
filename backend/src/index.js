require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const propertyRoutes = require('./routes/properties');
const contractRoutes = require('./routes/contracts');
const invoiceRoutes = require('./routes/invoices');
const serviceRoutes = require('./routes/services');
const serviceOrderRoutes = require('./routes/serviceOrders');
const productRoutes = require('./routes/products');
const technicianRoutes = require('./routes/technicians');
const scheduleRoutes = require('./routes/schedules');
const territoryRoutes = require('./routes/territories');
const routeRoutes = require('./routes/routes');
const complianceRoutes = require('./routes/compliance');
const leadRoutes = require('./routes/leads');
const quoteRoutes = require('./routes/quotes');
const inspectionRoutes = require('./routes/inspections');
const pestRoutes = require('./routes/pests');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const configRoutes = require('./routes/config');

const prisma = new PrismaClient();
const app = express();

// Security: Helmet headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Disable CSP for dev (frontend proxy)
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/pests', pestRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ai-extras', require('./routes/aiExtras'));
app.use('/api/custom-views', require('./routes/customViews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

app.use('/api', require('./routes/gap-features')); // === Batch 11 Gaps & Frontend Mounts ===

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
