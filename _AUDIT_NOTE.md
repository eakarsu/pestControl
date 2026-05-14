# Audit Note - pestControl

Source: `_AUDIT/reports/batch_11.md` (lines 343-388).

## Original Audit Recommendations

### Missing AI Counterparts
- `/chemical-safety-checker` for hazmat compliance.
- `/customer-churn-predictor` for retention.
- `/equipment-maintenance-scheduler` for van/equipment upkeep.

### Missing Non-AI Features
- Payment processing (Stripe).
- Mobile technician app (GPS, offline sync).
- Real-time customer SMS/email notifications.
- IoT sensor integration.

### Custom Feature Suggestions
1. Real-Time Pest Alert System with IoT.
2. Integrated Mobile Technician App.
3. Customer Self-Service Portal.
4. Predictive Equipment Maintenance.
5. Subscription Plans & Auto-Renewal.
6. Pest Library with Photos.

## Implementations Applied

Added 2 AI endpoints to `backend/src/routes/ai.js` matching the existing OpenRouter pattern + auth middleware + Prisma context (`req.prisma`):
- `POST /api/ai/chemical-safety-checker`
- `POST /api/ai/customer-churn-predictor`

Both produce JSON responses, follow existing fallback parsing pattern (regex JSON extract), and add no new dependencies.

## Backlog (Prioritized)

### High
- `/equipment-maintenance-scheduler` (needs equipment/van data model — left for product decision).
- Stripe payment processing on existing invoices.
- SMS/email notifications.

### Medium
- Customer self-service portal.
- Subscription/auto-renewal.
- Mobile technician app.

### Low / Product Decisions
- IoT sensor integration.
- Pest library with photos and search.

## Apply pass 3 (frontend)

LEFT-AS-IS. `frontend/src/pages/AIAdvisors.jsx` wires both pass-2 endpoints
`/api/ai/chemical-safety-checker` and `/api/ai/customer-churn-predictor` via
`aiService.chemicalSafetyChecker` and `aiService.customerChurnPredictor` defined
in `frontend/src/services/api.js` (axios interceptor adds Bearer token from
`localStorage`). Route registered in `App.jsx` at `/ai-advisors`. Toast surfaces
errors including 503 no-key. No FE changes required.

## Apply pass 4 (mechanical backlog)

IMPLEMENTED 1 feature (the remaining mechanical AI backlog item):

1. **POST `/api/ai/equipment-maintenance-scheduler`** — accepts an equipment list
   (`equipment[]`) and/or `fleetSummary` plus `horizonDays` via request body, asks
   the LLM to propose a prioritized maintenance schedule. No new Prisma model
   required (input is body-driven). BE: `backend/src/routes/ai.js`. Reuses
   `callOpenRouter` + `authMiddleware` and the same JSON-extract regex pattern
   used by sibling endpoints. Explicitly returns HTTP 503 when
   `OPENROUTER_API_KEY` is missing.

FE wiring:
- `frontend/src/services/api.js` — added `aiService.equipmentMaintenanceScheduler`.
- `frontend/src/pages/AIAdvisors.jsx` — added a third tab "Equipment Maintenance"
  with a JSON textarea (equipment list) + horizon-days input + run button.
  Reuses existing tab styling, loading/error/result panels, and toast handling.
  JWT bearer is auto-attached by the existing axios interceptor.

Remaining backlog: Stripe payments / SMS-email (NEEDS-CREDS); customer portal,
subscriptions, mobile tech app, IoT, pest library photos (NEEDS-PRODUCT-DECISION).

Smoke test: `node --check` PASS for `backend/src/routes/ai.js` and
`frontend/src/services/api.js`. Live HTTP smoke skipped (Postgres + Prisma
required by `start.sh`). JSX file inspected post-edit; structure matches the
existing two-tab pattern.
