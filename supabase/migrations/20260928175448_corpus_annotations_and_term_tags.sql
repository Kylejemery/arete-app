-- Corpus fixes surfaced by the Themata Project's Phase 1 ledger (PR #281,
-- themata/evidence/gaps.md section 3). Three changes, none of which touches
-- chunk_text or an embedding:
--
--   (a) Zeller relabelled. Eduard Zeller, "The Stoics, Epicureans and
--       Sceptics", is 564 rows labelled text_type = 'primary' with translator
--       and edition_year null. It is 19th-century secondary scholarship in
--       Oswald J. Reichel's translation (the title page, chunk 0, reads "NEW
--       AND REVISED EDITION ... 1892"). Its footnotes quote Sextus, Alexander,
--       Simplicius, Galen and Diogenes in Greek and Latin, and for several
--       texts the corpus lacks (Alexander in APr., Simplicius in De Caelo)
--       those quotations are the only witness it holds. So the rows become
--       'scholarship', with the new flag contains_quoted_primary = true
--       recording that primary text is embedded in them. Fence effect: none.
--       server/lib/corpus-fence.js excludes neither 'primary' nor
--       'scholarship' on any fence, so no surface gains or loses Zeller.
--
--   (b) Translation and transcription errors recorded, not corrected. Canon
--       text is never edited. A new table, rag_corpus_annotations, holds
--       editorial notes about a chunk: the derived layer's record of what is
--       wrong with, or missing from, the canonical text. Seven rows: three
--       Hicks renderings in DL VII that change the logic, one abridgement in
--       the corpus copy of DL 7.82, one Yonge rendering in De Fato that
--       inverts Chrysippus's point, and two OCR faults in the same Yonge text.
--
--   (c) Greek term tags. A new column, rag_corpus.greek_terms, carries the
--       Greek technical terms a chunk renders, as lemmas, so that a term the
--       translation hides can still be found. It starts with one row: DL 7.78,
--       where Hicks renders κατά τι τῶν θεμάτων ἢ τινά ("by one or some of the
--       themata") as "in respect of one or more of the premisses", so the
--       only primary passage in the corpus that names the themata never says
--       the word. This complements the concordances
--       (academy/corpus-ingestion/concordance/). A concordance bridges vector
--       search; a tag is exact and filterable.
--
-- NOT APPLIED. Written to be applied through the Supabase migration tool in a
-- later session, with the checks below run first. Until it is applied, merging
-- this file puts an unapplied migration on main, which repo.migration_drift
-- reports. Apply, then merge.
--
-- Every write is keyed by id and guarded by a pre-state check that raises
-- rather than writing to rows that are not what this file expects.

begin;

-- ---------------------------------------------------------------------------
-- Pre-state
-- ---------------------------------------------------------------------------
do $$
declare n_zeller int; n_zeller_primary int; n_targets int;
begin
  select count(*), count(*) filter (where text_type = 'primary')
    into n_zeller, n_zeller_primary
  from public.rag_corpus
  where author = 'Eduard Zeller'
    and work = 'The Stoics, Epicureans and Sceptics'
    and deprecated = false;
  if n_zeller <> 564 or n_zeller_primary <> 564 then
    raise exception 'unexpected Zeller pre-state: rows=% primary=% (expected 564/564)',
      n_zeller, n_zeller_primary;
  end if;

  -- The annotated chunks must be live and must still read as annotated.
  select count(*) into n_targets from public.rag_corpus
  where deprecated = false and (
       (id = 'f9d254ff-01b0-4b37-b98d-9d71132839a9'
        and chunk_text like '%reducible to such as do not admit of, immediate proof in respect of one or more of the premisses%')
    or (id = 'dbaf3427-c4d5-4f04-bd95-b5c332606b3a'
        and chunk_text like '%but it is night, therefore it is not day%'
        and chunk_text like '%employs a conjunction of negative propositions for major premiss%')
    or (id = 'e624f24d-83d0-4efd-98d3-19457ace3554'
        and chunk_text like '%The Veiled is as follows: …%')
    or (id = 'dfd1d864-021a-4b4a-b9b6-71223d8d16fb'
        and chunk_text like '%It is not the case that if any one is born under the dog-star he will be drowned in the sea%'
        and chunk_text like '%excel lent%')
    or (id = '549c888b-0585-43eb-80ed-1e959d7eb678'
        and chunk_text like '%OX FATE. Z6y%')
  );
  if n_targets <> 5 then
    raise exception 'annotation targets changed: % of 5 matched', n_targets;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- (a) Zeller: secondary, with embedded primary quotations
-- ---------------------------------------------------------------------------
alter table public.rag_corpus
  add column if not exists contains_quoted_primary boolean not null default false;

comment on column public.rag_corpus.contains_quoted_primary is
  'True when a non-primary row embeds verbatim primary text (e.g. Greek or Latin quoted in a scholar''s footnotes). The row is still cited as its own author; the quotation is a witness of lower standing than the primary text itself.';

update public.rag_corpus
   set text_type = 'scholarship',
       contains_quoted_primary = true,
       translator = 'Oswald J. Reichel',
       edition_year = 1892
 where author = 'Eduard Zeller'
   and work = 'The Stoics, Epicureans and Sceptics'
   and deprecated = false
   and text_type = 'primary';

-- ---------------------------------------------------------------------------
-- (b) Annotations: the derived layer's notes on canon text
-- ---------------------------------------------------------------------------
create table if not exists public.rag_corpus_annotations (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.rag_corpus(id),
  kind text not null check (kind in ('translation_error', 'abridgement', 'ocr_error')),
  quoted text not null,          -- the words in chunk_text the note is about, verbatim
  note text not null,            -- what is wrong and what the source says instead
  evidence text,                 -- where the correction comes from (chunk ids, editions)
  source text not null,          -- who raised it: 'themata_phase1' | 'manual' | 'quality_audit' ...
  deprecated boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.rag_corpus_annotations is
  'Editorial notes on rag_corpus chunks: translation errors, abridgements and OCR faults in the canonical text, recorded instead of edited. Canon chunk_text is never changed to fix these. Deprecate a note rather than delete it.';

create index if not exists rag_corpus_annotations_chunk_idx
  on public.rag_corpus_annotations (chunk_id) where deprecated = false;

-- Service-role only, like the other editorial tables: no policy for anon or
-- authenticated.
alter table public.rag_corpus_annotations enable row level security;

insert into public.rag_corpus_annotations (chunk_id, kind, quoted, note, evidence, source) values
  ('f9d254ff-01b0-4b37-b98d-9d71132839a9', 'translation_error',
   'reducible to such as do not admit of, immediate proof in respect of one or more of the premisses',
   'DL 7.78. The Greek reads ἀναγόμενοι ἐπὶ τοὺς ἀναποδείκτους κατά τι τῶν θεμάτων ἢ τινά: reduced to the indemonstrables by one or some of the themata. Hicks renders the themata as "premisses", so the term never appears in the English.',
   'Greek quoted in Zeller, ch. V n.241 (rag_corpus 8e7bb081-9d8b-481f-b3ac-57183751efa5).',
   'themata_phase1'),
  ('dbaf3427-c4d5-4f04-bd95-b5c332606b3a', 'translation_error',
   'but it is night, therefore it is not day',
   'DL 7.80, second indemonstrable. The definition in the same sentence requires the minor premise to be the contradictory of the consequent ("it is light"); "it is night" is not its contradictory. Either the example or its rendering is at fault; check the Greek before relying on it.',
   'Internal: the definition immediately preceding in the same chunk.',
   'themata_phase1'),
  ('dbaf3427-c4d5-4f04-bd95-b5c332606b3a', 'translation_error',
   'employs a conjunction of negative propositions for major premiss',
   'DL 7.80, third indemonstrable. The major premise is a negated conjunction ("It is not the case that Plato is both dead and alive"), not a conjunction of negative propositions, as Hicks''s own example shows.',
   'Zeller, ch. V n.230, citing Diog. 80: "it is not at the same time A and B" (rag_corpus 4b20ae16-4914-4fb8-9953-7b8efd451523).',
   'themata_phase1'),
  ('e624f24d-83d0-4efd-98d3-19457ace3554', 'abridgement',
   'The Veiled is as follows: …',
   'DL 7.82. The corpus copy is abridged at three points marked " … ". The description of the Veiled argument is missing, so the Sorites text that follows reads as if it were the Veiled.',
   'Internal: ellipses in chunk_text.',
   'themata_phase1'),
  ('dfd1d864-021a-4b4a-b9b6-71223d8d16fb', 'translation_error',
   'It is not the case that if any one is born under the dog-star he will be drowned in the sea',
   'Cicero, De Fato ch. 8 (Yonge). Chrysippus''s reformulation is a negated conjunction, not a negated conditional: Non et natus est quis oriente Canicula et is in mari morietur. Cicero''s own gloss in the next sentence ("negative indefinite conjunctives") agrees.',
   'Latin quoted in Zeller, ch. V n.221 (rag_corpus 05958d2e-5680-46e2-a7aa-bb5c95a250b7).',
   'themata_phase1'),
  ('dfd1d864-021a-4b4a-b9b6-71223d8d16fb', 'ocr_error',
   'excel lent',
   'OCR split: "excellent".',
   null,
   'themata_phase1'),
  ('549c888b-0585-43eb-80ed-1e959d7eb678', 'ocr_error',
   'OX FATE. Z6y',
   'Running head and page number captured by OCR mid-sentence ("ON FATE." plus a page number). Not part of the text.',
   null,
   'themata_phase1');

-- ---------------------------------------------------------------------------
-- (c) Greek term tags
-- ---------------------------------------------------------------------------
alter table public.rag_corpus
  add column if not exists greek_terms text[] not null default '{}';

comment on column public.rag_corpus.greek_terms is
  'Greek technical terms the chunk renders, as dictionary lemmas in Greek script (e.g. θέμα for thema/themata), so a term a translation hides can be found exactly. Tag where the Greek is known from a cited source; record the source in rag_corpus_annotations or the migration that adds the tag.';

create index if not exists rag_corpus_greek_terms_idx
  on public.rag_corpus using gin (greek_terms);

update public.rag_corpus
   set greek_terms = array['θέμα', 'ἀναπόδεικτος', 'συλλογιστικός']
 where id = 'f9d254ff-01b0-4b37-b98d-9d71132839a9'
   and deprecated = false;

-- ---------------------------------------------------------------------------
-- Post-state
-- ---------------------------------------------------------------------------
do $$
declare n_primary int; n_schol int; n_notes int; n_tagged int;
begin
  select count(*) filter (where text_type = 'primary'),
         count(*) filter (where text_type = 'scholarship' and contains_quoted_primary
                          and translator = 'Oswald J. Reichel' and edition_year = 1892)
    into n_primary, n_schol
  from public.rag_corpus
  where author = 'Eduard Zeller' and work = 'The Stoics, Epicureans and Sceptics'
    and deprecated = false;
  select count(*) into n_notes from public.rag_corpus_annotations where source = 'themata_phase1';
  select count(*) into n_tagged from public.rag_corpus where 'θέμα' = any(greek_terms);

  if n_primary <> 0 or n_schol <> 564 or n_notes <> 7 or n_tagged <> 1 then
    raise exception 'post-state wrong: zeller primary=% scholarship=% notes=% tagged=% (expected 0/564/7/1)',
      n_primary, n_schol, n_notes, n_tagged;
  end if;
end $$;

commit;
