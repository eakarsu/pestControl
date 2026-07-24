require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function operatorName() {
  const fullName = String(process.env.PROVISION_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || '').trim();
  const [firstName = 'Runtime', ...lastParts] = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: String(process.env.PROVISION_ADMIN_FIRST_NAME || firstName).trim(),
    lastName: String(process.env.PROVISION_ADMIN_LAST_NAME || lastParts.join(' ') || 'Administrator').trim(),
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = required('PROVISION_ADMIN_EMAIL').toLowerCase();
    const password = required('PROVISION_ADMIN_PASSWORD');
    if (password.length < 14) throw new Error('PROVISION_ADMIN_PASSWORD must contain at least 14 characters');
    const { firstName, lastName } = operatorName();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, password: passwordHash, firstName, lastName, role: 'ADMIN', isActive: true },
      update: { password: passwordHash, firstName, lastName, role: 'ADMIN', isActive: true, authVersion: { increment: 1 } },
      select: { id: true, email: true, role: true },
    });
    console.log(`Provisioned ${user.role} ${user.email} (${user.id})`);
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
