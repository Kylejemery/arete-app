# Nightly Journal Analysis Agent

Autonomous nightly job (`journal-analysis-agent.js`) that, for each user active in
the last 7 days, reads their `journal_entries` **and** `cabinet_conversations`,
identifies recurring philosophical themes + longitudinal patterns, grounds the
dominant theme in `rag_corpus` (`match_rag_corpus`), and stores a weekly insight
in `journal_analysis`. Distress-flagged cases are queued in `distress_review_queue`
for human review and are **never auto-delivered**.

It reuses the same raw-`fetch` calls to Claude (`CLAUDE_API_KEY`) and OpenAI
embeddings as `index.js` — no SDKs.

## Running manually

```
cd server
node journal-analysis-agent.js
```

Processes every active user once and exits, printing a run summary
(`Succeeded | Failed | Distress flagged`).

## Railway scheduling (its own cron service)

A **separate** Railway cron service — not bolted onto the API process
(`index.js`), so it never touches the web request lifecycle.

1. In the Railway project, **New → GitHub Repo** pointing at this repo.
2. Set the service's **Root Directory** to `server`.
3. Configure the service (Settings):
   - **Start command**: `node journal-analysis-agent.js`
   - **Cron schedule**: `0 9 * * *`  → **09:00 UTC nightly (~4 AM ET)**, after the
     corpus agent's 08:00 run.
   - **Restart policy**: `NEVER` (cron jobs run once and exit).
4. Add the environment variables below.

A cron service sleeps between runs, so cost is just the nightly Claude +
embedding spend, bounded by the active-user count.

## Environment variables (set on the cron service)

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as the API service. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Bypasses RLS to read journals/cabinet and write analysis. |
| `CLAUDE_API_KEY` | yes | Anthropic key (same name index.js uses) for the Sonnet analysis. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-small`) for RAG grounding. |

## Delivery & safety

- Insights are stored with `delivered = false`; the app fetches them via
  `GET /api/user/insight` (marks delivered on first fetch).
- **Distress cases are excluded** from that endpoint and routed to
  `distress_review_queue`. Review them at `/admin/distress`.
