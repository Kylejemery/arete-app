-- Scheduled social posts for the direct platforms (LinkedIn, Bluesky, X), which
-- have no native scheduling. The admin scheduler enqueues future-dated posts
-- here; a Railway cron pings /api/cron/post-due to fire the ones that are due.
-- Backend-only: RLS on with no policies, so only the service role can touch it.

CREATE TABLE IF NOT EXISTS post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- The cron's hot path: pending posts whose time has come.
CREATE INDEX IF NOT EXISTS idx_post_queue_due
  ON post_queue(status, scheduled_at);

ALTER TABLE post_queue ENABLE ROW LEVEL SECURITY;
