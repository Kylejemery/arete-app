-- Retention build plan, ticket R0: the product event log.
--
-- product_events is the single append-only stream every surface (mobile,
-- web, server) writes to through logEvent. Clients insert their own rows
-- under RLS; nobody reads it through PostgREST (service role and SQL only),
-- mirroring paywall_events.
CREATE TABLE IF NOT EXISTS product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_events_event_created_idx ON product_events (event, created_at);
CREATE INDEX IF NOT EXISTS product_events_user_created_idx ON product_events (user_id, created_at);
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own product events" ON product_events;
CREATE POLICY "Users insert own product events"
  ON product_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Two timestamps the plan's metrics read straight off user_settings:
-- last_active_at is stamped by the server on authenticated requests (at most
-- once an hour per user); kt_completed_at is set by markKnowThyselfComplete.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_completed_at timestamptz;

-- One row per Stripe subscription status change, written by the webhook.
-- stripe_event_id is unique so a replayed delivery is a no-op. source is the
-- paywall source stamped into checkout metadata (R11 wires the stamp).
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL UNIQUE,
  status_from text,
  status_to text NOT NULL,
  plan text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_user_created_idx ON subscription_events (user_id, created_at);
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.
