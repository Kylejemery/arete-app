-- Musonius Rufus, eulogikon.org (Lectures, Minor Fragments, Spurious Letters):
-- the texts are Hense's Greek, ingested with language = 'english' and no
-- translator. Relabel the Greek rows 'ancient_greek' (the normalised value;
-- 'greek' is not allowed by rag_corpus_language_normalized_check). Text,
-- chunking and embeddings are untouched.
--
-- Sampled 2026-09-29, all 56 rows: 52 are Greek throughout; the first row of
-- each work opens with eulogikon's English front matter (title, summary) and
-- then the Greek text, and is relabelled with the rest. One row is not Greek
-- and stays 'english': Minor Fragments chunk 4, which is only eulogikon's
-- "License and provenance" note with no Musonius in it. It is left for a
-- separate deprecation decision.

do $$
declare n int;
begin
  update public.rag_corpus
     set language = 'ancient_greek'
   where author = 'Musonius Rufus'
     and work in ('Lectures', 'Minor Fragments', 'Spurious Letters')
     and source_url like 'https://eulogikon.org/works/musonius-%'
     and language = 'english'
     and chunk_text ~ '[ἀ-ῼ]';
  get diagnostics n = row_count;
  if n <> 55 then
    raise exception 'expected 55 Musonius eulogikon Greek rows, updated %', n;
  end if;
end $$;
