-- Academy waitlist
CREATE TABLE IF NOT EXISTS academy_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  reason     text,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups by email
CREATE INDEX IF NOT EXISTS academy_waitlist_email_idx ON academy_waitlist (email);

-- Only service-role can read; anyone can insert (public waitlist signup)
ALTER TABLE academy_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can apply to waitlist"
  ON academy_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role reads waitlist"
  ON academy_waitlist FOR SELECT
  USING (auth.role() = 'service_role');
