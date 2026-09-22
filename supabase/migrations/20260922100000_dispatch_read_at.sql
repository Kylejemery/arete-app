-- Retention plan R5: record when a member actually opened a dispatch.
--
-- GET /api/dispatch/today and /api/dispatch/:id set read_at on the reader's
-- delivery row regardless of its status (a row that was 'sent' by push kept
-- that status and was never recorded as opened), and create the row when
-- none exists (a member reading in-app who had no push token when the
-- dispatch was queued, or a dispatch delivered by the timezone fallback).
ALTER TABLE dispatch_deliveries ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_dispatch_deliveries_read_at ON dispatch_deliveries (read_at) WHERE read_at IS NOT NULL;
