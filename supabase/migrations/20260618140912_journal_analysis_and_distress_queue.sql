-- Journal Analysis Agent storage: one analysis record per user per week, plus a
-- human-review queue for distress-flagged cases. Applied to prod via Supabase MCP.

CREATE TABLE IF NOT EXISTS journal_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_week DATE NOT NULL, -- Monday of the analyzed week

  themes JSONB NOT NULL DEFAULT '[]',
  -- [{ theme, count, sources: ['journal'|'cabinet'], firstSeen, weeksSeen }]
  journal_only_themes JSONB DEFAULT '[]',
  cabinet_only_themes JSONB DEFAULT '[]',

  insight_text TEXT NOT NULL,
  grounding_passages JSONB DEFAULT '[]',
  -- [{ author, work, chunk_text, relevance }]

  weeks_analyzed INT NOT NULL DEFAULT 1,
  dominant_theme TEXT,

  distress_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  distress_notes TEXT,

  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, analysis_week)
);

CREATE INDEX IF NOT EXISTS idx_journal_analysis_user_id ON journal_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_analysis_week ON journal_analysis(analysis_week);
CREATE INDEX IF NOT EXISTS idx_journal_analysis_distress
  ON journal_analysis(distress_flagged) WHERE distress_flagged = TRUE;

-- RLS: users can read only their own analysis; the service role bypasses RLS for writes.
ALTER TABLE journal_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own analysis" ON journal_analysis;
CREATE POLICY "Users can read their own analysis"
  ON journal_analysis FOR SELECT
  USING (user_id = auth.uid());

-- Distress cases queued for Kyle's review before any delivery. Backend-only:
-- RLS on with no policies, so only the service role can touch it.
CREATE TABLE IF NOT EXISTS distress_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  analysis_id UUID NOT NULL REFERENCES journal_analysis(id),
  distress_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'escalated', 'dismissed')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE distress_review_queue ENABLE ROW LEVEL SECURITY;
