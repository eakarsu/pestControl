# PestControl Governed Evidence

This repository now supports one bounded production workflow: a pest-control service order accumulates verifiable evidence, an independently authorized human reviews it, external OCR/e-sign/filing/storage operations run through durable leased queues, and retention or legal-hold rules govern final disposition.

The workflow stores content hashes, versioned object references, authoritative-template provenance, jurisdiction/effective-date checks, product-registration/SDS evidence, signature receipts, export manifests, and an immutable hash-chained audit. It does not store document binaries or connector credentials. Generated AI/gap pages, simulated provider success, demo accounts, public registration, runtime seeding, and destructive bootstrap behavior are not part of the reachable product.

## Local release flow

Requirements: Node.js 22 and PostgreSQL 17.

```bash
cd backend
npm ci
npm run prisma:generate
export DATABASE_URL='postgresql://app_user:password@127.0.0.1:5432/pest_control'
npm run prisma:migrate:deploy
PROVISION_ADMIN_EMAIL='operator@example.com' \
PROVISION_ADMIN_PASSWORD='a-long-random-password' \
PROVISION_ADMIN_FIRST_NAME='Evidence' \
PROVISION_ADMIN_LAST_NAME='Administrator' \
npm run provision

cd ../frontend
npm ci
npm run build
cd ..
JWT_SECRET='at-least-32-random-characters-here' ./start.sh
```

Run `npm run worker` from `backend/` as a separate process. Startup never installs dependencies, migrates, creates a database, seeds records, mutates environment files, kills ports, or reveals credentials.

See [operations](docs/OPERATIONS.md) and [external evidence contracts](docs/EVIDENCE_CONNECTORS.md).
