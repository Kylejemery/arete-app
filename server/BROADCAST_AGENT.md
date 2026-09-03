# Counselor Broadcast Agent

A **broadcast** is a message written by hand in the admin console and sent from
a counselor to the membership — a "did you know", a note about something new,
anything you'd otherwise have emailed. It arrives twice: as a push
notification, and as a post in the member's Cabinet chat, where it opens a
conversation they can reply to.

Unlike every other agent in `server/`, this one generates nothing. It delivers.

## The one thing to understand

**The Cabinet post is the delivery. The push is only the nudge.**

Only a minority of members ever granted notification permission (see the note
in `lib/pushNotifications.ts` — the cold-boot prompt is why), and a member who
swipes a push away without tapping it has still not read anything. So the
message does not depend on the notification:

- The app calls `GET /api/broadcasts/pending` on **every foreground** and seeds
  each due broadcast into the Cabinet thread via `seedCounselorLine()` — the
  same path Settings reminders and Attend nudges already use.
- It then calls `POST /api/broadcasts/seen`. **Until it acknowledges, the
  message stays owed** and is served again. A dropped push, a cleared tray, an
  offline device, and a failed acknowledgement all recover on their own.
- Both paths dedupe on the broadcast id (`broadcast:<uuid>` in the client's
  seen-list), so a member who taps the push and one who never sees a
  notification both end up with exactly one post.

A member with no usable Expo token is marked `skipped`, not `failed`. They lose
the nudge, not the message. A low push count is not an incident.

## Data model (migration `20260903000000_counselor_broadcasts.sql`)

- `counselor_broadcasts` — one row per broadcast: the speaker, the copy
  (`push_body` for the notification, `message` for the Cabinet post), the
  audience, `send_date` + `send_hour`, and four tallies (`recipient_count`,
  `pushed_count`, `failed_count`, `seeded_count`). `seeded_count` is the real
  reach — how many members have the post in their thread.
- `counselor_broadcast_deliveries` — one row per recipient, unique on
  `(broadcast_id, user_id)`. `push_status` in `pending | sent | failed |
  skipped` tracks the nudge; `seeded_at` tracks the message. They are
  independent on purpose.

Both are service-role only (RLS on, no policies): the app reaches its own rows
through the API, never directly.

## Timing

`send_date` + `send_hour` are measured in **the member's own timezone**
(`user_settings.timezone`), like the Daily Dispatch. The hourly sweep sends to
whoever has reached their hour. Due-ness uses `>=`, not `==`: a broadcast is
owed until it is delivered, so a member who was offline at 10 AM still gets it
that evening — unlike a dispatch, which is stale by then.

A NULL `send_hour` means **as soon as possible**. The composer stores
`send_date` as *yesterday UTC* for those, because the earliest local date
anywhere on earth is UTC minus a day — that is what makes "now" mean now in
every timezone.

**Keep clear of 7 AM.** That is when the Daily Dispatch push goes out. Two
notifications in one morning is one too many.

## Who speaks

Pin a counselor (`counselor_slug`) and everyone hears the same voice. Leave it
NULL and each member hears it from the first counselor in their own cabinet,
falling back to `fallback_counselor_slug` (Marcus) — write copy that stays in
voice for any of them.

`user_settings.cabinet_members` still carries legacy short ids (`marcus`,
`goggins`, `roosevelt`) alongside real `counselors.slug` values;
`server/lib/broadcasts.js` maps the legacy forms before resolving.

## Railway (one new cron service)

Config in `server/railway.broadcast-delivery-agent.json`; set the service's
**Settings → Config-as-code** path to `/server/railway.broadcast-delivery-agent.json`
at creation, as with every other agent.

- Root directory: `server`
- Start command: `node broadcast-delivery-agent.js`
- Cron schedule: `0 * * * *` (every hour on the hour)
- Restart policy: `NEVER`
- Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. No AI keys — this
  agent calls no model.

The API service needs no new variables; it picks up the two broadcast
endpoints and `POST /api/admin/broadcasts/deliver` on its next deploy.

Until the cron service exists, **the feature still works**: "Run delivery
agent" in the Broadcasts tab pushes on demand, and the Cabinet post lands on
each member's next foreground either way. The cron is what makes a
*scheduled* broadcast fire without you.

## Admin

`academy/web` → **Broadcasts**. Compose, preview both surfaces, pick the
audience by tier or send a test to yourself, schedule by local hour. Drafts are
never delivered — the agent only reads `status = 'scheduled'`. Cancelling stops
a broadcast for everyone who hasn't received it yet; members who already have
it keep it.

Copy is locked once a broadcast leaves draft. A member who already has the post
in their thread would never see an edit, so editing means cancel, edit,
reschedule.
