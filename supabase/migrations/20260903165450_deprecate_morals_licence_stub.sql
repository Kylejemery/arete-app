-- Follow-up to 20260903120000_deprecate_front_matter_and_licence.
--
-- The licence run at the end of Seneca's Morals (Gutenberg, L'Estrange) was
-- deprecated as chunks 323–330, which is where the inspection stopped: the
-- sweep looked for chunks containing "Project Gutenberg", and the ebook's very
-- last chunk is a 25-character fragment of the final licence sentence that
-- does not contain it — "to hear about new eBooks." Verified by reading it
-- after the first migration's counts came back with a live chunk past 330.
--
-- Expected: 1 row.
update rag_corpus
set deprecated = true
where deprecated = false
  and text_type = 'primary'
  and author = 'Seneca' and work = 'Morals' and chunk_index = 331;
