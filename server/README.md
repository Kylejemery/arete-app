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

| Service | Start command | Required variables |
|---------|---------------|--------------------|
| API | `node index.js` | `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Journal Analysis agent | `node journal-analysis-agent.js` | `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Coverage Gap agent | `node coverage-gap-agent.js` | `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (no Claude key) |

See `JOURNAL_AGENT.md` and `COVERAGE_GAP_AGENT.md` for each agent's schedule
and details.
