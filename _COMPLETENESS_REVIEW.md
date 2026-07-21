# Completeness Review: pestControl

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 94 project files (85 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for legal/document workflow. Generated gap/demo patterns are present: it contains 85 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Add matter-scoped permissions, document provenance, version history, privileged-access controls, and immutable audit events.
2. Integrate OCR, e-signature, filing/storage, retention/legal-hold, and authoritative template sources.
3. Require human legal review and jurisdiction/effective-date validation for generated clauses, forms, or recommendations.
4. Test redaction, conflicting versions, signer failure, access revocation, export, and retention workflows end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `frontend/src/App.jsx:42`
- `frontend/src/components/ChemicalInventoryTracker.js:103`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one legal/document workflow workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

All source-actionable review items are implemented for the actual pest-control domain as a governed service-order evidence workflow:

- Matter-equivalent service-order access is explicit, revocable, role-ranked, and separately gates privileged evidence. Authentication uses server-validated revocable sessions, account activity and auth-version checks, strong password changes, and fail-closed production configuration.
- PostgreSQL now persists immutable evidence versions, source and redaction provenance, independent human reviews, authoritative effective-dated templates, product-registration/SDS validation, signature envelopes, leased connector operations, export manifests, retention decisions, legal holds, and hash-chained immutable audit events. Database constraints and triggers enforce critical separation, immutability, and retention invariants.
- OCR, e-signature, filing, storage/export, and disposition connectors use explicit connector selection, HTTPS/allowlist/SSRF controls, idempotency keys, leased `SKIP LOCKED` claims, bounded retries, dead-letter state, manual repair, signed webhook verification, and audit receipts. Provider credentials remain deployment secrets and no simulated success path is reachable in production.
- Generated AI/gap/demo surfaces, public registration, fake reset-token exposure, runtime seed/migration behavior, and destructive bootstrap logic were removed from the reachable product. Startup only validates prepared artifacts and configuration before serving the evidence workspace and supported API.
- Risk-based unit and PostgreSQL end-to-end tests cover authoritative-source rejection, jurisdiction/effective-date controls, independent review, redaction lineage, optimistic version conflicts, exactly-once leased OCR work, signature retry/dead-letter/repair, filing, access revocation, privileged filtering/export denial, deterministic export hashing, legal-hold races, reviewed disposition, audit immutability, signed-webhook rejection, session revocation, CORS, readiness, and removal of legacy APIs.
- CI now provisions fresh PostgreSQL, applies and replays migrations, checks migration status, runs backend checks/tests and frontend builds, audits dependencies, scans secrets, and builds the container. Operator documentation covers provisioning, connector contracts, migrations, worker operation, backup/restore, recovery, and production startup.

Fresh verification on 2026-07-20 passed: migration from an empty database, no-op migration replay, migration status, the complete test suite twice, backend syntax checks, frontend production build, backend/frontend dependency audits at the low-severity threshold (zero findings), Compose configuration validation, working-tree and full-history secret scans (zero findings), production runtime/readiness/CORS/legacy-route smoke checks, and backup/restore count parity. CI generates its authentication secret per run. An image build could not be executed locally because no Docker daemon was available; the checked-in CI workflow performs that build.

## Runtime acceptance verification (2026-07-20)

The shared non-suite validator launched `start.sh` with a fresh disposable PostgreSQL database and isolated loopback ports (`55680` database, `6164` API, `6165` browser origin). It provisioned the acceptance administrator through the explicit `create-admin` operator command, received HTTP 200 from `/api/auth/login`, and verified the bearer session through `/api/auth/me`. The recorded outcome is `API_VERIFIED startup_login_session_api`.

The same assigned database port was then reused only after the validator released it. A fresh `prisma migrate deploy`, a no-op migration replay, all 3 backend tests, backend syntax checks, and the frontend production build passed. All three assigned ports were released after verification.
