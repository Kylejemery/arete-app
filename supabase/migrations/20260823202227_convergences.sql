-- Convergence Agent — the fork of Inquiry that runs the other direction. Where
-- Inquiry finds the question the corpus cannot answer, Convergence finds the
-- answer the corpus already contains but has never assembled: it samples
-- passages that sit FAR APART in embedding space, holds them together, and
-- states the one conclusion (the sumperasma) that follows from all of them and
-- is written in none of them.
--
-- The agent supplies validity and novelty. It NEVER judges significance — that
-- is the human review gate (significance_note, written by Kyle, never the
-- agent). Convergence output is the corpus's conjecture about its own contents;
-- it is NEVER ingested into rag_corpus as source material.
--
-- Each convergence is stored as `pending_review`. Approved / starred
-- convergences become eligible as Synthesis seed material and Observatory cards
-- (a third card type: THE CORPUS CONCLUDES).

-- ---------------------------------------------------------------------------
-- convergence_runs — one row per agent run (manual or cron). Written even when
-- zero convergences clear the bar; a zero-store run is correct, not a failure.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convergence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  candidates_considered INT,
  convergences_stored INT,
  -- Per-run coverage: authors touched, traditions touched, distance range,
  -- discard reasons, seed theme, degradation notes.
  report JSONB
);

-- ---------------------------------------------------------------------------
-- convergences — one stored sumperasma per row.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convergences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES convergence_runs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- The conclusion
  title TEXT,                       -- evocative, 3-7 words, sentence case
  conclusion_text TEXT,             -- the sumperasma, one or two sentences
  source_passage_ids JSONB,         -- array of rag_corpus chunk ids it rests on
  source_authors JSONB,             -- array of distinct author names
  source_traditions JSONB,          -- array of distinct traditions represented

  -- Validity + novelty (the two things the agent DOES judge)
  entailment_strength TEXT
    CHECK (entailment_strength IN ('deductive', 'strong', 'suggestive')),
  novelty TEXT
    CHECK (novelty IN ('novel', 'latent', 'already_stated')),
  mean_pairwise_distance FLOAT,     -- embedding spread of the source set (anti-hairball metric)

  -- The working-out
  pursuit_text TEXT,                -- 400-600 word chain from premises to conclusion
  breakpoint_text TEXT,             -- the single premise whose removal collapses the conclusion

  -- Status (significance_note is the human's job; the agent never writes it)
  status TEXT DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'starred')),
  significance_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_convergences_status ON convergences(status);
CREATE INDEX IF NOT EXISTS idx_convergences_run ON convergences(run_id);
CREATE INDEX IF NOT EXISTS idx_convergence_runs_started ON convergence_runs(started_at);

-- RLS — no policies; service role only (Railway agent writes, admin API reads
-- via the service-role admin client behind ADMIN_EMAIL-gated routes). These are
-- system output, not user data — no user policies.
ALTER TABLE convergences ENABLE ROW LEVEL SECURITY;
ALTER TABLE convergence_runs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- convergence_seed_pool — Pass 1 loose pool. Theme-scoped semantic pull of
-- PRIMARY passages (never synthesis, never deprecated, never null-embedding),
-- ordered by nearness to the seed theme. The agent then greedily selects the
-- FAR-APART subset from this pool in JS. Self-contained so the selection rule
-- never depends on the shared match_* RPCs' filtering behavior.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION convergence_seed_pool(theme_embedding vector, pool_size INT DEFAULT 40)
RETURNS TABLE (id UUID, chunk_text TEXT, author TEXT, work TEXT, text_type TEXT, similarity DOUBLE PRECISION)
LANGUAGE sql
STABLE
AS $$
  SELECT rc.id, rc.chunk_text, rc.author, rc.work, rc.text_type,
         (1 - (rc.embedding <=> theme_embedding))::float8 AS similarity
  FROM rag_corpus rc
  WHERE COALESCE(rc.text_type, 'primary') <> 'synthesis'
    AND rc.author IS NOT NULL
    AND rc.author <> 'Arete Synthesis'
    AND rc.chunk_text IS NOT NULL
    AND rc.embedding IS NOT NULL
    AND COALESCE(rc.deprecated, false) = false
  ORDER BY rc.embedding <=> theme_embedding
  LIMIT pool_size;
$$;

-- ---------------------------------------------------------------------------
-- convergence_pairwise_distances — cosine distance for every unordered pair in
-- a candidate id set. Keeps the 1536-dim vectors server-side; the agent runs
-- the max-min greedy selection over this small matrix. Returns each pair once
-- (a < b). distance = cosine distance in [0, 2]; larger = further apart.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION convergence_pairwise_distances(chunk_ids UUID[])
RETURNS TABLE (a UUID, b UUID, distance DOUBLE PRECISION)
LANGUAGE sql
STABLE
AS $$
  SELECT r1.id AS a, r2.id AS b, (r1.embedding <=> r2.embedding)::float8 AS distance
  FROM rag_corpus r1
  JOIN rag_corpus r2 ON r1.id < r2.id
  WHERE r1.id = ANY(chunk_ids)
    AND r2.id = ANY(chunk_ids)
    AND r1.embedding IS NOT NULL
    AND r2.embedding IS NOT NULL;
$$;
