-- Can a retrieved passage be cited?
--
-- Part 5 rule 3 of the acquisition plan requires a `locator` wherever a text
-- has canonical divisions -- book, chapter, section, letter, Stephanus number
-- -- so that a retrieved passage is citable as "Discourses 1.14" without a
-- human going back to the source. Nothing checked whether the locators that
-- exist actually do that.
--
-- They do not always. Yonge's complete Diogenes Laertius carried `7.x`
-- locators that looked canonical and were `book.life` ordinals, so all 77
-- chunks of Zeno's life cited as DL 7.1 and all 71 chunks of Book 10 -- the
-- Letter to Menoeceus and the Principal Doctrines among them -- cited as
-- DL 10.1. A missing locator makes a passage uncitable; a wrong one makes it
-- falsely citable, and nothing downstream can tell the difference. Book VII
-- was repaired by 20260917175536_dl_book7_identity_split; the other nine
-- books still carry the scheme, which is why this became a query rather than
-- a note.
--
-- This function aggregates; the probe thresholds, so the judgement stays in
-- server/lib/quality-audit/probes-corpus.js and in agent_config rather than
-- needing a migration to tune.
--
-- Thresholds were calibrated against the live corpus, not guessed. Twelve
-- works carry locators, and the discriminating statistic is the MEDIAN number
-- of chunks per locator, not the worst one:
--
--   work                                median  worst  verdict
--   Diogenes Laertius, Lives (Yonge)         3     71  scheme is book.life
--   Seneca, Letters                          1     18  fine
--   Seneca, On Anger                         1     29  fine
--   Epictetus, Discourses                    1     24  fine
--   Augustine, The City of God               1     17  fine
--   everything else                          1     <7  fine
--
-- The worst-locator statistic would have flagged four well-parsed works and
-- caught nothing. `Discourses 4.1` really is the longest chapter in the
-- Discourses, `On Anger 2.10` and `City of God 22.8` are likewise genuinely
-- long divisions, and Augustine's 636 distinct locators over 1006 chunks is
-- what a correct parse looks like. Only the median separates a scheme pitched
-- at the wrong level from a correct scheme with a long chapter in it, which is
-- the difference between a probe that is read and a probe that is ignored.
--
-- Scoped to the layers that claim to reproduce a text with divisions of its
-- own. A synthesis or a Mode 2 summary has no canonical divisions to carry.

create or replace function public.quality_audit_locator_quality()
returns table (
  author text,
  work text,
  chunks bigint,
  located bigint,
  distinct_locators bigint,
  median_chunks_per_locator integer,
  worst_locator text,
  worst_locator_chunks bigint,
  first_ingest date
)
language sql
stable
as $$
  with live as (
    select author, work, locator, created_at
      from rag_corpus
     where deprecated = false
       and text_type in ('primary', 'scholarship', 'modern_primary')
  ),
  per_work as (
    select author, work,
           count(*) as chunks,
           count(locator) as located,
           count(distinct locator) as distinct_locators,
           min(created_at)::date as first_ingest
      from live
     group by author, work
  ),
  per_locator as (
    select author, work, locator, count(*) as n
      from live
     where locator is not null
     group by author, work, locator
  ),
  spread as (
    select author, work,
           percentile_disc(0.5) within group (order by n)::int as median_chunks_per_locator,
           (array_agg(locator order by n desc, locator))[1] as worst_locator,
           max(n) as worst_locator_chunks
      from per_locator
     group by author, work
  )
  select w.author, w.work, w.chunks, w.located, w.distinct_locators,
         s.median_chunks_per_locator, s.worst_locator, s.worst_locator_chunks,
         w.first_ingest
    from per_work w
    left join spread s on s.author = w.author and s.work = w.work
   order by w.author, w.work
$$;

comment on function public.quality_audit_locator_quality() is
  'Per-work locator granularity: whether a retrieved passage can actually be cited (acquisition plan Part 5 rule 3). For the Quality Audit Agent.';
