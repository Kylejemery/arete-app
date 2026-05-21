-- ============================================================
-- 20260521000001_session_progress.sql
-- Session completion & quiz submission tracking.
-- Run in the Supabase SQL editor — not a migration runner.
-- ============================================================

-- Status enum
CREATE TYPE session_status AS ENUM (
  'not_started',
  'completed',
  'passed',
  'failed'
);

-- Main table
CREATE TABLE IF NOT EXISTS session_progress (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id         text        NOT NULL,
  session_id        integer     NOT NULL,
  status            session_status NOT NULL DEFAULT 'not_started',
  submitted_answers jsonb,
  submitted_at      timestamptz,
  graded_at         timestamptz,
  graded_by         uuid        REFERENCES auth.users(id),
  admin_notes       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, course_id, session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS session_progress_user_idx
  ON session_progress (user_id);
CREATE INDEX IF NOT EXISTS session_progress_course_idx
  ON session_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS session_progress_status_idx
  ON session_progress (status);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE session_progress ENABLE ROW LEVEL SECURITY;

-- Students: read their own rows
CREATE POLICY "Users read own progress"
  ON session_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Students: insert their own rows
CREATE POLICY "Users insert own progress"
  ON session_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students: update their own rows
CREATE POLICY "Users update own progress"
  ON session_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins: full access via profiles.is_admin
CREATE POLICY "Admins full access"
  ON session_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
