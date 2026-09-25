# Activation report, 2026-09-25

All ten Parts of the activation prompt (0–9) shipped, and none were reverted or skipped. Every Part is committed on `claude/optimistic-fermat-xyt1j9`, not on `main`. This session's harness only allows pushing to that branch, so the work goes to `main` through a draft PR (decisions log D0.1).

Related documents:
- Decisions log: [`docs/decisions/2026-09-25-activation.md`](../decisions/2026-09-25-activation.md)
- Recon: [`docs/recon/2026-09-25-activation.md`](../recon/2026-09-25-activation.md)

All counts below exclude the admin account.

## What shipped, per Part

### Part 0: Recon
The recon is in `docs/recon/2026-09-25-activation.md`. Two findings shaped everything that followed:
- Five committed migrations had never been applied to the project.
- The journal agent ran twice each morning.

### Part 1: Distress queue
- **Why it ran twice:** the Railway service `coverage-gap-agent` had its config-as-code path set to `/server/railway.agent.json`. That is the journal agent's config file, so the service ran the journal agent daily at 09:00. The coverage gap agent itself has not been running.
  - I repointed the service to `/server/railway.gap-agent.json` through the Railway API. This takes effect on its next deploy.
  - The agent now also claims a run in `agent_runs`, one per 20 hours, so a second scheduler exits.
- **Enqueueing:** the agent enqueues only through `enqueue_distress_review`, which is `insert … on conflict (analysis_id) do nothing`. After each run it sweeps for flagged analyses created since its last successful run. A week's distress flag can no longer be cleared by a later run.
- **Status rules:** status moves forward only. A trigger enforces this, and the admin route refuses a backward move.
- **Support card:** a gentle, dismissible card on the Journal screen, on mobile and web, for 7 days after a flag. It links to 988 (call or text) and findahelpline.com. It never mentions analysis and makes no confidentiality claims.

### Part 2: Instrumentation
- **Who spoke:** `cabinet_conversations.counselor_slugs` is the thread's identity; null means the group thread. Filling it in would fork every group thread (D2.1). The speakers go in a new column, `speaker_slugs`, which a trigger sets on every save and which was backfilled.
- **`check_ins.type`:** now `morning`, `evening`, `both` or null. A trigger sets it on every save, and existing rows were backfilled.
- **`check_ins.reflection_answer`:** dead. No UI writes it, but four prompt builders sent "(not answered)" to the model from it on every check-in. Those references are removed; the column is kept with a comment.
- **Events:** an hourly conversation cycle runs on the existing broadcast cron. It logs:
  - `conversation_ended` with `{user_turns, thread}`
  - `conversation_ended_one_exchange`
  - `kt_field_filled` with `{field_key, source}` (shipped in Part 3). The server logs it for inferred and asked facts; the clients log it for form saves and confirmations.

### Part 3: Know Thyself, filled by the Cabinet
- **Data:**
  - `user_profile_facts`, with sync triggers in both directions with `user_settings`, so installed app builds keep working.
  - A field registry in four copies: server, mobile, web and SQL. A test checks they agree.
  - `profiles.know_thyself_complete` is set when the top five fields are filled.
- **Onboarding:**
  - Mobile email signup goes to one optional screen (name, and "anything your Cabinet should never bring up?"), then straight into the Cabinet.
  - Web keeps its username step, adds the off-limits field, and lands on `/cabinet`.
  - The "complete your Know Thyself" nudges on Home and in the Cabinet are removed. The form stays in Settings, the web sidebar and on the Know Thyself screen, and gains the three top-five fields it lacked.
- **Extraction:** the hourly cycle runs a Haiku pass over idle sessions (30 minutes or more) and that day's check-in text. Guardrails:
  - explicit self-statements only
  - no sensitive fields
  - never over a value the user wrote, answered or confirmed
  - never a rejected field
  - confidence of at least 0.75, and higher than the stored value to replace it
  - skipped entirely when there is a distress flag in the last 14 days, or when the text reads as distressed
- **Asking:**
  - At most one missing field is offered to the closing voice, chosen by relevance to the topic, then priority.
  - Never in the first two turns or in distress.
  - At most one ask per conversation and one per 48 hours.
  - A 14-day cooldown after a deflection. The answer is detected on the next turn by Haiku.
- **Prompts:**
  - Facts are passed as Known and Tentative, with instructions for each.
  - Off-limits topics are a hard constraint in every counselor prompt.
  - Facts are only used for JWT-verified callers.
- **What the user sees:** each field shows its value and one of three sources: "You wrote this", "You told your Cabinet", or "Your Cabinet's understanding". Inferred values get Confirm, Edit and Remove, and there is a plain explanation at the top. A dot appears on the entry point until the screen is viewed. There are no pushes.
- **Tests:** `server/tests/profile-facts.test.js` covers the guardrails, the ask limiter, sessions and registry parity.

### Part 4: First reply
The first assistant turn of a new conversation is instructed to be three to five sentences about the specific situation, give one concrete observation, and end with one question. In the group Cabinet only one voice answers the first turn.

### Part 5: Intention question
The morning intention box is now a question asked in the voice of the day's daily-question counselor, falling back to the first Cabinet member. The answer still saves to `check_ins.intention`, and the daily question is unchanged. This is on mobile and web.

### Part 6: Goal offers
When the person states a concrete intention, the closing voice may offer to save it as a goal.
- The client shows a card with the title, category and target date, all editable.
- Accepting creates the goal with `source = 'cabinet'`.
- At most one offer per conversation, never on the first turn, and nothing is created without acceptance.
- The pieces are `cabinet_offers` and `POST /api/cabinet/offers/:id/respond`.

### Part 7: Paywall and insights
- **Daily-limit paywall:** it now says "Keep talking with {counselor}". The unsent message is kept and restored, and an upgrade returns to the conversation, on mobile and web. Prices and tiers are unchanged.
- **Bug fixed:** the mobile 1:1 chat had been saving a 403 response as the counselor's reply.
- **Insight delivery.** Only 8 of 70 insights had been delivered, for three reasons:
  - The daily upsert reset 11 insights that had been delivered. This is fixed, and a migration restored them, so 19 of 70 are now delivered.
  - Only the mobile Journal tab pulled insights. The web Journal page now has the card.
  - 4 insights are distress-flagged, and correctly held back.
- **Endpoint:** it returns nothing while a flag is recent or the latest analysis is flagged. Free users receive only the first paragraph, with the existing `insight_tease` upgrade prompt.

### Part 8: Tier reconciliation
- **The view:** `v_tier_reconciliation` shows IDs only and can be read only by the service role.
- **Upgrades:** 19 active manual grants sat on profiles that read free. They were fixed, so paid profiles went from 16 to 34.
- **Trigger:** `subscriptions_sync_profile_upgrade` keeps profiles upgraded whatever writes the subscription row. It never downgrades.
- **Web:** `getIsPremium` now counts `pro`.

### Part 9: Scroll offers
- **When:** after six or more messages the Cabinet offers once, "Would you like a scroll on this?". At most once per user per 72 hours.
- **On Yes:** the scroll is written through the existing pipeline, attributed to whichever of the pipeline's three scroll voices (Marcus, Epictetus, Seneca) spoke most. See D9.1.
- **Commits:** the shared offer code is in the Part 6 commit.

## Reverted or skipped
Nothing was reverted or skipped. Two parts of the prompt were interpreted rather than done literally:
- **`counselor_slugs`** was not filled in with speakers; it is the thread's identity (D2.1). The same analytics now come from `speaker_slugs`.
- **The distress queue** holds two escalated analyses, not one. The collapse rule you specified (escalated outranks reviewed) keeps both as escalated (D1.4).

## Migrations
All were applied through `apply_migration` in this session and verified by query. The committed file names match the applied versions.

| Version | Name | Part |
|---|---|---|
| 20260925153557 | distress_queue_dedupe | 1 |
| 20260925153659 | enqueue_distress_review | 1 |
| 20260925153941 | product_events (committed 2026-09-21, never applied until now; file `20260921120000_product_events.sql`) | 2 |
| 20260925155436 | activation_instrumentation | 2 |
| 20260925160005 | user_profile_facts | 3 |
| 20260925160711 | check_ins_profile_extracted_at | 3 |
| 20260925162221 | cabinet_offers | 6/9 |
| 20260925163008 | journal_analysis_restore_delivered | 7 |
| 20260925163213 | tier_reconciliation | 8 |

**Still unapplied, and left for Kyle** (D0.3). These are committed migrations from the retention build:
- `20260922100000_dispatch_read_at.sql`
- `20260923100000_kt_reflection.sql`
- `20260924100000_checkin_followup.sql`
- `20260925100000_email_sends.sql`. Applying this one turns on outbound lifecycle email.

The code for those features is live and failing against the database until they are applied.

## Backfill counts
All counts exclude the admin account.

| What | Count |
|---|---|
| `distress_review_queue` rows | 56 → 12 (one per analysis). Backup: `distress_review_queue_dupes_backup_20260925` |
| Open distress cases after the collapse | 2 pending (1497f6ff, 6540a17c), 2 escalated (032cef37, 4321568f) |
| Cabinet threads with speakers (`speaker_slugs`) | 56 of 129. Another 52 threads have replies that cannot be attributed (legacy single-voice replies carry no speaker), so they stay null. 21 threads have no replies. |
| `check_ins.type` filled | 85 of 202 (morning 11, evening 20, both 54). The other 117 have neither half done, so null by design. |
| Know Thyself facts | 194, all `source = form`, across 41 users. No inferred or asked facts yet: they start with the first hourly cycle after deploy. |
| Insights delivered | 8 → 19 of 70 |
| Paid profiles | 16 → 34 |

## What Kyle needs to do
1. **Merge the PR into `main`.** The Railway services (the API, the journal agent, the broadcast cron that now runs the conversation cycle) and Vercel deploy from `main`.
2. **Redeploy the `coverage-gap-agent` Railway service** if main doesn't redeploy it, so its new config path (`railway.gap-agent.json`) takes effect. Until then it keeps running the journal agent daily. That is now harmless thanks to the run lock, but the coverage gap agent itself stays off.
3. **Check Railway for another duplicate:** `dispatch-delivery-agent` and `dispatch-delivery-agent-EXOv` both run `node dispatch-delivery-agent.js` hourly. I did not change them.
4. **Cut a new EAS build.** It is required for the mobile changes: the signup screen, Know Thyself, the support card, the offer cards, the paywall copy and draft keeping, the intention question, and the 1:1 limit fix.
   - Until users update, installed builds keep working: the server features and the database triggers apply to them.
   - Old builds will not show the new cards, and will still route email signup to the old wizard.
5. **Review the 19 tier upgrades (D8.1).** They are the 2026-08-25 grandfather grants whose profiles were reset to free the same day by something outside the repo. If that reset was deliberate, revoke them.
6. **Review in `v_tier_reconciliation`:**
   - 12 paid profiles without an active subscription
   - 2 active manual subscriptions with no profile
7. **Decide on the four unapplied retention migrations** (listed above).
8. **Fix the `userId` trust in `/api/chat/counselor`:** the existing Know Thyself block trusts the `userId` in the request body, not only the JWT. That lets a caller who supplies someone else's id get that user's profile read back in a reply. The new facts block does not trust it. The old path should be closed once all builds send a JWT.

## Checks

| Check | Result |
|---|---|
| Server tests (`npm test` in `server/`) | 46 pass, 0 fail |
| Web typecheck | Clean |
| Academy typecheck | Clean |
| Mobile typecheck | 5 errors, identical to the base commit; none are in files this work touched |
| Mobile lint | 47 problems on the changed files, against 48 on the same files at the base commit; no new findings |
| Web lint | 3 warnings, all pre-existing |
| Academy lint | No new findings |
| Web production build (`next build`) | Passes |
