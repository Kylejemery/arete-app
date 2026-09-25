-- Personalization run C, Part C3: ideas the Cabinet passed along to the
-- person who builds Arete, grouped by need.
--
-- feature_requests
--   The closing voice asks "Want me to pass this idea along to the person
--   who builds Arete?" and the card records the answer. Nothing is kept
--   unless the person says yes.
--   need_draft    the counselor's plain wording of the wish, held only until
--                 it is summarized (or cleared on decline).
--   need_summary  a Haiku rewrite: one neutral sentence, no personal details.
--                 This is all the admin page ever shows.
--   embedding     text-embedding-3-small of need_summary, for clustering.
--
-- feature_request_clusters
--   Requests with a similar need. centroid is the mean of its requests'
--   embeddings; a new request joins the nearest open cluster at cosine
--   similarity 0.82 or above, or starts its own. A cluster can be marked
--   shipped only with a registry module_key (Part C4).
--
-- Written by the server (service role); the requester can read their own
-- requests; clusters are admin-only (read through the academy admin API).
CREATE TABLE IF NOT EXISTS feature_request_clusters (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  centroid      vector(1536),
  request_count integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'shipped', 'declined')),
  module_key    text        CHECK (module_key IS NULL OR module_key ~ '^[a-z][a-z_]{0,39}$'),
  shipped_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_request_clusters_shipped_needs_module CHECK (status <> 'shipped' OR module_key IS NOT NULL)
);
ALTER TABLE feature_request_clusters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feature_request_clusters FROM anon, authenticated;
COMMENT ON TABLE feature_request_clusters IS
  'Feature requests grouped by need (run C). Admin only; no identities. status shipped requires a module registry key.';

CREATE TABLE IF NOT EXISTS feature_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  counselor_id    text,
  status          text        NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'submitted', 'declined')),
  need_draft      text        CHECK (need_draft IS NULL OR char_length(need_draft) <= 300),
  need_summary    text,
  embedding       vector(1536),
  cluster_id      uuid        REFERENCES feature_request_clusters(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  summarized_at   timestamptz
);
CREATE INDEX IF NOT EXISTS feature_requests_user_created_idx ON feature_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feature_requests_cluster_idx ON feature_requests (cluster_id);
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own feature requests" ON feature_requests;
CREATE POLICY "Users read own feature requests" ON feature_requests
  FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON feature_requests FROM anon, authenticated;
COMMENT ON TABLE feature_requests IS
  'Ideas a person asked the Cabinet to pass along (run C). need_draft is cleared once summarized; the admin sees need_summary only, never who asked.';

-- Puts a summarized request in the nearest open cluster, or a new one, and
-- refreshes that cluster's centroid and count. Service role only.
CREATE OR REPLACE FUNCTION public.assign_feature_request_cluster(p_request_id uuid, p_threshold double precision DEFAULT 0.82)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding vector(1536);
  v_summary   text;
  v_cluster   uuid;
BEGIN
  SELECT embedding, need_summary INTO v_embedding, v_summary
    FROM feature_requests
   WHERE id = p_request_id AND status = 'submitted';
  IF v_embedding IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT c.id INTO v_cluster
    FROM feature_request_clusters c
   WHERE c.status = 'open'
     AND c.centroid IS NOT NULL
     AND 1 - (c.centroid <=> v_embedding) >= p_threshold
   ORDER BY c.centroid <=> v_embedding
   LIMIT 1;

  IF v_cluster IS NULL THEN
    INSERT INTO feature_request_clusters (title, centroid)
    VALUES (left(coalesce(v_summary, 'Untitled need'), 200), v_embedding)
    RETURNING id INTO v_cluster;
  END IF;

  UPDATE feature_requests SET cluster_id = v_cluster WHERE id = p_request_id;

  UPDATE feature_request_clusters c
     SET centroid = s.centroid,
         request_count = s.n,
         updated_at = now()
    FROM (
      SELECT avg(embedding) AS centroid, count(*)::int AS n
        FROM feature_requests
       WHERE cluster_id = v_cluster AND status = 'submitted' AND embedding IS NOT NULL
    ) s
   WHERE c.id = v_cluster;

  RETURN v_cluster;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_feature_request_cluster(uuid, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_feature_request_cluster(uuid, double precision) TO service_role;

-- Cluster counts for the admin Requests tab: distinct requesters, excluding
-- admin and internal accounts (measured_profiles). No identities leave SQL.
CREATE OR REPLACE VIEW public.feature_request_cluster_counts
WITH (security_invoker = true) AS
SELECT c.id AS cluster_id,
       c.title,
       c.status,
       c.module_key,
       c.shipped_at,
       c.created_at,
       count(DISTINCT r.user_id) FILTER (WHERE mp.id IS NOT NULL) AS measured_requesters,
       count(r.id) FILTER (WHERE mp.id IS NOT NULL) AS measured_requests,
       max(r.responded_at) FILTER (WHERE mp.id IS NOT NULL) AS last_requested_at
  FROM feature_request_clusters c
  LEFT JOIN feature_requests r ON r.cluster_id = c.id AND r.status = 'submitted'
  LEFT JOIN measured_profiles mp ON mp.id = r.user_id
 GROUP BY c.id;
REVOKE ALL ON public.feature_request_cluster_counts FROM anon, authenticated;
