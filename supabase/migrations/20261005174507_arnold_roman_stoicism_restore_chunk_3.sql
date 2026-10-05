-- E. Vernon Arnold, Roman Stoicism: restore chunk 3, lost at ingest.
--
-- corpus.sequence_gaps reported one absent chunk_index in 1..439. It is 3, at
-- any deprecation state: the 2026-07-21 ingest wrote 2 and 4 and not 3. The
-- text was lost, not merely the number: the chunker's windows here are exact
-- (400 words, 350-word stride, 50-word overlap), and chunk 2's last 50 words
-- do not reappear at the head of chunk 4. About 300 words are missing: the end
-- of the errata, the table of contents, a dozen tokens of index-page OCR
-- noise, and the opening of Chapter I ("THE present work treats of a subject
-- of outstanding interest..."), which no reader of the corpus currently sees.
--
-- The source. The work carries no source_url and nothing in the queue,
-- staging or storage records one. The live text is a specific OCR, recognisable
-- by its errors ("progranfme", "justic of their form", "Gymmnosophists",
-- "Comm. im Luc, ix 6"). Of the eight archive.org scans of the 1911 Cambridge
-- edition, exactly one carries all of them: isbn_9781112022630
-- (https://archive.org/details/isbn_9781112022630), read on 2026-10-05 through
-- archive.org/stream. 341 of the 438 live chunks are exact word windows of it
-- at the 350-word stride; the rest differ only in whether a punctuation mark
-- is detached ("science ;" against "science;").
--
-- The restored chunk is that source's words 1052-1452, which is where the
-- stride puts chunk 3: chunk 2 sits at 702 and chunk 4 at 1403. Its first 50
-- words are chunk 2's last 50 and its last 50 are chunk 4's first 50, exactly,
-- as the overlap requires; both are checked below. It is 401 words, not 400,
-- because the source has one more detached punctuation token in this stretch
-- than the ingest's file had, and which of the 13 candidates that was cannot
-- be known. The words are the source's; one space may differ.
--
-- The row copies its neighbours' metadata except provenance, which Part 5
-- requires on a new write: source_url (the scan above), translator 'original'
-- (an English original, per Part 5 rule 1) and retrieved_at. The other 438
-- rows are not backfilled here. Written without an embedding, as the
-- synthesis loads are; academy/corpus-ingestion/reembed-stale.js embeds it.
-- Until then no match_rag_corpus function returns it, since each requires an
-- embedding.

begin;

-- Guard: abort unless the gap and its edges are exactly as found.
do $$
declare n int; has3 boolean; tail2 text; head4 text;
begin
  select count(*), bool_or(chunk_index = 3)
    into n, has3
    from rag_corpus where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd';
  select chunk_text into tail2 from rag_corpus
   where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 2;
  select chunk_text into head4 from rag_corpus
   where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 4;
  if n <> 438 or has3 or tail2 not like '%to the quotation fro Comm. im Luc, ix 6 add ‘et'
     or head4 not like 'of pure water, cleared the countryside of highwaymen,%' then
    raise exception 'unexpected pre-state: rows=% has3=% (expected 438/false, and the edges of chunks 2 and 4)', n, has3;
  end if;
end $$;

insert into rag_corpus
  (program_id, author, work, section_label, chunk_index, chunk_text, word_count,
   translator, source_url, retrieved_at, text_type, language, source_type, edition_year,
   locator, license_status, quotable_on_air, contains_quoted_primary, greek_terms, deprecated)
select program_id, author, work, section_label, 3,
       $t$617 K.P. 222, u. 333 Com. WM. D.ii. P. 224 n. 473 Sext. math. vii 93. P. 251, u. 76; Galen plac. Hipp. et Plat. p. 242 P. 255, u- 865 for wiyya read ulyya, P. 264, n. 139; to the quotation fro Comm. im Luc, ix 6 add ‘et esse sic immortales ut non moriantur sed resolvan tur.” P. 298, n. 1845; Alex. Aph. de fato 28, Pp- 199, 18 B. CONTENTS The World-Religions Heraclitus and Socrates The Academy and the Porch The Preaching of Stoicism The Stoic Sect in Rome Of Reason and Speech The Foundations of Physics The Universe The Supreme Problems Religion . The Kingdom of the Soul The Law for Humanity Daily Duties . Sin and Weakness Counsels of Perfection . Stoicism in Roman History and Literature . The Stoic Strain in Christianity . BIBLIOGRAPHY : I. Ancient Writers and Philosophers II. Modern Writers GENERAL INDEX . ‘ 5 - a GREEK INDEX v) ‘ ry: li : ‘ “=. i oe CHAPTER I. THE WORLD-RELIGIONS. 1. THE present work treats of a subject of outstanding Roman litera. interest in the literature which is associated with ale the history of the Roman State, and which is expressed partly in Hellenistic Greek, partly in Latin. In the generations preceding our own, classical study has, to a large extent, attended to form rather than to matter, to expression rather than to content. To-day it is beginning to take a wider outlook. We are learning to look on literature as an unveiling of the human mind in its various stages of development, and as a key to the true meaning of history. The literature of Greece proper does not cease to attract us by its originality, charm, and variety ; but the new interest may yet find its fullest satisfaction in Roman literature; for of all ancient peoples the Romans achieved most, and their achievements have been the most enduring. It was the Roman who joined the ends of the world by his roads and his bridges, poured into crowded towns unfail- ing supplies of corn and perennial streams of pure water, cleared the countryside of highwaymen, converted enemies into neigh- bours, created ideals of brotherhood under which the nations were united by common laws and unfettered marriage relations, and so shaped a new religion that if it shattered an empire it yet became the mother of many nations.$t$,
       401,
       'original', 'https://archive.org/details/isbn_9781112022630', '2026-10-05T00:00:00Z'::timestamptz,
       text_type, language, source_type, edition_year,
       locator, license_status, quotable_on_air, contains_quoted_primary, greek_terms, false
  from rag_corpus
 where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 2;

-- Guard: the work is contiguous again, and the new chunk overlaps both
-- neighbours by exactly the chunker's 50 words.
do $$
declare n int; lo int; hi int; w2 text[]; w3 text[]; w4 text[];
begin
  select count(*), min(chunk_index), max(chunk_index) into n, lo, hi
    from rag_corpus where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd';
  select regexp_split_to_array(chunk_text, ' ') into w2 from rag_corpus
   where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 2;
  select regexp_split_to_array(chunk_text, ' ') into w3 from rag_corpus
   where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 3;
  select regexp_split_to_array(chunk_text, ' ') into w4 from rag_corpus
   where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd' and chunk_index = 4;
  if n <> 439 or lo <> 1 or hi <> 439 or hi - lo + 1 <> n
     or array_length(w3, 1) <> 401
     or w3[1:50] is distinct from w2[351:400]
     or w3[352:401] is distinct from w4[1:50] then
    raise exception 'unexpected post-state: rows=% range=%..% words=% head_ok=% tail_ok=%',
      n, lo, hi, array_length(w3, 1), w3[1:50] = w2[351:400], w3[352:401] = w4[1:50];
  end if;
end $$;

commit;
