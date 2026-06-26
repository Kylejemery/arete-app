# Daily Dispatch Agent

The fifth agent in the Arete AI Agent System. Every morning each user receives a
push notification with a fresh **dispatch** — a 150–200 word integrated
reflection generated that morning. Not a retrieved quote: a generated document
that synthesizes (1) what the community is collectively wrestling with (top
`journal_analysis` themes, last 7 days), (2) what the corpus has recently been
thinking about (latest ingested synthesis + recent ingestions), and (3) the
specific day. Every dispatch ends with one concrete practice, completable within
24 hours.

**Community-level, not personalized.** One dispatch per day, sent to everyone —
a shared morning briefing. Per-user coaching is the Journal Analysis Agent's job.

## Architecture — generation and delivery are decoupled

Two **separate** Railway cron services so the cheap hourly delivery sweep never
blocks (or is blocked by) the once-daily generation:

- **Generation** (`dispatch-generation-agent.js`) — runs once at **10:00 UTC
  (≈5 AM ET)**. Generates today's dispatch with Claude Haiku, stores it in
  `daily_dispatches`, and pre-creates `dispatch_deliveries` rows (`pending`) for
  every opted-in user with a push token. Idempotent: one row per `dispatch_date`.
- **Delivery** (`dispatch-delivery-agent.js`) — runs **every hour on the hour**.
  Finds users whose configured local dispatch hour (default 7 AM) falls in the
  current hour *in their own timezone*, sends the teaser as a push notification
  via the Expo SDK, and flips each delivery `pending → sent`/`failed`.

Delivery is a push teaser (the dispatch's first sentence) → tap → full dispatch
in-app (`/dispatch`). No email in v1.

## Data model (migration `20260619000001_daily_dispatch_agent.sql`)

- `daily_dispatches` — one row per day: `title`, `body`, `teaser`, `practice`,
  `community_themes`, `corpus_context`, generation metadata, and delivery counts.
- `dispatch_deliveries` — per-user log: `(dispatch_id, user_id)` unique, `status`
  in `pending | sent | failed | dismissed`.
- `user_settings` gains `timezone` (IANA, default `America/New_York`),
  `expo_push_token`, `dispatch_enabled` (default true), `dispatch_hour`
  (0–23, default 7). The token is written by the mobile app via
  `POST /api/user/push-token`; the timezone via `POST /api/user/timezone`.

> Note: `profiles.expo_push_token` predates this agent and was never written by
> runtime code. Registration now writes the token to `user_settings` so all
> dispatch preferences live on one row.

## Timezone delivery — how the hourly sweep targets users

The delivery job runs hourly. For each pending delivery it computes the user's
**current local hour** (`toLocaleString` with their IANA `timezone`) and sends
only when that equals their `dispatch_hour`. This means a single hourly job
naturally fans out across every timezone over the course of a UTC day with no
per-zone configuration. Invalid/unknown timezones fall back to Eastern Time
(send when UTC hour is 11 or 12, covering 7 AM ET across DST).

Because `dispatch_deliveries` has no direct FK to `user_settings`, the job
fetches pending deliveries and the matching settings rows separately and joins
in JS (a PostgREST embedded-resource join is not available here).

## Full morning agent run order (UTC)

| Time (UTC) | Agent | Notes |
| --- | --- | --- |
| 03:00 | Corpus Agent | Ingests texts |
| 04:00 | Journal Analysis | Reads users |
| 05:00 | Coverage Gap | Reads corpus + themes (Mondays only) |
| 06:00 / 11:00 | Synthesis Agent | Generates documents (Mondays only) |
| 10:00 | **Dispatch Generation** | Generates today's dispatch |
| hourly | **Dispatch Delivery** | Sends to users whose local dispatch hour has arrived |

## Railway scheduling (two new cron services)

Each is a **separate** Railway cron service (matching the other agents), config
in `server/railway.dispatch-generation-agent.json` and
`server/railway.dispatch-delivery-agent.json`.

**Service 1 — Dispatch Generation**
- Root directory: `server`
- Start command: `node dispatch-generation-agent.js`
- Cron schedule: `0 10 * * *` (10:00 UTC = 5:00 AM ET daily)
- Restart policy: `NEVER`

**Service 2 — Dispatch Delivery**
- Root directory: `server`
- Start command: `node dispatch-delivery-agent.js`
- Cron schedule: `0 * * * *` (every hour on the hour)
- Restart policy: `NEVER`

### Environment variables

| Var | Generation | Delivery | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | yes | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | yes | Bypasses RLS to read themes/corpus and write dispatch tables. |
| `OPENAI_API_KEY` | yes | — | Embeddings (`text-embedding-3-small`) for grounding-passage retrieval. |
| `CLAUDE_API_KEY` | yes | — | Anthropic key for generation (`claude-haiku-4-5-20251001`). |

The delivery service needs no API keys — it only reads Supabase and talks to the
Expo push service (`expo-server-sdk`, added to `server/package.json`).

## Adjusting parameters (no redeploy)

Both halves read `agent_config` (`agent_name='dispatch_agent'`) at the start of
each run. Edit from the admin dashboard (**Dispatch** tab → Agent Config, which
PATCHes `/api/admin/agent-config/dispatch_agent`) or directly:

```sql
UPDATE agent_config
SET config = config || '{"max_community_themes": 6}'::jsonb
WHERE agent_name = 'dispatch_agent';
```

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | true | Master switch (generation exits early when false). |
| `generation_hour_utc` | 10 | Documentation only — the cron schedule is the source of truth. |
| `delivery_hour_local` | 7 | Documentation only — per-user `dispatch_hour` governs delivery. |
| `max_community_themes` | 5 | How many community themes to feed the generator. |
| `target_word_count` | 175 | Target dispatch length. |
| `model` | `claude-haiku-4-5-20251001` | Generation model. Haiku — short doc, daily cadence, cost matters. |

## Running manually

```
cd server
node dispatch-generation-agent.js   # generate today's dispatch (idempotent)
node dispatch-delivery-agent.js     # send to users whose local hour matches now
```
