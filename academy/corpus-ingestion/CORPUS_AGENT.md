# Nightly RAG Corpus Agent

Autonomous nightly job that grows the `rag_corpus` table from a human-approved
queue (`corpus_ingestion_queue`). It reuses the existing ingestion pipeline
(`ingest-sources.js`: 400-word / 50-overlap chunking → `text-embedding-3-small`
→ upsert into `rag_corpus`) and logs each run to `corpus_ingestion_runs`.

## Files

- `corpus-agent.js` — the nightly job (fetch → clean → chunk → embed → upsert → report).
- `seed-queue.js` — one-time seed of the starter source list into the queue.
- `queue-add.js` — CLI to add a single source to the queue.
- `ingest-sources.js` — the shared pipeline (now exports `chunkText`, `ingestChunks`, …).
- `railway.json` — Railway cron service config for this folder.

## Running manually

```
cd academy/corpus-ingestion
node seed-queue.js        # one time — populate the starter list
node corpus-agent.js      # process up to CORPUS_AGENT_BATCH_SIZE pending sources
```

`CORPUS_AGENT_BATCH_SIZE=0 node corpus-agent.js` is a safe no-op dry run (creates
a run-log row, processes nothing, prints the coverage report).

## Railway scheduling (decoupled from the API server)

The agent runs as its **own** Railway cron service — it is NOT bolted onto the
main API process (`server/index.js`), so it never touches the web request
lifecycle. To wire it up in the Railway dashboard:

1. In the existing Railway project, **New → Empty Service** (or "GitHub Repo"
   pointing at this same repo).
2. Set the service's **Root Directory** to `academy/corpus-ingestion`. Railway
   then auto-detects this folder's `railway.json`, which sets:
   - `startCommand: node corpus-agent.js`
   - `cronSchedule: 0 8 * * *`  → **08:00 UTC nightly (~3 AM ET)**
   - `restartPolicyType: NEVER` (cron jobs run once and exit; don't restart)
3. Add the environment variables below to this service.

A cron service sleeps between runs (no idle web process), so cost is just the
nightly embedding spend bounded by `CORPUS_AGENT_BATCH_SIZE`.

## Environment variables (set on the cron service in the Railway dashboard)

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role — bypasses RLS on the backend-only queue/run tables. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-small`). |
| `CORPUS_AGENT_BATCH_SIZE` | no | Sources per night. Default 3. `0` pauses ingestion. |

> These currently live only in `academy/corpus-ingestion/.env` (gitignored, used
> for local runs). They must be added to the **new Railway cron service's**
> variables — the API service's existing env does not carry over to a separate
> service.

## Cost guards

- Hard cap of `CORPUS_AGENT_BATCH_SIZE` sources per run (default 3).
- Giant-source handling: **full ingest + warning**. A work producing more than
  5,000 chunks logs a loud cost warning but is still ingested fully in one run
  (chosen over splitting for v1 simplicity).

## Scope (v1)

Reliable scheduled ingestion of a human-approved queue + a coverage report.
No AI gap analysis, source discovery, or quality scoring — those are later
phases. Writes only to `rag_corpus` (never the dead `source_text_chunks`).
