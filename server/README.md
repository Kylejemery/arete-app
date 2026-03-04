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

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | Your Anthropic API key (get one at https://console.anthropic.com) |
| `PORT` | No | Port to listen on (defaults to `3000`) |

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
4. In the Railway dashboard, add the `CLAUDE_API_KEY` environment variable under your service's **Variables** tab.
5. Railway sets the `PORT` environment variable automatically — no action needed.
6. Once deployed, copy the Railway-provided URL (e.g. `https://your-app.railway.app`) and set it as `EXPO_PUBLIC_API_BASE_URL` in your app's `.env`.
