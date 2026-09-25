-- Personalization run C, Part C4: telling the people who asked when their
-- idea ships.
--
-- A cluster is marked shipped only with a module registry key (the check on
-- feature_request_clusters, and the server refuses an unknown key). Each
-- person who asked is then told once per cluster: a counselor line in their
-- Cabinet thread, a push, and a proposal card (adjustment_proposals with
-- source 'feature_shipped' and this cluster_id) to turn the practice on.
ALTER TABLE adjustment_proposals
  ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES feature_request_clusters(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS adjustment_proposals_one_notice_per_cluster
  ON adjustment_proposals (user_id, cluster_id)
  WHERE cluster_id IS NOT NULL;

-- Appends one message to a person's solo Cabinet thread in a single
-- statement (no read-modify-write race with the app), creating the thread if
-- they have none. Service role only.
CREATE OR REPLACE FUNCTION public.append_cabinet_message(p_user_id uuid, p_message jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF jsonb_typeof(p_message) <> 'object' THEN
    RAISE EXCEPTION 'message must be an object';
  END IF;
  SELECT id INTO v_id
    FROM cabinet_conversations
   WHERE user_id = p_user_id AND counselor_slugs IS NULL AND session_type = 'solo'
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO cabinet_conversations (user_id, messages)
    VALUES (p_user_id, jsonb_build_array(p_message))
    RETURNING id INTO v_id;
  ELSE
    UPDATE cabinet_conversations
       SET messages = messages || jsonb_build_array(p_message),
           updated_at = now()
     WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.append_cabinet_message(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_cabinet_message(uuid, jsonb) TO service_role;
