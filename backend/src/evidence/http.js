const dns = require('node:dns/promises');
const net = require('node:net');
const { EvidenceError } = require('./errors');

function privateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase().split('%')[0];
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized) || normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.');
}

async function safeConnectorUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new EvidenceError('INVALID_CONNECTOR_URL', 'Connector URL is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new EvidenceError('UNSAFE_CONNECTOR_URL', 'Connector delivery requires HTTPS on the standard port');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new EvidenceError('UNSAFE_CONNECTOR_URL', 'Local connector destinations are forbidden');
  }
  const allowed = String(process.env.CONNECTOR_ALLOWED_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(hostname)) throw new EvidenceError('CONNECTOR_HOST_NOT_ALLOWED', 'Connector host is not allowlisted');
  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length || resolved.some(({ address }) => privateAddress(address))) {
    throw new EvidenceError('UNSAFE_CONNECTOR_URL', 'Connector host resolved to a private or reserved address');
  }
  return url;
}

async function readBounded(response, limit = 64 * 1024) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new EvidenceError('CONNECTOR_RESPONSE_TOO_LARGE', 'Connector response exceeded 64 KiB', 502);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

async function deliver(connector, operation) {
  const url = await safeConnectorUrl(connector.baseUrl);
  const credential = process.env[connector.credentialRef];
  if (!credential) throw new EvidenceError('CONNECTOR_CREDENTIAL_MISSING', `Secret ${connector.credentialRef} is not configured`, 503, true);
  const response = await fetch(url, {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10_000),
    headers: {
      authorization: `Bearer ${credential}`,
      'content-type': 'application/json',
      'idempotency-key': operation.idempotencyKey,
      'user-agent': 'PestControlEvidence/1.0',
    },
    body: JSON.stringify({ type: operation.type, payload: operation.payload }),
  });
  const body = await readBounded(response);
  if (response.status >= 300 && response.status < 400) throw new EvidenceError('CONNECTOR_REDIRECT_BLOCKED', 'Connector redirects are not followed', 502);
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new EvidenceError(`CONNECTOR_HTTP_${response.status}`, 'Connector rejected the operation', 502, retryable);
  }
  let output = {};
  if (body) {
    try { output = JSON.parse(body); } catch { output = {}; }
  }
  return {
    receipt: response.headers.get('x-request-id') || response.headers.get('x-receipt-id') || output.receipt || output.id || `http-${response.status}`,
    output,
  };
}

module.exports = { deliver, safeConnectorUrl };
