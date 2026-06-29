-- Reading Room presentation overrides. Admin-editable layer over the hardcoded
-- defaults in server/library.js: per-work display title, shelf (tradition), era,
-- and a reversible "hidden" flag (pull off the public shelf while keeping chunks
-- in rag_corpus for the Cabinet). Keyed by the rag_corpus (author, work) so the
-- corpus key — used by the reader URL and RAG — stays stable. Backend/admin-only:
-- RLS enabled with NO policies; service-role bypasses, anon key cannot read.

CREATE TABLE IF NOT EXISTS library_overrides (
  author TEXT NOT NULL,
  work TEXT NOT NULL,
  title TEXT,                         -- display-title override (null = default)
  tradition TEXT
    CHECK (tradition IN ('stoic', 'wider', 'synthesis')),  -- shelf override (null = default)
  era TEXT,                           -- era-line override (null = default)
  hidden BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (author, work)
);

ALTER TABLE library_overrides ENABLE ROW LEVEL SECURITY;
