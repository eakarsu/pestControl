const { sha256 } = require('./hash');

const GENESIS = '0'.repeat(64);

async function appendAudit(tx, input) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', input.serviceOrderId);
  const last = await tx.evidenceAuditEvent.findFirst({
    where: { serviceOrderId: input.serviceOrderId },
    orderBy: { sequence: 'desc' },
  });
  const sequence = (last?.sequence || 0) + 1;
  const previousHash = last?.eventHash || GENESIS;
  const eventHash = sha256({
    serviceOrderId: input.serviceOrderId,
    entityType: input.entityType,
    entityId: input.entityId,
    sequence,
    actorId: input.actorId,
    action: input.action,
    payload: input.payload,
    previousHash,
  });
  return tx.evidenceAuditEvent.create({ data: { ...input, sequence, previousHash, eventHash } });
}

async function verifyAuditChain(prisma, serviceOrderId) {
  const events = await prisma.evidenceAuditEvent.findMany({ where: { serviceOrderId }, orderBy: { sequence: 'asc' } });
  let previousHash = GENESIS;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.sequence !== index + 1 || event.previousHash !== previousHash) return false;
    const expected = sha256({
      serviceOrderId: event.serviceOrderId,
      entityType: event.entityType,
      entityId: event.entityId,
      sequence: event.sequence,
      actorId: event.actorId,
      action: event.action,
      payload: event.payload,
      previousHash: event.previousHash,
    });
    if (expected !== event.eventHash) return false;
    previousHash = event.eventHash;
  }
  return true;
}

module.exports = { appendAudit, verifyAuditChain };
