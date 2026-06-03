ALTER TABLE rag_corpus
  ADD CONSTRAINT rag_corpus_author_work_program_chunk_key
  UNIQUE (author, work, program_id, chunk_index);
