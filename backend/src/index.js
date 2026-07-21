require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('./app');
const { jwtSecret } = require('./middleware/auth');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.CORS_ALLOWED_ORIGINS) throw new Error('CORS_ALLOWED_ORIGINS is required');
jwtSecret();

const prisma = new PrismaClient();
const app = createApp({ prisma });
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
const server = app.listen(port, host, () => console.log(`Evidence API listening on ${host}:${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
