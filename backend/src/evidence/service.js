const { appendAudit } = require('./audit');
const { requireOrderAccess, orderAccess } = require('./access');
const { EvidenceError } = require('./errors');
const { normalizeJurisdiction, requireSha256, sha256 } = require('./hash');

const documentInclude = {
  versions: { orderBy: { version: 'desc' } },
  reviews: { orderBy: { createdAt: 'desc' } },
  legalHolds: { where: { status: 'ACTIVE' } },
  signatureEnvelopes: { orderBy: { createdAt: 'desc' } },
};

function requireText(value, field, max = 500) {
  const result = String(value || '').trim();
  if (!result || result.length > max) throw new EvidenceError('VALIDATION_ERROR', `${field} is required and must be at most ${max} characters`);
  return result;
}

function parseDate(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new EvidenceError('VALIDATION_ERROR', `${field} must be a valid date`);
  return date;
}

function versionData(input) {
  const byteSize = Number(input.byteSize);
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > 100 * 1024 * 1024) {
    throw new EvidenceError('INVALID_BYTE_SIZE', 'byteSize must be between 1 byte and 100 MiB');
  }
  return {
    contentHash: requireSha256(input.contentHash),
    mimeType: requireText(input.mimeType, 'mimeType', 120),
    byteSize,
    storageProvider: requireText(input.storageProvider, 'storageProvider', 80),
    storageObjectKey: requireText(input.storageObjectKey, 'storageObjectKey', 1000),
    storageVersion: requireText(input.storageVersion, 'storageVersion', 200),
    sourceSystem: requireText(input.sourceSystem, 'sourceSystem', 120),
    sourceReference: requireText(input.sourceReference, 'sourceReference', 500),
  };
}

async function grantOrderAccess(prisma, input) {
  return prisma.$transaction(async (tx) => {
    await requireOrderAccess(tx, input.actor, input.serviceOrderId, 'ADMINISTER');
    if (input.userId === input.actor.id && input.actor.role !== 'ADMIN') {
      throw new EvidenceError('SELF_GRANT_FORBIDDEN', 'Non-administrators cannot grant access to themselves', 403);
    }
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, isActive: true } });
    if (!user?.isActive) throw new EvidenceError('USER_NOT_ACTIVE', 'The grantee must be an active user');
    const grant = await tx.serviceOrderAccessGrant.upsert({
      where: { serviceOrderId_userId: { serviceOrderId: input.serviceOrderId, userId: input.userId } },
      create: {
        serviceOrderId: input.serviceOrderId,
        userId: input.userId,
        accessLevel: input.accessLevel,
        privilegedAccess: Boolean(input.privilegedAccess),
        grantedById: input.actor.id,
      },
      update: {
        accessLevel: input.accessLevel,
        privilegedAccess: Boolean(input.privilegedAccess),
        grantedById: input.actor.id,
        grantedAt: new Date(),
        revokedAt: null,
        revokeReason: null,
      },
    });
    await appendAudit(tx, {
      serviceOrderId: input.serviceOrderId,
      entityType: 'ACCESS_GRANT', entityId: grant.id, actorId: input.actor.id, action: 'ACCESS_GRANTED',
      payload: { userId: input.userId, accessLevel: input.accessLevel, privilegedAccess: Boolean(input.privilegedAccess) },
    });
    return grant;
  });
}

async function revokeOrderAccess(prisma, input) {
  return prisma.$transaction(async (tx) => {
    await requireOrderAccess(tx, input.actor, input.serviceOrderId, 'ADMINISTER');
    const grant = await tx.serviceOrderAccessGrant.findUnique({
      where: { serviceOrderId_userId: { serviceOrderId: input.serviceOrderId, userId: input.userId } },
    });
    if (!grant || grant.revokedAt) throw new EvidenceError('ACCESS_GRANT_NOT_FOUND', 'An active access grant was not found', 404);
    const updated = await tx.serviceOrderAccessGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date(), revokeReason: requireText(input.reason, 'reason', 1000) },
    });
    await appendAudit(tx, {
      serviceOrderId: input.serviceOrderId,
      entityType: 'ACCESS_GRANT', entityId: grant.id, actorId: input.actor.id, action: 'ACCESS_REVOKED',
      payload: { userId: input.userId, reason: updated.revokeReason },
    });
    return updated;
  });
}

async function validateAuthoritativeTemplate(tx, input, jurisdiction, effectiveDate) {
  if (!input.templateVersionId) throw new EvidenceError('AUTHORITATIVE_TEMPLATE_REQUIRED', 'An authoritative template version is required');
  const templateVersion = await tx.authoritativeTemplateVersion.findUnique({
    where: { id: input.templateVersionId }, include: { template: true },
  });
  if (!templateVersion || !templateVersion.template.active || templateVersion.template.kind !== input.kind) {
    throw new EvidenceError('TEMPLATE_NOT_AUTHORIZED', 'The selected template is not an active authoritative source');
  }
  if (templateVersion.template.jurisdiction !== jurisdiction) {
    throw new EvidenceError('JURISDICTION_MISMATCH', 'Template jurisdiction does not match the service property');
  }
  if (templateVersion.effectiveFrom > effectiveDate || (templateVersion.effectiveTo && templateVersion.effectiveTo < effectiveDate)) {
    throw new EvidenceError('TEMPLATE_NOT_EFFECTIVE', 'Template is not effective on the document date');
  }
  return templateVersion;
}

async function validateTemplateAndProducts(tx, input, jurisdiction, effectiveDate) {
  const templateVersion = await validateAuthoritativeTemplate(tx, input, jurisdiction, effectiveDate);
  const productIds = [...new Set(input.productIds || [])];
  if (productIds.length === 0) throw new EvidenceError('PRODUCT_EVIDENCE_REQUIRED', 'Treatment plans require at least one registered product');
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw new EvidenceError('PRODUCT_NOT_FOUND', 'One or more treatment products were not found');
  const validation = [];
  for (const product of products) {
    if (!product.epaNumber) throw new EvidenceError('EPA_NUMBER_REQUIRED', `${product.name} has no EPA registration number`);
    const [registration, safetyDataSheet] = await Promise.all([
      tx.productRegistration.findFirst({
        where: { epaNumber: product.epaNumber, state: jurisdiction, status: 'ACTIVE', registrationDate: { lte: effectiveDate }, expiryDate: { gte: effectiveDate } },
        orderBy: { expiryDate: 'desc' },
      }),
      tx.safetyDataSheet.findFirst({ where: { productName: product.name, revisionDate: { lte: effectiveDate } }, orderBy: { revisionDate: 'desc' } }),
    ]);
    if (!registration) throw new EvidenceError('PRODUCT_NOT_REGISTERED', `${product.name} is not actively registered in ${jurisdiction} on the effective date`);
    if (!safetyDataSheet) throw new EvidenceError('SAFETY_DATA_MISSING', `${product.name} has no effective safety data sheet`);
    validation.push({
      productId: product.id,
      epaNumber: product.epaNumber,
      registrationId: registration.id,
      registrationExpiry: registration.expiryDate.toISOString(),
      safetyDataSheetId: safetyDataSheet.id,
      safetyRevisionDate: safetyDataSheet.revisionDate.toISOString(),
    });
  }
  return { templateVersion, productValidation: validation };
}

async function createEvidenceDraft(prisma, input) {
  return prisma.$transaction(async (tx) => {
    await requireOrderAccess(tx, input.actor, input.serviceOrderId, 'CONTRIBUTE', Boolean(input.privileged));
    const order = await tx.serviceOrder.findUnique({ where: { id: input.serviceOrderId }, include: { property: true } });
    if (!order) throw new EvidenceError('SERVICE_ORDER_NOT_FOUND', 'Service order was not found', 404);
    const jurisdiction = normalizeJurisdiction(input.jurisdiction || order.property.state);
    if (normalizeJurisdiction(order.property.state) !== jurisdiction) {
      throw new EvidenceError('JURISDICTION_MISMATCH', 'Document jurisdiction must match the service property');
    }
    const effectiveDate = parseDate(input.effectiveDate, 'effectiveDate');
    const storedVersion = versionData(input.version);
    let templateVersion = null;
    let productValidation = [];
    if (input.kind === 'TREATMENT_PLAN') {
      ({ templateVersion, productValidation } = await validateTemplateAndProducts(tx, input, jurisdiction, effectiveDate));
    } else if (input.templateVersionId) {
      templateVersion = await validateAuthoritativeTemplate(tx, input, jurisdiction, effectiveDate);
    }
    const retentionPolicy = await tx.retentionPolicy.findFirst({
      where: { jurisdiction, documentKind: input.kind, active: true }, orderBy: { updatedAt: 'desc' },
    });
    if (!retentionPolicy) throw new EvidenceError('RETENTION_POLICY_REQUIRED', 'An active retention policy is required for this jurisdiction and document kind');
    const document = await tx.serviceEvidenceDocument.create({
      data: {
        serviceOrderId: input.serviceOrderId,
        kind: input.kind,
        title: requireText(input.title, 'title', 300),
        status: 'PENDING_REVIEW',
        privileged: Boolean(input.privileged),
        jurisdiction,
        effectiveDate,
        currentVersion: 1,
        retentionPolicyId: retentionPolicy.id,
        versions: {
          create: {
            version: 1,
            ...storedVersion,
            provenance: {
              supplied: input.provenance || {},
              authoritativeTemplate: templateVersion ? {
                templateId: templateVersion.templateId, versionId: templateVersion.id,
                version: templateVersion.version, contentHash: templateVersion.contentHash,
              } : null,
              productValidation,
              capturedAt: new Date().toISOString(),
            },
            templateVersionId: templateVersion?.id,
            createdById: input.actor.id,
          },
        },
      },
      include: documentInclude,
    });
    await appendAudit(tx, {
      serviceOrderId: input.serviceOrderId,
      entityType: 'EVIDENCE_DOCUMENT', entityId: document.id, actorId: input.actor.id, action: 'DOCUMENT_CREATED',
      payload: { kind: document.kind, version: 1, contentHash: storedVersion.contentHash, jurisdiction, effectiveDate: effectiveDate.toISOString(), privileged: document.privileged },
    });
    return document;
  });
}

async function addEvidenceVersion(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId }, include: { versions: true } });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'CONTRIBUTE', document.privileged);
    if (document.status === 'DISPOSED') throw new EvidenceError('DOCUMENT_DISPOSED', 'Disposed evidence cannot be revised', 409);
    if (document.currentVersion !== Number(input.expectedVersion)) {
      throw new EvidenceError('VERSION_CONFLICT', 'The evidence document changed; reload before adding a version', 409);
    }
    const storedVersion = versionData(input.version);
    const previous = document.versions.find((version) => version.version === document.currentVersion);
    if (previous.contentHash === storedVersion.contentHash) {
      throw new EvidenceError('DUPLICATE_VERSION', 'A new version must have different content', 409);
    }
    let redactedFromVersionId = null;
    let redactionManifest = null;
    if (input.redaction) {
      if (!Array.isArray(input.redaction.fields) || input.redaction.fields.length === 0) {
        throw new EvidenceError('REDACTION_MANIFEST_REQUIRED', 'Redacted versions require a non-empty field manifest');
      }
      redactedFromVersionId = previous.id;
      redactionManifest = { fields: input.redaction.fields.map(String).sort(), reason: requireText(input.redaction.reason, 'redaction.reason', 1000) };
    }
    const next = document.currentVersion + 1;
    const created = await tx.serviceEvidenceVersion.create({
      data: {
        documentId: document.id,
        version: next,
        ...storedVersion,
        provenance: { supplied: input.provenance || {}, supersedesVersionId: previous.id, capturedAt: new Date().toISOString() },
        templateVersionId: input.templateVersionId || previous.templateVersionId,
        redactedFromVersionId,
        redactionManifest,
        createdById: input.actor.id,
      },
    });
    await tx.serviceEvidenceDocument.update({ where: { id: document.id }, data: { currentVersion: next, status: 'PENDING_REVIEW' } });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId,
      entityType: 'EVIDENCE_DOCUMENT', entityId: document.id, actorId: input.actor.id,
      action: input.redaction ? 'REDACTED_VERSION_CREATED' : 'VERSION_CREATED',
      payload: { version: next, contentHash: storedVersion.contentHash, previousVersion: document.currentVersion, redactionManifest },
    });
    return created;
  });
}

async function reviewEvidence(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({
      where: { id: input.documentId }, include: { versions: { where: { version: Number(input.version) }, include: { templateVersion: { include: { template: true } } } } },
    });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'REVIEW', document.privileged);
    const version = document.versions[0];
    if (!version || version.version !== document.currentVersion) throw new EvidenceError('STALE_REVIEW', 'Only the current version may be reviewed', 409);
    if (version.createdById === input.actor.id) throw new EvidenceError('SEPARATE_REVIEWER_REQUIRED', 'The author cannot approve their own evidence', 403);
    const jurisdictionValidated = input.jurisdictionValidated === true;
    const effectiveDateValidated = input.effectiveDateValidated === true;
    const productRegistrationChecked = input.productRegistrationChecked === true;
    const safetyDataChecked = input.safetyDataChecked === true;
    if (input.decision === 'APPROVED' && (!jurisdictionValidated || !effectiveDateValidated)) {
      throw new EvidenceError('REVIEW_CHECKS_REQUIRED', 'Jurisdiction and effective date must be validated before approval');
    }
    if (input.decision === 'APPROVED' && document.kind === 'TREATMENT_PLAN' && (!productRegistrationChecked || !safetyDataChecked)) {
      throw new EvidenceError('SAFETY_REVIEW_REQUIRED', 'Product registration and safety data must be checked before approving a treatment plan');
    }
    if (input.decision === 'APPROVED' && version.templateVersion) {
      if (version.templateVersion.template.jurisdiction !== document.jurisdiction
        || version.templateVersion.effectiveFrom > document.effectiveDate
        || (version.templateVersion.effectiveTo && version.templateVersion.effectiveTo < document.effectiveDate)) {
        throw new EvidenceError('TEMPLATE_NO_LONGER_VALID', 'The authoritative template is not valid for the document jurisdiction/effective date', 409);
      }
    }
    const review = await tx.evidenceReview.create({
      data: {
        documentId: document.id, versionId: version.id, reviewerId: input.actor.id, decision: input.decision,
        reason: requireText(input.reason, 'reason', 2000), jurisdictionValidated, effectiveDateValidated,
        productRegistrationChecked, safetyDataChecked,
      },
    });
    const status = input.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await tx.serviceEvidenceDocument.update({ where: { id: document.id }, data: { status } });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId,
      entityType: 'EVIDENCE_REVIEW', entityId: review.id, actorId: input.actor.id, action: `VERSION_${input.decision}`,
      payload: { documentId: document.id, version: version.version, reason: review.reason, jurisdictionValidated, effectiveDateValidated, productRegistrationChecked, safetyDataChecked },
    });
    return review;
  });
}

async function connectorFor(tx, kind, connectorId) {
  if (connectorId) {
    const connector = await tx.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector?.enabled || connector.kind !== kind) throw new EvidenceError('CONNECTOR_NOT_CONFIGURED', `The selected ${kind} connector is not active`, 503);
    return connector;
  }
  const connectors = await tx.externalConnector.findMany({ where: { kind, enabled: true }, take: 2, orderBy: { createdAt: 'asc' } });
  if (connectors.length === 0) throw new EvidenceError('CONNECTOR_NOT_CONFIGURED', `No active ${kind} connector is configured`, 503);
  if (connectors.length > 1) throw new EvidenceError('CONNECTOR_SELECTION_REQUIRED', `Multiple ${kind} connectors are active; connectorId is required`, 409);
  return connectors[0];
}

async function createOperation(tx, input) {
  const payloadHash = sha256(input.payload);
  return tx.externalOperation.create({
    data: {
      connectorId: input.connectorId,
      documentId: input.documentId,
      versionId: input.versionId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      payloadHash,
      maxAttempts: input.maxAttempts || 5,
    },
  });
}

async function queueOcr(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId }, include: { versions: { where: { version: Number(input.version) } } } });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'CONTRIBUTE', document.privileged);
    const version = document.versions[0];
    if (!version || version.version !== document.currentVersion) throw new EvidenceError('VERSION_CONFLICT', 'OCR can only run on the current version', 409);
    const connector = await connectorFor(tx, 'OCR', input.connectorId);
    const operation = await createOperation(tx, {
      connectorId: connector.id, documentId: document.id, versionId: version.id, type: 'OCR_EXTRACT',
      idempotencyKey: input.idempotencyKey || `ocr:${version.id}`,
      payload: { documentId: document.id, versionId: version.id, storageProvider: version.storageProvider, storageObjectKey: version.storageObjectKey, storageVersion: version.storageVersion },
    });
    await tx.serviceEvidenceVersion.update({ where: { id: version.id }, data: { ocrStatus: 'QUEUED' } });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId, entityType: 'EXTERNAL_OPERATION', entityId: operation.id,
      actorId: input.actor.id, action: 'OCR_QUEUED', payload: { documentId: document.id, version: version.version },
    });
    return operation;
  });
}

async function requestSignature(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId }, include: { versions: { where: { version: Number(input.version) } } } });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'REVIEW', document.privileged);
    const version = document.versions[0];
    if (!version || version.version !== document.currentVersion || document.status !== 'APPROVED') {
      throw new EvidenceError('APPROVED_CURRENT_VERSION_REQUIRED', 'Only the approved current version can be sent for signature', 409);
    }
    if (!Array.isArray(input.signers) || input.signers.length === 0 || input.signers.some((signer) => !signer.email || !signer.name)) {
      throw new EvidenceError('SIGNERS_REQUIRED', 'At least one signer with name and email is required');
    }
    const connector = await connectorFor(tx, 'ESIGN', input.connectorId);
    const idempotencyKey = input.idempotencyKey || `esign:${version.id}`;
    const envelope = await tx.signatureEnvelope.create({
      data: { documentId: document.id, versionId: version.id, connectorId: connector.id, idempotencyKey, signers: input.signers },
    });
    const operation = await createOperation(tx, {
      connectorId: connector.id, documentId: document.id, versionId: version.id, type: 'ESIGN_SEND', idempotencyKey,
      payload: { envelopeId: envelope.id, documentId: document.id, versionId: version.id, signers: input.signers, storageObjectKey: version.storageObjectKey },
    });
    await tx.serviceEvidenceDocument.update({ where: { id: document.id }, data: { status: 'SIGNATURE_PENDING' } });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId, entityType: 'SIGNATURE_ENVELOPE', entityId: envelope.id,
      actorId: input.actor.id, action: 'SIGNATURE_REQUESTED', payload: { version: version.version, signers: input.signers.map(({ name, email }) => ({ name, email })), operationId: operation.id },
    });
    return envelope;
  });
}

async function queueFiling(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId }, include: { versions: { where: { version: Number(input.version) } } } });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'REVIEW', document.privileged);
    const version = document.versions[0];
    if (!version || version.version !== document.currentVersion || !['APPROVED', 'SIGNED'].includes(document.status)) {
      throw new EvidenceError('REVIEWED_CURRENT_VERSION_REQUIRED', 'Only an approved or signed current version can be filed', 409);
    }
    const connector = await connectorFor(tx, 'FILING', input.connectorId);
    const operation = await createOperation(tx, {
      connectorId: connector.id, documentId: document.id, versionId: version.id, type: 'FILE_RECORD',
      idempotencyKey: input.idempotencyKey || `filing:${version.id}`,
      payload: { documentId: document.id, versionId: version.id, jurisdiction: document.jurisdiction, effectiveDate: document.effectiveDate.toISOString(), storageProvider: version.storageProvider, storageObjectKey: version.storageObjectKey, storageVersion: version.storageVersion },
    });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId, entityType: 'EXTERNAL_OPERATION', entityId: operation.id,
      actorId: input.actor.id, action: 'FILING_QUEUED', payload: { documentId: document.id, version: version.version },
    });
    return operation;
  });
}

async function placeLegalHold(prisma, input) {
  return prisma.$transaction(async (tx) => {
    await requireOrderAccess(tx, input.actor, input.serviceOrderId, 'ADMINISTER', true);
    if (input.documentId) {
      const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId } });
      if (!document || document.serviceOrderId !== input.serviceOrderId) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found in this service order', 404);
    }
    const hold = await tx.legalHold.create({
      data: {
        serviceOrderId: input.serviceOrderId, documentId: input.documentId || null,
        reason: requireText(input.reason, 'reason', 2000), reference: requireText(input.reference, 'reference', 300), placedById: input.actor.id,
      },
    });
    await appendAudit(tx, {
      serviceOrderId: input.serviceOrderId, entityType: 'LEGAL_HOLD', entityId: hold.id,
      actorId: input.actor.id, action: 'LEGAL_HOLD_PLACED', payload: { documentId: hold.documentId, reason: hold.reason, reference: hold.reference },
    });
    return hold;
  });
}

async function releaseLegalHold(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const hold = await tx.legalHold.findUnique({ where: { id: input.holdId } });
    if (!hold || hold.status !== 'ACTIVE') throw new EvidenceError('ACTIVE_HOLD_NOT_FOUND', 'An active legal hold was not found', 404);
    await requireOrderAccess(tx, input.actor, hold.serviceOrderId, 'ADMINISTER', true);
    const updated = await tx.legalHold.update({
      where: { id: hold.id }, data: { status: 'RELEASED', releasedById: input.actor.id, releasedAt: new Date(), releaseReason: requireText(input.reason, 'reason', 2000) },
    });
    await appendAudit(tx, {
      serviceOrderId: hold.serviceOrderId, entityType: 'LEGAL_HOLD', entityId: hold.id,
      actorId: input.actor.id, action: 'LEGAL_HOLD_RELEASED', payload: { reason: updated.releaseReason },
    });
    return updated;
  });
}

async function requestEvidenceExport(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const access = await orderAccess(tx, input.actor, input.serviceOrderId);
    const documents = await tx.serviceEvidenceDocument.findMany({
      where: { serviceOrderId: input.serviceOrderId, status: { not: 'DISPOSED' } },
      include: { versions: { orderBy: { version: 'asc' } }, reviews: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    if (documents.some((document) => document.privileged) && !access.privilegedAccess) {
      throw new EvidenceError('PRIVILEGED_ACCESS_REQUIRED', 'The export includes privileged evidence', 403);
    }
    const auditOkay = await require('./audit').verifyAuditChain(tx, input.serviceOrderId);
    if (!auditOkay) throw new EvidenceError('AUDIT_CHAIN_INVALID', 'The evidence audit chain failed verification', 409);
    const manifest = {
      serviceOrderId: input.serviceOrderId,
      documents: documents.map((document) => ({
        id: document.id, kind: document.kind, title: document.title, status: document.status,
        jurisdiction: document.jurisdiction, effectiveDate: document.effectiveDate.toISOString(), privileged: document.privileged,
        versions: document.versions.map((version) => ({ version: version.version, contentHash: version.contentHash, sourceSystem: version.sourceSystem, sourceReference: version.sourceReference, storageProvider: version.storageProvider, storageObjectKey: version.storageObjectKey, storageVersion: version.storageVersion })),
        reviews: document.reviews.map((review) => ({ versionId: review.versionId, reviewerId: review.reviewerId, decision: review.decision, createdAt: review.createdAt.toISOString() })),
      })),
    };
    const manifestHash = sha256(manifest);
    const connector = await connectorFor(tx, 'STORAGE', input.connectorId);
    const created = await tx.evidenceExport.create({ data: { serviceOrderId: input.serviceOrderId, requestedById: input.actor.id, manifest, manifestHash } });
    await createOperation(tx, {
      connectorId: connector.id, type: 'STORE_EXPORT', idempotencyKey: input.idempotencyKey || `export:${created.id}`,
      payload: { exportId: created.id, serviceOrderId: input.serviceOrderId, manifest, manifestHash },
    });
    await appendAudit(tx, {
      serviceOrderId: input.serviceOrderId, entityType: 'EVIDENCE_EXPORT', entityId: created.id,
      actorId: input.actor.id, action: 'EXPORT_REQUESTED', payload: { manifestHash, documentCount: documents.length },
    });
    return created;
  });
}

async function requestDisposition(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.serviceEvidenceDocument.findUnique({ where: { id: input.documentId }, include: { retentionPolicy: true, reviews: { where: { decision: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!document) throw new EvidenceError('DOCUMENT_NOT_FOUND', 'Evidence document was not found', 404);
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'ADMINISTER', document.privileged);
    if (!document.retentionPolicy || document.reviews.length === 0) throw new EvidenceError('RETENTION_NOT_ESTABLISHED', 'Approved evidence with a retention policy is required', 409);
    const hold = await tx.legalHold.findFirst({ where: { serviceOrderId: document.serviceOrderId, status: 'ACTIVE', OR: [{ documentId: null }, { documentId: document.id }] } });
    if (hold) throw new EvidenceError('LEGAL_HOLD_ACTIVE', 'Evidence under legal hold cannot be disposed', 409);
    const dueAt = new Date(document.reviews[0].createdAt.getTime() + document.retentionPolicy.retainDays * 86_400_000);
    if (dueAt > new Date()) throw new EvidenceError('RETENTION_PERIOD_ACTIVE', `Evidence must be retained until ${dueAt.toISOString()}`, 409);
    const disposition = await tx.evidenceDisposition.create({
      data: { documentId: document.id, requestedById: input.actor.id, reason: requireText(input.reason, 'reason', 2000), dueAt },
    });
    await appendAudit(tx, {
      serviceOrderId: document.serviceOrderId, entityType: 'EVIDENCE_DISPOSITION', entityId: disposition.id,
      actorId: input.actor.id, action: 'DISPOSITION_REQUESTED', payload: { documentId: document.id, dueAt: dueAt.toISOString(), reason: disposition.reason },
    });
    return disposition;
  });
}

async function decideDisposition(prisma, input) {
  return prisma.$transaction(async (tx) => {
    const disposition = await tx.evidenceDisposition.findUnique({ where: { id: input.dispositionId }, include: { document: { include: { versions: { orderBy: { version: 'desc' }, take: 1 } } } } });
    if (!disposition || disposition.status !== 'REQUESTED') throw new EvidenceError('DISPOSITION_NOT_REVIEWABLE', 'Disposition request is not pending review', 409);
    const document = disposition.document;
    await requireOrderAccess(tx, input.actor, document.serviceOrderId, 'ADMINISTER', document.privileged);
    if (disposition.requestedById === input.actor.id) throw new EvidenceError('SEPARATE_REVIEWER_REQUIRED', 'The disposition requester cannot review their own request', 403);
    const reason = requireText(input.reason, 'reason', 2000);
    if (!input.approve) {
      const rejected = await tx.evidenceDisposition.update({ where: { id: disposition.id }, data: { status: 'REJECTED', reviewedById: input.actor.id, reviewedAt: new Date(), reason: `${disposition.reason}\nReview: ${reason}` } });
      await appendAudit(tx, { serviceOrderId: document.serviceOrderId, entityType: 'EVIDENCE_DISPOSITION', entityId: disposition.id, actorId: input.actor.id, action: 'DISPOSITION_REJECTED', payload: { reason } });
      return rejected;
    }
    const hold = await tx.legalHold.findFirst({ where: { serviceOrderId: document.serviceOrderId, status: 'ACTIVE', OR: [{ documentId: null }, { documentId: document.id }] } });
    if (hold) throw new EvidenceError('LEGAL_HOLD_ACTIVE', 'A legal hold was placed after the request; disposition is blocked', 409);
    const connector = await connectorFor(tx, 'STORAGE', input.connectorId);
    const current = document.versions[0];
    const operation = await createOperation(tx, {
      connectorId: connector.id, documentId: document.id, versionId: current.id, type: 'DELETE_OBJECT',
      idempotencyKey: `disposition:${disposition.id}`,
      payload: { dispositionId: disposition.id, documentId: document.id, storageProvider: current.storageProvider, storageObjectKey: current.storageObjectKey, storageVersion: current.storageVersion },
    });
    const approved = await tx.evidenceDisposition.update({ where: { id: disposition.id }, data: { status: 'QUEUED', reviewedById: input.actor.id, reviewedAt: new Date() } });
    await appendAudit(tx, { serviceOrderId: document.serviceOrderId, entityType: 'EVIDENCE_DISPOSITION', entityId: disposition.id, actorId: input.actor.id, action: 'DISPOSITION_APPROVED', payload: { reason, operationId: operation.id } });
    return approved;
  });
}

async function listOrderEvidence(prisma, input) {
  const access = await orderAccess(prisma, input.actor, input.serviceOrderId);
  return prisma.serviceEvidenceDocument.findMany({
    where: { serviceOrderId: input.serviceOrderId, ...(access.privilegedAccess ? {} : { privileged: false }) },
    include: documentInclude,
    orderBy: { updatedAt: 'desc' },
  });
}

module.exports = {
  addEvidenceVersion,
  createEvidenceDraft,
  createOperation,
  decideDisposition,
  grantOrderAccess,
  listOrderEvidence,
  placeLegalHold,
  queueFiling,
  queueOcr,
  releaseLegalHold,
  requestDisposition,
  requestEvidenceExport,
  requestSignature,
  revokeOrderAccess,
  reviewEvidence,
};
