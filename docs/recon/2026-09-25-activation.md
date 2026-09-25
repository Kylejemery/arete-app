# Activation recon, 2026-09-25

This recon was done before any code changes for the activation plan. Paths are repo-relative. Line numbers are as of commit 7c25834.

## Live-state surprises

These matter before touching anything else.

- **Five committed migrations were never applied to the project** (`zhaarabzemhantyxxckq`). The remote history ends at `20260921152557`. These files have no applied version:
  - `20260921120000_product_events.sql`: `product_events`, `subscription_events`, `user_settings.last_active_at` and `kt_completed_at`
  - `20260922100000_dispatch_read_at.sql`
  - `20260923100000_kt_reflection.sql`
  - `20260924100000_checkin_followup.sql`
  - `20260925100000_email_sends.sql`

  Any code that writes these objects (`logEvent`, the `kt_completed_at` stamp, `/api/kt-reflection` storage, the check-in follow-up, the lifecycle email ledger) is failing against production today.
- **The journal agent runs twice every morning.** Railway service `coverage-gap-agent` has its config-as-code path set to `/server/railway.agent.json`, which is the journal agent's file. So it runs `node journal-analysis-agent.js` at `0 9 * * *`, and its logs show "=== Journal Analysis Agent ===" daily. The real `journal-analysis-agent` service runs the same job one to two minutes apart. The coverage gap agent itself has not been running.
- **These objects are not created by any migration file:** `cabinet_conversations`, `check_ins.reflection_answer`, `check_ins.stoic_answer`, and RPC `try_increment_message_count`. They were created out of band.

## Distress flagging job

- **Code:** `server/journal-analysis-agent.js`. It is a standalone Railway cron (`server/railway.agent.json`, `0 9 * * *`, restart NEVER). It can also be run on demand through `POST /api/admin/journal/run` (`server/index.js:5020-5057`), which has an in-memory guard only.
- **Selection:** every user with journal or Cabinet activity in the last 7 days is re-analyzed every day.
- **Store:** `storeAnalysis` upserts on `(user_id, analysis_week)`, where the week starts Monday UTC. So the analysis id is stable all week. Each upsert overwrites `insight_text` and `distress_flagged` and resets `delivered = false`.
- **Enqueue:** `queueDistressReview` does a plain insert with status `pending` and never checks for an existing row or for errors. A user who stays flagged gets a new pending row each run, and runs are doubled by the second Railway service. An analysis escalated on 9/14 got new pending rows on 9/16 and 9/17 this way.
- **Queue table:** `distress_review_queue` (migration `20260618000001_journal_analysis.sql`). It has no uniqueness on `analysis_id`. RLS is on with no policies.
- **State before the fix:** 56 rows over 12 analyses.
- **Admin surfaces:**
  - `academy/web/src/app/api/admin/distress/route.ts` lists rows and lets the admin set any status, including back to pending.
  - The counters in `api/agents/journal/route.ts:40` and `api/admin/overview/route.ts:65` count pending rows.
  - `server/weekly-self-reflection-agent.js:206` also reads the queue.
- **Support resources:** none exist anywhere in the app or on the web.

## Journal analysis delivery

- **Delivery is pull-only.** `GET /api/user/insight` (`server/index.js:2124-2157`) returns the latest analysis with `distress_flagged = false`. It marks that analysis delivered only when the analysis is returned.
- **Only mobile calls it:** `app/(tabs)/journal.tsx:187-201`, when the Journal tab gains focus. The web app has no insight card.
- **Why delivery is low:**
  1. The daily upsert resets `delivered` to false and swaps in new text.
  2. Only the mobile Journal tab pulls.
  3. Users who don't open that tab in a given week are never "delivered".
- **Free tier:** sees a 3-line preview and an `insight_tease` tap to the paywall (`journal.tsx:746-782`). The full text is sent to the device.
- **Other readers:** `server/lifecycle-email-agent.js:337-350` (day five email, non-flagged only) and `server/longitudinal-user-model.js:122`.

## Know Thyself

- **Storage:** `user_settings` columns. There is no question registry; labels are hard-coded per screen.
  - `kt_background`, `kt_identity`, `kt_goals` (mirrored to `user_goals`), `kt_strengths`, `kt_weaknesses`, `kt_patterns`, `kt_major_events`, `future_self_years`, `future_self_description`
  - `feedback_preference`, `kt_life_situation`, `app_usage_intent`, `accountability_style`, `archetype`. Only `feedback_preference` is used in prompts.
- **Screens:**
  - Mobile: `app/know-thyself.tsx` (form), `app/(onboarding)/setup.tsx` (11-step signup wizard; email signup routes there), `app/onboarding.tsx` (Future Self conversation), `app/kt-reflection.tsx`.
  - Web: `web/src/app/profile/page.tsx`, `web/src/app/onboarding/page.tsx`, `web/src/app/setup/page.tsx` (username only).
  - Settings entry points: `app/settings.tsx:440`, `web/src/app/settings/page.tsx:126`, and the web sidebar.
- **Complete flag:** `profiles.know_thyself_complete` is set only on the client, by `markKnowThyselfComplete()` (`lib/db.ts:790-831`, `web/src/lib/db.ts:1080-1120`). The rule is `kt_goals` plus at least 2 of `KT_OTHER_FIELDS`. The flag is never unset.
- **Gating:** there is no hard gate. Mobile email signup goes to the setup wizard. That wizard requires name, goals, a future-self description and a cabinet member before "continue". The web app only requires a username.
- **Prompts:**
  - Group Cabinet (parallel path): `loadKnowThyselfSettings` and `buildKnowThyselfBlock` (`server/index.js:960-1012`), injected at 1453-1461 and 1530.
  - 1:1 and legacy paths: the client-built profile in `services/claudeService.ts:243-283` (`gatherUserProfile`) and `web/src/lib/claudeService.ts:148-195`.
- **Off-limits topics:** no field exists anywhere.

## Cabinet conversations

- **Table:** `cabinet_conversations(id, user_id, messages jsonb, counselor_slugs text[], session_type, created_at, updated_at)`. A trigger keeps one row per `(user_id, counselor_slugs)` (`20260915010000`).
- **Writers:**
  - Mobile: `lib/db.ts:427-558`. The group thread is saved with `counselor_slugs` null. 1:1 threads use `[counselorId]`.
  - Web: `web/src/lib/db.ts:316-363` (group, null slugs) and `createConversation` (sorted slugs) for `/cabinet/conversation`.
  - The server never writes this table.
- **Message shape:** `{role, content, timestamp (ms), counselorId?, counselorName?, kind?}`. Group replies carry `counselorId` and `counselorName` from the server's parallel `responses[]`.
- **Server endpoint:** `POST /api/chat/counselor` (`server/index.js:1348-1777`).
  - Parallel path: a Haiku director picks voices, then `fireParallelCounselors`.
  - Single path: the client's system prompt plus server blocks.
  - The model comes from the tier: free = Haiku, premium = Sonnet 4.6, pro = Opus.
  - Nothing marks a turn as the first. The best signal is "no prior user message in history".

## Check-ins

- **Table:** `check_ins`, one row per `(user_id, check_in_date)` since `20260526000001_checkins_parity.sql`. That migration set `type = NULL` when it merged rows.
- **Writers:** both apps upsert, at `lib/db.ts:264-279` and `web/src/lib/db.ts:134-148`. Nothing writes `type`.
- **Intention:** a blank text input on the morning screens (`app/(tabs)/morning.tsx:332`, `web/src/app/morning/page.tsx:410`), debounced save.
- **Daily counselor question:** Home. The answer goes into that counselor's chat thread.
- **`reflection_answer`:** no UI writes it. It is read at `services/claudeService.ts:485,750,1074` and `web/src/lib/claudeService.ts:705`. The evening reflection box writes `stoic_answer` instead, so `reflection_answer` is dead.

## Goals

- **Table:** `goals` (`source` default 'user', `category` default 'GENERAL').
- **Creation:** mobile only, in `app/(tabs)/journal.tsx:453-461`. The web app lists, completes and deletes.

## Scrolls

- **Table:** `scrolls`. `counselor` is limited by a check constraint to marcus, epictetus or seneca. `request_type` is auto or requested.
- **Generation:** `POST /api/scrolls/generate` (`server/index.js:2911-3006`) generates the scroll, and the client inserts the row. Requesters are `app/(tabs)/scrolls.tsx:63-96` and `web/src/app/scrolls/page.tsx:113-145` (the web version omits `request_type`).

## Paywall

- **`paywall_events`:** inserted only by mobile `app/paywall.tsx:154-159`.
- **Sources:** `lib/paywall.ts`, mirrored in `web/src/lib/paywall.ts`.
- **At the limit:**
  - The mobile Cabinet shows an inline card (`cabinet.tsx:1015-1035`).
  - Web shows `DailyLimitCard`.
  - Mobile 1:1 chat saves "temporarily unavailable (Error 403)" as the counselor's reply (a bug).
  - The paywall screen has no copy for `cabinet_daily_limit`, `counselor_daily_limit` or `insight_tease`.
- **Server limit:** `enforceMessageLimit` (`server/index.js:744-912`).

## Subscription tier

- **Decision source:** entitlement is decided from `profiles.tier` and `is_premium` (`server/index.js:749-778`, `lib/db.ts:907-929`, `web/src/lib/db.ts:576-592`). The web version ignores `pro` unless `is_premium` is set. `subscription_tier` is deprecated.
- **Writers of `subscriptions`:**
  - The Stripe webhook (`web/src/app/api/stripe-webhook/route.ts`), which also writes `profiles`.
  - Manual grant functions (`grant_manual_premium`, `grant_manual_tier`, `expire_manual_grants` via pg_cron every 30 min).
  - Nothing reconciles `subscriptions` with `profiles` after the fact.

## Events

- **`product_events`:** written through `logEvent` in `lib/events.ts`, `web/src/lib/events.ts` and `server/lib/events.js`. The table is not yet applied in production (see above).
- **Other tables:** `paywall_events` and `subscription_events` exist. There is no `app_events`.
