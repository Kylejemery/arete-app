-- Dreaming Agent — the most unusual agent in the system, with the strictest
-- review gate. Every other agent is accountable to the source texts; the
-- Dreaming Agent uses the texts as fuel and goes beyond them: new aphorisms,
-- thought experiments, propositions, and meditations that no author in the
-- corpus wrote, but that the corpus, held together, is capable of producing.
--
-- The output is conjecture, clearly labeled. It is never attributed to any
-- counselor or historical figure. It is NEVER ingested into rag_corpus. It
-- requires human review before anything surfaces anywhere — Kyle is the
-- philosophical judge. Hollow dreams are stored too: the failures calibrate
-- the system, and a dream the agent judges hollow may strike a human reader
-- differently.

CREATE TABLE IF NOT EXISTS corpus_dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_week DATE NOT NULL,

  -- What kind of dream
  dream_type TEXT NOT NULL CHECK (dream_type IN (
    'aphorism',          -- a new formulation the corpus implies but never stated
    'thought_experiment',-- a scenario that tests a philosophical position
    'proposition',       -- a short, precise, arguable claim between traditions
    'meditation'         -- free-form philosophical prose in the tradition of the texts
  )),

  -- The dream itself
  content TEXT NOT NULL,
  title TEXT,                       -- optional, for thought experiments and meditations

  -- Provenance — what it dreamed FROM
  seed_chunk_ids UUID[],            -- the passages that fueled this
  seed_authors TEXT[],
  seed_summary TEXT,                -- 1-2 sentences: what materials were held together
  tension_id UUID REFERENCES philosophical_tensions(id),  -- if seeded from an approved tension
  inquiry_id UUID REFERENCES open_inquiries(id),          -- if seeded from an approved inquiry

  -- The agent's own honest assessment
  self_assessment TEXT,             -- the agent's judgment of its own output: is this alive or hollow?
  fidelity_note TEXT,               -- where this extends the tradition vs. where it departs from it

  -- Review — strictest gate in the system
  status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'rejected', 'starred'
  )),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Where approved dreams may surface (all default false — Kyle enables per-dream)
  observatory_visible BOOLEAN DEFAULT false,

  -- Meta
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_corpus_dreams_week ON corpus_dreams(dream_week);
CREATE INDEX IF NOT EXISTS idx_corpus_dreams_status ON corpus_dreams(status);
CREATE INDEX IF NOT EXISTS idx_corpus_dreams_type ON corpus_dreams(dream_type);

-- RLS — no policies; service role only (Railway agent writes, admin API reads
-- via the service-role admin client behind ADMIN_EMAIL-gated routes). The
-- public Observatory endpoint reads with the service role too, filtered to
-- approved/starred + observatory_visible.
ALTER TABLE corpus_dreams ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Agent config row — lets the admin dashboard tune the agent without a redeploy.
-- ---------------------------------------------------------------------------
INSERT INTO agent_config (agent_name, config) VALUES (
  'dreaming-agent',
  '{
    "enabled": true,
    "run_hour_utc": 23,
    "run_minute_utc": 30,
    "run_day": "sunday",
    "model": "claude-sonnet-4-6",
    "dreams_per_run": 4,
    "seed_passages_per_dream": 5,
    "meditation_max_words": 350,
    "thought_experiment_max_words": 200,
    "prefer_tension_seeds": true,
    "prefer_inquiry_seeds": true
  }'
) ON CONFLICT (agent_name) DO NOTHING;
