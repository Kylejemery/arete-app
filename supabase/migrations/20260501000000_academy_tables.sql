-- ============================================================
-- Arete Academy — Phase 1 Tables
-- ============================================================

-- Student enrollments
CREATE TABLE IF NOT EXISTS academy_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id   text NOT NULL DEFAULT 'stoicism-phd',
  current_course text DEFAULT 'phil-701',
  tier         text NOT NULL DEFAULT 'auditor',
  enrolled_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Seminar sessions
CREATE TABLE IF NOT EXISTS academy_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  text NOT NULL,
  agent_id   text NOT NULL DEFAULT 'socratic-proctor',
  messages   jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Student papers
CREATE TABLE IF NOT EXISTS academy_papers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  text NOT NULL,
  title      text,
  content    text,
  feedback   jsonb DEFAULT '{}',
  status     text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS academy_enrollments_user_id_idx ON academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS academy_sessions_user_id_idx    ON academy_sessions(user_id);
CREATE INDEX IF NOT EXISTS academy_sessions_course_idx     ON academy_sessions(user_id, course_id);
CREATE INDEX IF NOT EXISTS academy_papers_user_id_idx      ON academy_papers(user_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE academy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_papers      ENABLE ROW LEVEL SECURITY;

-- Enrollments: users can read and write only their own rows
CREATE POLICY "Users manage own enrollments"
  ON academy_enrollments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sessions: users can read and write only their own rows
CREATE POLICY "Users manage own sessions"
  ON academy_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Papers: users can read and write only their own rows
CREATE POLICY "Users manage own papers"
  ON academy_papers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- updated_at trigger (reuse pattern from existing Arete tables)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academy_sessions_updated_at
  BEFORE UPDATE ON academy_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER academy_papers_updated_at
  BEFORE UPDATE ON academy_papers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
