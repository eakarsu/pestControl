require('dotenv').config();
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { processOneOperation } = require('../src/evidence/worker');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient();
const once = process.argv.includes('--once');
const workerId = process.env.WORKER_ID || `evidence-worker:${randomUUID()}`;
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

async function main() {
  do {
    const result = await processOneOperation(prisma, workerId);
    if (once) break;
    if (result === 'idle') await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (!stopping);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Evidence worker failed', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
