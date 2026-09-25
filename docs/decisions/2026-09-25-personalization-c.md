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

## C2

**DC2.1 The limits and where they live.**
- **The limits:** these are in `server/lib/proposals.js`.
  - never in the first two user turns of a conversation
  - one per conversation
  - two per person per 7 days, counting only proposals from the Cabinet
  - never while the conversation reads as distress
  - a module declined or undone is not proposed again for 30 days
  - a module with an open, unanswered card is not proposed twice
- **Exclusions:** the registry's exclusions apply as well, meaning teens, and distress in the last 14 days read from `distress_review_queue` (failing closed).
- **Shipped notices:** a notice from Part C4 is not the Cabinet proposing, so it does not count against the weekly limit.

**DC2.2 One card per turn.**
- **Chosen:** a proposal is recorded only when the turn made no goal, task or scroll offer. The instruction tells the closing voice never to combine offers.
- **Why:** the Run A and Run B offers keep their priority, and a reply never ends in two cards.
- **Alternative:** show both cards.

**DC2.3 Server-side revalidation.**
- **What is checked on Yes:** the registry, teen status and 14-day distress, all read at that moment.
- **When a check fails:** the proposal becomes `withdrawn`, and the card says the practice is not available.
- **Double taps:** the proposal is claimed with a conditional update, so a double tap applies it once.

**DC2.4 Undo restores exactly.**
- **What is recorded:** `prior_state` holds the full `user_app_config` row as it was, or null, for every row the acceptance touched.
- **What Undo does:** it writes each row back field for field, `updated_at` included, and deletes a row that did not exist before.
- **Alternative:** set `enabled = false`. That leaves a row that was not there and does not restore earlier settings.

**DC2.5 Re-enabling a practice keeps its settings.** When the person had turned a practice off earlier, a yes turns the same row back on with the settings they gave it, rather than the proposal's defaults.

**DC2.6 A proposal the person never answered.**
- **When it comes back:** it shows again when the Cabinet next opens, for 24 hours. A shipped-feature notice shows until answered.
- **Why:** someone who left mid-conversation still gets to answer.
- **Alternative:** drop it. It would then count against the weekly limit without ever being seen.

**DC2.7 Events.**
- **The events:** `adjustment_proposed`, `adjustment_accepted`, `adjustment_declined`, `adjustment_undone` and `adjustment_withdrawn`, plus `practice_settings_saved` and `practice_turned_off`.
- **Props:** `module_key`, `tier`, `source` and a reason code only, never the note.

## C3

**DC3.1 Asked first, kept only on yes.**
- **The question:** the closing voice asks "Want me to pass this idea along to the person who builds Arete?", and the card asks the same.
- **What is stored before an answer:** only the counselor's plain wording of the wish, as `need_draft`.
- **On Not now:** the draft is cleared.
- **On Yes:** Haiku rewrites it as one neutral sentence with no personal details (`need_summary`). The draft is cleared once that succeeds, so the wording in the person's own words is never kept.
- **Alternative:** keep the wording for context. The admin does not need it, and the privacy rule says aggregate only.

**DC3.2 Limits.**
- **The limits:** Cabinet thread only, not the first user turn, not in distress, one per conversation, three per person per week.
- **Priority:** a turn carries at most one card, in this order: offer, then practice proposal, then feature request. The instruction tells the voice to prefer a listed practice when one fits the wish.

**DC3.3 Clustering.**
- **How:** each summary is embedded with `text-embedding-3-small`, the same model and 1536 dimensions as the rest of Arete. It joins the nearest open cluster at cosine similarity 0.82 or above, or starts its own.
- **Where:** `assign_feature_request_cluster()`, service role only. It keeps each cluster's centroid as `avg(embedding)` of its requests, and the cluster title is its first summary.
- **Shipped or declined clusters:** they take no new members.
- **Tested:** a rolled-back dry run on synthetic vectors confirmed that near vectors join and distant ones split.
- **Alternative:** a Haiku pass that labels clusters. That is more calls for a list that is still small.

**DC3.4 Processing and retry.**
- **Normal path:** summarizing and clustering run in the background on the API server when the person says yes.
- **Retry:** a failure leaves the request `submitted` with no summary, and opening the admin Requests tab retries up to 25 of them through `POST /api/admin/feature-requests/process`.
- **Alternative:** a new cron. The recon rule is no new Railway service without need.

**DC3.5 The admin tab shows no identities.**
- **Where:** the Requests tab sits next to Email.
- **What it shows:** each cluster's title, up to five anonymous summaries, the number of distinct people who asked, the last date and the status.
- **What it never shows:** the route selects no `user_id`, email, conversation or draft, and a test checks this.
- **Counts:** they come from `feature_request_cluster_counts`, which joins `measured_profiles`, so admin and internal accounts are excluded.

## C4

**DC4.1 Shipped requires a module.**
- **In SQL:** a check constraint on `feature_request_clusters` refuses `status = 'shipped'` without a `module_key`.
- **On the server:** the ship endpoint refuses any key the registry does not list.
- **In the admin tab:** it offers only the registry's modules, fetched from the server so there is no fourth copy of the list.

**DC4.2 Told once, and only if it is for them.**
- **The guard:** the `adjustment_proposals` row with `source = 'feature_shipped'` and the cluster id. A unique index on `(user_id, cluster_id)` means re-running the ship tells only people not yet told.
- **Who is skipped:** people for whom the practice is excluded (teen, recent distress) and people who already have it on. The response and the admin notice carry counts only.
- **Alternative:** tell everyone and let the card say it is unavailable. That sends a teenager a line about a practice they cannot use.

**DC4.3 How they are told.**
- **In the Cabinet thread:** one counselor line, the counselor who took the request or "The Cabinet". It is appended in a single statement by `append_cabinet_message()` (service role only), so it cannot race the app's own saves.
- **By push:** "Something you asked for is here.", routed to `/cabinet`, which the app already handles.
- **The card:** the proposal card shows when the Cabinet opens ("You asked for this"), and a yes is revalidated like any other proposal.
- **What the line quotes:** the neutral summary the person agreed to pass along, never their own words.

**DC4.4 Where shipping runs.** On the Railway server, because it owns the registry, push and the Cabinet threads. The academy tab proxies to it with the admin's token, the same pattern as the journal-agent run button.
