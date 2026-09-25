# Activation run B: report, 2026-09-25

Run B covered internal accounts, duplicate conversations, starters, neutral defaults and the age gate.

- **Decisions:** `docs/decisions/2026-09-25-activation-b.md`.
- **Where it shipped:** Parts B1–B5 were in Kylejemery/arete-app#272, which Kyle merged. The final checks, two fixes and this report ride a follow-up PR.

## What shipped, per Part

### B0: Run A's output
Read. Run A shipped every Part. B5 reuses the support card, and events go to `product_events`.

### B1: Internal accounts
- **Tagging:** `profiles.is_internal` marks internal accounts. `config/internal-accounts.ts` is the list, and `node scripts/sync-internal-accounts.mjs` applies it through the `set_internal_accounts` RPC.
- **Measurement:** `measured_profiles` excludes admin and internal accounts. CLAUDE.md now says measurement reads it.
- **Email:** the admin Email tab tags internal recipients.
- **Access:** clients cannot write the flag.

### B2: Duplicate conversations
- **Cause:** the mobile client, until 2026-09-04, and the web client, until 2026-09-15, opened a new solo Cabinet row each day, copying the thread into it. Both were already fixed, so no new duplicates are being made.
- **Backup first:** every candidate row went to `cabinet_conversations_dupes_backup_20260925` (58 rows), with `merge_action` and `merged_into`.
- **Merge:** true duplicates were then merged, with every reference moved to the kept row before the delete.
- **Origin:** `origin` (user / check_in / daily_question / escalation) is kept by a trigger. The hourly cycle stamps it on `conversation_ended` events.
- **Memory:** conversation_memory keys on the user, not the row, so it is unaffected.

### B3: Conversation starters
- **What shows:** the empty Cabinet, on mobile and web, shows four starters ranked by the stated goal and today's intention, plus "Ask me something".
- **Logging:** the id alone is logged (`cabinet_starter_used`).
- **Ask me:** "Ask me something" makes the first reply open with one question.

### B4: Neutral defaults, first-week task, pronouns
- **Default tasks:** new users get neutral default check-in tasks. Existing users keep theirs.
- **First-week task:** a one-time first-week counselor task offer uses the Run A offer card (`cabinet_offers.kind = 'task'`).
- **Pronouns:** a pronoun setting sits in Settings on mobile and web. Check-in prompts and the counselor context use it, and the gendered defaults and example text were made neutral.

### B5: Age gate
- **Bands:** the bands are under 13, 13–15, 16–17 and 18+. Signup asks before an account is made. Existing users see a one-time gate. Only the band is stored.
- **Under 13:** signup stops. For an existing account, it is locked and queued in `account_deletion_queue` (30 days, `pending_review`). **Nothing is deleted automatically.**
- **Teens:**
  - A teen addendum goes into every counselor prompt.
  - The immediate support card shows on distress in the Cabinet, 1:1 chat and journal.
  - No Agora (RLS).
  - No marketing email.
  - No paywall, upgrade or Premium mention.
- **Apple Declared Age Range:** not added, because it needs a native module this project does not have. This is a follow-up.

## Reverted or skipped
Nothing.

## Migrations (all applied to `zhaarabzemhantyxxckq` and verified)
- `20260925163904_profiles_is_internal.sql`
- `20260925173651_cabinet_conversations_dedupe_origin.sql`
- `20260925174447_pronouns_and_task_offers.sql`
- `20260925175506_age_gate.sql`
- `20260925182645_measured_profiles_age_columns.sql` (this follow-up, DBF.3)

## Counts (admin and internal accounts excluded unless stated)
| What | Count |
| --- | --- |
| Internal accounts tagged (includes admin) | 6 (admin + 5) |
| Measured profiles | 71 |
| B2 backup rows | 58 |
| B2: merged / left_diverged / kept_new_window / kept | 15 / 8 / 24 / 11 |
| Measured Cabinet threads before → after merge | 115 → 100 |
| Origin backfill: user / check_in / daily_question / escalation / null | 33 / 16 / 33 / 1 / 17 |
| Accounts that have answered the age question | 0 (the gate reaches users with the next build) |
| Under-13 accounts locked / queued for deletion | 0 / 0 |
| Pronouns set | 0 |

## What Kyle needs to do
1. **Placeholders:** replace `AUNDREA_EMAIL_PLACEHOLDER` and `DEVON_EMAIL_PLACEHOLDER` in `config/internal-accounts.ts` with the real emails, then run `node scripts/sync-internal-accounts.mjs`.
2. **The other "Kyle":** confirm whether the other non-admin account named "Kyle" is yours. If it is, add it to the list (DB1.1).
3. **EAS build:** yes, one is required. The age gate, teen mode screens, starters, pronoun setting, neutral defaults and immediate support card are all in the mobile app, and existing installs see none of it until a new build ships. The server and web changes are live on deploy.
4. **Deletion queue:** check `account_deletion_queue` from time to time. Under-13 accounts wait there for a person to review them.
5. **Apple Declared Age Range:** decide whether to add a native module for it.

## Checks (on the merged head plus this follow-up)
| Check | Result |
| --- | --- |
| Server tests | 48 of 48 pass |
| Web `tsc --noEmit` and `next lint` | Clean |
| Academy `tsc --noEmit` and `next lint` | Clean |
| Mobile `tsc` | No new errors against the Run A baseline (mobile files) |
| Mobile ESLint on changed files | No new errors against the Run A baseline. The two new errors found at the end of B5 are fixed (`ac19c05` and DBF.2). |
