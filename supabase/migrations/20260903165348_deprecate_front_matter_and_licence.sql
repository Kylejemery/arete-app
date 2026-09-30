-- Deprecate the non-primary material that rode in with the public-domain
-- ingests: Project Gutenberg / Standard Ebooks headers, licence text and
-- colophons, and the translators' introductions and endnotes that the source
-- files carry before and after the text proper.
--
-- Why. Every one of these rows sits at text_type = 'primary', so the counselor
-- fence and every agent could retrieve a licence paragraph or a Victorian
-- footnote and present it as a passage from Marcus Aurelius or Epictetus. The
-- reading room showed them too: the Meditations opened on the Gutenberg
-- header and closed on George Long's essay, and 49 of its 179 chunks were not
-- Marcus. The Discourses carried 121 such chunks of 459; the Enchiridion 17
-- of 41. Cleanthes' Hymn to Zeus was one chunk of hymn in ten chunks of
-- licence.
--
-- What is deprecated.
--   (a) Chunks the ingest labelled itself: section_label exactly
--       'front matter' or 'end matter', in the four works that carry those
--       labels. Verified by reading the first and last chunk of each block
--       and, for the Discourses' 112-chunk end matter, by the footnote-return
--       marks (↩) on 106 of them: it is Long's endnotes throughout.
--   (b) Pure licence / colophon runs in works whose ingest wrote no section
--       labels, by inspected chunk-index range. Each run begins on a chunk
--       whose opening is licence text and ends on the ebook's last chunk.
--
-- What is NOT touched.
--   Straddle chunks ('front matter–1.6', '12.36–end matter', '4.13–end
--   matter', '51–end matter', '7.31–end matter', …) carry primary text and
--   stay. So do the chunk-0 rows that open with a one-line attribution and run
--   straight into the text (the Jowett Platos, Sun Tzu, the Analects), and the
--   chunks where text runs out into a licence tail (De Finibus 612, Golden
--   Sayings 66, Apocolocyntosis 16, Morals 322, Memorabilia 201, Tusculan
--   228). Their overlap is a few hundred characters; their text is not.
--
-- Why deprecate the translators' apparatus rather than re-label it. Long on
-- Antoninus and Schweighäuser's notes are real scholarship, but re-labelling
-- these rows to text_type = 'scholarship' would leave them attributed to
-- Marcus Aurelius and Epictetus as author. If wanted, they should be
-- re-ingested as their own work under their own author with full metadata,
-- through the admission tests in docs/corpus/ACQUISITION_PLAN.md Part 4.
--
-- Two ingests need a follow-up of their own, not done here.
--   * Cleanthes, Hymn To Zeus — translator and source_url are NULL, which the
--     write path now requires; the hymn itself is chunks 0–1.
--   * Cicero, De Finibus — the source volume (Yonge, Gutenberg) also contains
--     the Academic Questions and the Tusculan Disputations; 622 chunks under
--     one work title is more than De Finibus alone.
--
-- Deprecate, never delete. Reversible with `set deprecated = false` over the
-- same predicate. The server's library read paths filter deprecated = false
-- from the same commit as this file.

-- 1. The rows. Expected: 248.
update rag_corpus
set deprecated = true
where deprecated = false
  and text_type = 'primary'
  and (
    (section_label in ('front matter', 'end matter')
      and (author, work) in (
        ('Marcus Aurelius', 'Meditations'),
        ('Epictetus', 'Discourses'),
        ('Epictetus', 'Enchiridion'),
        ('Seneca', 'On Benefits')))
    or (author = 'Cicero'    and work = 'De Finibus'            and chunk_index between 613 and 621)
    or (author = 'Cicero'    and work = 'Tusculan Disputations' and chunk_index = 229)
    or (author = 'Cleanthes' and work = 'Hymn To Zeus'          and chunk_index between 2 and 9)
    or (author = 'Epictetus' and work = 'Golden Sayings'        and chunk_index between 67 and 75)
    or (author = 'Seneca'    and work = 'Apocolocyntosis'       and chunk_index between 17 and 24)
    or (author = 'Seneca'    and work = 'Morals'                and chunk_index between 323 and 330)
    or (author = 'Xenophon'  and work = 'Memorabilia'           and chunk_index between 202 and 209)
  );

-- 2. The shelf inventory counted and excerpted over every row, and skipped
-- front matter by a pattern and an offset. It now reads live rows only; the
-- offset stays so the excerpt still comes from a little way into the text.
create or replace function library_shelf()
returns table (
  author text,
  work text,
  text_type text,
  chunk_count bigint,
  translator text,
  language text,
  source_url text,
  excerpt text
)
language sql
stable
as $$
  select
    g.author, g.work, g.text_type, g.chunk_count,
    g.translator, g.language, g.source_url, e.chunk_text as excerpt
  from (
    select author, work, text_type,
           count(*)        as chunk_count,
           min(translator) as translator,
           min(language)   as language,
           min(source_url) as source_url
    from rag_corpus
    where deprecated = false
    group by author, work, text_type
  ) g
  left join lateral (
    select r.chunk_text
    from rag_corpus r
    where r.author = g.author and r.work = g.work and r.text_type = g.text_type
      and r.deprecated = false
      and r.chunk_text not ilike '%project gutenberg%'
      and length(r.chunk_text) > 200
    order by r.chunk_index asc
    offset greatest(0, (g.chunk_count / 8)::int)
    limit 1
  ) e on true
  order by g.text_type, g.author, g.work;
$$;

-- Verify:
--   select author, work,
--          count(*) filter (where deprecated)     as dead,
--          count(*) filter (where not deprecated) as live
--   from rag_corpus where text_type = 'primary'
--   group by 1, 2 having count(*) filter (where deprecated) > 0 order by dead desc;
-- Meditations should read dead 46 / live 133; Discourses 120 / 339.
