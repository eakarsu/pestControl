const assert = require('node:assert/strict');
const test = require('node:test');
const { requireSha256, sha256, stableJson } = require('../src/evidence/hash');
const { safeConnectorUrl } = require('../src/evidence/http');

test('canonical evidence hashes are independent of object key order', () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
  assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));
  assert.throws(() => requireSha256('not-a-hash'), /SHA-256/);
});

test('connector URL validation rejects credentials, local hosts, and nonstandard ports', async () => {
  await assert.rejects(safeConnectorUrl('http://provider.example/api'), /HTTPS/);
  await assert.rejects(safeConnectorUrl('https://user:pass@provider.example/api'), /HTTPS/);
  await assert.rejects(safeConnectorUrl('https://localhost/api'), /Local/);
  await assert.rejects(safeConnectorUrl('https://provider.example:8443/api'), /standard port/);
});
