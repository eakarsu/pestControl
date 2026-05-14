// === Batch 11 Gaps & Frontend Mounts ===
// Gap features (AI counterparts + Non-AI features) for pestControl.
// Lazy gap_features table (in-memory), OpenRouter via native fetch.

const express = require('express');
const router = express.Router();

const gapFeatures = new Map();

async function llm(systemPrompt, userMsg, maxTokens = 1400) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { const e = new Error('OPENROUTER_API_KEY not configured'); e.status = 503; throw e; }
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'pestControl Gap Features' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], max_tokens: maxTokens }),
  });
  const data = await r.json();
  if (data && data.error) throw new Error(data.error.message || 'LLM error');
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function track(slug, payload) {
  const list = gapFeatures.get(slug) || [];
  list.push({ at: new Date().toISOString(), payload });
  gapFeatures.set(slug, list);
}

function safe(res, e) { return res.status((e && e.status) || 500).json({ error: (e && e.message) || 'request failed' }); }

// ---- AI Gap Counterparts ----

router.post('/gap-chemical-safety-checker', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You verify hazardous chemical applications against safety regs (EPA, OSHA) and warn if violations are possible.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('chemical-safety-checker', { keys: Object.keys(body) });
    res.json({ check: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-customer-churn-predictor', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You predict customer churn risk over the next 90 days based on service history. Return score and drivers.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('customer-churn-predictor', { keys: Object.keys(body) });
    res.json({ risk: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-equipment-maintenance', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You schedule preventive maintenance for vehicles and equipment based on usage and manufacturer guidance.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('equipment-maintenance', { keys: Object.keys(body) });
    res.json({ schedule: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-invoice-payment-prediction', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You predict when an invoice will be paid based on customer history and outreach approach.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('invoice-payment-prediction', { keys: Object.keys(body) });
    res.json({ prediction: out });
  } catch (e) { safe(res, e); }
});

// ---- Non-AI Gap Features ----

router.post('/gap-payment-processor', (req, res) => {
  const body = req.body || {};
  const record = { id: 'payment-processor_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('payment-processor', record);
  res.json({ charge: record, status: 'recorded' });
});

router.post('/gap-mobile-technician', (req, res) => {
  const body = req.body || {};
  const record = { id: 'mobile-technician_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('mobile-technician', record);
  res.json({ jobUpdate: record, status: 'recorded' });
});

router.post('/gap-sms-email-dispatch', (req, res) => {
  const body = req.body || {};
  const record = { id: 'sms-email-dispatch_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('sms-email-dispatch', record);
  res.json({ message: record, status: 'recorded' });
});

router.post('/gap-iot-sensor', (req, res) => {
  const body = req.body || {};
  const record = { id: 'iot-sensor_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('iot-sensor', record);
  res.json({ reading: record, status: 'recorded' });
});

router.post('/gap-customer-portal', (req, res) => {
  const body = req.body || {};
  const record = { id: 'customer-portal_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('customer-portal', record);
  res.json({ request: record, status: 'recorded' });
});

router.post('/gap-subscription-billing', (req, res) => {
  const body = req.body || {};
  const record = { id: 'subscription-billing_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('subscription-billing', record);
  res.json({ subscription: record, status: 'recorded' });
});

router.get('/gap-features/_audit', (req, res) => {
  const rows = [];
  for (const [k, v] of gapFeatures.entries()) rows.push({ feature: k, events: v.length });
  res.json({ rows });
});

module.exports = router;
