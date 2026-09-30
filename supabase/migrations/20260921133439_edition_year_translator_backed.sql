-- ============================================================
-- Corpus metadata: record edition_year on the translator-backed primary works.
--
-- ACQUISITION_PLAN Part 5 rule 2 requires edition_year on translations,
-- because public domain status depends on it and because translator
-- divergence on technical vocabulary is a philosophical fact about a
-- passage rather than a bibliographic footnote. 53 of the 60 primary works
-- carry no year. 28 of those carry a translator, which is what makes the
-- year findable; this migration covers 16 of the 28. The other 12 are
-- listed at the foot with the reason each was left alone.
--
-- Every year below is taken from the ingested text itself, not from
-- recall. The ingests carry their own provenance — either a header the
-- ingest wrote, or the translator's signed preface inside the scanned
-- front matter — and that evidence is quoted per work. Two years that
-- recall would have supplied were wrong and the text corrected them:
-- Edmonds's Paradoxa is 1892 rather than the 1850s, and Goodwin's Plutarch
-- is 1878 rather than 1874.
--
-- No source page was fetched to confirm any of this. The environment's
-- network egress policy denies the corpus's source hosts, so the evidence
-- is what the corpus already holds. Where that evidence is a header a
-- previous ingest wrote rather than a scan of a title page, it is only as
-- good as that ingest.
--
-- All 16 are 1930 or earlier, so all remain inside the standing copyright
-- rule they were already relying on without recording.
--
-- Guarded by `edition_year is null` so it is idempotent, and scoped by
-- author, work AND translator so it cannot reach a differently-sourced
-- ingest that shares a work name.
-- ============================================================

-- ---------- 1. The year is stated in the ingested text ----------

-- "AUBREY STEWART London, March, 1887." — the translator's signed preface,
-- in the Gutenberg front matter of this ingest (chunk_index 5).
update public.rag_corpus set edition_year = 1887
where author = 'Seneca' and work = 'On Benefits'
  and translator = 'Aubrey Stewart' and edition_year is null;

-- "AUBREY STEWART. _London,_ 1889." — signed preface in the front matter of
-- the Minor Dialogues volume (chunk_index 1).
update public.rag_corpus set edition_year = 1889
where author = 'Seneca' and work = 'On Providence'
  and translator = 'Aubrey Stewart' and edition_year is null;

-- "ON FATE (DE FATO) — Cicero, tr. C.D. Yonge (Bohn 1853, public domain)"
-- — the ingest's own header, chunk_index 0.
update public.rag_corpus set edition_year = 1853
where author = 'Cicero' and work = 'De Fato'
  and translator = 'C.D. Yonge' and edition_year is null;

-- "tr. Cyrus R. Edmonds (1892, public domain)" — header, chunk_index 0.
update public.rag_corpus set edition_year = 1892
where author = 'Cicero' and work = 'Paradoxa Stoicorum'
  and translator = 'Cyrus R. Edmonds' and edition_year is null;

-- "tr. Goodwin (1878, public domain), via ToposText" — header, chunk_index 0
-- of both Plutarch essays, which were ingested together.
update public.rag_corpus set edition_year = 1878
where author = 'Plutarch'
  and work in ('On Stoic Self-Contradictions', 'Against the Stoics on Common Conceptions')
  and translator = 'W.W. Goodwin' and edition_year is null;

-- "Discourses was written circa 108 by Arrian of Nicomedia and translated
-- from Greek in 1877 by George Long." — the Standard Ebooks colophon, in
-- the back matter of this ingest (chunk_index 457).
update public.rag_corpus set edition_year = 1877
where author = 'Epictetus' and work = 'Discourses'
  and translator = 'George Long' and edition_year is null;

-- ---------- 2. Same volume as a work above ----------
--
-- Stewart's Minor Dialogues (Bohn, 1889) was ingested once, as one
-- continuous run of chunk_index 1..430, and then split by work. The run is
-- contiguous and in the order of the volume's own contents page, which the
-- front matter prints: Of Providence, On the Firmness of the Wise Man, Of
-- Anger I-III, then the Consolations and the rest. On Providence (1..21)
-- carries the signed 1889 preface, so every work in the same run is the
-- same printing. This is an inference from the ingest's structure, not a
-- second statement of the year.

update public.rag_corpus set edition_year = 1889
where author = 'Seneca'
  and work in (
    'On Constancy',              -- chunk_index  22.. 49
    'Consolation to Marcia',     --             163..205
    'On a Happy Life',           --             206..242
    'On Leisure',                --             243..252
    'On Peace of Mind',          --             253..291
    'On the Shortness of Life',  --             292..322
    'Consolation to Polybius',   --             323..355
    'Consolation to Helvia',     --             356..383
    'Clemency'                   --             384..430
  )
  and translator = 'Aubrey Stewart' and edition_year is null;

-- ============================================================
-- Deliberately not covered, and why.
--
-- Seneca, On Anger — NOT a metadata gap. The rows are labelled
--   translator = 'Aubrey Stewart' but the text is not Stewart's. Its own
--   citation reads: "Lucius Annaeus Seneca. 'On Anger.' Moral Essays. Vol.
--   1. Trans. John W. Basore. London: W. Heinemann, 1928. (c) SophiaOmni,
--   2005. The specific electronic form of this text is copyright." The
--   rows also carry the source site's page furniture into the reading text
--   ("SophiaOmni 37 www.sophiaomni.org"), and the recorded source_url
--   points at archive.org rather than SophiaOmni. Stewart's own On Anger
--   is absent: it is the gap at chunk_index 50..162 in the 1889 run above.
--   Recording a year here would ratify the wrong translator. Needs a
--   decision, not a backfill.
--
-- Epictetus, Enchiridion — the ingest is the Liberal Arts Press edition,
--   whose front matter reads "COPYRIGHT, 1948 THE LIBERAL ARTS PRESS,
--   INC. First Edition, October, 1948". Higginson's translation is older
--   than that, but this edition is not, and one live row (chunk_index 7)
--   is the edition's bibliography rather than Epictetus. Needs the same
--   kind of decision.
--
-- Seneca, Letters — Gummere's Loeb Epistulae Morales was published across
--   three volumes (1917, 1920, 1925) and this ingest spans all 124
--   letters, so one year cannot be right for the whole work. The corpus
--   holds no statement of which printing the Wikisource text follows.
--
-- Cicero, De Natura Deorum — Yonge via ToposText, and the header states no
--   year. 1853 is the likely answer, since the same translator's De Fato
--   is the Bohn 1853 Treatises volume, but that is a guess about a
--   different ingest route rather than evidence.
--
-- Plato, 8 dialogues tr. Benjamin Jowett (The Republic, Apology,
--   Euthyphro, Timaeus, Gorgias, Meno, Protagoras, Alcibiades) — the
--   Gutenberg texts carry no edition year anywhere in the ingested
--   material. Jowett's Dialogues ran to several editions between 1871 and
--   1892 and the corpus records nothing that distinguishes them.
--
-- Verify after applying:
--   select author, work, translator, min(edition_year) as year, count(*)
--   from rag_corpus
--   where deprecated = false and text_type = 'primary'
--   group by 1,2,3 order by year nulls first, 1, 2;
-- ============================================================
