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

## Stoic Life mode

A second mode of the same agent writes ~2000-word pieces on how to live a
Stoic life, one topic at a time, as versioned Markdown in the format of
`academy/corpus-ingestion/synthesis/` (the path Kyle's Stoic Logic and
Virtues of Socrates documents took). Code: `synthesis/modes/stoic-life.js`
(config, prompts, drafting), `synthesis/topic-proposer.js` (the backlog),
`synthesis/checks.js` (citation and political checks), `synthesis/drafts.js`
(the queue), `synthesis/shared.js` (model calls, embeddings), and
`lib/synthesis-markdown.js` (the file renderer).

**Flow.** Topics (`synthesis_topics`) → Kyle approves → a draft
(`synthesis_drafts`, one in review at a time) → Kyle approves →
`academy/corpus-ingestion/export-synthesis-drafts.js` writes
`<doc_key>.v1.md` → PR → merge → the nightly sync loads it. Nothing reaches
`rag_corpus` without a committed file.

**When it runs.** No schedule. The admin page at
`/admin/synthesis/stoic-life` starts a cycle
(`POST /api/admin/synthesis/stoic-life/run` on the API server) whenever Kyle
approves or rejects a topic or a draft, and has a Run now button. By hand:
`node synthesis-agent.js --mode stoic-life`. A cycle tops up the backlog,
then claims the oldest approved topic (`claim_stoic_life_topic`) unless a
draft is already in review.

**What a draft reads.** Primary texts only, author by author (Seneca,
Epictetus, Marcus Aurelius, Musonius Rufus, Diogenes Laertius Book VII): every
other layer is excluded in the query with the fence's own lists, and rows are
filtered again on `text_type` and author. No synthesis, including this mode's
own pieces, can reach a prompt; the fence is unchanged. For the present day it
reads the newest `world_observations` row with status `approved` (never
`auto_approved`), if no older than `world_observation_max_age_days`; it shapes
how the topic is applied, never which topic.

**What a draft claims.** Sections reporting the sources are `corpus_verified`
when the Haiku citation check supports them, `unverified` when it does not;
sections applying them to the present, and the introduction, are
`interpretive`, with `review_by` (12 months). The political check flags any
contemporary political reference not in the approved observation; the draft
is written once more without it, and a remaining flag is shown to Kyle.
Every quotation is then checked against the passages with no model call
(`synthesis/locators.js`): words found in no passage, or cited to the wrong
author, make their section `unverified`; a section number outside the
passage's label (the first draft cited Meditations 8.22 for 10.12) or a
quote introduced under another author's name is flagged on the review page.
A Haiku pass lists sentences carrying machine tells (`docs/machine-tells.md`)
as flags; it never rewrites.

**The backlog.** Seeded with nine topics from Kyle's two documents. When
fewer than `min_approved_topics` (5) approved topics wait, the proposer adds
up to the shortfall (never more than `max_pending_proposals` unreviewed), in
order: corpus gaps (thin Cabinet retrieval, clustered, at least 3 members,
counts stored and no question text), primary-text themes no title covers,
follow-ons from approved drafts, aggregated journal themes (at least 3
members). Internal and admin accounts never count. World observations are
only a context note.

**Config** (`agent_config.synthesis_stoic_life`, no redeploy): model
(`claude-sonnet-4-6`), check model (Haiku 4.5), authors and works, passage
counts, world-observation age, review period, backlog sizes, and the
proposer's thresholds. Missing keys fall back to the defaults in
`stoic-life.js`.

**Cost.** About $0.11 a draft (one Sonnet call, three Haiku checks), and about
$0.05 a proposal pass. At four drafts a month, with redrafts and proposals,
roughly $1-2 a month.

**Journal-demand drafts as Markdown.** `node synthesis-agent.js --markdown`
runs the original mode but writes each document to `synthesis_drafts` as a
`.v1.md` file, with every section's status set by the citation check, instead
of to `synthesis_documents`. The default run is unchanged.
