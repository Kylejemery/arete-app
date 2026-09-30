-- ============================================================
-- Counselor broadcasts — a message from a counselor, written by hand rather
-- than generated, delivered to members as a push notification AND as a post
-- in their Cabinet chat.
--
-- The Cabinet post is the primary channel and the push is only the nudge:
-- most members never grant notification permission, so delivery does not
-- depend on a push token. The app sweeps GET /api/broadcasts/pending on every
-- foreground and seeds each due broadcast into the Cabinet thread through the
-- same seedCounselorLine() path that Settings reminders and Attend nudges
-- already use (lib/counselorLines.ts).
--
-- Shape mirrors daily_dispatches / dispatch_deliveries: one row per broadcast,
-- one delivery row per recipient, materialised when the broadcast is
-- scheduled so recipient_count is known before anything is sent.
--
-- Service-role only. RLS is enabled with no policies, so neither anon nor
-- authenticated clients can read the roster of who was messaged — the app
-- reaches its own rows through the Railway server.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.counselor_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who speaks. A counselors.slug pins one voice for everyone; NULL means
  -- "whoever is in the member's own cabinet", resolved per user at delivery
  -- with fallback_counselor_slug for a cabinet that resolves to nothing.
  counselor_slug  text REFERENCES public.counselors(slug) ON DELETE SET NULL,
  fallback_counselor_slug text NOT NULL DEFAULT 'marcus-aurelius'
    REFERENCES public.counselors(slug) ON DELETE SET DEFAULT,

  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  push_body       text NOT NULL CHECK (char_length(push_body) BETWEEN 1 AND 240),
  message         text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),

  -- Where tapping the notification lands. The Cabinet tab is where the post is.
  route           text NOT NULL DEFAULT '/cabinet',

  -- { label, tiers: ['free','premium','pro'], userIds: [...] } — what was
  -- picked in the admin composer, kept for the audit trail.
  audience        jsonb NOT NULL DEFAULT '{}'::jsonb,

  status          text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),

  -- Local-time delivery, same contract as the Daily Dispatch: send_date is the
  -- calendar day in the member's own timezone, send_hour the hour of that day
  -- (0-23). NULL send_hour means "as soon as possible" — the next hourly run.
  send_date       date,
  send_hour       integer CHECK (send_hour >= 0 AND send_hour <= 23),

  recipient_count integer NOT NULL DEFAULT 0,
  pushed_count    integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  seeded_count    integer NOT NULL DEFAULT 0,  -- confirmed landed in a Cabinet thread

  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- A scheduled broadcast needs a day to be scheduled for.
  CONSTRAINT counselor_broadcasts_scheduled_needs_date
    CHECK (status = ANY (ARRAY['draft', 'cancelled']) OR send_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS counselor_broadcasts_status_idx
  ON public.counselor_broadcasts (status, send_date);
CREATE INDEX IF NOT EXISTS counselor_broadcasts_created_at_idx
  ON public.counselor_broadcasts (created_at DESC);

CREATE TABLE IF NOT EXISTS public.counselor_broadcast_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id  uuid NOT NULL REFERENCES public.counselor_broadcasts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The push half. 'skipped' = no usable Expo token; the member still gets the
  -- Cabinet post, which is why a skipped push is not a failure.
  push_status   text NOT NULL DEFAULT 'pending'
    CHECK (push_status IN ('pending', 'sent', 'failed', 'skipped')),
  pushed_at     timestamptz,
  error_message text,

  -- The Cabinet half: set when the app confirms the line is in the thread.
  seeded_at     timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);

CREATE INDEX IF NOT EXISTS counselor_broadcast_deliveries_broadcast_idx
  ON public.counselor_broadcast_deliveries (broadcast_id);
-- The app's per-foreground sweep: this user's un-seeded deliveries.
CREATE INDEX IF NOT EXISTS counselor_broadcast_deliveries_unseeded_idx
  ON public.counselor_broadcast_deliveries (user_id) WHERE seeded_at IS NULL;
CREATE INDEX IF NOT EXISTS counselor_broadcast_deliveries_push_pending_idx
  ON public.counselor_broadcast_deliveries (broadcast_id) WHERE push_status = 'pending';

ALTER TABLE public.counselor_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_broadcast_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.counselor_broadcasts FROM anon, authenticated;
REVOKE ALL ON public.counselor_broadcast_deliveries FROM anon, authenticated;

COMMENT ON TABLE public.counselor_broadcasts IS
  'Hand-written messages from a counselor, delivered as a push notification and a post in the Cabinet chat. Service role only.';
COMMENT ON COLUMN public.counselor_broadcasts.counselor_slug IS
  'counselors.slug of the speaker; NULL = whoever is in the member''s own cabinet.';
COMMENT ON COLUMN public.counselor_broadcast_deliveries.seeded_at IS
  'When the app confirmed the line landed in this member''s Cabinet thread. NULL = still owed, and the pending sweep will serve it again.';

-- Delivery agent config, alongside the other agents.
INSERT INTO public.agent_config (agent_name, config)
VALUES (
  'broadcast_agent',
  '{
    "enabled": true,
    "push_enabled": true,
    "default_send_hour": 10,
    "suppress_on_dispatch_hour": true
  }'
)
ON CONFLICT (agent_name) DO NOTHING;

-- The first draft: the reading-room marginalia the Library shipped on
-- 2026-09-01 (library_comments). Drafts are never picked up by the delivery
-- agent — it only reads status = 'scheduled'.
INSERT INTO public.counselor_broadcasts
  (counselor_slug, title, push_body, message, audience, status, created_by)
SELECT
  'marcus-aurelius',
  'A note in the margin',
  'Did you know you can leave comments in the Reading Room?',
  'Did you know you can write in the margins? Every book in the Library''s Reading Room now takes comments — select a passage, leave your note, and read what others have left beside it.' || chr(10) || chr(10) ||
  'Go and find your favourite passage in the Meditations, and say why it is yours. I wrote those lines to no one but myself; that they are still argued over is not my doing but yours.',
  '{"label": "Everyone"}'::jsonb,
  'draft',
  'seed'
WHERE EXISTS (SELECT 1 FROM public.counselors WHERE slug = 'marcus-aurelius')
  AND NOT EXISTS (
    SELECT 1 FROM public.counselor_broadcasts WHERE created_by = 'seed'
  );
