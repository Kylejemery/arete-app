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

## Part 2

**D2.1 `speaker_slugs`, not `counselor_slugs`.** `counselor_slugs` is the thread's identity: null is the solo group Cabinet thread and `[slug]` is a 1:1 thread. The one-row-per-thread trigger and every client look threads up by it. Writing the speakers into it would fork all 105 group threads into new rows on the next save.
- **Chosen:** a new column, `speaker_slugs`, recomputed by a trigger from `messages` on every save. It needs no client release and fills the same analytics need.
- **Alternative:** repurpose `counselor_slugs`, which would break threading.

**D2.2 `check_ins.type` holds `morning`, `evening`, `both`, or null.** Rows have been one per day since the parity migration. The original values were `morning` and `evening` per row. `both` covers a day where both halves are done. A trigger sets it on every save, so installed builds that never write the column are covered too.

**D2.3 `reflection_answer` is dead, not broken.** No screen writes it. The evening reflection box writes `stoic_answer`.
- Four prompt builders sent "EVENING REFLECTION: (not answered)" to the model on every check-in, and the Enchiridion agent fell back to the column.
- All of those references are removed, and the evening check-in prompt now labels `stoic_answer` as the evening reflection.
- The column stays in place with a comment saying it is dead.

**D2.4 Where "conversation ended after one exchange" is detected.** Threads are persistent, so a "conversation" is a session: messages with no gap over 30 minutes.
- An hourly cycle, riding on the existing `broadcast-delivery-agent` cron, processes threads idle for 30 minutes or more.
- It logs `conversation_ended {user_turns, thread}` for every session, and `conversation_ended_one_exchange {thread}` when the user wrote once and got a reply. The first event gives the denominator.
- The events go to the existing `product_events`, not a new `app_events` table (see D0.3).
- **Alternative:** a new Railway cron service. The prompt prefers hooking into an existing cycle. The dispatch-delivery cron was not used because it runs as two duplicate Railway services (see the report).

**D2.5 The "Know Thyself field filled" event ships with Part 3.** It is keyed by registry field key and source, and the registry is created in Part 3.

## Part 3

**D3.1 Registry keys, and what counts as sensitive.**
- **Keys:** there was no registry, so one was created: `server/lib/profile-fields.js`, mirrored in `lib/profileFields.ts`, `web/src/lib/profileFields.ts` and SQL `profile_field_columns()`. A test checks that all copies carry the same keys.
- **Sensitive fields:** `life_situation` (family and relationships), `background` (life story, which routinely includes loss and family), `major_events` (loss, health), and `off_limits`.
- **The cost:** `life_situation` is in the top five but can never be inferred. So the top-five completion flag needs the user to state it, either in the form or when a counselor asks. That is intended.
- **Alternative:** mark only `major_events` as sensitive. Rejected as too permissive.

**D3.2 `user_settings` stays the store of what the user wrote.** Installed app builds read and write `user_settings` directly. Two triggers keep it in sync with `user_profile_facts`:
- A form edit on any client becomes a `form` fact.
- A value the user confirmed or answered is mirrored back into the column.
- Inferred values are never mirrored, so every older reader (client prompts, the Enchiridion agent) sees only what the user said.

**D3.3 The backfill excludes the admin account** (rule 9). The admin's form answers remain readable, because the prompt builder falls back to `user_settings` for any field without a fact. They become facts on the admin's next form save.

**D3.4 Facts reach prompts only for a JWT-verified user.** `/api/chat/counselor` accepts a body `userId` as a fallback identity for old builds. The existing Know Thyself block already trusts that fallback, and the report flags it. The new facts block, the tentative facts and the asks use only `req.areteVerifiedUserId`.

**D3.5 Extraction runs in the hourly conversation cycle** (Part 2's hook on the broadcast cron), on sessions idle for 30 minutes or more.
- It reads that day's check-in text (intention, evening reflection) only alongside a conversation from that day, and marks the check-in `profile_extracted_at`.
- Check-ins from users with no conversation are not read.
- **Alternative:** a separate pass over all check-ins. That is a larger surface for a first version.

**D3.6 The ask rules.**
- **Who asks:** the closing voice of the turn, the last counselor in the relay. By then the user's topic has been addressed.
- **What limits it:**
  - An ask is recorded as "offered" when the instruction is put in the prompt. On the next user turn, a Haiku check decides whether the counselor actually asked.
  - If the counselor did not ask, the offer is released (`asked_at` cleared), so the 48-hour budget is not spent.
  - If the user deflected, `ask_declined_at` is set, which starts the 14-day cooldown.
- **Relevance:** relevance to the topic comes first, then priority. A sensitive field is asked about only when the user's own message touches it.
- **Distress:** shown by a keyword check on the session, or by a flag in the last 14 days. Either blocks asks.

**D3.7 Completion.**
- `profiles.know_thyself_complete` is now set when the top five fields are filled by any source.
- A trigger on `user_profile_facts` applies the rule, and so do the clients' `markKnowThyselfComplete`.
- The old rule (goals plus two other answers) is retired.
- The form gained the three top-five fields it lacked (how to be challenged, what brought you, life now) and the off-limits field.
- The completeness score (`computeCompleteness` / `completenessScore`) is computed, not stored.

**D3.8 Signup and nudges.**
- **Mobile email signup** now goes to one optional screen (name and off-limits, both skippable), then straight to the Cabinet. The 11-step wizard is no longer in the signup path but still exists at `/setup`.
- **Web signup** keeps its required username step, because the web app keys every page on `user_name`. The step gains the optional off-limits field and now lands on `/cabinet`.
- **Nudges removed:** the Home and Cabinet "complete your Know Thyself" prompts, on both platforms. The form remains reachable from Settings, the web sidebar and the Know Thyself screen.
- **Alternative:** keep the nudges. The prompt says the form is no longer a prompted step.
