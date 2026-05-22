-- ============================================================
-- 20260521000002_daily_examinations.sql
-- Daily Examination — morning & evening check-in loop for PHIL 701.
-- Run in the Supabase SQL editor — not a migration runner.
-- ============================================================

CREATE TABLE daily_examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  course_id text NOT NULL DEFAULT 'phil-701',
  session_id integer NOT NULL,
  morning_responses jsonb,
  morning_completed_at timestamptz,
  proctor_morning_response text,
  evening_responses jsonb,
  evening_completed_at timestamptz,
  proctor_evening_response text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_examinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own examinations"
  ON daily_examinations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own examinations"
  ON daily_examinations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own examinations"
  ON daily_examinations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin full access"
  ON daily_examinations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
