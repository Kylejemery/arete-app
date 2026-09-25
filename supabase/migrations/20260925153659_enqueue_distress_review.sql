-- Activation plan, Part 1: the only write path into distress_review_queue.
--
-- The unique index on analysis_id is partial (WHERE analysis_id IS NOT NULL),
-- and PostgREST's upsert cannot name a partial index as its conflict target,
-- so the journal agent inserts through this function instead:
-- insert ... on conflict (analysis_id) do nothing. An analysis that already
-- has a row, whatever its status, is never enqueued again. Returns true when
-- a row was inserted. Service role only.
CREATE OR REPLACE FUNCTION public.enqueue_distress_review(
  p_user_id uuid,
  p_analysis_id uuid,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO distress_review_queue (user_id, analysis_id, distress_notes, status)
  VALUES (p_user_id, p_analysis_id, p_notes, 'pending')
  ON CONFLICT (analysis_id) WHERE analysis_id IS NOT NULL DO NOTHING;
  RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION public.enqueue_distress_review(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
