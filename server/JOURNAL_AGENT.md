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
- **One queue row per analysis.** `distress_review_queue.analysis_id` is
  unique. The agent writes only through `enqueue_distress_review`
  (`insert ... on conflict (analysis_id) do nothing`), so a reviewed or
  escalated case never comes back as pending. A trigger allows status to
  move forward only (pending < dismissed < reviewed < escalated).
- **A week's flag is sticky.** Once any run that week flags an analysis, a
  later re-run that week cannot clear `distress_flagged`.
- **One run per morning.** Each run claims a row in `agent_runs` through
  `claim_agent_run('journal-analysis', '20 hours')`, and a second scheduler
  firing the same morning exits. The admin "run now" button skips the
  window but still refuses to overlap a run in progress. Until 2026-09-25 the
  `coverage-gap-agent` Railway service had its config-as-code path pointed at
  `railway.agent.json`, so the job ran twice every day. Check that no other
  service points at this file.
- **Support card.** For 7 days after a user's flag, the Journal screen (web
  and mobile) shows a dismissible card with 988 and findahelpline.com
  (`GET /api/user/support-card`). The card never mentions analysis.
