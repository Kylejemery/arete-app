# Personalization run C: decisions, 2026-09-25

This file records the judgement calls made while carrying out Run C without stopping to ask. Each entry gives what was chosen, why, and what the alternative was. The hard rule, additive only, holds throughout: nothing is removed, hidden or moved for anyone.

## Process

**DC0.1 Branch and PR.**
- **Chosen:** Run C is committed on the session branch `claude/optimistic-fermat-xyt1j9`, one commit per Part (`Part CN:`), and pushed once at the end.
- **Where it lands:** the branch already carries the Run B close-out, which is open as draft PR Kylejemery/arete-app#273, so Run C lands in that PR.
- **Alternative:** push to `main`, which the session harness does not permit.

**DC0.2 "Tools" are markers.**
- **Chosen:** `propose_adjustment` and `request_feature` are implemented as end-of-reply markers, the same mechanism Run A and Run B use for goals and tasks: `[[ADJUST|module_key|free text]]` and `[[REQUEST|need]]`. The server strips them, rechecks every rule, records the proposal and returns it for a card.
- **Why:** the Cabinet fans out several text completions in parallel, and a real tool-use round trip on the closing voice would change that path for every conversation.
- **Alternative:** Anthropic tool use on the closing voice. The server-side rules are the same either way; only the transport differs.

**DC0.3 The Cabinet thread only.**
- **Chosen:** proposals and feature requests are offered in the group Cabinet thread only, on mobile and web, not in 1:1 counselor chats.
- **Why:** one surface to test, and a limit of one proposal per conversation is clearest there.
- **Alternative:** every thread, which needs the card in the 1:1 screens as well.

## C1

**DC1.1 The four modules.**
- **Surface existing:** `focus_timer` pins the existing timer (`/timer` on mobile, `/focus` on web), and `evening_review` pins the existing evening check-in. Neither feature changes.
- **New modules:** `premeditatio` is a Home card that opens a 1:1 with Seneca (web: the Cabinet with Seneca), seeded with the person's focus. `habit_tracker` is a Home card with a daily tick and the week's count, backed by a new `module_checkins` table.
- **Why these two are new:** the recon found neither existed.

**DC1.2 Exclusions.**
- **Chosen:** `premeditatio` is excluded for teens and for anyone with a distress flag in the last 14 days, because rehearsing what could go wrong is not for someone already struggling or a teenager on their own. The other three exclude no one.
- **Alternative:** exclude teens from every proposal. The registry lets each module say, and nothing about a habit tick or a timer shortcut needs keeping from a teen.

**DC1.3 Who writes `user_app_config`.**
- **Chosen:** only the server. The table has a SELECT policy for the owner and no write policy, and INSERT, UPDATE and DELETE are revoked from `anon` and `authenticated`.
- **Why:** this satisfies "only the backend inserts `enabled_by = 'cabinet'`" and, more strictly, keeps the registry validation and the Part C6 limit impossible to bypass.
- **Ticks:** habit ticks in `module_checkins` are the person's own, and they write them directly.
- **Alternative:** a client INSERT policy restricted to `enabled_by = 'user'`. That would let a direct write skip the free-tier limit.

**DC1.4 `module_key` is text, not an enum.** A new module needs no migration: the key's shape is checked in SQL, and its existence is checked by the server against the registry.

**DC1.5 Turning a practice off keeps the row.** `enabled` and `pinned` go false and the settings stay. The person removing their own practice is their choice, not the system hiding something.

**DC1.6 Free edits.** On free, an edit changes only the free-text field and keeps every other stored setting. A person who set 45 minutes while paid keeps 45 after a downgrade. The alternative, resetting to defaults, would take away something they had.
