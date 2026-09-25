# Activation run B: decisions, 2026-09-25

This file records the judgement calls made while carrying out Run B without stopping to ask. Each entry gives what was chosen, why, and what the alternative was. Run A's decisions are in `2026-09-25-activation.md`.

## Process

**DB0.1 Branch.**
- **Chosen:** Run B is committed on the same session branch as Run A, `claude/optimistic-fermat-xyt1j9`, one commit per Part (`Part BN:`), and pushed once at the end.
- **Where it lands:** the open draft PR Kylejemery/arete-app#272. It has not merged, so Run B stacks on it (see Run A D0.1).
- **Alternative:** push to `main`, which the session harness does not permit.

**DB0.2 Run A's output.** Run A shipped every Part and skipped none.
- **Support card:** it exists (`components/SupportCard.tsx`, `web/src/components/SupportCard.tsx`), and B5 reuses it.
- **Events:** Run A added no `app_events` table. It applied and uses `product_events`.
- **Admin exclusions:** Run A's admin-excluding queries were one-off backfills inside applied migrations. They are not re-run.

## B1

**DB1.1 Who is seeded as internal.**
- **Seeded:** the admin, plus every profile whose email, handle or display name contains "test". That is 5 accounts, applied as a rule in the migration and also listed by email in `config/internal-accounts.ts`.
- **Placeholders:** Aundrea and Devon are placeholders, as the prompt asked, even though profiles that look like theirs exist.
- **Not marked:** the other non-admin account named "Kyle" has a different surname in its email, so it is not marked. The report asks Kyle to confirm it.
- **Alternative:** mark every name match. That risks excluding a real user.

**DB1.2 "Every query that excludes is_admin".**
- **What the search found:** no code outside the admin auth checks filters on `is_admin` for measurement.
- **Instead:**
  - The migration adds `measured_profiles`, which excludes both admin and internal accounts, for every metric, dashboard and backfill.
  - `CLAUDE.md` gains a convention saying so.
  - The admin Email tab tags internal recipients.
  - Every count in Runs B and C excludes both.
- **Why internal accounts stay in the mailing counts:** those counts are who can be mailed, not a metric, and internal accounts keep full functionality.

**DB1.3 Clients cannot change `is_internal`.** The 2026-08-25 lockdown grants the authenticated role UPDATE only on named columns, and this is not one of them. Verified: `has_column_privilege` returns false.

## B2

**DB2.1 The cause.** The mobile app, until 2026-09-04, and the web client, until 2026-09-15, looked for a solo Cabinet row created *today* and inserted a new one otherwise. Each new row carried a full copy of the thread so far.
- **Pattern:** chains of daily snapshots with the same first message. One user had 25 rows.
- **Already fixed:** since 2026-09-15 the table's `cabinet_conversations_one_row_per_thread` trigger merges any second insert for a thread into the existing row. No duplicate has been created since 2026-09-14.
- **Check-ins and the daily question:** they do not spawn threads. They write into the same thread, which is why so many rows begin with a check-in message.
- **This run:** cleans up the leftovers and adds `origin`.

**DB2.2 What counts as a "true duplicate".** A row must match on all of these:
- same user, same thread (`counselor_slugs` and `session_type`), same first user message
- created within 24 hours of the *first* row of its group
- one row's messages contain every message of the other, so it is a snapshot

Rows outside the window are kept and start a new group. Rows that fail the containment test are left and counted as diverged.
- **Alternative:** chain rows that are each within 24 hours of the previous one. That would fold a 12-day chain into one row, which is beyond the prompt's "within 24 hours of each other".
- **Dry run:** before applying, the migration was run in a transaction that rolled back. It lost no messages.

**DB2.3 References.** `session_participants` and `session_messages` reference the row with `ON DELETE CASCADE`. The merge moves every reference (those two tables, plus `cabinet_offers` and the fact evidence ids) to the kept row before deleting, so nothing cascades.
- **`conversation_memory`:** keyed by (`user_id`, `counselor_slug`), not by row, so it needs no change. The Cabinet's thread lookup already takes the most recently updated row for a thread, and the kept row takes the latest `updated_at` of its group.

**DB2.4 `origin` values.**
- **The four values:** `check_in` for the check-in chip or a `[Morning/Evening check-in]` message, `escalation` for `[Escalated from private ...]`, `daily_question` whenever a counselor spoke first (the daily question, and also broadcast counselor lines), and `user` otherwise.
- **Null:** a row with no messages yet. It is set when the first message arrives.
- **Sessions:** the hourly cycle stamps the same `origin` on each session's `conversation_ended` events, so start metrics can count `user` only.
- **Alternative:** a fifth value for broadcast lines. The prompt fixes the set at four.

## B3

**DB3.1 Which starters are shown.**
- **The set:** always five. Four of the five topical starters, plus "I'm not sure what to ask. Ask me something." last.
- **Order:** starters are ranked by keyword hits in the person's stated goal (`kt_goals`) and today's intention. Ties rotate by day.
- **Where:** on the empty Cabinet thread only, on mobile and web. On web they are also hidden during a search with no results.

**DB3.2 "Ask me something".**
- The client sends `starterId: 'ask_me'` once with that message.
- On the conversation's first turn, the server replaces the first-reply instruction (Part 4 of Run A) with an instruction to open with one or two warm sentences and exactly one question. The first turn already has a single voice.
- **Logging:** only the id is logged, as `cabinet_starter_used {starter_id}` through `product_events`. No text is logged.
