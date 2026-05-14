// AI Extras — Custom Feature Suggestions (batch 11)
// Real-Time Pest Alerts (IoT), Mobile Technician App, Customer Portal, Predictive Maintenance,
// Subscription/Auto-Renewal, Pest Library.

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens = 1000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const e = new Error('OPENROUTER_API_KEY not configured');
    e.status = 503;
    throw e;
  }
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'PestControl AI Extras',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  const data = await r.json();
  if (data?.error) throw new Error(data.error.message || 'LLM error');
  return data.choices?.[0]?.message?.content || '';
}

function fail(res, e) {
  res.status(e?.status || 500).json({ error: e?.message || 'AI failed' });
}

// 1) Real-Time Pest Alert System — accept IoT sensor payload, triage, recommend dispatch.
// TODO: configure credentials — IOT_WEBHOOK_SECRET to validate hardware POSTs.
router.post('/iot-alert', authMiddleware, async (req, res) => {
  try {
    const { sensorId, propertyId, signals = {}, timestamp } = req.body || {};
    if (!sensorId) return res.status(400).json({ error: 'sensorId required' });
    const sys = 'You are a pest-control triage agent. From IoT sensor signals (motion count, trap weight, temp, humidity), assess severity (none|monitor|dispatch|urgent), propose recommended action, and confidence 0-1. Output JSON.';
    const user = `Sensor: ${sensorId}\nProperty: ${propertyId || 'unknown'}\nTimestamp: ${timestamp || new Date().toISOString()}\nSignals: ${JSON.stringify(signals)}`;
    const raw = await callOpenRouter([{ role: 'system', content: sys }, { role: 'user', content: user }], 600);
    res.json({ raw, propertyId });
  } catch (e) { fail(res, e); }
});

// 2) Integrated Mobile Technician App — endpoints for offline sync.
const workQueue = new Map();
router.get('/mobile/jobs', authMiddleware, (req, res) => {
  const techId = req.user?.id || req.query.technicianId;
  const jobs = Array.from(workQueue.values()).filter((j) => j.technicianId === techId && j.status !== 'completed');
  res.json({ jobs });
});
router.post('/mobile/jobs/:id/sync', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status, notes, photoUrls = [], signatureBase64, gps } = req.body || {};
  const job = workQueue.get(id) || { id, technicianId: req.user?.id };
  workQueue.set(id, { ...job, status: status || job.status, notes, photoUrls, signatureBase64, gps, syncedAt: new Date().toISOString() });
  res.json({ job: workQueue.get(id) });
});
router.post('/mobile/jobs', authMiddleware, (req, res) => {
  const { id, technicianId, propertyId, scheduledFor } = req.body || {};
  if (!id || !technicianId) return res.status(400).json({ error: 'id and technicianId required' });
  workQueue.set(id, { id, technicianId, propertyId, scheduledFor, status: 'scheduled', createdAt: new Date().toISOString() });
  res.json({ job: workQueue.get(id) });
});

// 3) Customer Portal — public booking widget endpoints.
router.post('/portal/quote-request', authMiddleware, async (req, res) => {
  try {
    const { propertyType, sqft, knownPests = [], urgency = 'standard' } = req.body || {};
    const sys = 'You are a pest-control quoting assistant. Produce: estimated price range (USD), recommended treatment plan, follow-up cadence, and disclaimers. Output JSON.';
    const user = `Property: ${propertyType}\nSqft: ${sqft}\nPests: ${knownPests.join(',') || 'unknown'}\nUrgency: ${urgency}`;
    const raw = await callOpenRouter([{ role: 'system', content: sys }, { role: 'user', content: user }], 800);
    res.json({ raw });
  } catch (e) { fail(res, e); }
});

// 4) Predictive Maintenance — monitor van mileage / product usage.
router.post('/predictive-maintenance', authMiddleware, async (req, res) => {
  try {
    const { fleet = [], productUsage = [] } = req.body || {};
    if (!fleet.length && !productUsage.length) return res.status(400).json({ error: 'fleet[] or productUsage[] required' });
    const sys = 'You are a fleet/equipment maintenance planner. From vehicle mileage history and chemical/product usage, predict next service date per van and reorder dates per product. Output JSON.';
    const user = `Fleet: ${JSON.stringify(fleet).slice(0, 3000)}\nProductUsage: ${JSON.stringify(productUsage).slice(0, 3000)}`;
    const raw = await callOpenRouter([{ role: 'system', content: sys }, { role: 'user', content: user }], 1200);
    res.json({ raw });
  } catch (e) { fail(res, e); }
});

// 5) Subscription Plans & Auto-Renewal — define plan + simulate next-charge.
const subs = new Map();
router.post('/subscriptions', authMiddleware, (req, res) => {
  const { customerId, plan, frequency = 'quarterly', startDate } = req.body || {};
  if (!customerId || !plan) return res.status(400).json({ error: 'customerId and plan required' });
  const id = `sub_${Date.now()}`;
  subs.set(id, { id, customerId, plan, frequency, startDate: startDate || new Date().toISOString(), active: true, nextRenewal: null });
  res.json({ subscription: subs.get(id) });
});
router.post('/subscriptions/:id/renew', authMiddleware, (req, res) => {
  const s = subs.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  // TODO: configure credentials — STRIPE_SECRET_KEY for actual charge.
  s.nextRenewal = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
  s.lastRenewedAt = new Date().toISOString();
  res.json({ subscription: s, stripeReady: !!process.env.STRIPE_SECRET_KEY });
});

// 6) Pest Library with Photos — searchable catalog.
const pestLibrary = new Map();
router.post('/pest-library', authMiddleware, (req, res) => {
  const { id, commonName, scientificName, photos = [], treatmentProtocol, regionTags = [] } = req.body || {};
  if (!id || !commonName) return res.status(400).json({ error: 'id and commonName required' });
  pestLibrary.set(id, { id, commonName, scientificName, photos, treatmentProtocol, regionTags, updatedAt: new Date().toISOString() });
  res.json({ entry: pestLibrary.get(id) });
});
router.get('/pest-library/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const region = (req.query.region || '').toString().toLowerCase();
  const hits = Array.from(pestLibrary.values()).filter((p) => {
    if (region && !(p.regionTags || []).some((t) => t.toLowerCase() === region)) return false;
    if (!q) return true;
    return p.commonName.toLowerCase().includes(q) || (p.scientificName || '').toLowerCase().includes(q);
  });
  res.json({ results: hits });
});

module.exports = router;
