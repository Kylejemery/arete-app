# Weekly Synthesis Agent

Autonomous weekly job (`synthesis-agent.js`) — the fourth agent in the Arete AI
Agent System. It generates **cross-source philosophical synthesis documents**:
not summaries of individual works, but cross-thinker analyses that map
agreements, tensions, and convergences across the corpus that no single chunk
contains. Approved documents are ingested back into `rag_corpus` with
`text_type='synthesis'` — a third layer above primary sources and summaries that
Cabinet counselors can retrieve. The corpus thinking about itself.

## What it does each run

1. **Reads its config** from `agent_config` (`agent_name='synthesis_agent'`).
   If `enabled` is false, it exits immediately.
2. **Selects concepts** by user demand: aggregates the top themes from
   `journal_analysis.themes` + `dominant_theme` (last 30 days), filtered to those
   at or above `min_user_frequency`. It skips concepts already synthesized this
   week, or approved/ingested in the last 60 days. If there aren't enough
   demand-driven concepts to hit `documents_per_week`, it backfills from the
   `corpus_significance_map` (structural concepts).
3. **Retrieves source passages** per concept: human-approved passages from
   `concept_passage_map` first; otherwise a semantic search via the
   `match_rag_corpus_ids` RPC, deduped by author so no single thinker dominates.
4. **Picks a synthesis type** — `cross_thinker` (≥3 authors), `concept_evolution`
   (sources spanning early→late Stoa), or `practical` (always available).
5. **Generates a ~2000-word document** with Claude Sonnet under a system prompt
   that enforces the guardrail: **surface tensions, never resolve them**; attribute
   every claim to a source; flag uncertainty.
6. **Stores it as `pending_review`** in `synthesis_documents`. Nothing is ingested
   automatically — Kyle reviews in the admin dashboard.

Runs **Monday 11:00 UTC (≈6:00 AM ET)** — after the Corpus Agent (03:00 ET),
Journal Analysis Agent (04:00 ET), and Coverage Gap Agent (05:00 ET), so it
synthesizes against the freshest corpus and demand signals.

## Adjusting parameters (no redeploy)

The agent reads `agent_config` at the start of every run, so changes take effect
on the next scheduled run with no redeployment. Edit from the admin dashboard
(`academy.pursuearete.com/admin` → **Synthesis** tab → Agent Config), which
PATCHes `/api/admin/agent-config/synthesis_agent`, or update the row directly:

```sql
UPDATE agent_config
SET config = config || '{"documents_per_week": 8}'::jsonb
WHERE agent_name = 'synthesis_agent';
```

Config keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `documents_per_week` | 5 | How many synthesis documents to generate per run (1–20). |
| `min_user_frequency` | 3 | Minimum aggregated theme frequency for a concept to qualify by demand. |
| `target_word_count` | 2000 | Target length passed to the generator. |
| `synthesis_types` | all three | Which types the agent may choose from. |
| `enabled` | true | Master switch. |

**To disable:** set `enabled` to `false` (toggle in the admin config panel, or
`SET config = config || '{"enabled": false}'::jsonb`).

## Running manually

```
cd server
node synthesis-agent.js
```

Reads config, selects concepts, generates documents, writes them as
`pending_review`, prints a summary, then exits. With no `journal_analysis`
demand data and no active `corpus_significance_map` rows it correctly defers and
generates nothing.

## Railway scheduling (its own cron service)

A **separate** Railway cron service — not bolted onto the API process
(`index.js`), matching the corpus, journal, and gap agents. Config lives in
`server/railway.synthesis-agent.json`.

1. In the Railway project, **New → GitHub Repo** pointing at this repo.
2. Set the service's **Root Directory** to `server`.
3. Configure the service (Settings):
   - **Start command**: `node synthesis-agent.js`
   - **Cron schedule**: `0 11 * * 1` → **11:00 UTC Monday (≈6:00 AM ET)**.
   - **Restart policy**: `NEVER` (cron jobs run once and exit).
   - (Optional) point the service at `railway.synthesis-agent.json` as its config.
4. Add the environment variables below.

A cron service sleeps between runs, so cost is just the weekly generation spend
(~5 documents × one Sonnet call each, plus a handful of embeddings per concept).

## Environment variables (set on the cron service)

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Bypasses RLS to read the corpus/analysis and write `synthesis_documents`. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-small`) for semantic source retrieval. Without it, only human-approved `concept_passage_map` passages are usable. |
| `CLAUDE_API_KEY` | yes | Anthropic key for generation (`claude-sonnet-4-6`). Same variable name the other agents use. |

> Ingestion of approved documents into `rag_corpus` happens in the **admin web
> app** (Vercel), not in this cron service — so the web app needs `OPENAI_API_KEY`
> and `ADMIN_EMAIL` set there. See `POST /api/admin/synthesis/:id/ingest`.

## Review & ingestion

Generated documents are reviewed at `academy.pursuearete.com/admin` →
**Synthesis** tab:

- **Pending Review** — read, edit, approve, or reject each document. Editing
  resets it to `edited` (needs re-approval). Approving then ingesting adds the
  document to `rag_corpus` as `text_type='synthesis'` (author `Arete Synthesis`).
- **Agent Config** — tune `documents_per_week`, `min_user_frequency`, and the
  enabled toggle.
- **Ingested archive** — read-only record of what synthesis is in the corpus.
