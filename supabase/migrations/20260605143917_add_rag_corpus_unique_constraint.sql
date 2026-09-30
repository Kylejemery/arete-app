
ALTER TABLE rag_corpus
ADD CONSTRAINT rag_corpus_upsert_key
UNIQUE (author, work, program_id, chunk_index);
