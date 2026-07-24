const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const evidenceRoutes = require('./routes/evidence');

const EXPECTED_MIGRATION = '202607240000_openrouter_evidence';

function createApp({ prisma }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));
  const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
  app.use(cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Origin is not allowed'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-signature-timestamp', 'x-signature-hmac'],
  }));
  app.use(express.json({ limit: '1mb', verify: (req, _res, buffer) => { req.rawBody = buffer.toString('utf8'); } }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use((req, res, next) => {
    req.prisma = prisma;
    res.setHeader('x-request-id', req.headers['x-request-id'] || randomUUID());
    next();
  });
  app.use('/api', rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/auth', authRoutes);
  app.use('/api/evidence', evidenceRoutes);
  app.use('/api/runtime-ai', require('./routes/runtimeAi'));
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const migration = await prisma.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1');
      if (migration[0]?.migration_name !== EXPECTED_MIGRATION) return res.status(503).json({ status: 'not-ready', reason: 'migration-mismatch' });
      return res.json({ status: 'ready', migration: EXPECTED_MIGRATION });
    } catch (error) {
      return res.status(503).json({ status: 'not-ready', reason: 'database-unavailable' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unsupported API route' }));
  const frontendDirectory = process.env.FRONTEND_DIST_DIR || path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDirectory)) {
    app.use(express.static(frontendDirectory, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(frontendDirectory, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
    if (error.status === 403) return res.status(403).json({ error: 'Origin is not allowed' });
    console.error('Unhandled request error', error);
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { EXPECTED_MIGRATION, createApp };
