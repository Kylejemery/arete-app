-- Weekly Self-Reflection Agent — Layer 6, the meta-agent of the Arete AI Agent
-- System. Once a week (Sundays 07:00 UTC, after a full week of every other
-- agent's data has accumulated) it assesses the health of the entire living
-- system — corpus growth, agent performance, user engagement, anomalies — and
-- writes one structured report for the founder.
--
-- This migration adds:
--   1. system_reflections        — one row per ISO week (machine + prose report)
--   2. system_reflection_corpus_stats(since) — aggregate RPC so the agent counts
--      the ~7k-row rag_corpus server-side (a client .select() is capped at 1000
--      rows by PostgREST and would undercount).
--   3. agent_config row 'weekly-self-reflection' — runtime-tunable thresholds.

CREATE TABLE IF NOT EXISTS system_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_week DATE NOT NULL UNIQUE,   -- ISO week start (Monday, UTC)

  -- Corpus Health
  corpus_total_chunks INTEGER,
  corpus_chunks_added_this_week INTEGER,
  corpus_authors_covered INTEGER,
  corpus_tier1_gaps JSONB,                -- authors/works below their Tier 1 threshold
  corpus_tier2_gaps JSONB,                -- authors/works below their Tier 2 threshold
  ingestion_runs_this_week INTEGER,
  ingestion_failures_this_week INTEGER,

  -- Agent Performance
  agent_status JSONB,                     -- { agent_name: { fired, failures, last_run } }
  synthesis_docs_generated INTEGER,
  synthesis_docs_approved INTEGER,
  synthesis_docs_pending INTEGER,
  gap_reports_generated INTEGER,
  gap_recommendations_actioned INTEGER,

  -- User Engagement
  active_users_this_week INTEGER,
  dispatches_sent INTEGER,
  dispatch_delivery_rate NUMERIC(5,2),    -- percentage
  insights_delivered INTEGER,
  distress_flags_this_week INTEGER,
  distress_flags_resolved INTEGER,

  -- Anomalies
  anomalies JSONB,                        -- [{ severity:'warning'|'critical', domain, message }]

  -- Recommended Actions
  recommended_actions JSONB,              -- [{ priority:'high'|'medium'|'low', action, rationale }]

  -- Prose Report
  report_title TEXT,
  report_body TEXT,                       -- full prose narrative for the admin dashboard

  -- Meta
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_system_reflections_week
  ON system_reflections (reflection_week DESC);

-- Aggregate corpus stats in one server-side pass, immune to the PostgREST
-- 1000-row read cap. `since` bounds the "added this week" window.
CREATE OR REPLACE FUNCTION system_reflection_corpus_stats(since TIMESTAMPTZ)
RETURNS TABLE (
  total_chunks BIGINT,
  chunks_added BIGINT,
  authors_covered BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)                                          AS total_chunks,
    COUNT(*) FILTER (WHERE created_at >= since)        AS chunks_added,
    COUNT(DISTINCT author)                             AS authors_covered
  FROM rag_corpus;
$$;

-- RLS — no policies; service role only. The admin web app reads via the
-- service-role admin client behind ADMIN_EMAIL-gated API routes (same pattern
-- as synthesis_documents / corpus_gap_reports).
ALTER TABLE system_reflections ENABLE ROW LEVEL SECURITY;

-- Default config for the agent. Tunable from the dashboard without a redeploy.
INSERT INTO agent_config (agent_name, config)
VALUES (
  'weekly-self-reflection',
  '{
    "enabled": true,
    "run_hour_utc": 7,
    "run_day": "sunday",
    "model": "claude-sonnet-4-6",
    "max_report_words": 600,
    "anomaly_critical_threshold_dispatch_delivery": 80,
    "anomaly_critical_threshold_distress_unresolved": 3,
    "anomaly_warning_threshold_synthesis_backlog": 5
  }'
)
ON CONFLICT (agent_name) DO NOTHING;
