# Personalization run C: report, 2026-09-25

Run C lets the Cabinet personalize Arete and pass feature requests along.

- **Recon:** `docs/recon/2026-09-25-personalization-c.md`.
- **Decisions:** `docs/decisions/2026-09-25-personalization-c.md`.
- **Hard rule, held throughout:** additive only. Nothing is removed, hidden or moved for anyone, and a person with no practices sees exactly the Home they saw before (C5 test).

## What shipped, per Part

### C0: Recon
- **Home screens:** mapped. "Your practices" goes below everything on both.
- **Offers:** the Cabinet's offer-marker mechanism was chosen as the transport for the two new tools.
- **Registry modules:** `focus_timer` and `evening_review` already exist as features, while `premeditatio` and `habit_tracker` are new.

### C1: Module registry and Your practices
- **Registry:** `server/lib/module-registry.js`, the source of truth. Four modules, each with:
  - a tier (`surface_existing` or `enable_module`)
  - `excluded_for`
  - `existing_feature`
  - zod-validated settings, with free text capped at 280 characters
  - one free-text field
- **Client mirrors:** `lib/modules.ts` and `web/src/lib/modules.ts`. A test keeps all three in step.
- **`user_app_config`:** written only by the server; the owner reads their own rows, and no client write is possible. So only the backend ever sets `enabled_by = 'cabinet'`.
- **`module_checkins`:** holds the habit tracker's daily ticks.
- **"Your practices":** on mobile and web Home, after the last existing element. It renders nothing unless a practice is on and pinned.
  - **Focus timer and evening review:** shortcuts to the existing screens.
  - **Premeditatio:** opens a 1:1 with Seneca seeded with the person's focus.
  - **Habit tracker:** ticks today and shows the week.
  - **Controls:** every card has Edit (the free-text field) and Turn off.

### C2: `propose_adjustment`
- **The marker:** the closing Cabinet voice may end with `[[ADJUST|module_key|note]]`. The server always strips it and records a proposal only when every rule passes:
  - Cabinet thread, never in the first two turns, never in distress
  - one per conversation, two per week
  - registry exclusions (teen, distress in the last 14 days)
  - no module declined or undone in the last 30 days, none already on or awaiting an answer
- **The card:** a proposal card appears under the reply, with Yes or Not now.
- **On Yes:** everything is revalidated server-side. If a rule now fails, the card says the practice is not available.
- **Undo:** restores `user_app_config` exactly from `prior_state`.
- **Unanswered cards:** reappear when the Cabinet next opens, for 24 hours.
- **Table:** `adjustment_proposals`.
- **Events:** `adjustment_proposed`, `adjustment_accepted`, `adjustment_declined`, `adjustment_undone` and `adjustment_withdrawn`.

### C3: `request_feature`
- **The question:** when someone wishes Arete did something it does not, the closing voice asks "Want me to pass this idea along to the person who builds Arete?" and the card asks the same.
- **On Not now:** the wording is cleared.
- **On Yes:** Haiku rewrites the wish as one neutral sentence with no personal details, and the original wording is cleared. The sentence is embedded (`text-embedding-3-small`) and joins the nearest open cluster at cosine 0.82 or above, or starts a new one. The clustering is done in SQL by `assign_feature_request_cluster()`, with the centroid kept as `avg(embedding)`.
- **Admin Requests tab:** next to Email. It shows clusters, anonymous summaries, the count of distinct people and the last date. Counts exclude admin and internal accounts through `measured_profiles`. It shows no identities, and a test checks the columns the route selects.

### C4: Shipping
- **Marking shipped:** a cluster is marked shipped only with a registry `module_key`, enforced by a SQL check and on the server, and the tab offers only registry modules.
- **Telling people:** each person who asked is told once per cluster (a unique index guards this):
  - a counselor line, appended atomically to their Cabinet thread
  - a push that opens the Cabinet
  - the proposal card, "You asked for this"
- **Who is skipped:** people the practice is excluded for, and people who already have it on.
- **Re-running:** a ship run again tells only people not yet told.

### C5: Tests
- **Count:** 36 Run C tests in `server/tests/personalization.test.js`; the server suite now runs 84, all passing.
- **"Unpersonalized Home is identical":** tested by stripping Run C's lines from both Home files and matching sha256 against the pre-Run-C files. The client's own `visiblePractices` is run as TypeScript to show that no practices means nothing renders.
- **Nothing removed elsewhere:** `git diff --numstat` since before Run C shows only three client lines deleted, each an import or signature replaced by its extended form.

### C6: Free-tier limit
- **The limit:** `free_active_module_limit = 1` in `agent_config` (see below), never in code.
- **What free gets:** registry defaults plus the one free-text field.
- **At the limit:** a free yes shows a choice card:
  - "Swap out <practice>", where Undo restores both sides of the swap
  - "See Premium", which opens the paywall with source `module_limit`
  - "Not now"
- **Teens:** Swap and Not now only; Premium is never shown.
- **Grandfathering:** `user_app_config.grandfathered` marks practices on before the limit existed, and these never count. There were none at launch.
- **Downgrades:** a downgraded account keeps everything it has.
- **Events:** `module_limit_shown`, `module_limit_swap` and `module_limit_upgrade_click`.

## Reverted or skipped
Nothing.

## Migrations (all applied to `zhaarabzemhantyxxckq` through the migration tool, then verified by query)
- `20260925185645_user_app_config.sql`
- `20260925190448_adjustment_proposals.sql`
- `20260925191937_feature_requests.sql`: verified with a rolled-back dry run of the clustering
- `20260925193004_feature_shipped_notices.sql`
- `20260925193443_free_module_limit.sql`

## Counts (admin and internal accounts excluded)
Run C tables were empty at report time: 0 practices on, 0 proposals, 0 feature requests. Every surface reaches people with the deploy (server, web) and the next build (mobile).

## How to add a module
1. **Registry entry:** add it to `MODULES` in `server/lib/module-registry.js` with:
   - `key`, `label` and `description`
   - `tier`: `surface_existing` if it pins an existing screen, and then `existingFeature` gives its routes; otherwise `enable_module`
   - `excludedFor` (`'teen'`, `'recent_distress'`)
   - `freeTextField`
   - a strict zod `settings` object whose free-text field is `z.string().trim().max(280)` with a default
2. **Client mirrors:** add the same `key`, `label`, `tier` and `freeTextField`, plus a label and placeholder, to `lib/modules.ts` and `web/src/lib/modules.ts`, and add the key to the `ModuleKey` type. The parity test fails until all three agree.
3. **Home cards:** give it a card branch in `components/YourPractices.tsx` and `web/src/components/YourPractices.tsx`.
4. **No migration.** `module_key` is text, checked by shape in SQL and by the registry on the server. The Cabinet offers it as soon as the server deploys, and it appears in the admin tab's "Shipped as" list.

## Where the free limit lives
- **Primary:** `agent_config` row `agent_name = 'personalization'`, `config.free_active_module_limit` (now `1`). To change it:
  `update agent_config set config = jsonb_set(config, '{free_active_module_limit}', '2') where agent_name = 'personalization';`
  The server picks it up within five minutes, with no deploy.
- **Fallback:** `server/config/personalization.json`, used only if the row is missing or malformed.
- **Paid tiers:** premium and pro have no limit.

## Checks
| Check | Result |
| --- | --- |
| Server tests | 84 of 84 pass (36 of them are Run C) |
| Server boot | Starts, and every new route answers 401 without a token |
| Web `tsc` and `next lint` | Clean |
| Academy `tsc` and `next lint` | Clean |
| Mobile `tsc` | No new errors against the baseline |
| Mobile ESLint | No new errors on any changed file against the pre-Run-C commit: 7 before, 7 after |

Not exercised end to end: the accept, undo and ship endpoints against the live database with a real signed-in user, and a real Haiku or embedding call. Their rules are unit tested, and the SQL was dry-run.

## Things to know
- **Latency:** from a person's second message in a conversation, a Cabinet turn makes up to four small parallel queries to decide whether it may carry a card. The first message makes none.
- **Keys:** feature-request processing runs on the API server and needs `CLAUDE_API_KEY` and `OPENAI_API_KEY` there. The journal agent already needs both, so they should be set. If a call fails, opening the admin Requests tab retries it.
- **Test upkeep:** the Home identity test pins the current Home files. If Home is changed on purpose, recompute the two hashes in the test, which explains how.

## EAS build
**Yes, a build is required.** The mobile app carries all of the following, and existing installs see none of it until a new build ships:
- the "Your practices" section
- the proposal and feature-request cards
- the limit choice card
- the `module_limit` paywall copy

The server and web changes go live on deploy. Older mobile builds are never offered a card: the server offers cards only when the request carries `clientCards: ['proposal']`, which only the new builds send (DF.1), so nobody collects proposals they cannot see. Kyle cuts the build.
