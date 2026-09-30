-- ============================================================
-- Delivery claim state — 2026-09-12
--
-- The push delivery agents read every 'pending' row, send, then mark each
-- row 'sent'. Two overlapping runs (the hourly cron alongside an admin
-- "run now", or a slow run still sending when the next hour fires) both
-- read the same pending rows and both push them, so a member's phone
-- shows the notification twice. The agents now claim rows first by
-- flipping them pending -> 'sending' in one UPDATE and only push the rows
-- that flip; this adds the value to both status constraints.
-- ============================================================

ALTER TABLE dispatch_deliveries DROP CONSTRAINT IF EXISTS dispatch_deliveries_status_check;
ALTER TABLE dispatch_deliveries ADD CONSTRAINT dispatch_deliveries_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'dismissed'::text, 'read'::text]));

ALTER TABLE counselor_broadcast_deliveries DROP CONSTRAINT IF EXISTS counselor_broadcast_deliveries_push_status_check;
ALTER TABLE counselor_broadcast_deliveries ADD CONSTRAINT counselor_broadcast_deliveries_push_status_check
  CHECK (push_status IN ('pending', 'sending', 'sent', 'failed', 'skipped'));
