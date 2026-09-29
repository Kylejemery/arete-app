-- Musonius Rufus, Minor Fragments chunk 4 (eulogikon.org): the row holds only
-- eulogikon's "License and provenance" note, no Musonius. Deprecated, not
-- deleted, at Kyle's request (2026-09-29). The same note at the end of three
-- Greek rows (Lectures 45, Minor Fragments 3, Spurious Letters 4) stays, as
-- those rows carry Greek text.

do $$
declare n int;
begin
  update public.rag_corpus
     set deprecated = true
   where author = 'Musonius Rufus'
     and work = 'Minor Fragments'
     and chunk_index = 4
     and source_url like 'https://eulogikon.org/works/musonius-%'
     and chunk_text like '## License and provenance%'
     and not deprecated;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'expected 1 Musonius license-note row, updated %', n;
  end if;
end $$;
