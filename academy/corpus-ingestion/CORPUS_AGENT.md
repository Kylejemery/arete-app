# Nightly RAG Corpus Agent

Autonomous nightly job that grows the `rag_corpus` table from a human-approved
queue (`corpus_ingestion_queue`). It reuses the existing ingestion pipeline
(`ingest-sources.js`: 400-word / 50-overlap chunking → `text-embedding-3-small`
→ upsert into `rag_corpus`) and logs each run to `corpus_ingestion_runs`.

Each run first syncs the editorial concordances in `concordance/*.md`
(`ingest-concordance.js`: one numbered entry, one chunk, embedded whole), then
drains the queue. See `concordance/README.md`.

## Files

- `corpus-agent.js` — the nightly job (concordance sync → fetch → clean → cut → chunk → embed → upsert → report).
- `ingest-concordance.js` — concordance sync, retrieval probes, and `--verify "query"`.
- `verify-queue.js` — check a URL or the pending queue through the agent's own guards before a run.
- `seed-queue.js` — one-time seed of the starter source list into the queue.
- `queue-add.js` — CLI to add a single source to the queue, with provenance and body markers.
- `ingest-sources.js` — the shared pipeline (exports `chunkText`, `ingestChunks`, …).
- `railway.json` — Railway cron service config for this folder.

## Queue row provenance and body markers

Every chunk inherits `translator` and `text_type` from its queue row (defaults:
null and `primary`). Two optional markers cut a translator's front matter so
that, unlike the Republic and the Apology already in the corpus, Jowett's
Introduction and Analysis is not ingested under Plato's name:

| Column | Meaning |
| --- | --- |
| `body_start_marker` | The body starts at the **last** occurrence of this exact string after Gutenberg boilerplate is stripped. Last, because a contents list often repeats the heading that opens the body. |
| `body_end_marker` | The body ends at the first occurrence of this string after the start. |

A marker that is not found never fails the source. The whole text is ingested
and a dated note is appended to the queue row's `notes`, so the fallback is
visible in the admin panel and the work can be deprecated and requeued.

Check a source before queueing it, from a machine with open egress:

```
node verify-queue.js --url https://www.gutenberg.org/cache/epub/1572/pg1572.txt --start-marker "PERSONS OF THE DIALOGUE"
node queue-add.js --author "Plato" --work "Timaeus" --url https://www.gutenberg.org/cache/epub/1572/pg1572.txt \
  --translator "Benjamin Jowett" --start-marker "PERSONS OF THE DIALOGUE" --priority 1
```

`verify-queue.js` prints the marker's occurrences with context, the upper-case
front-matter headings that are the usual candidates for a marker, and the
first and last 300 characters of what would be ingested.

## Running manually

```
cd academy/corpus-ingestion
node seed-queue.js              # one time — populate the starter list
node corpus-agent.js            # sync concordances, then process up to CORPUS_AGENT_BATCH_SIZE pending sources
node ingest-concordance.js      # concordance sync only, then its probes
node verify-queue.js            # check every pending row
```

`CORPUS_AGENT_BATCH_SIZE=0 node corpus-agent.js` is a safe near-no-op dry run
(creates a run-log row, syncs concordances, processes nothing, prints the
coverage report).

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

The admin "Run ingestion now" button uses the server-side twin
(`server/corpus-agent.js`). It applies the same provenance and markers but
does not sync concordances: the concordance files live in this folder and are
not deployed with the API server.

## Environment variables (set on the cron service in the Railway dashboard)

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role — bypasses RLS on the backend-only queue/run tables. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-small`). |
| `CORPUS_AGENT_BATCH_SIZE` | no | Sources per night. Default 3. `0` pauses queue ingestion. |
| `CORPUS_AGENT_PROBES` | no | `always` runs the concordance retrieval probes every night, not only when an entry was re-embedded. |

> These currently live only in `academy/corpus-ingestion/.env` (gitignored, used
> for local runs). They must be added to the **new Railway cron service's**
> variables — the API service's existing env does not carry over to a separate
> service.

## Cost guards

- Hard cap of `CORPUS_AGENT_BATCH_SIZE` sources per run (default 3).
- Giant-source handling: **full ingest + warning**. A work producing more than
  5,000 chunks logs a loud cost warning but is still ingested fully in one run
  (chosen over splitting for v1 simplicity).
- Concordance sync embeds only entries whose text changed or whose row has no
  embedding; an unchanged concordance costs nothing.

## Scope (v1)

Reliable scheduled ingestion of a human-approved queue + a coverage report.
No AI gap analysis, source discovery, or quality scoring — those are later
phases. Writes only to `rag_corpus` (never the dead `source_text_chunks`).
