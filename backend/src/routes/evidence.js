const { createHmac, timingSafeEqual } = require('node:crypto');
const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { appendAudit, verifyAuditChain } = require('../evidence/audit');
const { asEvidenceError, EvidenceError } = require('../evidence/errors');
const { requireSha256 } = require('../evidence/hash');
const { safeConnectorUrl } = require('../evidence/http');
const {
  addEvidenceVersion, createEvidenceDraft, decideDisposition, grantOrderAccess, listOrderEvidence,
  placeLegalHold, queueFiling, queueOcr, releaseLegalHold, requestDisposition, requestEvidenceExport,
  requestSignature, revokeOrderAccess, reviewEvidence,
} = require('../evidence/service');
const { applySignatureEvent, retryOperation } = require('../evidence/worker');

const router = express.Router();
const accessLevels = new Set(['READ', 'CONTRIBUTE', 'REVIEW', 'ADMINISTER']);
const documentKinds = new Set(['SERVICE_REPORT', 'TREATMENT_PLAN', 'INSPECTION_REPORT', 'SAFETY_DATA_SHEET', 'LICENSE', 'CONTRACT', 'EXPORT_MANIFEST']);
const connectorKinds = new Set(['OCR', 'ESIGN', 'FILING', 'STORAGE', 'TEMPLATE']);

function route(handler) {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      const known = asEvidenceError(error);
      if (known.status >= 500) console.error(`[evidence:${known.code}]`, error);
      res.status(known.status).json({ error: known.code, message: known.message });
    }
  };
}

function actor(req) {
  return { id: req.user.id, role: req.user.role };
}

router.post('/webhooks/signature/:connectorId', route(async (req, res) => {
  const connector = await req.prisma.externalConnector.findUnique({ where: { id: req.params.connectorId } });
  if (!connector?.enabled || connector.kind !== 'ESIGN' || !connector.webhookSecretRef) throw new EvidenceError('CONNECTOR_NOT_FOUND', 'Signature connector was not found', 404);
  const secret = process.env[connector.webhookSecretRef];
  if (!secret) throw new EvidenceError('WEBHOOK_SECRET_MISSING', 'Signature webhook secret is not configured', 503);
  const timestamp = Number(req.headers['x-signature-timestamp']);
  const supplied = String(req.headers['x-signature-hmac'] || '');
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp * 1000) > 5 * 60_000) throw new EvidenceError('WEBHOOK_TIMESTAMP_INVALID', 'Webhook timestamp is outside the five-minute window', 401);
  const expected = createHmac('sha256', secret).update(`${timestamp}.${req.rawBody || ''}`).digest('hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  let suppliedBytes;
  try { suppliedBytes = Buffer.from(supplied, 'hex'); } catch { suppliedBytes = Buffer.alloc(0); }
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) throw new EvidenceError('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid', 401);
  const updated = await applySignatureEvent(req.prisma, { connectorId: connector.id, ...req.body });
  res.json(updated);
}));

router.use(authMiddleware);

router.get('/orders/:orderId', route(async (req, res) => {
  res.json(await listOrderEvidence(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId }));
}));

router.post('/orders/:orderId/access', route(async (req, res) => {
  if (!accessLevels.has(req.body.accessLevel)) throw new EvidenceError('VALIDATION_ERROR', 'accessLevel is invalid');
  const grant = await grantOrderAccess(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId, ...req.body });
  res.status(201).json(grant);
}));

router.delete('/orders/:orderId/access/:userId', route(async (req, res) => {
  res.json(await revokeOrderAccess(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId, userId: req.params.userId, reason: req.body.reason }));
}));

router.post('/orders/:orderId/documents', route(async (req, res) => {
  if (!documentKinds.has(req.body.kind)) throw new EvidenceError('VALIDATION_ERROR', 'kind is invalid');
  const document = await createEvidenceDraft(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId, ...req.body });
  res.status(201).json(document);
}));

router.post('/documents/:documentId/versions', route(async (req, res) => {
  const version = await addEvidenceVersion(req.prisma, { actor: actor(req), documentId: req.params.documentId, ...req.body });
  res.status(201).json(version);
}));

router.post('/documents/:documentId/reviews', route(async (req, res) => {
  if (!['APPROVED', 'REJECTED'].includes(req.body.decision)) throw new EvidenceError('VALIDATION_ERROR', 'decision is invalid');
  const review = await reviewEvidence(req.prisma, { actor: actor(req), documentId: req.params.documentId, ...req.body });
  res.status(201).json(review);
}));

router.post('/documents/:documentId/ocr', route(async (req, res) => {
  res.status(202).json(await queueOcr(req.prisma, { actor: actor(req), documentId: req.params.documentId, ...req.body }));
}));

router.post('/documents/:documentId/signatures', route(async (req, res) => {
  res.status(202).json(await requestSignature(req.prisma, { actor: actor(req), documentId: req.params.documentId, ...req.body }));
}));

router.post('/documents/:documentId/file', route(async (req, res) => {
  res.status(202).json(await queueFiling(req.prisma, { actor: actor(req), documentId: req.params.documentId, ...req.body }));
}));

router.post('/orders/:orderId/holds', route(async (req, res) => {
  res.status(201).json(await placeLegalHold(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId, ...req.body }));
}));

router.post('/holds/:holdId/release', route(async (req, res) => {
  res.json(await releaseLegalHold(req.prisma, { actor: actor(req), holdId: req.params.holdId, reason: req.body.reason }));
}));

router.post('/orders/:orderId/exports', route(async (req, res) => {
  res.status(202).json(await requestEvidenceExport(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId, ...req.body }));
}));

router.post('/documents/:documentId/dispositions', route(async (req, res) => {
  res.status(201).json(await requestDisposition(req.prisma, { actor: actor(req), documentId: req.params.documentId, reason: req.body.reason }));
}));

router.post('/dispositions/:dispositionId/review', route(async (req, res) => {
  res.json(await decideDisposition(req.prisma, { actor: actor(req), dispositionId: req.params.dispositionId, approve: req.body.approve === true, reason: req.body.reason, connectorId: req.body.connectorId }));
}));

router.post('/operations/:operationId/retry', route(async (req, res) => {
  res.json(await retryOperation(req.prisma, { actor: actor(req), operationId: req.params.operationId, reason: req.body.reason }));
}));

router.get('/orders/:orderId/audit/verify', route(async (req, res) => {
  await listOrderEvidence(req.prisma, { actor: actor(req), serviceOrderId: req.params.orderId });
  res.json({ valid: await verifyAuditChain(req.prisma, req.params.orderId) });
}));

router.post('/admin/connectors', roleMiddleware('ADMIN'), route(async (req, res) => {
  if (!connectorKinds.has(req.body.kind)) throw new EvidenceError('VALIDATION_ERROR', 'kind is invalid');
  if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(String(req.body.credentialRef || ''))) throw new EvidenceError('VALIDATION_ERROR', 'credentialRef must be an environment secret reference');
  if (req.body.webhookSecretRef && !/^[A-Z][A-Z0-9_]{2,127}$/.test(req.body.webhookSecretRef)) throw new EvidenceError('VALIDATION_ERROR', 'webhookSecretRef must be an environment secret reference');
  await safeConnectorUrl(req.body.baseUrl);
  const serviceUser = await req.prisma.user.findUnique({ where: { id: req.body.serviceUserId } });
  if (!serviceUser?.isActive) throw new EvidenceError('SERVICE_USER_REQUIRED', 'Connector requires an active service user');
  const connector = await req.prisma.externalConnector.create({
    data: {
      kind: req.body.kind, provider: String(req.body.provider || '').trim(), baseUrl: req.body.baseUrl,
      credentialRef: req.body.credentialRef, webhookSecretRef: req.body.webhookSecretRef || null, serviceUserId: req.body.serviceUserId,
    },
  });
  res.status(201).json(connector);
}));

router.post('/admin/templates', roleMiddleware('ADMIN'), route(async (req, res) => {
  if (!documentKinds.has(req.body.kind)) throw new EvidenceError('VALIDATION_ERROR', 'kind is invalid');
  requireSha256(req.body.contentHash);
  const effectiveFrom = new Date(req.body.effectiveFrom);
  const effectiveTo = req.body.effectiveTo ? new Date(req.body.effectiveTo) : null;
  const approvedAt = new Date(req.body.approvedAt);
  const name = String(req.body.name || '').trim();
  const jurisdiction = String(req.body.jurisdiction || '').trim().toUpperCase();
  const sourceSystem = String(req.body.sourceSystem || '').trim();
  const externalId = String(req.body.externalId || '').trim();
  const versionName = String(req.body.version || '').trim();
  const storageProvider = String(req.body.storageProvider || '').trim();
  const storageObjectKey = String(req.body.storageObjectKey || '').trim();
  if (!name || !jurisdiction || !sourceSystem || !externalId || !versionName || !storageProvider || !storageObjectKey) throw new EvidenceError('VALIDATION_ERROR', 'Template identity, jurisdiction, version, and storage fields are required');
  if (Number.isNaN(approvedAt.getTime()) || Number.isNaN(effectiveFrom.getTime()) || (effectiveTo && (Number.isNaN(effectiveTo.getTime()) || effectiveTo <= effectiveFrom))) throw new EvidenceError('VALIDATION_ERROR', 'Template approval and effective dates are invalid');
  const template = await req.prisma.authoritativeTemplate.upsert({
    where: { sourceSystem_externalId: { sourceSystem, externalId } },
    create: { name, kind: req.body.kind, jurisdiction, sourceSystem, externalId },
    update: { name, active: true },
  });
  const version = await req.prisma.authoritativeTemplateVersion.create({
    data: {
      templateId: template.id, version: versionName, contentHash: req.body.contentHash.toLowerCase(),
      storageProvider, storageObjectKey,
      effectiveFrom, effectiveTo, approvedAt, provenance: req.body.provenance || {},
    },
  });
  res.status(201).json(version);
}));

router.post('/admin/retention-policies', roleMiddleware('ADMIN'), route(async (req, res) => {
  if (!documentKinds.has(req.body.documentKind) || !Number.isInteger(req.body.retainDays) || req.body.retainDays < 0) throw new EvidenceError('VALIDATION_ERROR', 'Retention policy is invalid');
  const policy = await req.prisma.retentionPolicy.create({
    data: { name: req.body.name, jurisdiction: String(req.body.jurisdiction).toUpperCase(), documentKind: req.body.documentKind, retainDays: req.body.retainDays, dispositionReviewDays: req.body.dispositionReviewDays || 30 },
  });
  res.status(201).json(policy);
}));

module.exports = router;
