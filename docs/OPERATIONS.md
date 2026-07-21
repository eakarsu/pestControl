# Operations runbook

## Release processes

Run these as distinct release/runtime identities:

1. `npm run prisma:migrate:deploy` applies checked-in forward migrations.
2. `npm run provision` creates the first administrator once and refuses to run after any user exists.
3. `./start.sh` serves an already-built frontend and the evidence API.
4. `npm run worker` delivers queued OCR, e-signature, filing, export-storage, and disposition operations.

The web and worker require `DATABASE_URL`; the web also requires a 32-character `JWT_SECRET`. Connector rows contain only environment-variable names. Inject their values from a secret manager and set `CONNECTOR_ALLOWED_HOSTS` to the exact production provider hostnames.

## Evidence controls

- Administrators bootstrap service-order access; all other access is scoped to an active order grant or the assigned technician.
- Privileged evidence requires a grant with `privilegedAccess`; exports fail rather than silently omitting privileged records.
- Versions retain hashes and immutable object-version references. OCR may append only its normalized-text hash.
- Authors cannot approve their own version. Treatment plans require jurisdiction/effective-date, product registration, and SDS checks against an effective authoritative template.
- Workers claim with `FOR UPDATE SKIP LOCKED`, retain a lease owner, verify payload hashes, retry transient failures, and dead-letter bounded failures.
- Legal holds are rechecked when disposition is requested, reviewed, and physically deleted. A late hold blocks the worker.

## Backup and restore

```bash
npm run backup -- /absolute/path/pest-control.dump
npm run restore -- /absolute/path/pest-control.dump RESTORE_CONFIRMED
```

Practice restore against a new database. Verify migration status, `/api/health/ready`, evidence/export counts, and each affected order's `/api/evidence/orders/{id}/audit/verify` result before declaring the backup usable.

## Incident recovery

1. Disable the affected connector and revoke relevant order grants or user sessions.
2. Preserve audit events, versions, reviews, operations, signature receipts, holds, and exports.
3. Rotate externally stored credentials and webhook secrets.
4. Repair the root cause, then use the authenticated dead-letter retry endpoint with a reason.
5. Re-verify the audit chain and provider receipt before restoring the connector.

Liveness is `GET /api/health/live`; readiness is `GET /api/health/ready` and confirms the latest expected migration.
