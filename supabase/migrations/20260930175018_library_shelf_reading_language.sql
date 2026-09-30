-- ============================================================
-- library_shelf(): one reading language per work — 2026-09-30
--
-- The shelf groups rag_corpus by (author, work, text_type) and reported
-- min(language), min(translator) and min(source_url) over the whole group.
-- That was harmless while every work held one language. Musonius Rufus'
-- Lectures now holds two: the eulogikon Greek (46 rows, chunk_index 0-45) and
-- Lutz's English (85 rows, 46-130, promoted 2026-09-29). The shelf called the
-- work ancient_greek, because 'ancient_greek' < 'english', and its excerpt,
-- chosen an eighth of the way into the whole group, was Greek:
--
--     "γε φιλόσοφον εὐθὺς καὶ βασιλικὸν εἶναι. [95] ### 8 (100) ..."
--
-- The Library reads English, so a work now has one reading language:
-- english when it has any English rows, otherwise its only (or least) one.
-- The language, translator, source_url and excerpt all come from the rows in
-- that language, so a card describes the text it shows. chunk_count stays
-- the whole work, because the reader pages through every live row.
--
-- For a work in one language, which on 2026-09-30 is every work but the
-- Lectures, each value is what it was: the per-language group is the whole
-- group, and the excerpt offset is the same eighth of the same count.
--
-- library_works() holds the rule, so the shelf and the excerpt refresh cannot
-- disagree about which language a work is read in. The excerpt cache gains a
-- language column and matches on it, so the one run of
-- refresh_library_excerpts() below rewrites every cached row in place (their
-- language is null until then) and nothing is deleted.
-- ============================================================

-- One row per shelf work, with its reading language and the rows in it.
CREATE OR REPLACE FUNCTION public.library_works()
RETURNS TABLE (
  author text,
  work text,
  text_type text,
  chunk_count bigint,
  language text,
  language_count bigint,
  translator text,
  source_url text
)
LANGUAGE sql
STABLE
AS $$
  WITH per_language AS (
    SELECT r.author, r.work, r.text_type, r.language,
           count(*)          AS n,
           min(r.translator) AS translator,
           min(r.source_url) AS source_url
    FROM rag_corpus r
    WHERE r.deprecated = false
    GROUP BY r.author, r.work, r.text_type, r.language
  ),
  reading AS (
    SELECT p.author, p.work, p.text_type,
           sum(p.n)::bigint AS chunk_count,
           coalesce(max(p.language) FILTER (WHERE p.language = 'english'), min(p.language)) AS language
    FROM per_language p
    GROUP BY p.author, p.work, p.text_type
  )
  SELECT w.author, w.work, w.text_type, w.chunk_count, w.language,
         p.n AS language_count, p.translator, p.source_url
  FROM reading w
  JOIN per_language p
    ON p.author = w.author
   AND p.work = w.work
   AND p.text_type = w.text_type
   AND p.language IS NOT DISTINCT FROM w.language;
$$;

ALTER TABLE public.library_excerpts ADD COLUMN IF NOT EXISTS language text;

-- One work's excerpt, by the same rule as before, within its reading
-- language: skip the first eighth of those rows to clear front matter and
-- prefaces, then take the first passage of real length.
DROP FUNCTION IF EXISTS public.library_excerpt_for(text, text, text, bigint);
CREATE OR REPLACE FUNCTION public.library_excerpt_for(
  p_author text,
  p_work text,
  p_text_type text,
  p_language text,
  p_language_count bigint
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
    AND r.language IS NOT DISTINCT FROM p_language
    AND r.deprecated = false
    AND r.chunk_text NOT ILIKE '%project gutenberg%'
    AND length(r.chunk_text) > 200
  ORDER BY r.chunk_index ASC
  OFFSET greatest(0, (p_language_count / 8)::int)
  LIMIT 1;
$$;

-- As before, plus: a cached row is stale when the work's reading language
-- has changed, not only its passage count.
CREATE OR REPLACE FUNCTION public.refresh_library_excerpts()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  written integer := 0;
BEGIN
  WITH live AS (
    SELECT * FROM public.library_works()
  ),
  stale AS (
    SELECT l.author, l.work, l.text_type, l.chunk_count, l.language, l.language_count
    FROM live l
    LEFT JOIN library_excerpts c
      ON c.author = l.author AND c.work = l.work AND c.text_type = l.text_type
    WHERE c.author IS NULL
       OR c.chunk_count <> l.chunk_count
       OR c.language IS DISTINCT FROM l.language
  ),
  upserted AS (
    INSERT INTO library_excerpts (author, work, text_type, chunk_count, language, excerpt, refreshed_at)
    SELECT s.author, s.work, s.text_type, s.chunk_count, s.language,
           public.library_excerpt_for(s.author, s.work, s.text_type, s.language, s.language_count),
           now()
    FROM stale s
    ON CONFLICT (author, work, text_type) DO UPDATE
      SET chunk_count = excluded.chunk_count,
          language = excluded.language,
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

-- The shelf. Same columns as before. The cache hit now also requires the
-- reading language to match; a miss falls back to the lateral, within that
-- language.
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
    SELECT * FROM public.library_works()
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
   AND c.language = g.language
  LEFT JOIN LATERAL (
    SELECT r.chunk_text
    FROM rag_corpus r
    -- Only when the cache missed. On a hit this is false for the row and
    -- the scan is never entered.
    WHERE c.author IS NULL
      AND r.author = g.author
      AND r.work = g.work
      AND r.text_type = g.text_type
      AND r.language IS NOT DISTINCT FROM g.language
      AND r.deprecated = false
      AND r.chunk_text NOT ILIKE '%project gutenberg%'
      AND length(r.chunk_text) > 200
    ORDER BY r.chunk_index ASC
    OFFSET greatest(0, (g.language_count / 8)::int)
    LIMIT 1
  ) fresh ON true
  ORDER BY g.text_type, g.author, g.work;
$$;

-- Rewrite the cache once under the new rule so the first request after this
-- migration is already fast.
SELECT public.refresh_library_excerpts();
