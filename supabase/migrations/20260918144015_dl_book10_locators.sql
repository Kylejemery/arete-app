-- Yonge's Diogenes Laertius Book X: locators that are true instead of false.
--
-- All 71 chunks of Book X carried the locator `10.1`. That is a book.life
-- ordinal -- "book 10, first life" -- not a DL section number, so the Letter
-- to Menoeceus and the whole of the Principal Doctrines cited as the opening
-- sentence about Epicurus's parentage. 20260917184834_quality_audit_locator_
-- quality added the probe that reports this class; this repairs the worst
-- instance of it in the corpus.
--
-- WHAT THIS DOES NOT DO, AND WHY.
--
-- It does not give Book X per-section locators, because Yonge's text does not
-- contain section numbers. That is the same fact that sent Book VII to Hicks
-- in July: "the previous text (Yonge, Gutenberg) has no section numbers (its
-- [N] brackets are footnote markers)". Verified again here rather than taken
-- on trust -- the Principal Doctrines run as consecutive quoted paragraphs
-- with no numerals at all, which is also why the Arabic numbers already in
-- `section_label` ("3-9", "37-43") cannot be used: they are a derived
-- paragraph count, and they run past 43 where the canonical Doctrines stop at
-- 40, so they do not correspond to KD numbering either.
--
-- The structurally correct fix is the Book VII remedy: ingest Hicks's numbered
-- 1925 Book X and deprecate Yonge's. That needs the source text, and this
-- environment's egress policy denies gutenberg.org, en.wikisource.org,
-- archive.org and perseus.tufts.edu alike, so it is left for a session that
-- can fetch one.
--
-- What is fixed is the falsehood. Each chunk now carries the canonical section
-- range of the document it belongs to. Those ranges are standard and they are
-- contiguous and complete over 10.1-10.154, which is a check on them: every
-- section of Book X is accounted for exactly once. A range locator is also
-- self-describing in a way `10.1` was not -- it shows on its face that it
-- names a region, so nothing reads it as a passage-level citation.
--
-- The boundaries were read from the chunk text, from the headings Yonge's
-- translation does provide:
--
--   473  "Epicurus was an Athenian, and the son of Neocles"      biography opens
--   484  closes with "...concerning the divisions of philosophy which he adopted"
--   485  "Now he divides philosophy into three parts."           canonic opens
--   487  closes with "Let us now go to the letter:-"
--   488  "EPICURUS TO HERODOTUS, WISHING HE MAY DO WELL."
--   512  SEAM: Herodotus ends and "EPICURUS TO PYTHOCLES" begins at
--        character 1214 of 1838, so 66% is Herodotus
--   513  the Pythocles letter proper
--   527  "Such are his sentiments on the heavenly phaenomena."   the sage
--   529  closes with "EPICURUS TO MENOECEUS, GREETING" at char 1999 of 2028
--   530  the Menoeceus letter proper
--   537  closes the letter, then Diogenes on Choice
--   538  SEAM: "Let us, however, now add the finishing stroke ... giving some
--        of his fundamental maxims" at character 1318 of 2192, so 60% is the
--        ethical doctrines and 40% the first two Doctrines
--   539  the Doctrines proper
--   543  ends Book X
--
-- Seam chunks are assigned to the document supplying the majority of their
-- text, as the Cicero volume split did.
--
-- Book X only. Books 1-6 and 8-9 still carry the same book.life scheme and are
-- untouched here; corpus.locator_quality will and should keep reporting the
-- work until they are repaired too.
--
-- Embeddings are of raw chunk_text with no metadata prefix, so changing a
-- locator invalidates no vector.

begin;

do $$
declare n_book10 int; n_mislabelled int;
begin
  select count(*) filter (where locator = '10.1'),
         count(*) filter (where chunk_index between 473 and 543 and locator <> '10.1')
    into n_book10, n_mislabelled
  from rag_corpus
  where author = 'Diogenes Laërtius' and work = 'Lives of Eminent Philosophers'
    and deprecated = false;

  if n_book10 <> 71 or n_mislabelled <> 0 then
    raise exception 'unexpected pre-state: book10=% mislabelled=% (expected 71/0)', n_book10, n_mislabelled;
  end if;
end $$;

update rag_corpus set locator = case
    when chunk_index between 473 and 484 then '10.1–10.28'     -- life, will, catalogue
    when chunk_index between 485 and 487 then '10.29–10.34'    -- division of philosophy, the Canon
    when chunk_index between 488 and 512 then '10.35–10.83'    -- Letter to Herodotus
    when chunk_index between 513 and 526 then '10.84–10.116'   -- Letter to Pythocles
    when chunk_index between 527 and 529 then '10.117–10.121'  -- doctrines of the wise man
    when chunk_index between 530 and 537 then '10.122–10.135'  -- Letter to Menoeceus
    when chunk_index = 538               then '10.136–10.138'  -- ethics against the Cyrenaics
    when chunk_index between 539 and 543 then '10.139–10.154'  -- the Principal Doctrines
  end
where author = 'Diogenes Laërtius' and work = 'Lives of Eminent Philosophers'
  and deprecated = false and chunk_index between 473 and 543;

do $$
declare n_left int; n_locs int; n_null int;
begin
  select count(*) filter (where locator = '10.1'),
         count(distinct locator),
         count(*) filter (where locator is null)
    into n_left, n_locs, n_null
  from rag_corpus
  where author = 'Diogenes Laërtius' and work = 'Lives of Eminent Philosophers'
    and deprecated = false and chunk_index between 473 and 543;

  if n_left <> 0 or n_locs <> 8 or n_null <> 0 then
    raise exception 'unexpected post-state: still_10_1=% locators=% nulls=% (expected 0/8/0)',
      n_left, n_locs, n_null;
  end if;
end $$;

commit;
