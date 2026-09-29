-- Synthesis layer retrieval tests, run against the live database.
--
-- Everything happens inside one DO block that ends by raising an exception,
-- so every write below is rolled back and nothing persists. The results come
-- back as the exception message: "SYNTHESIS TESTS: ..." with PASS or FAIL for
-- each test.
--
-- The tests need no embedding service. A phrase that appears only in a
-- synthesis document is stood in for by a synthetic unit vector no text
-- produces: one synthesis chunk is given that vector as its embedding, and
-- the vector is the query, so in any profile that can see the chunk it is the
-- exact top match, and in any profile that cannot, no synthesis row appears.
-- The exclusion lists are the ones the code sends:
--   research          researchRetrievalParams()            ['synthesis']
--   MCP default       excludeTextTypesForLayers(['canon'])
--   teaching          counselorRetrievalParams()           ['concordance','modern_primary','modern_summary']
--
--   1  research profile returns no synthesis row
--   2  teaching profile returns the chunk, labelled with layer and status
--   3  MCP with default layers returns no synthesis row
--   5  loading version 2 deactivates version 1 in both profiles
-- (Test 4, canon unchanged, is a checksum comparison run separately.)

do $$
declare
  v vector(1536);
  research_ex text[] := array['synthesis'];
  mcp_default_ex text[] := array['scholarship', 'paper_summary', 'modern_summary', 'concordance', 'synthesis'];
  teaching_ex text[] := array['concordance', 'modern_primary', 'modern_summary'];
  v1_doc uuid;
  v1_chunk uuid;
  v2_doc uuid;
  v2_chunk uuid;
  top record;
  n int;
  out text := '';
begin
  select array_agg(case when i % 3 = 0 then 1.0 else -1.0 end / sqrt(1536.0))::vector(1536)
    into v from generate_series(1, 1536) i;

  select d.id, r.id into v1_doc, v1_chunk
  from corpus_synthesis_documents d
  join rag_corpus r on r.synthesis_document_id = d.id
  where d.doc_key = 'stoic-logic-summary' and d.active and r.section_label = 'The Master Argument';
  if v1_chunk is null then raise exception 'SYNTHESIS TESTS: setup failed, no active Master Argument chunk'; end if;

  update rag_corpus set embedding = v where id = v1_chunk;

  -- 1. research
  select count(*) into n from match_rag_corpus(v, 10, null, 'english', research_ex) m where m.text_type = 'synthesis';
  out := out || format('1 research: %s synthesis rows in top 10 [%s]; ', n, case when n = 0 then 'PASS' else 'FAIL' end);

  -- 2. teaching
  select * into top from match_rag_corpus(v, 1, null, 'english', teaching_ex);
  out := out || format('2 teaching: top=%s sim=%s labelled=%s status=%s [%s]; ',
    top.section_label, round(top.similarity::numeric, 4),
    top.chunk_text like '[ARETE SYNTHESIS:%',
    (select verification_status from rag_corpus where id = top.id),
    case when top.id = v1_chunk and top.text_type = 'synthesis'
              and top.chunk_text like '[ARETE SYNTHESIS:%'
              and top.chunk_text like '%Verification: via_summary:%' then 'PASS' else 'FAIL' end);

  -- 3. MCP default layers
  select count(*) into n from match_rag_corpus(v, 8, null, 'english', mcp_default_ex) m where m.text_type = 'synthesis';
  out := out || format('3 mcp default: %s synthesis rows [%s]; ', n, case when n = 0 then 'PASS' else 'FAIL' end);

  -- 5. version 2
  insert into corpus_synthesis_documents (doc_key, version, title, created_at, generated_with, sources_used, file_path, content_sha256)
  values ('stoic-logic-summary', 2, 'Stoic Logic: A Summary', current_date, 'test', array['test'], 'test', 'test')
  returning id into v2_doc;
  insert into rag_corpus (program_id, author, work, section_label, chunk_index, chunk_text, word_count, translator,
                          source_url, edition_year, text_type, source_type, language, verification_status,
                          synthesis_document_id, deprecated, embedding)
  select program_id, author, work, section_label, 2012, replace(chunk_text, '(version 1)', '(version 2)'), word_count,
         translator, source_url, edition_year, text_type, source_type, language, verification_status, v2_doc, true, v
  from rag_corpus where id = v1_chunk
  returning id into v2_chunk;
  perform activate_synthesis_version(v2_doc);

  select count(*) into n from match_rag_corpus(v, 10, null, 'english', teaching_ex) m where m.id = v1_chunk;
  out := out || format('5a teaching sees v1: %s [%s]; ', n, case when n = 0 then 'PASS' else 'FAIL' end);
  select * into top from match_rag_corpus(v, 1, null, 'english', teaching_ex);
  out := out || format('5b teaching top is v2: %s [%s]; ', top.id = v2_chunk, case when top.id = v2_chunk then 'PASS' else 'FAIL' end);
  select count(*) into n from match_rag_corpus(v, 10, null, 'english', research_ex) m where m.id in (v1_chunk, v2_chunk);
  out := out || format('5c research sees either: %s [%s]; ', n, case when n = 0 then 'PASS' else 'FAIL' end);
  select count(*) into n from corpus_synthesis_documents where doc_key = 'stoic-logic-summary' and active;
  out := out || format('5d active versions: %s, v1 active=%s, v1 chunks live=%s [%s]',
    n, (select active from corpus_synthesis_documents where id = v1_doc),
    (select count(*) from rag_corpus where synthesis_document_id = v1_doc and not deprecated),
    case when n = 1 and not (select active from corpus_synthesis_documents where id = v1_doc)
              and (select count(*) from rag_corpus where synthesis_document_id = v1_doc and not deprecated) = 0
         then 'PASS' else 'FAIL' end);

  raise exception 'SYNTHESIS TESTS: %', out;
end $$;
