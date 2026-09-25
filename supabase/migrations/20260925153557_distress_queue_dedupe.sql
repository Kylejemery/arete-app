-- ----------------------------------------------------------------
-- 20260925120000_distress_queue_dedupe.sql
-- Activation plan, Part 1: one distress review row per analysis.
--
-- The journal agent ran twice every morning (the coverage-gap-agent Railway
-- service had its config-as-code path pointed at railway.agent.json, so it
-- ran the journal agent at 09:00 too), and every run re-inserted a pending
-- row for any analysis still flagged that week, because journal_analysis is
-- upserted per (user, week) and keeps its id all week. Twelve analyses had
-- become 56 rows, and an analysis escalated on 9/14 came back as pending.
--
-- This migration:
--   1. backs every row up to distress_review_queue_dupes_backup_20260925;
--   2. collapses to one row per analysis_id: the most advanced status
--      (escalated > reviewed > dismissed > pending), the earliest created_at,
--      the latest non-null reviewed_at, and every distinct distress_notes
--      value joined by a blank line in the order it first appeared;
--   3. adds a unique index on analysis_id so the agent's
--      insert ... on conflict (analysis_id) do nothing is the only path;
--   4. adds a trigger so a status only moves forward, never back to pending;
--   5. adds agent_runs plus claim/finish functions: the journal agent claims
--      a run before it starts, so a second scheduler firing the same morning
--      exits, and it enqueues only analyses written since its last
--      successful run.
-- ----------------------------------------------------------------

-- 1. Backup (service role only, like the queue itself).
CREATE TABLE IF NOT EXISTS distress_review_queue_dupes_backup_20260925 AS
  SELECT * FROM distress_review_queue;
ALTER TABLE distress_review_queue_dupes_backup_20260925 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE distress_review_queue_dupes_backup_20260925 IS
  'Every distress_review_queue row as it stood before the 2026-09-25 collapse to one row per analysis_id. Service role only.';

-- Rank used by the collapse, the trigger, and the admin route.
CREATE OR REPLACE FUNCTION public.distress_review_status_rank(s text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE s
    WHEN 'escalated' THEN 4
    WHEN 'reviewed'  THEN 3
    WHEN 'dismissed' THEN 2
    WHEN 'pending'   THEN 1
    ELSE 0
  END
$$;

-- 2. Collapse.
WITH notes AS (
  SELECT analysis_id,
         string_agg(note, E'\n\n' ORDER BY first_seen) AS joined
  FROM (
    SELECT analysis_id, distress_notes AS note, min(created_at) AS first_seen
    FROM distress_review_queue
    WHERE nullif(btrim(distress_notes), '') IS NOT NULL
    GROUP BY analysis_id, distress_notes
  ) d
  GROUP BY analysis_id
),
collapsed AS (
  SELECT analysis_id,
         (array_agg(id ORDER BY created_at, id))[1] AS keep_id,
         min(created_at) AS created_at,
         max(reviewed_at) AS reviewed_at,
         (array_agg(status ORDER BY public.distress_review_status_rank(status) DESC, created_at))[1] AS status
  FROM distress_review_queue
  GROUP BY analysis_id
),
kept AS (
  UPDATE distress_review_queue q
     SET status = c.status,
         created_at = c.created_at,
         reviewed_at = c.reviewed_at,
         distress_notes = n.joined
    FROM collapsed c
    LEFT JOIN notes n ON n.analysis_id = c.analysis_id
   WHERE q.id = c.keep_id
  RETURNING q.id
)
DELETE FROM distress_review_queue q
 WHERE q.id NOT IN (SELECT id FROM kept);

-- 3. One row per analysis.
CREATE UNIQUE INDEX IF NOT EXISTS distress_review_queue_analysis_id_key
  ON distress_review_queue (analysis_id)
  WHERE analysis_id IS NOT NULL;

-- 4. Forward-only status.
CREATE OR REPLACE FUNCTION public.distress_review_queue_forward_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.distress_review_status_rank(NEW.status) < public.distress_review_status_rank(OLD.status) THEN
    RAISE EXCEPTION 'distress_review_queue status may only move forward (% -> %)', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS distress_review_queue_forward_only ON distress_review_queue;
CREATE TRIGGER distress_review_queue_forward_only
  BEFORE UPDATE OF status ON distress_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.distress_review_queue_forward_only();

-- 5. Agent run ledger.
CREATE TABLE IF NOT EXISTS agent_runs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       text        NOT NULL,
  status      text        NOT NULL DEFAULT 'running'
              CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary     jsonb
);
CREATE INDEX IF NOT EXISTS agent_runs_agent_started_idx ON agent_runs (agent, started_at DESC);
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE agent_runs IS
  'One row per scheduled agent run. claim_agent_run refuses a second run inside the window, so a duplicate scheduler exits. summary holds counts only, never user content. Service role only.';

-- Returns the new run id, or NULL when another run of this agent is still
-- running (started within p_running_timeout) or succeeded within
-- p_min_interval. The advisory lock makes check-and-insert atomic.
CREATE OR REPLACE FUNCTION public.claim_agent_run(
  p_agent text,
  p_min_interval interval,
  p_running_timeout interval DEFAULT interval '2 hours'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('agent_run:' || p_agent));
  IF EXISTS (
    SELECT 1 FROM agent_runs
     WHERE agent = p_agent
       AND ((status = 'running' AND started_at > now() - p_running_timeout)
         OR (status = 'succeeded' AND started_at > now() - p_min_interval))
  ) THEN
    RETURN NULL;
  END IF;
  INSERT INTO agent_runs (agent) VALUES (p_agent) RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

CREATE OR REPLACE FUNCTION public.finish_agent_run(p_id uuid, p_status text, p_summary jsonb DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE agent_runs
     SET status = p_status, finished_at = now(), summary = p_summary
   WHERE id = p_id
$$;

REVOKE ALL ON FUNCTION public.claim_agent_run(text, interval, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_agent_run(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
