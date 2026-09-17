-- quality_audit_mode2_lengths: tell a long summary from a verbatim ingest.
--
-- The first cut flagged every Mode 2 work over a word budget as a possible
-- verbatim ingest wearing the summary label. Reading the flagged chunks showed
-- the framing was wrong. Holiday's Stillness is the Key, Postman's Amusing
-- Ourselves to Death and Mates's Stoic Logic are all real rewrites — they run
-- to twenty thousand words because they are chapter-by-chapter treatments
-- rather than the Paper Agent's 500-900 word abstracts. Length alone says
-- nothing about copyright, and a critical finding that is wrong every night is
-- worse than no finding at all.
--
-- What does separate the two is voice. A Mode 2 summary talks *about* its
-- author in the third person — "Holiday argues", "Postman contends", "Mates
-- notes" — because the agent wrote it. Verbatim text by that author almost
-- never names them. Measured across the live Mode 2 layers, every long work
-- scores 0.98 or better, which is what a rewrite looks like; a verbatim ingest
-- would sit near zero.
--
-- So return the rate and let the agent rank on it. Length becomes an
-- observation about retrieval weight; voice becomes the copyright signal.

-- Adding an out-column changes the return type, which create-or-replace cannot
-- do. Nothing but the audit agent calls this, so dropping it is safe.
drop function if exists public.quality_audit_mode2_lengths();

create function public.quality_audit_mode2_lengths()
returns table (
  author text,
  work text,
  text_type text,
  chunks bigint,
  total_words bigint,
  first_ingest date,
  attribution_rate numeric
)
language sql
stable
as $$
  with live as (
    select * from rag_corpus
    where deprecated = false
      and text_type in ('paper_summary', 'modern_summary')
  ),
  named as (
    -- First author's surname: cut at the first comma or " and ", then keep the
    -- last word. Multi-author strings are common in the paper layer and only
    -- the first name is needed for the test.
    select l.*,
           nullif(regexp_replace(
             split_part(split_part(l.author, ',', 1), ' and ', 1),
             '^.*\s', ''), '') as surname
    from live l
  )
  select author, work, text_type,
         count(*) as chunks,
         coalesce(sum(word_count), 0) as total_words,
         min(created_at)::date as first_ingest,
         round(
           count(*) filter (
             where surname is not null
               and length(surname) > 2
               and chunk_text ilike '%' || surname || '%'
           )::numeric / greatest(count(*), 1), 3) as attribution_rate
  from named
  group by author, work, text_type
  order by count(*) desc
$$;

comment on function public.quality_audit_mode2_lengths() is
  'Per-work size and third-person attribution rate of the Mode 2 summary layers, for the Quality Audit Agent.';
