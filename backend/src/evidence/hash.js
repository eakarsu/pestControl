const { createHash } = require('node:crypto');
const { EvidenceError } = require('./errors');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

function requireSha256(value, field = 'contentHash') {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new EvidenceError('INVALID_HASH', `${field} must be a SHA-256 hex digest`);
  }
  return value.toLowerCase();
}

function normalizeJurisdiction(value) {
  const result = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(result)) throw new EvidenceError('INVALID_JURISDICTION', 'Jurisdiction must be a two- or three-letter code');
  return result;
}

module.exports = { canonicalize, stableJson, sha256, requireSha256, normalizeJurisdiction };
