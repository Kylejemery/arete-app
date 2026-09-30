-- Plato, Alcibiades: retire Jowett's apparatus, strip the source site's
-- furniture, and give the dialogue back its own opening.
--
-- Reported by corpus.apparatus:source_site_furniture, the signal added in
-- 20260921143420 after Seneca's On Anger turned up the same class by eye.
-- Alcibiades is the larger case, and unlike On Anger it has more than one
-- defect. All 55 chunks are live; all 55 are wrong in at least one way.
--
-- 1. ELEVEN CHUNKS ARE NOT PLATO. chunk_index 0 to 10 are Benjamin Jowett's
--    own editorial matter, filed under Plato's name in a layer that claims to
--    hold the philosopher's words. Chunk 0 opens:
--
--      "Full Text Archive https://www.fulltextarchive.com Alcibiades I by
--       Plato This etext was prepared by Sue Asscher ALCIBIADES I by Plato
--       (see Appendix I) Translated by Benjamin Jowett APPENDIX I. It seems
--       impossible to separate by any exact line the genuine writings of Plato
--       from the spurious..."
--
--    and 1 to 10 run on through that appendix on Platonic authenticity and
--    then Jowett's Analysis, which paraphrases the dialogue in single quotes
--    ("'I mean,' replies Alcibiades, 'the man who is able to command in the
--    city.'"). A counselor retrieving that gets Jowett's summary of Alcibiades
--    attributed to Alcibiades. This is the defect the queue's
--    body_start_marker was introduced for in 20260902141857, and the same one
--    the Republic and the Apology were found with; Alcibiades was missed.
--
--    Deprecated, never deleted.
--
-- 2. CHUNK 11 STRADDLES THE JOIN. Its first 685 characters are the tail of
--    Jowett's Analysis; its remaining 1,559 are the dialogue's own opening,
--    "PERSONS OF THE DIALOGUE: Alcibiades, Socrates. SOCRATES: I dare say that
--    you may be surprised to find, O son of Cleinias...". Deprecating it whole
--    would take the opening of the dialogue with it, since the 50-word overlap
--    means chunk 12 starts well into Socrates's first speech. So it is trimmed
--    at the join rather than retired, and the dialogue keeps its first words.
--
-- 3. THE SOURCE SITE'S RUNNING FOOTER. "<page> / 53 Full Text Archive
--    https://www.fulltextarchive.com" sits mid-sentence in 45 of the 55
--    chunks, and the PDF generator's own trailer, "Powered by TCPDF
--    (www.tcpdf.org) 53 / 53", closes chunk 54. Same treatment as On Anger in
--    20260921142402, and the same reason for matching a fragment at either
--    chunk edge: the overlap window splits footers.
--
-- WHAT IS NOT CHANGED
--
-- edition_year stays null. Every one of the eight live Jowett dialogues in the
-- corpus (Apology, Euthyphro, Gorgias, Meno, Protagoras, The Republic,
-- Timaeus, and this one) carries null, so there is no in-corpus evidence for a
-- year, and this sandbox has no egress to establish one. Writing a year from
-- recall is how two of seven years came out wrong earlier in this session; the
-- rule that every year in 20260921133439 came from the corpus text holds here
-- by leaving it alone.
--
-- source_url stays null for the same reason. The text names fulltextarchive
-- .com and credits Sue Asscher, who prepared many of the Gutenberg Jowett
-- texts, so the file is most likely that site's re-hosting of the Gutenberg
-- edition — a lead worth following from a machine with egress, not a URL to
-- assert here.
--
-- Embeddings were computed over the unscrubbed text and are now slightly
-- stale for the 40 chunks whose text changes. Re-embedding needs an OpenAI key
-- and egress. The stored text is what a reader and a counselor are handed, so
-- it is fixed now; the vectors are a follow-up.

-- 1. Jowett's appendix and analysis: deprecate, never delete.
update public.rag_corpus
   set deprecated = true
 where author = 'Plato'
   and work = 'Alcibiades'
   and chunk_index between 0 and 10
   and deprecated = false;

-- 2. Trim the apparatus off the front of the straddling chunk, keeping the
--    dialogue's opening. Guarded: strpos > 1 means there is still a prefix.
update public.rag_corpus
   set chunk_text = btrim(substring(chunk_text from strpos(chunk_text, 'PERSONS OF THE DIALOGUE')))
 where author = 'Plato'
   and work = 'Alcibiades'
   and chunk_index = 11
   and strpos(chunk_text, 'PERSONS OF THE DIALOGUE') > 1;

-- 3. Strip the site footer and the PDF generator's trailer from what remains
--    live. Ordered: trailer at the very end first, then whole footers, then a
--    footer fragment at either edge.
update public.rag_corpus
   set chunk_text = btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         chunk_text,
         '\s*Powered by TCPDF \(www\.tcpdf\.org\)\s*[0-9]*\s*/?\s*[0-9]*\s*$', '', 'g'),
         '\s*[0-9]+\s*/\s*53\s*Full Text Archive\s*https?://www\.fulltextarchive\.com\s*', ' ', 'g'),
         '^\s*(?:[0-9]+\s*/\s*53\s*)?(?:Full Text Archive\s*)?(?:https?://www\.fulltextarchive\.com)?\s*', '', 'g'),
         '\s*(?:[0-9]+\s*/\s*53\s*)?Full Text Archive\s*(?:https?://www\.fulltextarchive\.com)?\s*$', '', 'g'))
 where author = 'Plato'
   and work = 'Alcibiades'
   and deprecated = false
   and chunk_text ~ '(fulltextarchive\.com|Full Text Archive|Powered by TCPDF)';
