# First-run, retention, and monetization audit

Date: 2026-09-21. Read-only code audit of the monorepo, covering the Expo
mobile app (`app/`, `components/`, `lib/`, `services/`), the companion web app
(`web/`), the Academy site (`academy/web/`) where relevant, and the Railway
server (`server/`). Nothing was run against a device; every claim is a code
reading with a `file:line` reference so it can be re-checked.

Sections:

1. First run path (mobile and web)
2. Return path (day two and day three)
3. Know Thyself
4. Gating map
5. Paywall and upgrade copy
6. Backend intelligence exposure
7. Instrumentation gaps and proposed events

---

## Executive summary

Ten findings that shape the first three days, in rough order of impact:

1. **Day two has almost nothing to come back to.** The mobile Home renders the same layout every day: a global 14-item question rotation drawn from four fixed counselors, a quote from the user's cabinet, a streak that stays at 0 unless both routines were done, and pills that reset. Nothing from day one's answers is shown back. The Morning tab on day two is a deliberately blank copy of day one.
2. **The only automatic return trigger is the Daily Dispatch push, and it cannot reach users east of the Atlantic.** Generation runs at 10:00 UTC; delivery fires only at local 07:00. Any user whose 07:00 is earlier than 10:00 UTC never gets it. Local reminders exist with defaults "on" but are scheduled only after the user opens Settings and saves. There is no lifecycle email of any kind.
3. **Know Thyself is a hidden input.** Its only consumer is the counselor system prompt, which is instructed never to reveal it. No agent reads it: the Portrait, the Weekly Insight and the Dispatch are built without it. The three completion paths disagree about "complete": only the conversational agent sets the flag, so wizard and form completers keep seeing "Meet Your Future Self" and "Complete your Know Thyself profile to receive your first scroll".
4. **The 11-step sign-up wizard wrote every `kt_*` column but never set `know_thyself_complete`** (fixed in this PR via `markKnowThyselfComplete()`), so every LLM prompt carried "This user has not completed their Know Thyself profile yet" for those users. The manual form in `app/know-thyself.tsx` and `web/src/app/profile/page.tsx` still has the same gap.
5. **Fourteen of the twenty-five gates fire before the user has tried the feature, and five of them show no lock until the paywall appears** (shared-session invite, watchlists, focus blocking, Agora submit, ask-the-corpus).
6. **The paywall the user reaches on a daily-limit hit uses the generic header** ("Unlock Your Cabinet / More counselors. More conversations."). Thirteen of twenty-two sources fall through to it. The tailored headers exist for nine attend, health, calendar and Agora sources. The web `/upgrade` page every purchase lands on has no feature table, says "every premium feature", and loses the mobile source.
7. **Reasoning depth, reply length, and model choice are never teased and never explained.** Free replies come from Haiku at 1500 tokens; the mobile Mind picker renders and saves a choice for every tier that the server ignores for free and premium.
8. **None of the four backend agents produces anything personal inside two weeks.** The longitudinal model needs four calendar weeks of activity (day 16 to 22). Inquiry, Tension, and Dreaming work on the corpus, not the user, and reach the public Observatory only after manual approval. All are free to see; none is gated.
9. **There is no analytics SDK and no event log.** The only telemetry table, `paywall_events`, has one writer, never writes `tier_at_view`, has no reader, and its `source` dies at the paywall view: checkout, trial, and conversion are unattributable and the trial-start date is overwritten in `subscriptions`. Dispatch "read" is only written for users who were never pushed, so push open rate is unobservable.
10. **Two first-run defects lose day one's payoff.** A transient failure on the check-in call persists "The Cabinet will speak when you return." as the day's response and blocks the retry; the What's New modal is keyed to 1.4.0 while the build is 1.4.2, so it never renders.

---

## 1. First run path

### 1.1 Mobile (Expo)

Routing decisions live in three files. `app/index.tsx:7-17` redirects on
session only: no session goes to `/(auth)/login`, any session goes to
`/(tabs)/`. There is no `onboarding_completed` flag anywhere in the repo (grep
for `onboarding_completed|onboarding_complete|has_onboarded` returns nothing).
The only completion flag is `profiles.know_thyself_complete`, and it drives
banners, not routing. `app/(tabs)/_layout.tsx:7-12,22-38` adds a time-of-day
redirect: between 05:00 and 11:59 the tab shell navigates to Morning, from
17:00 to Evening, unless the app was opened from a notification.

| # | Screen | Route / file | Shown when | Asks of the user | Taps / fields (fastest path) | API calls |
|---|---|---|---|---|---|---|
| 1 | Login / sign-up | `app/(auth)/login.tsx` | no Supabase session | "ARETE / Be who you want to be." Toggle **Sign In / Sign Up**. Fields: Email, Password, Confirm Password. Button **Create Account**. | 2 taps, 3 fields | `supabase.auth.signUp` (`:79`) or `signInWithPassword` (`:45`). A DB trigger creates the `profiles` row; no `user_settings` row yet. Plain sign-up then `router.replace('/setup')` (`:91`). |
| 2 | Commitment wizard | `app/setup.tsx` (redirect) then `app/(onboarding)/setup.tsx` | only after a fresh sign-up; sign-in never sees it; nothing guards re-entry | 11 steps (`TOTAL_STEPS = 11`, `:17`). Required: name (step 2 "What shall we call you?"), goals (step 5 "What are you here to build?"), Future Self description (step 9 "Meet your Future Self"). Optional with "Skip for now →": Background (3), Who You Are Today (4), Strengths & Weaknesses (6), Patterns & Failure Modes (7), Major Life Events (8). Step 10 "Your Cabinet" is pre-seeded with Marcus, Goggins, Roosevelt, Future Self. Step 11 "Your Commitment" ends with **I commit to Arete**. | 11 taps, 3 required fields (up to 9 fields if all filled) | One write on commit: `upsertUserSettings` (`:127-140`) writing `user_name`, `user_goals`, all seven `kt_*` columns, `future_self_years`, `future_self_description`, `cabinet_members`. Now also calls `markKnowThyselfComplete()` (fixed in this PR; before it, the wizard never set `profiles.know_thyself_complete`). |
| 3 | Home | `app/(tabs)/index.tsx` | every authenticated user | Name modal ("Welcome to Arete / What should we call you?") only if `user_name` is empty, which the wizard prevents. Dispatch push nudge card ("Your Daily Dispatch ... Allow notifications to receive it." **Enable / Not now**) if permission is undetermined. "Meet Your Future Self" banner with **Begin**. Pills Morning / Cabinet / Evening. Primary CTA by hour: **Begin Morning Routine** (<12), **Open the Cabinet** (12-17), **Evening Reflection** (17+). Streak card. "Today's Question" card. | 1 tap to Morning (0 if auto-redirected); +1 for "Not now" on the push card | `user_settings` select (`lib/db.ts:96`), `profiles.know_thyself_complete` (`:698`), `check_ins` today (`:229`), `profiles.streak` (`:157`), `counselors` quotes (`:758`), `profiles.tier` (`:825`), and an unprompted LLM call: `prefetchDailyQuestion` → `POST /api/chat/counselor` with `claude-opus-4-5`, `max_tokens 1500` (`services/claudeService.ts:1297`) then a `check_ins` upsert. Root layout also posts timezone and (if already granted) push token (`lib/pushNotifications.ts:91,72`), and polls `GET /api/sessions/pending-invite` on every foreground (`components/PendingInviteModal.tsx:27`). |
| 4 | Morning routine (first check-in) | `app/(tabs)/morning.tsx` | tab, Home CTA, or the 05:00-11:59 auto-redirect | Title "Morning Routine ☀️". Optional "TODAY'S INTENTION" field ("Write one sentence the Cabinet will hold you to…"). Three seeded disciplines: Eat breakfast, Train, Meditate (`:107-115`). Ticking all three completes the check-in. | 3 taps, 0 required fields | `routine_templates` select + 3 inserts on first visit; `check_ins` upsert on every toggle (`:161`); `incrementStreak` (`:164`) which returns early unless evening is also done (`lib/db.ts:194`); `sendCheckInToCabinet('morning')` → `POST /api/chat` (`services/claudeService.ts:1040`) whose context assembly reads `user_settings`, `check_ins`, `journal_entries`, `reading_data`, `profiles`, `routine_templates`, `goals`; reply written to `check_ins.cabinet_morning_response` (`:173`) and appended to `cabinet_conversations` (`lib/db.ts:417-450`). |

Fastest path total on mobile, sign-up to first completed morning check-in:
about 18 taps and 6 required text fields (3 for auth, 3 in the wizard).

What the first check-in writes: `check_ins` row for today with `morning_tasks`
(all done), `morning_done = true`, optional `intention`, and
`cabinet_morning_response`; three `routine_templates` rows; two messages in
`cabinet_conversations`. Nothing on `profiles`: the streak stays at 0 until the
evening routine is also completed the same day.

Interstitials that can appear on first run, with their conditions:

- **Name modal**, `app/(tabs)/index.tsx:195-241`, when `user_settings.user_name` is empty. Wizard users never see it.
- **Dispatch push nudge**, `components/DispatchNudge.tsx:25-31`, when OS permission is undetermined and not dismissed within 7 days. This is the only place the iOS permission prompt is ever fired (`lib/pushNotifications.ts:104-130`).
- **Meet Your Future Self banner**, `app/(tabs)/index.tsx:288-315`, when `profiles.know_thyself_complete` is false. Dismiss is per session only.
- **Pending invite modal**, `components/PendingInviteModal.tsx:27-36`, when the server reports an invite token.
- **What's New modal**, `components/WhatsNewModal.tsx:23`, keyed on `'1.4.0'` while `app.json:5` is `1.4.2`, so it never renders on the current build.
- **Paywall**: never auto-shown on first run. All entry points are user taps (section 4).

Findings from the mobile path worth acting on:

- **Fixed in this PR:** the wizard wrote every `kt_*` column but never set `profiles.know_thyself_complete` (`app/(onboarding)/setup.tsx:126-142`). Only `saveOnboardingProfile` in `lib/db.ts` set it, and only the Future Self chat called that. So a user who answered all nine wizard fields still saw "Meet Your Future Self" on Home, the "your counselors don't know you yet" banners on the Cabinet tab (`app/(tabs)/cabinet.tsx:900-911`), and every LLM prompt still carries "NOTE: This user has not completed their Know Thyself profile yet" (`services/claudeService.ts:427-430`).
- `sendCheckInToCabinet` returns the literal "The Cabinet will speak when you return." on any error (`services/claudeService.ts:1060,1074,1077`) and the morning tab persists it into `check_ins.cabinet_morning_response` (`morning.tsx:171-174`), after which the "already responded" guard blocks a retry for the day. On a bad first-run network, day one's Cabinet reply is lost.
- The root layout forces `session = null` after a 3 second `getSession` timeout (`app/_layout.tsx:169-171`), which sends a slow-network user to the login screen.
- The check-in prompt hard-codes masculine pronouns ("he has just completed his morning routine", "Speak to him", `services/claudeService.ts:1022,1032`).

### 1.2 Web (`web/`)

`web/src/middleware.ts:9` keeps only `/login`, `/privacy`, `/reset-password`
public and bounces everything else to `/login?redirectTo=...`. This means the
guest marketing landing inside `web/src/app/page.tsx:132-210` is unreachable
in production for a logged-out visitor.

| # | Screen | Route / file | Shown when | Asks of the user | Clicks / fields | API calls |
|---|---|---|---|---|---|---|
| 1 | Login / sign-up | `web/src/app/login/page.tsx` | any unauthenticated request | Same copy as mobile. Toggle Sign In / Sign Up, Email, Password, Confirm Password, **Create Account**. | 2 clicks, 3 fields | `supabase.auth.signUp` (`:75`). If email confirmation is on in Supabase, the flow stalls at "Account created! Check your email…" and there is no `/auth/callback` route in `web/src/app` (only `/auth/handoff`). |
| 2 | Setup | `web/src/app/setup/page.tsx` | `user_settings.user_name` empty; every main page redirects here (`page.tsx:99-102`, `morning/page.tsx:60`, `profile/page.tsx:33`, `cabinet/page.tsx:99`) | "Welcome! / Choose a username to personalize your experience." One field, **Continue →**. | 1 click, 1 field | `user_settings` upsert (`:37` → `web/src/lib/db.ts:74-88`). No `kt_*` columns, no cabinet choice. |
| 3 | Home | `web/src/app/page.tsx` | `user_name` set | Greeting, ☀️/🌙 pills, Future Self banner (**Begin** → `/onboarding`), streak ("Begin today." at 0), Today's Question → `/cabinet?q=…`, quote, and a Know Thyself nudge ("The Cabinet's responses are generic until you tell them who you are. It takes 2 minutes." **Complete Now →** → `/profile`) when `kt_goals` is empty. | 1 click to Morning | `user_settings`, `check_ins` (three reads), `profiles` (streak, `know_thyself_complete`), plus a silent `check_ins` upsert of `daily_question_counselor` on first load (`:121-123`). Site-wide `PendingInviteToast` polls `GET /api/sessions/pending-invite`. |
| 4 | Morning (first check-in) | `web/src/app/morning/page.tsx` | `user_name` set | Two default tasks "Eat Breakfast", "Meditate" (`:25-28`), optional "Add a discipline", optional intention field, button **Begin with the Cabinet ☀️** under "SEND TO CABINET". Completing does not require ticking any task. | 1 click, 0 required fields | `routine_templates`, `check_ins`; `sendCheckInToCabinet` → `POST /api/chat` with `claude-opus-4-5` (`web/src/lib/claudeService.ts:626-636`); server `enforceMessageLimit` (`server/index.js:756-789`); writes `check_ins.cabinet_morning_response`, `morning_done`, `cabinet_conversations`. Streak unchanged (same both-routines guard, `web/src/lib/db.ts:806`). |

Fastest path on web: 5 clicks, 4 fields. The web path skips the 11-step
wizard entirely, so a web sign-up never sets `cabinet_members`, `user_goals`,
or any `kt_*` field unless they later visit `/profile` or `/onboarding`.

Web-specific findings:

- The web cabinet has no message counter, no handling for the server's 403 `daily_limit_reached`, and no paywall route on limit. A free web user hits the cap silently; the morning check-in then persists "The Cabinet will speak when you return." as the day's response (`web/src/lib/claudeService.ts:639`).
- `check_ins.daily_question_response` is never written by the web app, so the ✓ state on the Today's Question card can only come from mobile.
- `/api/onboard` proxies to `server/index.js:2278` `/api/onboard-web`, which does no auth check and no message-limit enforcement.

Academy (`academy/web/`) has its own sign-up ("14-day free Auditor trial. No
credit card required." / **Start Auditing Free**), always requires the email
round-trip, has no setup or Know Thyself step, and silently auto-enrols the
first dashboard visit in PHIL 701 (`academy/web/src/app/dashboard/page.tsx:88-92`).

---

## 2. Return path

### 2.1 What can bring a user back

| Mechanism | Exists? | Trigger and schedule | Eligibility | Copy | Deep link |
|---|---|---|---|---|---|
| **Daily Dispatch push** | yes | Generated once a day at 10:00 UTC (`server/railway.dispatch-generation-agent.json`, `dispatch-generation-agent.js`); delivered by an hourly agent (`0 * * * *`) that sends only when the user's local hour equals `dispatch_hour` (default 7) (`dispatch-delivery-agent.js:88-99`). | `user_settings.dispatch_enabled = true` (default) and `expo_push_token` not null (`dispatch-generation-agent.js:372-376`). No tier gate. Content is community-level, identical for every user. | title "Arete — {dispatch title}", body = teaser sentence. Body demands "a specific, concrete action for today... completable within 24 hours" (`:200-230`). | `data.type = 'daily_dispatch'` → `/dispatch` reader (`app/_layout.tsx:93-104`) |
| **Counselor broadcasts** | yes, manual | Admin-authored rows in `counselor_broadcasts`; hourly delivery agent (`server/broadcast-delivery-agent.js`). No `railway.broadcast-delivery-agent.json` exists in the repo, so the production schedule is unknown from code. | audience tiers and user ids on the row | admin-written; nothing in the repo | push nudges to `/cabinet`; the line is also seeded into the Cabinet thread on next foreground whether or not the push is tapped (`lib/broadcasts.ts`, `lib/counselorLines.ts:163-171`) |
| **Local scheduled reminders** | yes, but dormant by default | `app/settings.tsx` `scheduleNotifications` (`:411-563`) schedules 7 weekly repeats per reminder: Morning 07:00, Evening 20:00, Midday 12:00, Workout 06:00, Reading 21:00 all "on"; Future Self 15:00 off. | **Only scheduled if `AsyncStorage['notificationSettings']` already exists** (`:322-344`), and only Save in Settings writes it. A user who never opens Settings and saves gets zero local reminders despite the defaults reading "on". | e.g. "The day is unwritten. Decide who you will be in it, then begin." / "The day is ending. Give an account of it to your Cabinet." / "You told yourself you'd train today. That conversation is over. Go." Signed by a rotating cabinet member. | `/cabinet`; the line is also appended to the Cabinet thread even when untapped |
| **Email** | transactional only | Resend for contact form, shared-session invites, Enchiridion orders (`server/index.js:399-401, 1724-1752`, `server/routes/enchiridion.js:187-190`). An admin-only Gmail campaign sender in the Academy (`academy/web/src/app/api/admin/email/send/route.ts`). | n/a | n/a | **No lifecycle, welcome, day-2, or re-engagement email exists.** |
| **SMS** | no | The app opens the native SMS composer for invites; the server never sends SMS. | | | |
| **Supabase edge functions** | none | `supabase/` holds migrations only. | | | |
| **Calendar / Health** | read-only context | `lib/calendar.ts`, `lib/health.ts` read on-device at prompt time; nothing is written or scheduled. | | | |

Push permission is asked in exactly two places: the Home "Your Daily
Dispatch" card (`components/DispatchNudge.tsx:38-48`) and, unconditionally, on
Settings mount (`app/settings.tsx:304-312`). Boot never asks
(`lib/pushNotifications.ts:104-116`; the comment records that only about a
quarter of users had tokens under the old cold-boot ask).

**Dispatch timing defect.** Generation runs at 10:00 UTC and delivery only
fires when the local hour equals 7. For any user whose 07:00 local is earlier
than 10:00 UTC (all of Europe, Africa, Asia, Australia) the row for today does
not exist yet at their 07:00, the delivery agent exits with "No dispatch
generated for today yet" (`dispatch-delivery-agent.js:56-65`), and by the next
07:00 local the query is looking for the next UTC date. Those users never get
the push. Only UTC-negative zones (the Americas) receive it. No catch-up path
was found.

### 2.2 Home on day two and day three

On mobile, a returning user often never sees Home: the tab shell redirects to
Morning between 05:00 and 11:59 and to Evening from 17:00 on every cold
launch (`app/(tabs)/_layout.tsx:7-36`). When they do land on Home, the
sections in render order are: name modal (if nameless), What's New (dead on
this build), greeting, Dispatch push nudge, quote card, Meet Your Future
Self banner, Morning / Cabinet / Evening pills, primary CTA by hour, streak
card, Today's Question.

What differs on day two and three from day one:

- **Today's Question** rotates: it indexes a hard-coded 14-item array by day of year (`app/(tabs)/index.tsx:48-68`), and the four counselors it draws from are fixed (Marcus, Epictetus, Goggins, Roosevelt) regardless of the user's cabinet. Identical for every user.
- **The quote** rotates each half-day, drawn from the user's `cabinet_members` (`:146-172`). This is the only Home content shaped by day-one input beyond the first name.
- **The streak number** moves only if both morning and evening were completed on day one (`lib/db.ts:194`). A user who did the morning routine only still sees "0 Days of Discipline / Keep the chain unbroken." on day two.
- **The pills reset** to grey.
- The name modal and push nudge are gone if answered; the Future Self banner returns every launch until the conversational onboarding is completed.

Nothing else. There is no yesterday's-check-in card, no "the Cabinet
replied" card, no dispatch card, no counselor line, no weekly review, no
portrait, and no scroll on the mobile Home. Morning and evening answers,
goals, intention, and Know Thyself answers are never rendered there. The
Morning tab on day two is deliberately a blank copy of day one: the intention
field lives on today's `check_ins` row so it does not carry forward
(`app/(tabs)/morning.tsx:144`), and tasks are re-created undone.

What a returning user has to navigate to in order to see something new:

- **Journal tab**: today's Dispatch card (`app/(tabs)/journal.tsx:727-744`) and the Weekly Insight card (`:746-782`). The insight is the one genuinely personal day-two artifact: the daily Journal Analysis agent (`0 9 * * *`) selects anyone with a journal entry or cabinet message in the last 7 days with no minimum (`server/journal-analysis-agent.js:40-50`), so a user who talked to the Cabinet on day one can have a row by 09:00 UTC on day two. Free users see a 3-line preview and "Your counselors noticed a pattern this week. Unlock the full insight →".
- **Cabinet tab**: any reminder or broadcast line seeded by `lib/counselorLines.ts`, which appears in the thread even if the push was ignored.
- **Progress tab**: a static Weekly Review card; the Portrait card cannot appear before four analysis weeks.
- **Scrolls tab**: empty state "Complete your Know Thyself profile to receive your first scroll" unless the conversational onboarding was completed.

Web Home (`web/src/app/page.tsx`) is similar: greeting, pills, Future Self
banner, streak arc ("Begin today." at zero, "The chain is heavier than it
looks."), Today's Question, a quote keyed on weekday, and a Know Thyself nudge
keyed on `kt_goals`. No dispatch card exists on web.

---

## 3. Know Thyself

### 3.1 Where it is offered and whether anything requires it

Nothing anywhere requires Know Thyself. Three distinct surfaces share the
name, and they disagree about what "complete" means.

| Entry point | Copy | Required? | Sets `profiles.know_thyself_complete`? |
|---|---|---|---|
| Mobile sign-up wizard, `app/(onboarding)/setup.tsx` | 11 steps; "Skip for now →" on steps 3, 4, 6, 7, 8 | Only on the sign-up branch. Hard-requires name, goals, Future Self description, and a cabinet with at least one optional member. A sign-in user never sees it; web sign-up has no equivalent. | **Yes, as of this PR** (was no) |
| Home banner → conversational agent, `app/onboarding.tsx` and `web/src/app/onboarding/page.tsx` | "Personalise Your App / Meet Your Future Self / Begin"; inside: "Know Thyself", "Speak freely…", "Save to Know Thyself" | Dismissible per session; the ✕ inside exits at any time. Turn count is model-driven (12 areas, tool fires at ≥ 9). | **Yes**, the only path (`lib/db.ts:743-746`, `web/src/lib/db.ts:1032-1035`). Also the only path that triggers the first Scroll (`app/onboarding.tsx:117-130`). |
| Manual form, `app/know-thyself.tsx` and `web/src/app/profile/page.tsx` | "Your profile gives the Cabinet deep context about who you are. Update it any time — changes take effect on your next session." Nine fields. Web headline: "Your Cabinet reads this." | Optional; reached from Settings, the Cabinet tab nudges ("📖 Your counselors don't know you yet…" / "💡 Tip: Complete your Know Thyself profile…"), the web sidebar, and the web Home nudge. | **No** |

Two different signals decide the nudges. The Home banner and the Scrolls
empty state key on `profiles.know_thyself_complete`; the Cabinet-tab and
web-Home nudges key on `user_settings.kt_goals`. So a user who fills the
wizard or the form sees the Cabinet nudges clear while the Home banner and the
Scrolls empty state keep telling them to do the thing they just did. The
mobile Side Menu has no Know Thyself entry.

### 3.2 Every downstream read of `kt_*`

Columns: `kt_background, kt_identity, kt_goals, kt_strengths, kt_weaknesses,
kt_patterns, kt_major_events` (`supabase/migrations/001_initial_schema.sql:41-47`)
plus `kt_life_situation` (`20260327000001_onboarding_agent_fields.sql:7`).

Reads that go into an LLM prompt (the user never sees these):

| Where | Fields | What it does |
|---|---|---|
| `services/claudeService.ts:234-269` `gatherUserProfile` | all seven + Future Self | Builds "=== WHO {NAME} IS — PERMANENT PROFILE ===" with "Do not recite this profile back to them… demonstrate through your responses that you have been paying attention." Consumed by `buildSystemPrompt` (`:365`), `buildCounselorSystemPrompt` (`:1161`), weekly review (`:1330-1334`), and so by Cabinet chat, check-in replies, 1:1 chat, Today's Question prefetch. |
| `web/src/lib/claudeService.ts:89-122` | all seven | Same block on web; omits the "You know this person" instruction paragraph. |
| `lib/db.ts:675-690` `getKnowThyselfProfile` → `services/claudeService.ts:1182` | all seven | Sent as `userProfile` only from 1:1 counselor chat; Cabinet chat sends none. |
| `server/index.js:1366-1373` | all seven + Future Self | Server "[KNOW THYSELF — {NAME}]" block, single-counselor path only. |
| `server/index.js:810-858` | seven + Future Self | Shared "couples" sessions: both participants' profiles summarised into every counselor prompt. |
| `server/enchiridion-agent.js:488-495, 547-554` | all eight plus `archetype`, `app_usage_intent`, `feedback_preference`, `accountability_style` | The "who you said you were" chapter of the paid printed book; also uses `kt_identity` and `kt_patterns` as retrieval queries. |

Reads that drive UI:

| Where | Field | Effect |
|---|---|---|
| `app/(tabs)/cabinet.tsx:392` | `kt_goals` | shows or hides the two Cabinet nudges |
| `web/src/app/page.tsx:104`, `web/src/app/cabinet/page.tsx:101` | `kt_goals` | shows or hides the web nudges |
| `web/src/app/scrolls/page.tsx:105-111` | `kt_goals` | default topic for a manually requested scroll |
| `app/know-thyself.tsx:37-43`, `web/src/app/profile/page.tsx:35-41` | all seven | populate the edit form |

Not read by any agent. `server/longitudinal-user-model.js`,
`server/journal-analysis-agent.js`, `server/dispatch-generation-agent.js`,
`server/broadcast-delivery-agent.js`, `server/weekly-self-reflection-agent.js`
and everything in `server/agents/` read no `kt_*` column. The Portrait, the
Weekly Insight, and the Daily Dispatch are built without Know Thyself input.

Dead or lossy columns:

- `kt_life_situation`, `archetype`, `app_usage_intent`, `accountability_style`, `recommended_readings` are declared in the 2026-03-27 migration and never written by any code; the agent's `extract_profile` tool (`server/index.js:2320-2339`) has no `life_situation` property despite `Onboarding_Agent.md` listing it.
- `feedback_preference` (firm / compassionate / both) is written from the agent's `challenge_style` and read only by the Enchiridion; it never reaches a counselor prompt, so the stated preference has no effect on how the Cabinet speaks.
- `saveOnboardingProfile` discards five of the twelve fields the agent gathers (`good_day`, `daily_practice`, `reading`, `physical_practice`, `dependents`): they are in the tool schema and the client type (`app/onboarding.tsx:27-34`) but have no column.
- `web/src/lib/storage.ts:45-51` defines `kt_*` localStorage keys that nothing imports.

**Parallel-Cabinet hole.** `server/index.js:1244-1255` keeps only the tail of
the client system prompt from "=== {NAME}'S CURRENT APP DATA" onward and
forwards it to the parallel counselors (`:1306`). Everything before that
marker, including the entire "WHO {NAME} IS" block, is discarded, and Cabinet
chat sends no `userProfile` so the server-side block is not built either. In
parallel mode the Know Thyself profile reaches no counselor. Whether this
bites depends on `PARALLEL_CABINET_ENABLED` and `PARALLEL_CABINET_ALLOWLIST`
(`:187-188`, default off), which are not knowable from the repo.

### 3.3 Would a user who completes it notice a difference in the first three days?

Barely, and inconsistently. Concretely, completing Know Thyself changes:

- Four nudge banners disappear (the two on the Cabinet tab and the two on web), and only if the completion path wrote `kt_goals`.
- If, and only if, they completed it through the conversational agent, the Home banner and the Scrolls empty state also clear and a first Scroll is generated.
- The default topic of a manually requested scroll on web.
- The contents of a system prompt they never see, in Cabinet chat (single-counselor path), check-in replies, 1:1 chat, Today's Question, and the weekly review. The prompt forbids the visible tell ("Do not recite this profile back to them"), and both forms tell the user "changes take effect on your next session", deferring the payoff to a conversation they must start.

It changes no screen layout, no card, no copy on Home or Morning, no
notification, nothing about the Dispatch, the streak, the daily question, or
the quote, and nothing in the Weekly Insight. A wizard or form completer keeps
seeing "Meet Your Future Self / Begin" on Home and "Complete your Know
Thyself profile to receive your first scroll" on Scrolls, while the counselor
prompt carries both their profile and the note "This user has not completed
their Know Thyself profile yet" (`services/claudeService.ts:427-430`, keyed on
the profiles flag).

---

## 4. Gating map

Entitlement comes from `profiles.tier` plus `profiles.is_premium`, read by
`lib/db.ts:819-830` on mobile, `web/src/lib/db.ts:557-573` on web, and
`server/index.js:726-753` on the server. The hook every screen actually uses
is `hooks/useTierLimits.ts` (free: 10 messages/day, paid: no client cap). The
richer `TIER_LIMITS` table in `lib/useSubscription.ts:112-125` (`maxCounselors`,
`maxTokens`) has zero importers and enforces nothing. The only
`paywall_events` insert in the codebase is `app/paywall.tsx:149-152`; the web
`/upgrade` page and the Academy log nothing.

| # | Feature | Free limit | Enforced at | Side | `paywall_events.source` | Copy the user sees | Fires before use? |
|---|---|---|---|---|---|---|---|
| 1 | Cabinet (multi-counselor) messages | 10/day | `app/(tabs)/cabinet.tsx` `handleSend` :494-497, :533-535; server `enforceMessageLimit` `server/index.js:761-786` | both | `cabinet_daily_limit` | "{n} messages remaining today" counter (:1044-1049); on cap, straight to paywall | after |
| 2 | Cabinet limit card (server 403 mid-turn) | 10/day | `app/(tabs)/cabinet.tsx:997-1014` | both | `cabinet_limit_card` | "The Cabinet was mid-counsel." / "Your 10 free messages are spent, and the conversation isn't finished. Premium continues it: 50 messages a day, deeper reasoning, all 23 counselors." / **Upgrade to Premium →** / "Resets at midnight" | after |
| 3 | 1:1 counselor chat messages | 10/day (shared counter with #1) | `app/counselor-chat.tsx` `handleSend` :123-129, :164-166 | both | `counselor_daily_limit` | "{n} messages remaining today" (:358-363) | after |
| 4 | Shared-session messages | 10/day | `app/(tabs)/cabinet.tsx` `handleSendShared` :555-560, :592-594 | both | `shared_daily_limit` | none; silent redirect | after |
| 5 | Locked counselor, chat screen | 3 free (`FREE_COUNSELOR_SLUGS = marcus, goggins, roosevelt`, `lib/db.ts:790`) | `app/counselor-chat.tsx:78-83`, overlay :376-392 | client only; server never checks the slug | `locked_counselor` | "Counselor Locked" / "Free members have access to Marcus Aurelius, Epictetus, and David Goggins. Upgrade to Arete to unlock all 23 counselors." / **Upgrade to Arete** / Go Back | **before** |
| 6 | Locked counselor, select screen | 3 free, and a 3-seat cabinet cap (paid: 5, `select.tsx:81`) | `app/my-cabinet/select.tsx` `isLockedForTier` :78-79, `handleToggle` :83-86, modal :232-254 | client | `cabinet_select_locked` | "Counselor Locked" / "Upgrade to Arete to unlock all 23 counselors across 6 categories and build your ideal advisory board." / **Upgrade to Arete — $9.99/mo** / Maybe Later | **before** |
| 7 | Custom Cabinet (entering select) | locked | `app/my-cabinet/index.tsx` `handleCustomize` :88-94, modal :148-172; web `web/src/app/cabinet/select/page.tsx:82-104` | client | `custom_cabinet` (web: none) | "Custom Cabinet is a Premium feature" / "Choose from 23 counselors across 6 categories to build your ideal advisory board." / **Upgrade to Premium** / Maybe Later | **before** |
| 8 | Shared sessions, hosting or inviting | locked | `app/(tabs)/cabinet.tsx:781-785`; web `cabinet/page.tsx:556-562`; server `POST /api/sessions/invite` `server/index.js:1650-1657` (403 `premium_required`) | both | `shared_invite_gate` | no pre-tap lock; the person-add icon looks enabled | **before** |
| 9 | Shared session guest upsell | upsell | `app/(tabs)/cabinet.tsx:1089-1099`; web `cabinet/page.tsx:943-955` | client | `shared_guest_banner` | "✨ Enjoying this shared session? With Premium you can host your own. Upgrade →" | after |
| 10 | Cabinet sees Screen Time signals | locked (monitoring itself is free; only Cabinet visibility is paid) | `app/settings.tsx:755-769`; prompt side `lib/attend.ts:708-722` | client | `attend_cabinet_sight` | "Cabinet sees Screen Time signals" + inline **PREMIUM** tag; hint "Goal crossings only — never exact usage, never raw data." | **before** |
| 11 | Cabinet sees Health signals | locked | `app/settings.tsx:921-936`; `lib/health.ts:175-194` | client | `health_cabinet_sight` | "Cabinet sees Health signals" + PREMIUM; "Last night's sleep, today's steps and exercise minutes…" | **before** |
| 12 | Cabinet sees today's calendar | locked | `app/settings.tsx:990-1005`; `lib/calendar.ts:136-155` | client | `calendar_cabinet_sight` | "Cabinet sees today's calendar" + PREMIUM | **before** |
| 13 | Watchlists | locked | `app/settings.tsx` `promptAddWatchlist` :233-236 | client | `attend_watchlists` | no lock label on the add affordance; paywall header carries the pitch | **before** |
| 14 | Focus blocking (toggle, block a website) | locked | `app/settings.tsx:791-796`, :840-847 | client | `attend_focus_block` | "Block distractions during Focus" (no PREMIUM tag); "Block a website…" | **before** |
| 15 | Attend context tease (Progress tab) | tease | `app/(tabs)/progress.tsx:607-615` | client | `attend_context_tease` | "✨ Your counselors could see this and hold you to it. Unlock with Premium →" | after (data visible) |
| 16 | Weekly Insight full text | 3-line preview | `app/(tabs)/journal.tsx:746-782` | client | `insight_tease` | "Your counselors noticed a pattern this week. Unlock the full insight →" | after |
| 17 | Symposium / Oracle dialogues | 5/day (premium 50, pro unlimited) | server `SYMPOSIUM_LIMITS` `server/index.js:5107`, `consumeSymposiumQuota` :5130-5156 (429); client `app/library/symposium.tsx:103-118`, banner :156-166 | server | `symposium_daily_limit` | "{n} of {limit} left today"; on 429 "You've reached your 5 free dialogues for today. Arete Premium members get 50 a day — or return tomorrow."; banner "Premium members sit for 50 dialogues a day. See Premium" | after |
| 18 | Ask the corpus to write in the margin | locked | server `POST /api/library/annotate` `server/index.js:5335-5342` (403); client `lib/libraryComments.ts:107`, `app/library/reader.tsx:669-677, 710-714` | both | `library_margin_note` | button "✶ Ask the corpus" looks live; after the 403: "Asking the corpus to write in the margin is an Arete Premium feature. Reading and commenting are always free. See Premium" | **before** in effect |
| 19 | Agora commenting | locked | `components/agora/AgoraUI.tsx` `CommentComposer` :86-96 via `app/agora/[id].tsx:247`; RLS `agora_can_write()` `supabase/migrations/20260913000000_agora.sql:52-70` | both | `agora_comment` | "Commenting is for subscribers" / "Reading the Agora is free. Writing in it is not." | **before** |
| 20 | Agora essay submission | locked | `app/agora/index.tsx:81-84`, `app/agora/compose.tsx:53-56`; RLS as above | both | `agora_submit` | no lock on the "+" button; paywall header "Write for the Agora" | **before** |
| 21 | Settings upgrade row | entry point | `app/settings.tsx:1034-1049` | client | `settings_upgrade` | "Upgrade to Premium" | n/a |
| 22 | What's New promo | promo | `components/WhatsNewModal.tsx:80-95` | client | `whats_new_cabinet_sight` | "See what Premium unlocks" | before (currently unreachable, see 1.1) |
| 23 | Reasoning depth and reply length | free pinned to `claude-haiku-4-5`; `max_tokens` 1500 (premium 2500, pro 4000) | `server/index.js` `resolveModelForTier` :248-256, `TIER_MAX_TOKENS` :1203-1205 | server only | none | none. No UI anywhere mentions it outside the paywall table row. | invisible |
| 24 | Web: Assigning Minds (model choice) | locked | `web/src/app/cabinet/minds/page.tsx:81-108` | client | none | "Assigning Minds is a Premium Feature" / "Upgrade to Arete Premium to choose which AI model powers each counselor." | **before** |
| 25 | Academy premium routes (PHIL 702-707, Practicum, Papers, Dissertation, Composer, Morning Routine, Viva) | free: PHIL 701, Lexicon, Vocab Drill, Daily Examination, Courtyard, Library | `academy/web/src/app/dashboard/layout.tsx` `PREMIUM_ROUTES` :12-23; `components/PremiumGate.tsx:30-70` | client | none | "Premium standing" / "This part of the Academy is for Arete Premium members. Your free standing already includes:" + list / **Upgrade to Premium** / "New members start with a 7-day free trial. Cancel anytime." | **before** |

Gates that fire before the user has experienced the feature: rows 5, 6, 7,
8, 10, 11, 12, 13, 14, 18, 19, 20, 24, 25. Of these, rows 8, 13, 14, 18, 20
show no visual lock at all before the tap; the control looks enabled and the
paywall arrives as a surprise.

Premium or Pro features never teased to free users:

- **Reasoning depth and reply length** (row 23). Enforced silently on the server. Free users are never told their replies are shorter or from a smaller model.
- **Model choice on mobile.** The Pro plan card promises "Model choice", and `app/my-cabinet/index.tsx:63-85` renders the Mind picker for every tier and persists it, but `server/index.js:248-256` ignores the choice for free and premium. A free user can pick Opus and never learn it does nothing. Web locks the same screen (row 24), so the two surfaces disagree.
- **Academy premium courses.** The paywall row "Academy courses: PHIL 701 / All" is the only mention in the mobile or web app; nothing points at what 702-707 contain.
- **The Agora** is gated in three places with good in-place teases but is absent from the paywall's feature table.
- **The 7-day trial** appears only on the paywall and `/upgrade`, never at any lock.
- **Web's 10-message cap** has no counter, no tease, and no paywall route.
- **Premium's 50/day and Pro's unlimited** are invisible once paid: `hooks/useTierLimits.ts:6-10` returns `null` and the counter disappears, so Pro's unlimited is never legible to a premium user.

Discrepancies found while building the map:

- The locked-counselor copy names "Marcus Aurelius, Epictetus, and David Goggins" (`app/counselor-chat.tsx:381`) but the free set is Marcus, Goggins, Roosevelt (`lib/db.ts:786-790`; Epictetus moved behind the paywall on 2026-08-28).
- `paywall_events.tier_at_view` is never written; every row has a null tier.
- The paywall table says "Counselors: 3 / 23 / 23" but the seatable cabinet is 3 free, 5 paid (`app/my-cabinet/select.tsx:81`).
- Web `getIsPremium()` (`web/src/lib/db.ts:572`) omits `pro` and `arete`, diverging from `normalizeTier` on mobile, server, and Academy.
- Locked counselors are enforced on the client only; `/api/chat/counselor` never validates the slug against tier.
- `Arete_Payments_Subscription_Spec.md` is stale: it gates on the retired `subscription_tier` column, specifies RevenueCat IAP which `app/paywall.tsx:24-32` forbids, lists gated features (Belief Journal, Canon, Progress, Reading tracker, web access) none of which are gated, forbids the word "upgrade" which appears at nearly every gate, and omits the Pro tier.

---

## 5. Paywall and upgrade copy

### 5.1 Mobile paywall (`app/paywall.tsx`)

Header, generic (13 of 22 sources fall through to this, including every
daily-limit source and both custom-cabinet sources):

> Arete
> **Unlock Your Cabinet**
> More counselors. More conversations.
> The discipline to actually use them.
> New members start with a 7-day free trial *(US storefront only)*

Source-specific headers (`SOURCE_COPY`, `:93-130`), used for 9 sources:

| source | title | subtitle |
|---|---|---|
| `attend_cabinet_sight` | Let Them See Your Hours | Your counselors see your screen-time signals — and hold you to the limit you set yourself. |
| `attend_context_tease` | They Could See This | (same subtitle) |
| `attend_watchlists` | Name Your Distractions | Watchlists let the Cabinet call it out by name: "your Instagram list crossed two hours today." |
| `attend_focus_block` | The Cabinet Holds the Door | Your chosen apps and websites stay shielded for the length of every focus session. |
| `health_cabinet_sight` | Let Them See Your Nights | Sleep, steps, and training — your counselors speak to the day you actually lived. |
| `calendar_cabinet_sight` | Let Them See Your Day | Your counselors read today's calendar and hold it beside the things you said matter. |
| `agora_comment` | Write in the Agora | Reading the Agora is free. Commenting on an essay, and submitting your own, is for subscribers. |
| `agora_submit` | Write for the Agora | Subscribers submit essays. An editor reads every one before it appears, open to argument. |
| `whats_new_cabinet_sight` | The Cabinet Sees More | Screen time, sleep, and your calendar — counselors who speak to the day you actually lived. |

Feature table (`FEATURES`, `:76-88`), columns Free / Arete / Pro:

| Row | Free | Arete | Pro |
|---|---|---|---|
| Messages/day | 10 | 50 | Unlimited |
| Counselors | 3 | 23 | 23 |
| Reasoning depth | Standard | Deeper | Deepest |
| Cabinet sight (screen · sleep · day) | — | ✓ | ✓ |
| Watchlists & Focus blocking | — | ✓ | ✓ |
| Custom cabinet | — | ✓ | ✓ |
| Shared sessions | — | ✓ | ✓ |
| Weekly insights | Preview | Full | Full |
| Academy courses | PHIL 701 | All | All |
| Symposium dialogues/day | 5 | 50 | Unlimited |
| The corpus writes in the margins | — | ✓ | ✓ |

Plan cards: "Arete $9.99/mo — 50 messages/day · All 23 counselors · Full
Academy"; "Arete Annual $79.99/yr BEST VALUE — $6.67/mo · Save 33% ·
Everything in Arete"; "Arete Pro $19.99/mo UNLIMITED — Unlimited messages ·
Deepest reasoning · Model choice". CTA **Subscribe on the Web**. Footer:
"Payment is handled securely at pursuearete.com. Your subscription unlocks
this app automatically." / "Subscriptions auto-renew. Manage or cancel anytime
from your account on the web." Outside the US storefront the plan cards and
CTA are replaced by "In-app upgrades aren't available in your region…".

Assessment. The nine source-specific headers name a concrete benefit in the
user's own situation and are the strongest copy in the product. The generic
header does not: "Unlock Your Cabinet / More counselors. More conversations."
names quantities, not a benefit, and it is what a user sees at the moment
that matters most, the daily message cap. The feature table is a comparison
grid, not a pitch; "Reasoning depth: Standard / Deeper / Deepest" is
unexplained. The purchase path adds friction that the copy does not
acknowledge: the CTA says "Subscribe on the Web", opens an in-app browser,
and the trial line is only on the US storefront.

### 5.2 Web upgrade page (`web/src/app/upgrade/page.tsx`)

> Pursue **Arete**
> Unlock the full cabinet and every premium feature
> New members start with a 7-day free trial

Plan cards: "Premium Monthly $9.99/month — Full counselor library, custom
cabinet, and premium features."; "Premium Yearly $79.99/year Best value —
Everything in Premium, two months free."; "Pro $19.99/month — For the most
committed: everything in Premium and first access to new features." Every
button reads **Start free trial**. Footer: "New subscribers get 7 days free
on any plan. Cancel anytime during the trial and you won't be charged. If
you've subscribed before, checkout starts your plan immediately."

Assessment. This is the page every mobile purchase actually lands on, and it
is weaker than the mobile paywall: "every premium feature" and "premium
features" are placeholders, the Pro blurb promises "first access to new
features" rather than the unlimited messages and model choice the mobile card
promised, and there is no feature table. Nothing carries over from the
mobile source, so the tailored header the user just read is gone by the time
they see a price. Nothing on this page is logged.

### 5.3 In-place gate copy

The strongest in-place copy is the Cabinet limit card ("Your 10 free messages
are spent, and the conversation isn't finished. Premium continues it: 50
messages a day, deeper reasoning, all 23 counselors.") and the two Agora
locks. The Settings toggles carry a bare "PREMIUM" tag. Every other lock
says a form of "upgrade": "Upgrade to Arete", "Upgrade to Premium",
"Upgrade →", "Upgrade to Premium →", "Unlock with Premium →", "See Premium".
The Academy gate ("This part of the Academy is for Arete Premium members.
Your free standing already includes: …") is the only one that reminds the
user what they already have.

---

## 6. Backend intelligence exposure

Only one of the four agents is per-user. Inquiry, Tension, and Dreaming work
on the corpus, produce nothing user-specific, and reach users only through
the public Observatory feed after a human sets `status = 'approved'` and
`observatory_visible = true`. None of the four outputs is tier-gated
anywhere; none feeds the daily Dispatch (`server/dispatch-generation-agent.js`
reads none of their tables).

| Agent | Schedule | Scope | Activity gate | Output table | Where a user sees it | Tier | Earliest day it can reach a new daily user |
|---|---|---|---|---|---|---|---|
| Longitudinal user model, `server/longitudinal-user-model.js` | Mondays 09:30 UTC (`railway.longitudinal-user-model.json:6`); the log line at `:500` and `server/routes/observatory.js:40` still say 04:30 | per user | 4 distinct `journal_analysis.analysis_week` rows (`min_weeks_required: 4`, `:34`; `:110`). Upstream, the daily Journal Analysis agent writes one row per user per week if the user has any journal entry or cabinet message that week (`journal-analysis-agent.js:290`). | `user_longitudinal_models` (+ `longitudinal_model_history`) | Portrait screen `app/portrait.tsx:103-137`; Progress tab card `app/(tabs)/progress.tsx:317, 502-518`; counselor system prompt `server/index.js:955-1084`, injected at `:1442-1445` once `weeks_analyzed >= 4` (`:994-995`); Enchiridion book. No web surface. | free included, no check anywhere | **day 16 to 22** (four calendar Mon-Sun weeks; Sunday sign-up is the fastest) |
| Inquiry, `server/agents/inquiry-agent.js` | Mondays 06:30 UTC | global, corpus | seed pool ≥ 2× seed size (`:455-458`), ≥ 2 authors per seed (`:210-214`); no user gate | `open_inquiries`, `status: 'pending_review'`, `observatory_visible: false` | `GET /api/observatory/inquiries` (`server/index.js:5685-5723`, public, no auth) → `app/library/observatory.tsx:170`; Academy `/observatory/inquiry/[id]`; titles name-dropped in the counselor prompt pulse block (`server/index.js:517-534`) | free included | day 1 for anything already approved; otherwise unbounded, human-gated |
| Tension, `server/agents/tension-agent.js` | Mondays 05:30 UTC | global, corpus; reads all users' `journal_analysis.themes` for the last 30 days only to order the admin queue (`:361-366`) | ≥ 4 passages, ≥ 2 authors, ≥ 2 traditions (`:233`, `:277`) | `philosophical_tensions`, pending review | `GET /api/observatory/tensions` (`:5775-5827`, public) → Observatory screen; counselor pulse block | free included | day 1 if approved; otherwise human-gated |
| Dreaming, `server/agents/dreaming-agent.js` | Sundays 23:30 UTC | global, corpus | needs an approved tension or inquiry, or 3 strangeness passages (`:253`, `:396-399`); stores hollow dreams too (`:433`) | `corpus_dreams`, pending review | `GET /api/observatory/dreams` (`:5887-5940`, public); only a count reaches the counselor prompt | free included | day 1 if approved; otherwise human-gated |

What this means for the first three days: none of the four agents produces
anything personal for a new user inside the first two weeks, and the three
corpus agents never produce anything personal at all. The only per-user
intelligence a new user can meet in days one to three is the daily Journal
Analysis row (invisible except through the Weekly Insight preview on the
Journal tab) and whatever the counselor prompt assembles at request time.

---

## 7. Instrumentation gaps

### 7.1 What exists today

There is no analytics SDK in any of the four `package.json` files and no
`track()` or `logEvent()` call anywhere. Everything measurable is a domain
table with a `created_at`, plus one purpose-built telemetry table.

| Signal | Written at | Fields | Readable by the team? | What it proxies |
|---|---|---|---|---|
| `paywall_events` | `app/paywall.tsx:149-152`, the only writer | `user_id`, `source`. `tier_at_view` is never written. | RLS insert-only, no select policy; nothing in the repo reads it (no admin route, no dashboard) | paywall viewed, mobile only |
| `crash_reports` and `breadcrumb()` rows | `server/index.js:4093-4103` via `POST /api/crash`; `lib/crashCapture.ts:58-69` | message, stack, `launch_id`. **No `user_id`.** No migration in the repo. | `GET /api/crash`, unauthenticated, last 200 | the breadcrumbs "notification tap: daily_dispatch" and "notification tap: cabinet" (`app/_layout.tsx:95,100`) are the only push-open signal in the product, and they cannot be joined to a user or a dispatch. A 5-second heartbeat breadcrumb for 2 minutes per launch floods the table. |
| `dispatch_deliveries.status` | `dispatch-delivery-agent.js:115-183`; `server/index.js:2003-2009` | pending / sending / sent / failed / read, `sent_at` | user reads own rows; admin Dispatch tab reads only the rollup counts | "sent" means the Expo ticket was accepted. Push receipts are never fetched. "read" is written only when the row is still `pending` (`:2007`), so a user who received the push and then opened the dispatch records nothing, and the deep-link target `GET /api/dispatch/:id` writes nothing. Sent and read are mutually exclusive populations, not a funnel. Open rate on pushed dispatches is unobservable. |
| `counselor_broadcast_deliveries` | `broadcast-delivery-agent.js`; ack at `server/index.js:2128-2135` | `push_status`, `pushed_at`, `seeded_at` | service role only | `seeded_at` is delivery into the thread, not an open |
| `subscriptions` | `web/src/app/api/create-checkout/route.ts:85-97`; webhook `stripe-webhook/route.ts:191-216` | one row per user, `status`, `tier`, `current_period_end`, `updated_at` | user reads own; no admin route reads it | overwritten in place: `trialing` → `active` → `canceled` loses the trial-start, conversion and churn dates. Recoverable only from Stripe. |
| `profiles.tier`, `is_premium` | webhook grant `:218-224`, revoke `:237-243` | current state | own row | entitlement; `updated_at` is bumped by unrelated writes so it is not a conversion timestamp |
| `profiles.created_at` | `handle_new_user()` trigger | | own row | sign-up |
| `profiles.know_thyself_complete` | `lib/db.ts:743-746`, `web/src/lib/db.ts:1032-1035` | boolean, no timestamp | own row | KT completed via the agent only |
| `user_settings.expo_push_token` | `server/index.js:1951-1953` | token | | permission granted at some point; denial writes nothing |
| `check_ins` | `lib/db.ts:245-258`, `:289-293` | `morning_done`, `evening_done`, … | own row | daily check-in. Row existence is not completion: `morning.tsx:131` and the daily-question cache create rows without a check-in. |
| `journal_entries`, `cabinet_conversations`, `goals`, `scroll_reads` (`first_read_at`, `last_read_at`) | clients | `created_at` | own row | feature adoption |
| Admin usage page, `academy/web/src/app/api/admin/usage/route.ts:62-118` | | reads `profiles`, `check_ins`, `cabinet_conversations`, `journal_entries`, `goals`, `scroll_reads` | admin email only | a "funnel" of independent distinct-user counts, not sequential; "Did a check-in" uses row existence and is inflated; does not read `paywall_events`, `subscriptions`, or delivery tables |

Device-local only, invisible to the server: focus-session history and the
"cabinet announced" flag (`lib/cabinetSignals.ts:49,154`), HealthKit
connected and share flags (`lib/health.ts:58,76`), the dispatch nudge
dismissal (`components/DispatchNudge.tsx:8`), and the Know Thyself nudge
dismissals.

### 7.2 Funnel questions and whether they can be answered today

| Question | Measurable? | Why |
|---|---|---|
| Sign-up → onboarding step N completion | **No** | The wizard holds `step` in React state and writes once on commit (`app/(onboarding)/setup.tsx:70,125-140`); the agent path writes once on save. Partial fills never occur, so per-step drop-off is invisible. |
| Know Thyself started vs abandoned vs completed | Completed only, and only via the agent | No screen-view event; no `kt_completed_at`; the wizard and the form never set the flag, so their completers count as not onboarded. Abandoned is indistinguishable from never started. |
| Push permission granted / denied | Granted only | Token presence. `registerForPushNotifications` logs a denial to console and returns null (`lib/pushNotifications.ts:35-38`); the nudge discards the boolean (`DispatchNudge.tsx:39-47`). Prompt-shown is unrecorded, so prompt → grant rate cannot be computed. |
| Notification delivered vs opened | Neither | "Sent" is Expo ticket acceptance; receipts are never fetched. Opened is an anonymous breadcrumb with no user or notification id. |
| Dispatch delivered vs opened | No | See the `read` defect above. |
| Day-2 / day-3 return | Coarse and understated | No `last_active`, `last_seen`, or session table for the app. Return is reconstructed from writes to four tables (`admin/usage/route.ts:106-118`), which misses every returning user who reads but does not write. No D1/D2/D3 cohort curve exists. |
| First check-in completed | Yes, with care | `min(check_ins.created_at) where morning_done` per user; do not use row existence. |
| Paywall → checkout → trial → converted → churned | Step 1 only | Checkout start writes nothing (`upgrade/page.tsx:81-97`, `create-checkout/route.ts`); the mobile handoff drops `src` (`app/paywall.tsx:163-166` opens a fixed `/upgrade`); trial and conversion are overwritten in the single `subscriptions` row; Stripe metadata carries only `supabase_user_id` (`create-checkout/route.ts:107-112`). |
| Message cap hit | Weak proxy | The counter is mutable state (`profiles.daily_message_count`); a 403 persists nothing. Only cap hits that mount the paywall show up, as `*_daily_limit` sources. Web logs nothing. |
| Which gate produced the conversion | No | `source` stops at the paywall view. Nothing downstream carries it. |

### 7.3 Proposed events

Naming follows the existing `paywall_events.source` style: lowercase
snake_case, no verb, `<feature>_<gate>` with the feature as prefix and the
state as suffix (`_daily_limit`, `_locked`, `_tease`, `_gate`, `_card`).
Existing values are two to three tokens; keep to that. The `src` strings are
free-form today (a typo silently becomes a new event), so the first change
is a shared `PaywallSource` union type imported by every caller.

Recommended shape: one `product_events` table `(id, user_id, event text,
props jsonb, platform text, app_version text, created_at)` with an
insert-only RLS policy mirroring `paywall_events`, written through a single
`logEvent(name, props)` helper on mobile, web, and server. `paywall_events`
can stay as is or become a view over `product_events where event like
'paywall_%'`. Every event below carries `platform` and `app_version`.

Onboarding (mobile wizard and web setup):

| Event | Props | When |
|---|---|---|
| `signup_completed` | `method: 'password' \| 'invite'` | `supabase.auth.signUp` resolves with a session (`login.tsx:79`) |
| `onboarding_step_viewed` | `step: 1..11`, `optional: bool` | each `setStep` in `app/(onboarding)/setup.tsx` |
| `onboarding_step_skipped` | `step` | the "Skip for now →" tap, distinct from Continue |
| `onboarding_committed` | `fields_filled: n`, `cabinet_size: n` | `handleCommit` |
| `onboarding_abandoned` | `last_step` | app background or unmount before commit (client-side, best effort) |
| `setup_name_saved` | `surface: 'wizard' \| 'home_modal' \| 'web_setup'` | any `user_name` write |
| `setup_name_skipped` | | the Home modal "Skip for now" |

Know Thyself:

| Event | Props | When |
|---|---|---|
| `kt_banner_viewed`, `kt_banner_dismissed` | `surface: 'home' \| 'cabinet_empty' \| 'cabinet_tip' \| 'web_home' \| 'scrolls'` | banner render and ✕ |
| `kt_started` | `path: 'agent' \| 'form' \| 'wizard'` | `/onboarding` mount, `/know-thyself` mount, wizard step 3 |
| `kt_turn_sent` | `turn: n`, `areas_remaining: n` | each agent message (progress from the API response) |
| `kt_abandoned` | `path`, `turn` or `fields_filled` | close without save |
| `kt_completed` | `path`, `fields_filled`, `duration_s` | `saveOnboardingProfile`, form save, wizard commit. Also add `user_settings.kt_completed_at` and make all three paths set `profiles.know_thyself_complete`. |
| `scroll_generated` | `trigger: 'kt_agent' \| 'manual'` | `triggerScrollGeneration` |

Notifications:

| Event | Props | When |
|---|---|---|
| `push_nudge_viewed`, `push_nudge_dismissed` | | `DispatchNudge` render and "Not now" |
| `push_prompt_shown` | `surface: 'dispatch_nudge' \| 'settings'` | immediately before `requestPermissionsAsync` |
| `push_permission_granted`, `push_permission_denied` | `surface` | the result (`lib/pushNotifications.ts:35-38`), replacing the console log |
| `reminders_scheduled` | `count`, `types[]` | `scheduleNotifications`, so the dormant-by-default gap becomes visible |
| `notification_opened` | `kind: 'daily_dispatch' \| 'counselor_broadcast' \| 'reminder'`, `dispatch_id` or `broadcast_id`, `cold_start: bool` | the tap handler in `app/_layout.tsx:93-104`, replacing the anonymous breadcrumb |
| `dispatch_opened` | `dispatch_id`, `via: 'push' \| 'journal_card' \| 'reader'` | `GET /api/dispatch/:id` and `/today`, unconditional on status; server-side |
| `dispatch_push_receipt` | `dispatch_id`, `receipt_status` | fetch Expo receipts 15 minutes after sending in the delivery agent |
| `broadcast_opened` | `broadcast_id` | Cabinet thread render of a seeded line |

Activity and retention:

| Event | Props | When |
|---|---|---|
| `app_opened` | `cold_start`, `landing_tab`, `from_notification` | root layout after session resolves; also upsert `user_settings.last_active_at` server-side on every authenticated request so D1/D2/D3 can be computed without client writes |
| `checkin_completed` | `kind: 'morning' \| 'evening'`, `tasks: n`, `intention_set: bool`, `cabinet_replied: bool` | `saveTasks` when `allDone`; `cabinet_replied` false when the fallback string was returned |
| `checkin_cabinet_failed` | `kind`, `reason` | the three fallback returns in `sendCheckInToCabinet` |
| `home_viewed` | `sections: []` (which banners rendered) | Home focus |
| `insight_viewed`, `insight_preview_viewed` | `week` | Journal tab card render by tier |

Monetisation, extending the existing vocabulary:

| Event | Props | When |
|---|---|---|
| `paywall_viewed` | `source` (existing values), `tier_at_view` (start writing it), `region: 'us' \| 'other'` | existing insert, extended |
| `gate_hit` | `source`, `blocked: bool` | every gate site at the moment of the block, whether or not the paywall mounts. Covers cap hits the user shrugs off and the web's silent 403. Server-side too on 403 `daily_limit_reached`, 403 `premium_required`, 429 `daily_limit`. |
| `gate_tease_viewed` | `source` | inline teases (`insight_tease`, `attend_context_tease`, `shared_guest_banner`, Settings PREMIUM rows) on render |
| `paywall_dismissed` | `source`, `dwell_ms` | the ✕ on the paywall |
| `paywall_plan_tapped` | `source`, `plan: 'premium_monthly' \| 'premium_yearly' \| 'pro_monthly'` | plan card or CTA tap |
| `checkout_opened` | `source`, `plan`, `platform` | `openWebCheckout`; pass `src` through the handoff to `/upgrade?src=…` and into Stripe `metadata.source` |
| `checkout_started` | `source`, `plan`, `trial_eligible` | `create-checkout/route.ts` after the session is created; server-side |
| `checkout_cancelled` | `source`, `plan` | `/upgrade?status=cancelled` |
| `trial_started` | `source`, `plan`, `trial_end` | webhook on `customer.subscription.created` with `status = 'trialing'` |
| `subscription_activated` | `source`, `plan`, `from_trial: bool` | webhook on transition to `active` |
| `subscription_cancelled`, `subscription_churned` | `plan`, `reason`, `days_paid` | webhook on `cancel_at_period_end` and on revoke |
| `subscription_events` history table | `user_id`, `stripe_event_id`, `status_from`, `status_to`, `source`, `created_at` | append-only alongside the mutable `subscriptions` row, so trial → paid → churn is reconstructable without Stripe |

Three server-side fixes make most of the above trustworthy: write
`tier_at_view`; flip `dispatch_deliveries` to `read` regardless of prior
status and add a `read_at` column (or a separate `dispatch_opens` table) so
sent and read stop being mutually exclusive; and stamp `source` into Stripe
metadata so the webhook can close the loop from gate to trial.
