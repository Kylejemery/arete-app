-- Paywall funnel telemetry: one row per paywall view, labeled with the
-- trigger source (daily limit, locked counselor, invite gate, insight tease,
-- ...). Users can only insert their own rows; reads are service-role/admin.
CREATE TABLE IF NOT EXISTS paywall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  tier_at_view text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paywall_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own paywall events"
  ON paywall_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
