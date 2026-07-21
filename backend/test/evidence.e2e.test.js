const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../src/app');
const { verifyAuditChain } = require('../src/evidence/audit');
const { EvidenceError } = require('../src/evidence/errors');
const {
  addEvidenceVersion, createEvidenceDraft, decideDisposition, grantOrderAccess, listOrderEvidence,
  placeLegalHold, queueFiling, queueOcr, releaseLegalHold, requestDisposition, requestEvidenceExport,
  requestSignature, revokeOrderAccess, reviewEvidence,
} = require('../src/evidence/service');
const { applySignatureEvent, processOneOperation, retryOperation } = require('../src/evidence/worker');

const databaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!databaseUrl.pathname.toLowerCase().includes('test')) throw new Error('Evidence tests require a database name containing "test"');
process.env.JWT_SECRET = 'test-jwt-secret-with-more-than-thirty-two-characters';
process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.test';
process.env.ESIGN_TEST_WEBHOOK = 'test-webhook-secret-with-more-than-thirty-two-characters';

const prisma = new PrismaClient();
const actor = (user) => ({ id: user.id, role: user.role });
const digest = (value) => require('node:crypto').createHash('sha256').update(value).digest('hex');

async function fixture() {
  const suffix = randomUUID().slice(0, 8);
  const password = await bcrypt.hash('long-test-password-1234', 4);
  const [admin, author, reviewer, viewer, serviceUser] = await Promise.all([
    prisma.user.create({ data: { email: `admin-${suffix}@example.test`, password, firstName: 'A', lastName: 'Admin', role: 'ADMIN' } }),
    prisma.user.create({ data: { email: `author-${suffix}@example.test`, password, firstName: 'T', lastName: 'Author', role: 'TECHNICIAN' } }),
    prisma.user.create({ data: { email: `reviewer-${suffix}@example.test`, password, firstName: 'R', lastName: 'Reviewer', role: 'MANAGER' } }),
    prisma.user.create({ data: { email: `viewer-${suffix}@example.test`, password, firstName: 'V', lastName: 'Viewer', role: 'RECEPTIONIST' } }),
    prisma.user.create({ data: { email: `service-${suffix}@example.test`, password, firstName: 'S', lastName: 'Connector', role: 'MANAGER' } }),
  ]);
  const customer = await prisma.customer.create({ data: { firstName: 'Case', lastName: 'Customer', email: `customer-${suffix}@example.test`, phone: '+12125550123' } });
  const property = await prisma.property.create({ data: { customerId: customer.id, name: 'Evidence site', addressLine1: '1 Main St', city: 'Albany', state: 'NY', zipCode: '12207' } });
  const serviceType = await prisma.serviceType.create({ data: { name: `Controlled treatment ${suffix}`, basePrice: 100, duration: 60 } });
  const technician = await prisma.technician.create({ data: { userId: author.id, employeeId: `TECH-${suffix}` } });
  const order = await prisma.serviceOrder.create({ data: { orderNumber: `SO-${suffix}`, propertyId: property.id, serviceTypeId: serviceType.id, technicianId: technician.id, scheduledDate: new Date() } });
  await grantOrderAccess(prisma, { actor: actor(admin), serviceOrderId: order.id, userId: author.id, accessLevel: 'REVIEW', privilegedAccess: false });
  await grantOrderAccess(prisma, { actor: actor(admin), serviceOrderId: order.id, userId: reviewer.id, accessLevel: 'ADMINISTER', privilegedAccess: true });
  await grantOrderAccess(prisma, { actor: actor(admin), serviceOrderId: order.id, userId: viewer.id, accessLevel: 'READ', privilegedAccess: false });
  await Promise.all([
    prisma.retentionPolicy.create({ data: { name: `NY treatment ${suffix}`, jurisdiction: 'NY', documentKind: 'TREATMENT_PLAN', retainDays: 0 } }),
    prisma.retentionPolicy.create({ data: { name: `NY report ${suffix}`, jurisdiction: 'NY', documentKind: 'SERVICE_REPORT', retainDays: 0 } }),
  ]);
  const product = await prisma.product.create({ data: { name: `Registered Product ${suffix}`, sku: `SKU-${suffix}`, category: 'INSECTICIDE', unitOfMeasure: 'oz', unitCost: 10, manufacturer: 'SafeCo', epaNumber: `EPA-${suffix}` } });
  const template = await prisma.authoritativeTemplate.create({ data: { name: 'NY treatment record', kind: 'TREATMENT_PLAN', jurisdiction: 'NY', sourceSystem: 'STATE_TEMPLATE_REGISTRY', externalId: `tpl-${suffix}` } });
  const templateVersion = await prisma.authoritativeTemplateVersion.create({
    data: { templateId: template.id, version: '2026.1', contentHash: digest('authoritative-template'), storageProvider: 'records-vault', storageObjectKey: `templates/${suffix}`, effectiveFrom: new Date('2026-01-01'), approvedAt: new Date('2025-12-15'), provenance: { registryReceipt: `registry-${suffix}` } },
  });
  const connectors = {};
  for (const kind of ['OCR', 'ESIGN', 'FILING', 'STORAGE']) {
    connectors[kind] = await prisma.externalConnector.create({ data: { kind, provider: `${kind.toLowerCase()}-${suffix}`, baseUrl: `https://${kind.toLowerCase()}.example.test/events`, credentialRef: `${kind}_TEST_TOKEN`, webhookSecretRef: kind === 'ESIGN' ? 'ESIGN_TEST_WEBHOOK' : null, serviceUserId: serviceUser.id } });
  }
  return { suffix, password, admin, author, reviewer, viewer, serviceUser, order, product, templateVersion, connectors };
}

test('governed service evidence survives review, integrations, revocation, export, holds, and disposition failures', async () => {
  const data = await fixture();
  const effectiveDate = new Date('2026-07-20T12:00:00Z');
  const version = {
    contentHash: digest('treatment-plan-v1'), mimeType: 'application/pdf', byteSize: 2048,
    storageProvider: 'records-vault', storageObjectKey: `orders/${data.order.id}/treatment.pdf`, storageVersion: 'v1',
    sourceSystem: 'FIELD_CAPTURE', sourceReference: `capture-${data.suffix}`,
  };
  await assert.rejects(
    createEvidenceDraft(prisma, { actor: actor(data.author), serviceOrderId: data.order.id, kind: 'TREATMENT_PLAN', title: 'Out-of-date treatment plan', jurisdiction: 'NY', effectiveDate: new Date('2025-07-20T12:00:00Z'), version, templateVersionId: data.templateVersion.id, productIds: [data.product.id] }),
    (error) => error instanceof EvidenceError && error.code === 'TEMPLATE_NOT_EFFECTIVE',
  );
  await assert.rejects(
    createEvidenceDraft(prisma, { actor: actor(data.author), serviceOrderId: data.order.id, kind: 'TREATMENT_PLAN', title: 'Controlled treatment plan', jurisdiction: 'NY', effectiveDate, version, templateVersionId: data.templateVersion.id, productIds: [data.product.id] }),
    (error) => error instanceof EvidenceError && error.code === 'PRODUCT_NOT_REGISTERED',
  );
  await prisma.productRegistration.create({ data: { productName: data.product.name, epaNumber: data.product.epaNumber, state: 'NY', registrationDate: new Date('2026-01-01'), expiryDate: new Date('2027-01-01') } });
  await prisma.safetyDataSheet.create({ data: { productName: data.product.name, manufacturer: 'SafeCo', revisionDate: new Date('2026-01-15'), documentUrl: 'https://records.example.test/sds.pdf', hazardClassifications: ['CAUTION'] } });
  const document = await createEvidenceDraft(prisma, {
    actor: actor(data.author), serviceOrderId: data.order.id, kind: 'TREATMENT_PLAN', title: 'Controlled treatment plan', jurisdiction: 'NY', effectiveDate,
    version, templateVersionId: data.templateVersion.id, productIds: [data.product.id], provenance: { deviceId: 'field-unit-7', capturedOffline: true },
  });
  assert.equal(document.status, 'PENDING_REVIEW');
  assert.equal(document.versions[0].provenance.productValidation.length, 1);
  await assert.rejects(
    reviewEvidence(prisma, { actor: actor(data.author), documentId: document.id, version: 1, decision: 'APPROVED', reason: 'self review', jurisdictionValidated: true, effectiveDateValidated: true, productRegistrationChecked: true, safetyDataChecked: true }),
    (error) => error.code === 'SEPARATE_REVIEWER_REQUIRED',
  );
  await assert.rejects(
    reviewEvidence(prisma, { actor: actor(data.reviewer), documentId: document.id, version: 1, decision: 'APPROVED', reason: 'incomplete review', jurisdictionValidated: true, effectiveDateValidated: true, productRegistrationChecked: false, safetyDataChecked: false }),
    (error) => error.code === 'SAFETY_REVIEW_REQUIRED',
  );
  await reviewEvidence(prisma, { actor: actor(data.reviewer), documentId: document.id, version: 1, decision: 'APPROVED', reason: 'Jurisdiction, registration, effective date, and SDS verified', jurisdictionValidated: true, effectiveDateValidated: true, productRegistrationChecked: true, safetyDataChecked: true });
  await assert.rejects(
    addEvidenceVersion(prisma, { actor: actor(data.author), documentId: document.id, expectedVersion: 0, version: { ...version, contentHash: digest('bad-conflict'), storageVersion: 'v-conflict' } }),
    (error) => error.code === 'VERSION_CONFLICT',
  );
  const redacted = await addEvidenceVersion(prisma, {
    actor: actor(data.author), documentId: document.id, expectedVersion: 1,
    version: { ...version, contentHash: digest('treatment-plan-redacted-v2'), storageObjectKey: `orders/${data.order.id}/treatment-redacted.pdf`, storageVersion: 'v2', sourceReference: `redaction-${data.suffix}` },
    redaction: { fields: ['customer.phone', 'property.gateCode'], reason: 'External filing minimization' }, provenance: { redactionTool: 'approved-redactor-2' },
  });
  assert.equal(redacted.version, 2);
  assert.deepEqual(redacted.redactionManifest.fields, ['customer.phone', 'property.gateCode']);
  await reviewEvidence(prisma, { actor: actor(data.reviewer), documentId: document.id, version: 2, decision: 'APPROVED', reason: 'Redaction and treatment controls verified', jurisdictionValidated: true, effectiveDateValidated: true, productRegistrationChecked: true, safetyDataChecked: true });

  await queueOcr(prisma, { actor: actor(data.author), documentId: document.id, version: 2, connectorId: data.connectors.OCR.id });
  let providerCalls = 0;
  const provider = async (_connector, operation) => {
    providerCalls += 1;
    if (operation.type === 'OCR_EXTRACT') return { receipt: 'ocr-receipt', output: { ocrTextHash: digest('normalized-ocr-text') } };
    if (operation.type === 'ESIGN_SEND') return { receipt: 'esign-receipt', output: { externalId: `envelope-${data.suffix}` } };
    if (operation.type === 'FILE_RECORD') return { receipt: 'filing-receipt', output: {} };
    if (operation.type === 'STORE_EXPORT') return { receipt: 'export-receipt', output: { storageObjectKey: `exports/${data.order.id}.json` } };
    if (operation.type === 'DELETE_OBJECT') return { receipt: 'delete-receipt', output: {} };
    throw new Error(`Unexpected operation ${operation.type}`);
  };
  const ocrResults = await Promise.all([processOneOperation(prisma, 'ocr-a', provider), processOneOperation(prisma, 'ocr-b', provider)]);
  assert.equal(ocrResults.filter((result) => result === 'completed').length, 1);
  assert.equal(providerCalls, 1, 'leased workers deliver OCR exactly once');
  const ocrVersion = await prisma.serviceEvidenceVersion.findUniqueOrThrow({ where: { id: redacted.id } });
  assert.equal(ocrVersion.ocrStatus, 'COMPLETED');

  const envelope = await requestSignature(prisma, { actor: actor(data.reviewer), documentId: document.id, version: 2, connectorId: data.connectors.ESIGN.id, signers: [{ name: 'Customer Signer', email: `signer-${data.suffix}@example.test` }] });
  const signOperation = await prisma.externalOperation.findUniqueOrThrow({ where: { idempotencyKey: `esign:${redacted.id}` } });
  await prisma.externalOperation.update({ where: { id: signOperation.id }, data: { maxAttempts: 2 } });
  const temporaryFailure = async () => { throw new EvidenceError('ESIGN_TEMPORARY', 'Provider temporarily unavailable', 502, true); };
  assert.equal(await processOneOperation(prisma, 'esign-fail-1', temporaryFailure), 'retry');
  await prisma.externalOperation.update({ where: { id: signOperation.id }, data: { nextAttemptAt: new Date() } });
  assert.equal(await processOneOperation(prisma, 'esign-fail-2', temporaryFailure), 'dead-letter');
  assert.equal((await prisma.signatureEnvelope.findUniqueOrThrow({ where: { id: envelope.id } })).status, 'FAILED');
  await retryOperation(prisma, { actor: actor(data.reviewer), operationId: signOperation.id, reason: 'Provider incident resolved and signer address verified' });
  assert.equal(await processOneOperation(prisma, 'esign-repaired', provider), 'completed');
  await applySignatureEvent(prisma, { connectorId: data.connectors.ESIGN.id, externalId: `envelope-${data.suffix}`, status: 'signed', occurredAt: new Date().toISOString() });
  assert.equal((await prisma.serviceEvidenceDocument.findUniqueOrThrow({ where: { id: document.id } })).status, 'SIGNED');

  await queueFiling(prisma, { actor: actor(data.reviewer), documentId: document.id, version: 2, connectorId: data.connectors.FILING.id });
  assert.equal(await processOneOperation(prisma, 'filing-worker', provider), 'completed');
  assert.equal((await prisma.serviceEvidenceDocument.findUniqueOrThrow({ where: { id: document.id } })).status, 'FILED');

  assert.equal((await listOrderEvidence(prisma, { actor: actor(data.viewer), serviceOrderId: data.order.id })).length, 1);
  await revokeOrderAccess(prisma, { actor: actor(data.admin), serviceOrderId: data.order.id, userId: data.viewer.id, reason: 'Assignment ended' });
  await assert.rejects(listOrderEvidence(prisma, { actor: actor(data.viewer), serviceOrderId: data.order.id }), (error) => error.code === 'ORDER_ACCESS_DENIED');

  const privileged = await createEvidenceDraft(prisma, {
    actor: actor(data.admin), serviceOrderId: data.order.id, kind: 'SERVICE_REPORT', title: 'Privileged incident appendix', jurisdiction: 'NY', effectiveDate,
    privileged: true, version: { ...version, contentHash: digest('privileged-report'), storageObjectKey: `orders/${data.order.id}/privileged.pdf`, storageVersion: 'privileged-v1', sourceReference: `incident-${data.suffix}` },
  });
  await reviewEvidence(prisma, { actor: actor(data.reviewer), documentId: privileged.id, version: 1, decision: 'APPROVED', reason: 'Privileged appendix verified', jurisdictionValidated: true, effectiveDateValidated: true, productRegistrationChecked: false, safetyDataChecked: false });
  await grantOrderAccess(prisma, { actor: actor(data.admin), serviceOrderId: data.order.id, userId: data.viewer.id, accessLevel: 'READ', privilegedAccess: false });
  assert.equal((await listOrderEvidence(prisma, { actor: actor(data.viewer), serviceOrderId: data.order.id })).some((item) => item.id === privileged.id), false);
  await assert.rejects(
    requestEvidenceExport(prisma, { actor: actor(data.viewer), serviceOrderId: data.order.id, connectorId: data.connectors.STORAGE.id }),
    (error) => error.code === 'PRIVILEGED_ACCESS_REQUIRED',
  );
  await revokeOrderAccess(prisma, { actor: actor(data.admin), serviceOrderId: data.order.id, userId: data.viewer.id, reason: 'Privileged export check completed' });
  const exportRequest = await requestEvidenceExport(prisma, { actor: actor(data.reviewer), serviceOrderId: data.order.id, connectorId: data.connectors.STORAGE.id });
  assert.equal(exportRequest.manifest.documents.length, 2);
  assert.equal(await processOneOperation(prisma, 'export-worker', provider), 'completed');
  assert.equal((await prisma.evidenceExport.findUniqueOrThrow({ where: { id: exportRequest.id } })).status, 'COMPLETED');

  const hold = await placeLegalHold(prisma, { actor: actor(data.admin), serviceOrderId: data.order.id, documentId: document.id, reason: 'Regulatory inquiry', reference: `HOLD-${data.suffix}` });
  await assert.rejects(requestDisposition(prisma, { actor: actor(data.reviewer), documentId: document.id, reason: 'Retention period elapsed' }), (error) => error.code === 'LEGAL_HOLD_ACTIVE');
  await releaseLegalHold(prisma, { actor: actor(data.admin), holdId: hold.id, reason: 'Regulator closed inquiry' });
  const disposition = await requestDisposition(prisma, { actor: actor(data.reviewer), documentId: document.id, reason: 'Retention period elapsed and export retained' });
  await assert.rejects(decideDisposition(prisma, { actor: actor(data.reviewer), dispositionId: disposition.id, approve: true, reason: 'self approval' }), (error) => error.code === 'SEPARATE_REVIEWER_REQUIRED');
  await decideDisposition(prisma, { actor: actor(data.admin), dispositionId: disposition.id, approve: true, reason: 'Retention evidence and export verified', connectorId: data.connectors.STORAGE.id });
  const lateHold = await placeLegalHold(prisma, { actor: actor(data.admin), serviceOrderId: data.order.id, documentId: document.id, reason: 'Late litigation notice', reference: `LATE-${data.suffix}` });
  assert.equal(await processOneOperation(prisma, 'delete-blocked', provider), 'dead-letter');
  assert.notEqual((await prisma.serviceEvidenceDocument.findUniqueOrThrow({ where: { id: document.id } })).status, 'DISPOSED');
  await releaseLegalHold(prisma, { actor: actor(data.admin), holdId: lateHold.id, reason: 'Notice withdrawn' });
  const deleteOperation = await prisma.externalOperation.findUniqueOrThrow({ where: { idempotencyKey: `disposition:${disposition.id}` } });
  await retryOperation(prisma, { actor: actor(data.reviewer), operationId: deleteOperation.id, reason: 'Legal hold release verified' });
  assert.equal(await processOneOperation(prisma, 'delete-worker', provider), 'completed');
  assert.equal((await prisma.serviceEvidenceDocument.findUniqueOrThrow({ where: { id: document.id } })).status, 'DISPOSED');
  assert.equal(await verifyAuditChain(prisma, data.order.id), true);
  const audit = await prisma.evidenceAuditEvent.findFirstOrThrow({ where: { serviceOrderId: data.order.id } });
  await assert.rejects(prisma.evidenceAuditEvent.update({ where: { id: audit.id }, data: { action: 'TAMPERED' } }));

  const app = createApp({ prisma });
  await request(app)
    .post(`/api/evidence/webhooks/signature/${data.connectors.ESIGN.id}`)
    .set('x-signature-timestamp', String(Math.floor(Date.now() / 1000)))
    .set('x-signature-hmac', '00'.repeat(32))
    .send({ externalId: `envelope-${data.suffix}`, status: 'signed', occurredAt: new Date().toISOString() })
    .expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: data.author.email, password: 'long-test-password-1234' }).expect(200);
  const token = login.body.token;
  await request(app).get(`/api/evidence/orders/${data.order.id}`).set('Authorization', `Bearer ${token}`).expect(200);
  await request(app).get('/api/customers').set('Authorization', `Bearer ${token}`).expect(404);
  await request(app).get('/api/health/ready').expect(200);
  await request(app).get('/api/health/live').set('Origin', 'https://evil.example').expect(403);
  await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
  await request(app).get(`/api/evidence/orders/${data.order.id}`).set('Authorization', `Bearer ${token}`).expect(401);
});

test.after(async () => prisma.$disconnect());
