# External evidence connector contracts

Connectors are typed as `OCR`, `ESIGN`, `FILING`, `STORAGE`, or `TEMPLATE`. Each has a dedicated active service user, HTTPS endpoint, credential secret reference, optional webhook secret reference, and provider name. Delivery rejects credentials in URLs, redirects, local/private/reserved destinations, nonstandard ports, responses over 64 KiB, and requests longer than ten seconds.

Every outbound request includes:

- `Authorization: Bearer {resolved secret}`;
- `Idempotency-Key: {stable operation key}`;
- JSON `{ "type": "...", "payload": { ... } }`.

Success requires HTTP 2xx. The worker records `x-request-id`, `x-receipt-id`, or the JSON `receipt`/`id`. HTTP 408, 429, and 5xx are retried; other failures dead-letter immediately.

## OCR

`OCR_EXTRACT` sends immutable storage provider/object/version references. A successful response must include a SHA-256 `ocrTextHash`; raw extracted text is not persisted in the application database.

## E-signature

`ESIGN_SEND` sends the reviewed evidence version and explicit signer list. Success must include `externalId`. Providers call:

```text
POST /api/evidence/webhooks/signature/{connectorId}
```

Headers are `x-signature-timestamp` (Unix seconds) and `x-signature-hmac` (hex HMAC-SHA256 of `{timestamp}.{rawBody}`). Events older than five minutes are refused. Supported terminal statuses are `signed`, `declined`, `failed`, and `voided`; terminal states cannot be rewritten.

## Filing and storage

`FILE_RECORD` receives a reviewed current version plus jurisdiction and effective date. `STORE_EXPORT` receives a deterministic evidence manifest and hash and must return `storageObjectKey`. `DELETE_OBJECT` is queued only after retention eligibility and independent approval; the worker rechecks active order/document legal holds immediately before deletion.

## Authoritative templates

Template metadata records its authoritative source/external identity. Versions are append-only, content-hashed, independently approved, and bounded by effective dates and jurisdiction. Treatment-plan drafting fails closed if the template, state product registration, or current safety data sheet is missing.
