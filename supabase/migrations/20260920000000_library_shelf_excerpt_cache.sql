-- ============================================================
-- library_shelf(): take the excerpt off the request path — 2026-09-20
--
-- GET /api/library/texts timed out in production (statement_timeout 8s,
-- inherited from PostgREST's login role). pg_stat_statements on the RPC:
--
--     calls 712 · mean 1743ms · stddev 1328ms · slowest completed 7939ms
--     total database time 1241s · ~194MB of buffer traffic per call
--
-- The slowest call that finished came 61ms under the limit, so the failures
-- are the tail of that distribution crossing it, not a flake. And the cost
-- grows with the corpus, which is designed to compound.
--
-- Measured split of the work:
--
--     the aggregate alone ......  21 ms
--     plus the excerpt ......... 630 ms   (warm cache)
--
-- The excerpt is the whole problem. To choose one 280-character string per
-- work, the lateral index-scans ~110 rows for each of the 123 works, sorts
-- them by chunk_index, then throws away an eighth of them through an OFFSET.
-- Those rows are wide: ~2KB of chunk_text plus a 1536-dimension embedding.
-- So a request fetched ~13,500 wide rows to produce 123 short strings.
--
-- The fix: cache the excerpt, which only changes when the corpus does, and
-- keep the passage counts live, because an admin reads those straight after
-- an ingest.
--
-- Staleness without coordination. rag_corpus has fifteen write paths across
-- the server, the ingestion package, the admin routes and one-off scripts,
-- so a cache that depends on each of them remembering to refresh would rot
-- the first time someone adds a sixteenth. Instead the cache row stores the
-- passage count the excerpt was chosen from, and the join requires it to
-- match the live count. A work whose count moved does not match, falls
-- through to the lateral, and is correct anyway — it just pays the old cost
-- until refresh_library_excerpts() next runs. Nothing can make the shelf
-- wrong; a missed refresh only makes one work slow.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.library_excerpts (
  author      text NOT NULL,
  work        text NOT NULL,
  text_type   text NOT NULL,
  -- The live passage count at the moment this excerpt was chosen. The shelf
  -- joins on it, so a changed work misses the cache rather than serving an
  -- excerpt from a superseded ingest.
  chunk_count bigint NOT NULL,
  excerpt     text,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (author, work, text_type)
);

-- Derived from rag_corpus and rebuildable at any time, so it is service-role
-- only like the rest of the corpus furniture. The shelf reaches it through
-- library_shelf(), which is what the public endpoint calls.
ALTER TABLE public.library_excerpts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.library_excerpts FROM anon, authenticated;

-- One work's excerpt, by the same rule the shelf has always used: skip the
-- first eighth of the text to clear Project Gutenberg front matter and
-- translators' prefaces, then take the first passage of real length.
CREATE OR REPLACE FUNCTION public.library_excerpt_for(
  p_author text,
  p_work text,
  p_text_type text,
  p_chunk_count bigint
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT r.chunk_text
  FROM rag_corpus r
  WHERE r.author = p_author
    AND r.work = p_work
    AND r.text_type = p_text_type
    AND r.deprecated = false
    AND r.chunk_text NOT ILIKE '%project gutenberg%'
    AND length(r.chunk_text) > 200
  ORDER BY r.chunk_index ASC
  OFFSET greatest(0, (p_chunk_count / 8)::int)
  LIMIT 1;
$$;

-- Rebuild the cache for every work whose passage count has moved, or that
-- has no row yet, and drop rows for works that no longer exist. Returns the
-- number of excerpts written. Idempotent and safe to run at any time: a run
-- with nothing to do costs one aggregate.
CREATE OR REPLACE FUNCTION public.refresh_library_excerpts()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  written integer := 0;
BEGIN
  WITH live AS (
    SELECT author, work, text_type, count(*) AS chunk_count
    FROM rag_corpus
    WHERE deprecated = false
    GROUP BY author, work, text_type
  ),
  stale AS (
    SELECT l.author, l.work, l.text_type, l.chunk_count
    FROM live l
    LEFT JOIN library_excerpts c
      ON c.author = l.author AND c.work = l.work AND c.text_type = l.text_type
    WHERE c.author IS NULL OR c.chunk_count <> l.chunk_count
  ),
  upserted AS (
    INSERT INTO library_excerpts (author, work, text_type, chunk_count, excerpt, refreshed_at)
    SELECT s.author, s.work, s.text_type, s.chunk_count,
           public.library_excerpt_for(s.author, s.work, s.text_type, s.chunk_count),
           now()
    FROM stale s
    ON CONFLICT (author, work, text_type) DO UPDATE
      SET chunk_count = excluded.chunk_count,
          excerpt = excluded.excerpt,
          refreshed_at = excluded.refreshed_at
    RETURNING 1
  )
  SELECT count(*) INTO written FROM upserted;

  -- A work that was fully deprecated or deleted leaves the shelf, so its
  -- excerpt should go too.
  DELETE FROM library_excerpts c
  WHERE NOT EXISTS (
    SELECT 1 FROM rag_corpus r
    WHERE r.author = c.author AND r.work = c.work AND r.text_type = c.text_type
      AND r.deprecated = false
  );

  RETURN written;
END;
$$;

-- The shelf. Counts stay live; the excerpt comes from the cache when its
-- count still matches, and from the old lateral when it does not.
CREATE OR REPLACE FUNCTION public.library_shelf()
RETURNS TABLE (
  author text,
  work text,
  text_type text,
  chunk_count bigint,
  translator text,
  language text,
  source_url text,
  excerpt text
)
LANGUAGE sql
STABLE
AS $$
  WITH g AS (
    SELECT author, work, text_type,
           count(*)        AS chunk_count,
           min(translator) AS translator,
           min(language)   AS language,
           min(source_url) AS source_url
    FROM rag_corpus
    WHERE deprecated = false
    GROUP BY author, work, text_type
  )
  SELECT
    g.author, g.work, g.text_type, g.chunk_count,
    g.translator, g.language, g.source_url,
    coalesce(c.excerpt, fresh.chunk_text) AS excerpt
  FROM g
  LEFT JOIN library_excerpts c
    ON c.author = g.author
   AND c.work = g.work
   AND c.text_type = g.text_type
   AND c.chunk_count = g.chunk_count
  LEFT JOIN LATERAL (
    SELECT r.chunk_text
    FROM rag_corpus r
    -- Only when the cache missed. On a hit this is false for the row and
    -- the scan is never entered.
    WHERE c.author IS NULL
      AND r.author = g.author
      AND r.work = g.work
      AND r.text_type = g.text_type
      AND r.deprecated = false
      AND r.chunk_text NOT ILIKE '%project gutenberg%'
      AND length(r.chunk_text) > 200
    ORDER BY r.chunk_index ASC
    OFFSET greatest(0, (g.chunk_count / 8)::int)
    LIMIT 1
  ) fresh ON true
  ORDER BY g.text_type, g.author, g.work;
$$;

-- Fill it once so the first request after this migration is already fast.
SELECT public.refresh_library_excerpts();
