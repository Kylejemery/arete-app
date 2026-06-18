# Weekly Coverage Gap Agent

Autonomous weekly job (`coverage-gap-agent.js`) — the third agent in the Arete
AI Agent System. It finds where the corpus is weak and recommends what to add.

It detects two kinds of gap and writes one `corpus_gap_reports` row per week:

1. **Structural gaps** — works the significance map (`corpus_significance_map`)
   says matter, by tier and `chunk_threshold`, but that `rag_corpus` covers
   thinly or not at all. Severity is `absent` (0 chunks), `critical` (more than
   half the threshold missing), or `low`.
2. **Demand gaps** — the top themes users actually raise (aggregated from
   `journal_analysis.themes`, last 30 days) that the corpus answers poorly.
   Before running a fresh semantic search it consults the
   `concept_passage_map` learning layer, so Kyle's prior approvals/rejections
   steer the verdict. Newly retrieved passages are stored as `approved = null`
   (unreviewed) for review in the admin Gap Agent tab.

It then produces **recommended additions**: public-domain structural gaps that
carry a `recommended_url` are marked `can_auto_queue`; summary-only and
demand-driven gaps are flagged for manual handling via the admin corpus page.

Runs **Monday 05:00 ET** — after the nightly Corpus Agent (03:00) and Journal
Analysis Agent (04:00), so it measures against the freshest corpus.

## Seeding / adjusting the significance map

The map is the agent's source of truth and lives in DB. Seed (or re-seed after
editing the JSON) with the idempotent upserting seeder:

```
node server/data/seed-significance-map.js
```

To adjust thresholds, tiers, or add works: edit
`server/data/significance-map.json` and re-run the seeder. It upserts on
`(author, work)`, so existing rows are updated in place and nothing is
duplicated.

> **Naming note:** structural-gap detection matches `author` + `work` exactly
> against `rag_corpus`. If a work is ingested under a slightly different name
> (e.g. corpus `Seneca / Letters` vs. map `Seneca / Letters from a Stoic`) it
> will read as a false gap. Keep the map's names aligned with the corpus, or
> normalize the corpus naming, to avoid phantom "absent" rows.

## Running manually

```
cd server
node coverage-gap-agent.js
```

Computes both gap types, writes the week's report, and prints a summary brief
(structural/demand/recommendation counts + the top of each list), then exits.

## Railway scheduling (its own cron service)

A **separate** Railway cron service — not bolted onto the API process
(`index.js`), matching the corpus and journal agents. Config lives in
`server/railway.gap-agent.json`.

1. In the Railway project, **New → GitHub Repo** pointing at this repo.
2. Set the service's **Root Directory** to `server`.
3. Configure the service (Settings):
   - **Start command**: `node coverage-gap-agent.js`
   - **Cron schedule**: `0 10 * * 1` → **10:00 UTC Monday (5:00 AM ET)**.
   - **Restart policy**: `NEVER` (cron jobs run once and exit).
   - (Optional) point the service at `railway.gap-agent.json` as its config.
4. Add the environment variables below.

A cron service sleeps between runs, so cost is just the weekly embedding spend,
bounded by the top-20 themes searched.

## Environment variables (set on the cron service)

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Bypasses RLS to read the corpus/analysis and write reports. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-small`) for demand-gap semantic search. Without it, demand-gap detection is skipped (structural gaps still run). |

## Review

The weekly report and the concept-passage approval UI live at
`academy.pursuearete.com/admin` → **Gap Agent** tab:

- **Add to Queue** on a recommendation inserts it into `corpus_ingestion_queue`
  (auto-queueable items only) so the nightly Corpus Agent picks it up.
- **Approve / Reject** on a retrieved passage writes to `concept_passage_map`,
  training future demand-gap verdicts.
