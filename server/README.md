# Arete Backend

A minimal Express proxy server that forwards requests from the Arete mobile app to the Claude API, keeping the API key secure on the server.

## What this server does

- Receives chat requests from the Arete app
- Forwards them to the Anthropic Claude API using a server-side API key
- Returns Claude's response back to the app
- The Claude API key never leaves the server and is never bundled into the app binary

## Endpoints

### `GET /health`

Returns server status.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### `POST /api/chat`

Proxies a request to the Claude API.

**Request body:**
```json
{
  "system": "You are a helpful assistant...",
  "messages": [{ "role": "user", "content": "Hello" }],
  "max_tokens": 1500,
  "model": "claude-opus-4-5"
}
```

`max_tokens` and `model` are optional (defaults: `1500` and `claude-opus-4-5`).

**Response:** The raw Claude API response object.

## Environment variables

Set these in each Railway service's **Variables** tab (or `.env` locally — see
`.env.example`). They are **not** baked into the image. If `CLAUDE_API_KEY` is
missing the server still boots but logs `WARNING: CLAUDE_API_KEY is not set` and
every Claude endpoint returns HTTP 500.

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | **Yes** | Anthropic API key (https://console.anthropic.com). Powers all counselor/agent Claude calls. |
| `OPENAI_API_KEY` | **Yes** | OpenAI key — RAG embeddings + any `gpt-*` counselor models. RAG returns no passages without it. |
| `SUPABASE_URL` | **Yes** | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service-role secret (bypasses RLS). |
| `PORT` | No | Listen port. Railway sets this automatically; defaults to `3000` locally. |
| `GEMINI_API_KEY` | No | Enables `gemini-*` counselor models; absent → falls back to Claude. |
| `XAI_API_KEY` | No | Enables `grok-*` counselor models; absent → falls back to Claude. |
| `RESEND_API_KEY` | No | Transactional email for shared-session invites; absent → email send skipped. |
| `INVITE_FROM_EMAIL` | No | From-address for invite emails (has a default). |
| `RAILWAY_PUBLIC_URL` | No | Base URL used in invite links (has a default). |
| `PARALLEL_CABINET_ENABLED` / `PARALLEL_CABINET_ALLOWLIST` | No | Parallel Cabinet feature flags. |

> **Security:** these keys must only ever be runtime service variables — never
> committed, never baked into the image via a Dockerfile/Nixpacks ARG. A key
> that was previously embedded in a built image should be rotated.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and add your API key:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `CLAUDE_API_KEY` to your Anthropic API key.

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`.

## Deploying to Railway

1. Go to [railway.app](https://railway.app) and create a new project.
2. Connect your GitHub repo (or push the `server/` directory as a standalone repo).
3. Railway will auto-detect the Node.js app and run `npm start`.
4. In the Railway dashboard, add **all four required** variables
   (`CLAUDE_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`) under the service's **Variables** tab, plus any
   optional ones you need.
5. Railway sets the `PORT` environment variable automatically — no action needed.
6. Once deployed, copy the Railway-provided URL (e.g. `https://your-app.railway.app`) and set it as `EXPO_PUBLIC_API_BASE_URL` in your app's `.env`.

### Variables are per-service

Railway scopes variables to each service, and the autonomous agents run as
**separate cron services** from this API. Set each one's variables independently:

**Every** service needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The AI
keys are what differ — the table lists only those, so a blank cell means the
service needs neither. Don't set a key a service doesn't use; it's one more
secret in one more place for nothing.

All schedules are UTC. Cron services must set **Restart Policy = Never** —
each script runs once and exits 0, and any other policy turns that exit into a
restart loop. `Root Directory` is `server` for every service.

| Service | Start command | Schedule | Extra keys |
|---------|---------------|----------|-----------|
| API | `node index.js` | — (always on) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Journal Analysis | `node journal-analysis-agent.js` | `0 9 * * *` (daily 09:00) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Dispatch Generation | `node dispatch-generation-agent.js` | `0 10 * * *` (daily 10:00) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Dispatch Delivery | `node dispatch-delivery-agent.js` | `0 * * * *` (hourly) | — |
| World | `node world-agent.js` | `30 3 * * 1` (Mon 03:30) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Tension | `node agents/tension-agent.js` | `30 5 * * 1` (Mon 05:30) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Inquiry | `node agents/inquiry-agent.js` | `30 6 * * 1` (Mon 06:30) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Longitudinal User Model | `node longitudinal-user-model.js` | `30 9 * * 1` (Mon 09:30) | `CLAUDE_API_KEY` |
| Coverage Gap | `node coverage-gap-agent.js` | `0 10 * * 1` (Mon 10:00) | `OPENAI_API_KEY` |
| Synthesis | `node synthesis-agent.js` | `0 11 * * 1` (Mon 11:00) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Weekly Self-Reflection | `node weekly-self-reflection-agent.js` | `0 7 * * 0` (Sun 07:00) | `CLAUDE_API_KEY` |
| Dreaming | `node agents/dreaming-agent.js` | `30 23 * * 0` (Sun 23:30) | `CLAUDE_API_KEY`, `OPENAI_API_KEY` |
| Consolidation | `node agents/consolidation-agent.js` | `30 7 * * *` (daily 07:30) | `CLAUDE_API_KEY` |

Ordering matters on Mondays: World → Tension → Inquiry run before the daily
Journal Analysis at 09:00; Longitudinal, Coverage Gap, and Synthesis run after
it. Longitudinal specifically must stay after Journal Analysis — it reads that
morning's `journal_analysis` rows, and an earlier slot silently builds every
portrait from week-old data.

> **These config files are live, via Config-as-code.** Railway does not read
> `railway.<name>.json` by default — it looks for `railway.json`. Each service
> here has its **Settings → Config-as-code** path pointed at its own file, which
> makes the file authoritative: schedule, start command, and restart policy all
> come from git, and the corresponding dashboard fields render read-only
> ("The value is set in /server/railway.<name>.json").
>
> The consequence is that **you change a schedule by editing the file and
> pushing, not in the dashboard.** A local commit changes nothing — Railway
> deploys from GitHub `main`, so an unpushed or unmerged change leaves the old
> schedule live while the repo says otherwise. If a service's cron doesn't
> match the file, check whether the change actually reached `main` before
> touching anything in Railway.
>
> A new service needs its Config-as-code path set once, at creation.

See `JOURNAL_AGENT.md`, `COVERAGE_GAP_AGENT.md`, `DISPATCH_AGENT.md`, and
`SYNTHESIS_AGENT.md` for individual agent details.
