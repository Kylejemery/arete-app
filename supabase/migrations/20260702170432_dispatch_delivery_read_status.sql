-- In-app reads count as delivery. GET /api/dispatch/today flips the reader's
-- pending dispatch_deliveries row to 'read' (and rolls it into
-- daily_dispatches.delivered_count), so the admin Dispatch tab reflects
-- reality for users who open the app without a push notification. 'read' is
-- distinct from 'sent' so push sends and in-app reads stay distinguishable.

ALTER TABLE dispatch_deliveries DROP CONSTRAINT IF EXISTS dispatch_deliveries_status_check;
ALTER TABLE dispatch_deliveries ADD CONSTRAINT dispatch_deliveries_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'dismissed'::text, 'read'::text]));
