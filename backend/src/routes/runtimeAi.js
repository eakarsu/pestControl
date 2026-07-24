'use strict';

const { randomUUID } = require('node:crypto');
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { requestEvidenceOperationsReadiness } = require('../services/openrouterEvidence');

const router = express.Router();

router.post('/operations-readiness', authMiddleware, async (req, res) => {
  const workflowSummary = typeof req.body?.workflowSummary === 'string' ? req.body.workflowSummary.trim() : '';
  if (workflowSummary.length < 10 || workflowSummary.length > 1000) return res.status(400).json({ error: 'workflowSummary must contain 10-1000 characters' });
  try {
    const evidence = await requestEvidenceOperationsReadiness(workflowSummary);
    const analysisId = randomUUID();
    const inputJson = JSON.stringify({ workflowSummary });
    const receiptJson = JSON.stringify(evidence.providerReceipt);
    await req.prisma.$executeRaw`
      INSERT INTO runtime_ai_results
        (id,user_id,feature,input,provider_request_id,provider_model,result_text,provider_receipt)
      VALUES
        (${analysisId},${req.user.id},${'operations-readiness'},${inputJson}::jsonb,${evidence.providerReceipt.requestId},${evidence.providerReceipt.model},${evidence.result},${receiptJson}::jsonb)
    `;
    return res.json({ analysisId, ...evidence });
  } catch (error) {
    console.error('[runtime-ai] operations readiness failed:', error.message);
    return res.status(502).json({ error: 'AI provider request failed' });
  }
});

module.exports = router;
