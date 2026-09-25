# Activation plan decisions, 2026-09-25

This file records the judgement calls made while carrying out the activation prompt without stopping to ask. Each entry gives what was chosen, why, and the alternative.

## Process

**D0.1 Branch.** The prompt says to commit to `main` only. This session runs in a managed cloud environment whose harness assigns the development branch `claude/optimistic-fermat-xyt1j9` and forbids pushing elsewhere without explicit permission.
- **Chosen:** every Part is committed to that branch, one commit per Part, pushed once at the end, with a draft PR into `main`.
- **Why:** it is the conservative option. Kyle merges it and gets the same history on `main`.
- **Alternative:** pushing to `main` directly.

**D0.2 PowerShell rules.** The container is Linux, so the PowerShell-specific rules (no `&&`, `Select-String`) do not apply. Everything else in the operating rules is followed.

**D0.3 Unapplied retention migrations.** Five committed migrations were never applied to the project (see the recon).
- **Chosen:** apply only `20260921120000_product_events.sql`.
  - Part 2 needs an events table, and this one is already the house standard (`logEvent` on three surfaces).
  - It is purely additive: two tables, two nullable columns, and RLS that is insert-own only.
- **Not applied:**
  - `20260925100000_email_sends.sql`. Applying it turns on outbound lifecycle email to real users. That is Kyle's call.
  - `20260922100000_dispatch_read_at.sql`, `20260923100000_kt_reflection.sql` and `20260924100000_checkin_followup.sql`. They are left for Kyle and listed in the report.
- **Alternative:** apply all five, or none. Applying none would have meant creating a second events table next to one the code already writes.

## Part 1

**D1.1 Why the job runs twice.** The Railway service `coverage-gap-agent` has its config-as-code path set to `/server/railway.agent.json`, the journal agent's file, so it ran the journal agent at 09:00 daily. The fix has two parts:
- **Railway:** the path was changed to `/server/railway.gap-agent.json` through the Railway API. This takes effect on that service's next deploy.
- **Code:** the agent now claims a run through `claim_agent_run('journal-analysis', '20 hours')`. A second scheduler firing the same morning exits without doing anything, so this holds even before the Railway change deploys, or if the path drifts again.
- **Alternative:** Railway only, with no in-code guard.

**D1.2 What "analyses created since the last successful run" means.** `journal_analysis` is upserted per `(user, week)`, so a flag raised on a Wednesday lands on a row created on Monday.
- **Chosen:** enqueue flagged analyses written by this run, plus a sweep for flagged analyses with `created_at` after the last successful run that have no queue row. The sweep catches a run that crashed between the store and the enqueue.
- **Dedupe:** "never enqueue an analysis that already has a row" is guaranteed by the unique index and `on conflict do nothing`.
- **Why:** reading the rule literally (only rows whose `created_at` is after the last run) would silently drop a mid-week distress flag. That is the one failure this queue exists to prevent.

**D1.3 Flags are sticky within a week.** Once an analysis for a week is flagged, a later re-run that week can no longer clear `distress_flagged`. A flagged analysis in the review queue could otherwise become deliverable as an insight the next morning.
- **Alternative:** keep re-evaluating the flag daily.

**D1.4 Open analyses after the collapse.** The prompt expected "two pending, one escalated". The collapse rule it specifies (escalated > reviewed > dismissed > pending) gives:
- Two pending: `1497f6ff` and `6540a17c`.
- Two escalated: `032cef37` and `4321568f`. The second was escalated on 9/15 and marked reviewed on 9/20. Escalated outranks reviewed, so it stays escalated.
- **Chosen:** the rule as written. The discrepancy is reported rather than overridden by hand.

**D1.5 Forward-only status.** The status may only move forward in the order pending → dismissed → reviewed → escalated.
- Moving forward is allowed, for example dismissed → reviewed, or reviewed → escalated.
- Moving backward is refused by a trigger. The admin route also refuses it, with a 409, before the database is hit.

**D1.6 Support card.**
- **Where:** it is shown on the Journal tab on mobile and the Journal page on web.
- **When:** for 7 days after the analysis's `created_at`, when the user has any `distress_flagged` analysis.
- **Dismissal:** a dismissal is stored locally per analysis id.
- **Data exposure:** the server endpoint returns only `{ show, key, until }`. It returns no notes and does not say why the card is shown.
