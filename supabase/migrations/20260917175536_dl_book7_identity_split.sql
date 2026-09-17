-- Diogenes Laertius Book VII identity split.
--
-- Two problems, one cause.
--
-- 1. `Lives Book7` is a filename artifact, not a work name -- the identity
--    failure CLAUDE.md warns about. It is R. D. Hicks's 1925 Loeb translation
--    of Book VII, ingested 2026-07-17 by academy/web/src/scripts/ingest-dl7.ts,
--    and it is renamed here to `Lives of Eminent Philosophers, Book VII`, a
--    sibling of the complete work rather than a stray identity beside it.
--
-- 2. Book VII is in the corpus twice. The Hicks ingest existed *because* a
--    decision had already been made: its own header says it "replace[s] the
--    Yonge Diogenes Laertius Book VII rows with the Hicks translation ...
--    which carries the canonical section numbering -- so citations like
--    'DL 7.87' machine-verify", the Yonge text having no section numbers
--    (its [N] brackets are footnote markers). On 2026-09-15 the complete
--    Yonge Lives was ingested for Books 1-6 and 8-10 (the Cynics, Epicurus)
--    per ACQUISITION_PLAN.md Tier A, and Book VII came in with it, silently
--    undoing that decision. The plan had anticipated exactly this and asked
--    for a deliberate choice: "decide deliberately whether to hold both
--    renderings of Book 7 or to exclude Yonge's Book 7 at ingest ... it must
--    be a decision rather than an accident."
--
-- The decision is Hicks, for the reason it was Hicks in July, and because
-- Yonge's Book VII locators are not DL section numbers at all. They are
-- book.life ordinals:
--
--   7.1  Life of Zeno        77 chunks (281-357)
--   7.2  Life of Ariston      2 chunks
--   7.3  Life of Herillus     1 chunk
--   7.4  Life of Dionysius    1 chunk
--   7.5  Life of Cleanthes    6 chunks
--   7.6  Life of Chrysippus  10 chunks
--
-- So all 77 chunks of Zeno's life -- including every doctrinal passage Hicks
-- numbers 7.39 through 7.160 -- claim to be "DL 7.1". A retrieved Yonge chunk
-- cited by its own locator cites the wrong passage. That is worse than an
-- absent locator, which is why this is a correction and not a preference:
-- Part 5 rule 3 requires a locator that makes the passage citable, and these
-- make it falsely citable.
--
-- Boundaries were read from the chunk text, and the seams are clean -- no
-- chunk needs adjudicating by majority:
--   280  closes Book VI: "...and now we must pass on to the Stoics, of which
--        sect the founder was Zeno, who had been a disciple of Crates."
--   281  opens Book VII: "Zeno was the son of Mnaseas, or Demeas..."
--   377  ends Book VII, in the Chrysippus catalogue
--   378  opens Book VIII: "Since we have now gone through the Ionian
--        philosophy, which was derived from Thales..."
--
-- Yonge's Books 1-6 and 8-10 are untouched and stay live. They are what the
-- September ingest was for, and nothing else in the corpus holds them.
--
-- Deprecated rows keep their work, their chunk_index and their own accurate
-- provenance, per CLAUDE.md: deprecate, never delete. Keeping the indices
-- means no gap opens in the Yonge sequence for corpus.sequence_gaps to find,
-- and retrieval_log history still resolves. Nothing references these rows
-- today -- 0 rows in concept_passage_map, 0 in retrieval_log -- so nothing
-- breaks; the Hicks rows that supersede them carry 2 concept references and
-- 3 logged retrievals.
--
-- Embeddings are of raw chunk_text with no metadata prefix
-- (academy/corpus-ingestion/embedder.js), so renaming a work does not
-- invalidate any vector and nothing needs re-embedding.

begin;

-- Guard: abort unless the corpus is in the exact shape this migration expects.
do $$
declare
  n_hicks int; n_yonge_bk7 int; n_collide int; n_dep_bk7 int;
begin
  select count(*) filter (where work = 'Lives Book7' and not deprecated),
         count(*) filter (where work = 'Lives of Eminent Philosophers'
                            and chunk_index between 281 and 377 and not deprecated),
         count(*) filter (where work = 'Lives of Eminent Philosophers, Book VII'),
         count(*) filter (where work = 'Lives of Eminent Philosophers'
                            and chunk_index between 281 and 377 and deprecated)
    into n_hicks, n_yonge_bk7, n_collide, n_dep_bk7
  from rag_corpus where author = 'Diogenes Laërtius';

  if n_hicks <> 87 or n_yonge_bk7 <> 97 or n_collide <> 0 or n_dep_bk7 <> 0 then
    raise exception 'unexpected pre-state: hicks=% yonge_bk7=% collide=% already_dep=% (expected 87/97/0/0)',
      n_hicks, n_yonge_bk7, n_collide, n_dep_bk7;
  end if;
end $$;

-- 1. Give the Hicks ingest a work name instead of a filename fragment.
update rag_corpus
   set work = 'Lives of Eminent Philosophers, Book VII'
 where author = 'Diogenes Laërtius' and work = 'Lives Book7';

-- 2. Deprecate Yonge's Book VII, superseded by Hicks for the reasons above.
update rag_corpus
   set deprecated = true
 where author = 'Diogenes Laërtius'
   and work = 'Lives of Eminent Philosophers'
   and chunk_index between 281 and 377;

-- 3. The question map followed the old identity. All four Yonge registrations
--    claim Book 7 material Yonge no longer supplies, and the Hicks ingest --
--    now the Book VII of record -- had no registrations at all, which Part 5
--    rule 4 requires of every work.
update corpus_question_registrations
   set position = 'Reports the Epicurean denial of providence and divine concern (Book 10) beside the Pythagorean and Presocratic cosmologies (Books 8-9). The Stoic doctrine that the cosmos is a living rational being governed by providence is held for this author in Book VII, tr. Hicks.',
       note = 'Doxography; registered at queue time, 2026-09-14. Book 7 claim moved to the Hicks Book VII registration, 2026-09-17.'
 where id = 'a076ef31-b64e-49c5-a247-49149a831ad1';

update corpus_question_registrations
   set position = 'Reports the Epicurean end of pleasure (Book 10) beside the Cynic sufficiency of virtue without doctrine (Book 6). The Stoic thesis that virtue alone suffices is held for this author in Book VII, tr. Hicks.',
       note = 'Doxography; registered at queue time, 2026-09-14. Book 7 claim moved to the Hicks Book VII registration, 2026-09-17.'
 where id = 'c10647f3-271f-4204-ad59-ef787174d23a';

update corpus_question_registrations
   set position = 'Reports the Cynic rejection of civic life (Book 6) beside the Epicurean counsel to live unnoticed (Book 10). The Stoic view that the sage takes part in politics unless something prevents him is held for this author in Book VII, tr. Hicks.',
       note = 'Doxography; registered at queue time, 2026-09-14. Book 7 claim moved to the Hicks Book VII registration, 2026-09-17.'
 where id = 'a465b6da-2303-4cb9-8262-61f7fe74b1bb';

update corpus_question_registrations
   set position = 'Reports the Epicurean view that the soul disperses at death (Book 10) and the Pythagorean transmigration (Book 8). The Stoic view that the soul survives the body for a time and perishes at the conflagration is held for this author in Book VII, tr. Hicks.',
       note = 'Doxography; registered at queue time, 2026-09-14. Book 7 claim moved to the Hicks Book VII registration, 2026-09-17.'
 where id = '1aff4840-43bf-4893-9532-fb08671125dd';

insert into corpus_question_registrations (question_id, author, work, position, role, note, source)
values
  ('Q01', 'Diogenes Laërtius', 'Lives of Eminent Philosophers, Book VII',
   'Reports the Stoic doctrine that the cosmos is a living rational being governed by providence, and that the whole is administered by reason and by fate (7.134-7.149).',
   'states', 'Doxography. Registered when Book VII became the Hicks text of record, 2026-09-17.', 'manual'),
  ('Q04', 'Diogenes Laërtius', 'Lives of Eminent Philosophers, Book VII',
   'Reports the Stoic thesis that virtue alone suffices for happiness, and the division of things into good, bad and indifferent that the thesis rests on (7.94-7.107).',
   'states', 'Doxography. Registered when Book VII became the Hicks text of record, 2026-09-17.', 'manual'),
  ('Q10', 'Diogenes Laërtius', 'Lives of Eminent Philosophers, Book VII',
   'Reports the Stoic view that the sage will take part in politics unless something prevents him (7.121).',
   'states', 'Doxography. Registered when Book VII became the Hicks text of record, 2026-09-17.', 'manual'),
  ('Q11', 'Diogenes Laërtius', 'Lives of Eminent Philosophers, Book VII',
   'Reports the Stoic view that the soul survives the body for a time and perishes at the conflagration (7.156-7.157).',
   'states', 'Doxography. Registered when Book VII became the Hicks text of record, 2026-09-17.', 'manual'),
  ('Q03', 'Diogenes Laërtius', 'Lives of Eminent Philosophers, Book VII',
   'Reports the Stoic criterion of truth: the cognitive impression, the impression as an imprint on the soul, and assent as what is up to us (7.45-7.54).',
   'states', 'Doxography. The corpus holds almost nothing on Q03 from a primary text; this is the fullest surviving ancient statement of the Stoic position. Registered 2026-09-17.', 'manual');

-- Guard: abort unless the split landed exactly as intended.
do $$
declare
  n_bk7 int; n_old int; n_yonge_live int; n_yonge_dep int; n_reg_bk7 int; n_bad_loc int;
begin
  select count(*) filter (where work = 'Lives of Eminent Philosophers, Book VII' and not deprecated),
         count(*) filter (where work = 'Lives Book7'),
         count(*) filter (where work = 'Lives of Eminent Philosophers' and not deprecated),
         count(*) filter (where work = 'Lives of Eminent Philosophers' and deprecated)
    into n_bk7, n_old, n_yonge_live, n_yonge_dep
  from rag_corpus where author = 'Diogenes Laërtius';

  -- 544 live Yonge minus the 97 Book VII rows; 16 already-deprecated Epicurus
  -- apparatus rows plus those 97.
  if n_bk7 <> 87 or n_old <> 0 or n_yonge_live <> 447 or n_yonge_dep <> 113 then
    raise exception 'unexpected post-state: book7=% old_name=% yonge_live=% yonge_dep=% (expected 87/0/447/113)',
      n_bk7, n_old, n_yonge_live, n_yonge_dep;
  end if;

  -- No live row may still carry a book.life locator pretending to be a DL
  -- section number: that is the defect this migration exists to remove.
  select count(*) into n_bad_loc
  from rag_corpus
  where author = 'Diogenes Laërtius' and not deprecated
    and locator ~ '^7\.[0-9]+$' and work <> 'Lives of Eminent Philosophers, Book VII';
  if n_bad_loc <> 0 then
    raise exception '% live rows still carry a book.life locator', n_bad_loc;
  end if;

  select count(*) into n_reg_bk7 from corpus_question_registrations
   where work = 'Lives of Eminent Philosophers, Book VII';
  if n_reg_bk7 <> 5 then
    raise exception 'unexpected Book VII registrations: % (expected 5)', n_reg_bk7;
  end if;

  if exists (
    select 1 from rag_corpus
     where author = 'Diogenes Laërtius' and not deprecated
       and work = 'Lives of Eminent Philosophers, Book VII'
       and (translator is distinct from 'R.D. Hicks' or edition_year is distinct from 1925)
  ) then
    raise exception 'live Book VII rows are missing provenance';
  end if;
end $$;

commit;
