ALTER TABLE rag_corpus ADD COLUMN IF NOT EXISTS language text DEFAULT 'english';
ALTER TABLE rag_corpus ADD COLUMN IF NOT EXISTS paired_chunk_id uuid REFERENCES rag_corpus(id);

COMMENT ON COLUMN rag_corpus.language IS 'Language of this chunk: english, ancient_greek, latin';
COMMENT ON COLUMN rag_corpus.paired_chunk_id IS 'For bilingual pairs: links Greek/Latin chunk to its English translation chunk and vice versa';
