-- seminar_corpus_catalog(): the works the Seminar Builder's Syllabus agent
-- may assign, one row per live (author, work, text_type), with the work's
-- section labels in reading order. Seminar Track spec, Part 4.
--
-- An aggregate, because rag_corpus is far over the 1,000 row cap a plain
-- select returns. Labels are ordered by the first chunk_index that carries
-- them; a work whose chunks carry no label returns an empty list, and the
-- builder locates its readings by search instead. Synthesis is left out:
-- it is teaching material, never an assigned reading.
--
-- Service role only.

create function public.seminar_corpus_catalog()
returns table (author text, work text, text_type text, chunks integer, labels text[])
language sql
stable
set search_path = public
as $$
  with live as (
    select r.author, r.work, r.text_type, r.section_label, r.chunk_index
    from rag_corpus r
    where not coalesce(r.deprecated, false)
      and r.text_type <> 'synthesis'
  ),
  by_label as (
    select l.author, l.work, l.text_type, l.section_label, min(l.chunk_index) as first_index, count(*) as n
    from live l
    group by 1, 2, 3, 4
  )
  select b.author, b.work, b.text_type, sum(b.n)::integer,
         coalesce(array_agg(b.section_label order by b.first_index)
                    filter (where coalesce(b.section_label, '') <> ''), '{}')
  from by_label b
  group by 1, 2, 3
  order by 1, 2, 3
$$;

revoke all on function public.seminar_corpus_catalog() from public, anon, authenticated;
