BEGIN;
CREATE TABLE IF NOT EXISTS runtime_ai_results (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  feature text NOT NULL,
  input jsonb NOT NULL,
  provider_request_id text NOT NULL UNIQUE,
  provider_model text NOT NULL,
  result_text text NOT NULL,
  provider_receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runtime_ai_results_feature_created_idx ON runtime_ai_results(feature, created_at DESC);
COMMIT;
