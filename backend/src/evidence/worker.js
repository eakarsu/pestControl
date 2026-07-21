const { appendAudit } = require('./audit');
const { EvidenceError, asEvidenceError } = require('./errors');
const { requireSha256, sha256 } = require('./hash');
const { deliver } = require('./http');

async function claimOperation(prisma, workerId, leaseMs = 60_000) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe(`
      SELECT id FROM external_operations
      WHERE status IN ('QUEUED', 'RETRY')
        AND "nextAttemptAt" <= NOW()
        AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
      ORDER BY "nextAttemptAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    if (!rows.length) return null;
    const leaseExpiresAt = new Date(Date.now() + leaseMs);
    await tx.externalOperation.update({ where: { id: rows[0].id }, data: { status: 'PROCESSING', leaseOwner: workerId, leaseExpiresAt } });
    return tx.externalOperation.findUnique({ where: { id: rows[0].id }, include: { connector: true, document: true, version: true } });
  });
}

async function operationServiceOrder(tx, operation) {
  if (operation.documentId) {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: operation.documentId }, select: { serviceOrderId: true } });
    return document?.serviceOrderId || null;
  }
  return operation.payload.serviceOrderId || null;
}

async function applySuccess(tx, operation, result, workerId) {
  const current = await tx.externalOperation.findUnique({ where: { id: operation.id } });
  if (!current || current.leaseOwner !== workerId || current.status !== 'PROCESSING') {
    throw new EvidenceError('STALE_LEASE', 'Operation lease is no longer owned by this worker', 409);
  }
  if (operation.type === 'OCR_EXTRACT') {
    const ocrTextHash = requireSha256(result.output?.ocrTextHash, 'ocrTextHash');
    await tx.serviceEvidenceVersion.update({ where: { id: operation.versionId }, data: { ocrStatus: 'COMPLETED', ocrTextHash } });
  } else if (operation.type === 'ESIGN_SEND') {
    const externalId = String(result.output?.externalId || '').trim();
    if (!externalId) throw new EvidenceError('ESIGN_EXTERNAL_ID_MISSING', 'E-sign provider did not return an envelope ID', 502, true);
    await tx.signatureEnvelope.update({
      where: { id: operation.payload.envelopeId }, data: { externalId, status: 'SENT', sentAt: new Date(), failureCode: null, failureMessage: null },
    });
  } else if (operation.type === 'STORE_EXPORT') {
    const storageObjectKey = String(result.output?.storageObjectKey || '').trim();
    if (!storageObjectKey) throw new EvidenceError('EXPORT_STORAGE_KEY_MISSING', 'Storage provider did not return an object key', 502, true);
    await tx.evidenceExport.update({
      where: { id: operation.payload.exportId },
      data: { status: 'COMPLETED', storageProvider: operation.connector.provider, storageObjectKey, providerReceipt: String(result.receipt), completedAt: new Date() },
    });
  } else if (operation.type === 'DELETE_OBJECT') {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: operation.documentId } });
    const hold = await tx.legalHold.findFirst({ where: { serviceOrderId: document.serviceOrderId, status: 'ACTIVE', OR: [{ documentId: null }, { documentId: document.id }] } });
    if (hold) throw new EvidenceError('LEGAL_HOLD_ACTIVE', 'A legal hold blocks storage deletion', 409);
    await tx.serviceEvidenceDocument.update({ where: { id: document.id }, data: { status: 'DISPOSED' } });
    await tx.evidenceDisposition.update({ where: { id: operation.payload.dispositionId }, data: { status: 'COMPLETED', completedAt: new Date() } });
  } else if (operation.type === 'FILE_RECORD') {
    await tx.serviceEvidenceDocument.update({ where: { id: operation.documentId }, data: { status: 'FILED' } });
  }
  const updated = await tx.externalOperation.updateMany({
    where: { id: operation.id, leaseOwner: workerId, status: 'PROCESSING' },
    data: { status: 'COMPLETED', attempts: { increment: 1 }, providerReceipt: String(result.receipt), completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null, lastErrorMessage: null },
  });
  if (updated.count !== 1) throw new EvidenceError('STALE_LEASE', 'Operation completion lost its lease', 409);
  const serviceOrderId = await operationServiceOrder(tx, operation);
  if (serviceOrderId) {
    await appendAudit(tx, {
      serviceOrderId, entityType: 'EXTERNAL_OPERATION', entityId: operation.id,
      actorId: operation.connector.serviceUserId, action: `${operation.type}_COMPLETED`, payload: { receipt: String(result.receipt), attempt: current.attempts + 1 },
    });
  }
}

async function applyFailure(prisma, operation, workerId, error) {
  const known = asEvidenceError(error);
  return prisma.$transaction(async (tx) => {
    const current = await tx.externalOperation.findUnique({ where: { id: operation.id } });
    if (!current || current.leaseOwner !== workerId || current.status !== 'PROCESSING') return 'stale';
    const attempts = current.attempts + 1;
    const dead = !known.retryable || attempts >= current.maxAttempts;
    await tx.externalOperation.update({
      where: { id: operation.id },
      data: {
        status: dead ? 'DEAD_LETTER' : 'RETRY', attempts, leaseOwner: null, leaseExpiresAt: null,
        nextAttemptAt: new Date(Date.now() + Math.min(60 * 60_000, (2 ** attempts) * 1000)),
        lastErrorCode: known.code, lastErrorMessage: known.message,
      },
    });
    if (operation.type === 'OCR_EXTRACT') {
      await tx.serviceEvidenceVersion.update({ where: { id: operation.versionId }, data: { ocrStatus: dead ? 'FAILED' : 'QUEUED' } });
    }
    if (operation.type === 'ESIGN_SEND' && dead) {
      await tx.signatureEnvelope.update({ where: { id: operation.payload.envelopeId }, data: { status: 'FAILED', failureCode: known.code, failureMessage: known.message } });
      await tx.serviceEvidenceDocument.update({ where: { id: operation.documentId }, data: { status: 'APPROVED' } });
    }
    if (operation.type === 'DELETE_OBJECT' && dead) {
      await tx.evidenceDisposition.update({ where: { id: operation.payload.dispositionId }, data: { status: 'FAILED' } });
    }
    const serviceOrderId = await operationServiceOrder(tx, operation);
    if (serviceOrderId) {
      await appendAudit(tx, {
        serviceOrderId, entityType: 'EXTERNAL_OPERATION', entityId: operation.id,
        actorId: operation.connector.serviceUserId, action: dead ? `${operation.type}_DEAD_LETTERED` : `${operation.type}_RETRY_SCHEDULED`,
        payload: { code: known.code, attempt: attempts },
      });
    }
    return dead ? 'dead-letter' : 'retry';
  });
}

async function processOneOperation(prisma, workerId, provider = deliver) {
  const operation = await claimOperation(prisma, workerId);
  if (!operation) return 'idle';
  try {
    if (sha256(operation.payload) !== operation.payloadHash) throw new EvidenceError('PAYLOAD_TAMPERED', 'Queued operation payload hash does not match', 409);
    const result = await provider(operation.connector, operation);
    await prisma.$transaction((tx) => applySuccess(tx, operation, result, workerId));
    return 'completed';
  } catch (error) {
    return applyFailure(prisma, operation, workerId, error);
  }
}

async function retryOperation(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const operation = await tx.externalOperation.findUnique({ where: { id: input.operationId }, include: { document: true } });
    if (!operation || operation.status !== 'DEAD_LETTER') throw new EvidenceError('OPERATION_NOT_REPAIRABLE', 'Only dead-letter operations can be repaired', 409);
    const serviceOrderId = operation.document?.serviceOrderId || operation.payload.serviceOrderId;
    await require('./access').requireOrderAccess(tx, input.actor, serviceOrderId, 'ADMINISTER', Boolean(operation.document?.privileged));
    const updated = await tx.externalOperation.update({
      where: { id: operation.id }, data: { status: 'QUEUED', attempts: 0, nextAttemptAt: new Date(), lastErrorCode: null, lastErrorMessage: `Repair: ${String(input.reason || '').trim()}` },
    });
    await appendAudit(tx, { serviceOrderId, entityType: 'EXTERNAL_OPERATION', entityId: operation.id, actorId: input.actor.id, action: 'DEAD_LETTER_REPAIRED', payload: { reason: String(input.reason || '').trim() } });
    return updated;
  });
}

async function applySignatureEvent(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const envelope = await tx.signatureEnvelope.findUnique({ where: { externalId: input.externalId }, include: { document: true, connector: true } });
    if (!envelope || envelope.connectorId !== input.connectorId) throw new EvidenceError('ENVELOPE_NOT_FOUND', 'Signature envelope was not found', 404);
    const map = { signed: 'SIGNED', declined: 'DECLINED', failed: 'FAILED', voided: 'VOIDED' };
    const status = map[String(input.status || '').toLowerCase()];
    if (!status) throw new EvidenceError('INVALID_SIGNATURE_STATUS', 'Signature status is not supported');
    if (envelope.status === status) return envelope;
    if (['SIGNED', 'DECLINED', 'VOIDED'].includes(envelope.status)) throw new EvidenceError('SIGNATURE_TERMINAL', 'A terminal signature state cannot be changed', 409);
    const updated = await tx.signatureEnvelope.update({
      where: { id: envelope.id },
      data: {
        status,
        signedAt: status === 'SIGNED' ? new Date(input.occurredAt) : null,
        failureCode: status === 'FAILED' || status === 'DECLINED' ? String(input.failureCode || status) : null,
        failureMessage: status === 'FAILED' || status === 'DECLINED' ? String(input.failureMessage || 'Signature did not complete') : null,
      },
    });
    await tx.serviceEvidenceDocument.update({ where: { id: envelope.documentId }, data: { status: status === 'SIGNED' ? 'SIGNED' : 'APPROVED' } });
    await appendAudit(tx, {
      serviceOrderId: envelope.document.serviceOrderId, entityType: 'SIGNATURE_ENVELOPE', entityId: envelope.id,
      actorId: envelope.connector.serviceUserId, action: `SIGNATURE_${status}`, payload: { externalId: input.externalId, occurredAt: input.occurredAt, failureCode: updated.failureCode },
    });
    return updated;
  });
}

module.exports = { applySignatureEvent, claimOperation, processOneOperation, retryOperation };
