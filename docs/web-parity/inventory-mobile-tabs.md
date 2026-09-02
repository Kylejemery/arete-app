# Arete Mobile App — Tab Inventory (for Web Parity)

Source of truth: `/home/user/arete-app` (Expo Router app). This document describes the
eight tab screens, the scroll detail screen, seven shared components and two hooks in
enough detail to reimplement them on the web.

**Scope flag:** iOS Screen Time / "Attend" monitoring is OUT of scope for the web port.
It is flagged inline as `[NATIVE-ONLY — EXCLUDE]` everywhere it appears.

---

## 0. Global conventions

### 0.1 Design tokens (used by every screen)

| Token | Value | Use |
|---|---|---|
| App background | `#1a1a2e` | every screen root, tab bar scene |
| Card / surface | `#16213e` | cards, modals, input rows, tab bar |
| Deep surface | `#0d1526` | progress-bar track |
| Gold (primary) | `#c9a84c` | headers, accents, CTA fill, active state |
| Gold tints | `#c9a84c11 / 18 / 22 / 33 / 44 / 55 / 88 / 99 / b3` | hairline borders, chip fills, muted gold text (8-digit hex = alpha suffix) |
| Body text | `#fff` (primary), `#e0e0e0` / `#e8e0d0` / `#ddd` / `#ccc` (secondary), `#888` (muted), `#555` / `#444` (placeholder/faint) |
| Cream | `#e0d5b5` / `#e6eef8` / `#e8e2cf` | headings inside dark cards, share card |
| Slate text | `#8A9BB0` | WhatsNew / SideMenu subtitles |
| Evening blue | `#4a6fa5` | evening dots, legends, "in progress" |
| Destructive | `#ff4444` | delete icons/labels |
| Success | `#4caf50` (`#4caf5088` muted) | achieved goals |
| Border neutral | `#2a2a3e`, `#2a3a5c`, `#ffffff0d`, `#ffffff22` | inactive pill / card borders |

Radii: cards `14`, chips/inputs `10–12`, modals `16–20` (bottom sheets: top corners only,
`20`), pills `20–50` / `999`. Standard screen padding `20–25`, card padding `16–24`.

Typography: no custom font on most screens — system sans. Headers are **gold, bold,
26px**. Section labels are uppercase, 10–13px, `letterSpacing: 1–2`, gold. Quotes are
italic. The one serif usage is `ShareQuoteModal` (`Georgia` on iOS / `serif` elsewhere).

### 0.2 Environment / server

- `API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'`
  (production: `https://arete-app-production.up.railway.app`). Exported from
  `services/claudeService.ts`; `lib/scrolls.ts` and `app/(tabs)/scrolls.tsx` each define
  their own identical copy.
- Supabase client: `lib/supabase.ts` (`EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`).
- All Railway calls that need identity send `Authorization: Bearer <supabase access_token>`.

### 0.3 Tier model (`hooks/useTierLimits.ts`, `lib/useSubscription.ts`, `lib/db.ts`)

- Tier is read from `profiles.tier` + `profiles.is_premium` via `getSubscriptionTier()`.
  `normalizeTier()` maps `pro`→pro; `premium|arete|scholar`→premium; anything else →
  `is_premium ? premium : free`. Client never writes the tier (Stripe/RevenueCat webhook only).
- `hooks/useTierLimits()` → `{ tier, maxMessages }`, where `maxMessages` = `free: 10`,
  `premium: null`, `pro: null` (paid tiers are gated server-side and show **no** counter).
- `lib/useSubscription.useTierLimits()` (a *different*, richer table, used by prompts/paywall
  copy): `free {maxMessages 10, maxCounselors 3, maxTokens 400}`,
  `premium {50, 23, 600}`, `pro {Infinity, 23, 1000}`.
- Server-side authoritative counter: `lib/db.checkAndIncrementMessageCount()` reads/writes
  `profiles.daily_message_count` + `profiles.message_count_date` and enforces
  `MESSAGE_LIMITS = {free 10, premium 50, pro null}`.
- Free counselors: `FREE_COUNSELOR_SLUGS = ['marcus','goggins','roosevelt']`.
  `getUserCabinet()` filters a free user's cabinet down to that set (falling back to
  `['marcus','roosevelt']` if nothing survives).
- `useSubscription()` re-reads the tier on every app foreground (web equivalent: on
  `visibilitychange` / focus).

### 0.4 Paywall routing

Every gate pushes `/paywall` with a `src` param used for analytics/copy:
`cabinet_daily_limit`, `cabinet_limit_card`, `shared_daily_limit`, `shared_invite_gate`,
`shared_guest_banner`, `insight_tease`, `attend_context_tease`, `menu_academy`,
`menu_library`, `whats_new_cabinet_sight`.

### 0.5 AsyncStorage keys (complete list touched by these screens)

| Key | Written by | Meaning |
|---|---|---|
| `arete:home_stats` | Home | `{streak, morningDone, eveningDone}` paint-from-cache |
| `home_quote_cache` | Home | `{slot, quote}` where slot = `Y-M-D-morning|evening` (flips at 18:00) |
| `arete:morning_tasks` | Morning | `{date: 'YYYY-MM-DD', tasks: []}` (date-stamped) |
| `arete:evening_tasks` | Evening | raw task array (NOT date-stamped — known asymmetry) |
| `morning_defaults_seeded` | Morning | prevents re-seeding default templates |
| `cabinet_defaults_seeded` | Cabinet | one-time default cabinet seed |
| `daily_messages_YYYY-MM-DD` | Cabinet | local per-day sent-message count |
| `arete:progress_streak` | Progress | `{streak}` cache |
| `screen_time_goal_hours` | Progress | daily screen-time goal, hours (default 2) |
| `screen_time_manual_log` | Progress → `lib/attend` | `{ 'YYYY-MM-DD': 'under'\|'over' }`, rolling 30 days |
| `dispatch_dismissed_date` | Journal | dismissal keyed to `dispatch_date` |
| `insight_dismissed_week` | Journal | dismissal keyed to `analysis_week` |
| `dispatch_nudge_dismissed_at` | DispatchNudge | epoch ms; re-ask after 7 days |
| `whats_new_seen_version` | WhatsNewModal | app version already announced |
| `dismissed_invite_<token>` | PendingInviteModal | permanently dismissed invite |
| `arete:pomodoro_sessions` | Focus → `lib/cabinetSignals` | `{ 'YYYY-MM-DD': count }`, rolling 30 days |
| `attend_*` (`attend_enabled`, `attend_goal_minutes`, `attend_family_selection`, `attend_daily_history`, `attend_night_history`, `attend_watchlists`, `attend_focus_blocklist`, `attend_focus_block_enabled`, `attend_blocked_domains`, `attend_armed_app_version`, `attend_counselor_lines`, `attend_share_screen_with_cabinet`, `attend_share_routines_with_cabinet`) | `lib/attend` | `[NATIVE-ONLY — EXCLUDE]` except `attend_share_routines_with_cabinet`, which gates whether routines are sent to the Cabinet prompt (worth keeping as a web preference) |
| `health_connected`, `health_share_with_cabinet` | `lib/health` | `[NATIVE-ONLY — EXCLUDE]` (HealthKit) |
| `calendar_connected`, `calendar_share_with_cabinet` | `lib/calendar` | `[NATIVE-ONLY — EXCLUDE]` (expo-calendar) |

Two Home flags are **module-level variables, deliberately not persisted** (reset on app
launch, survive tab switches): `futureSelfBannerDismissed`, `namePromptSkipped`.

---

## 1. `app/(tabs)/_layout.tsx` — Tab bar

**1. Purpose / navigation.** Expo Router `<Tabs>` container. Eight tabs, in this order:

| # | Route | Title | Ionicon |
|---|---|---|---|
| 1 | `index` (`/`) | Home | `home-outline` |
| 2 | `morning` | Morning | `sunny-outline` |
| 3 | `evening` | Evening | `moon-outline` |
| 4 | `cabinet` | Cabinet | `mic-outline` |
| 5 | `journal` | Journal | `book-outline` |
| 6 | `timer` | Focus | `library-outline` |
| 7 | `scrolls` | Scrolls | `newspaper-outline` |
| 8 | `progress` | Progress | `trophy-outline` |

**2. Features.**
- **Time-of-day auto-navigation** on first mount only (guarded by a `hasNavigated` ref):
  hour ∈ [5,12) → `router.navigate('/morning')`; hour ≥ 17 → `/evening`; otherwise stay on
  Home. This runs once per app session.
- Renders `<PendingInviteModal />` app-wide, above the tab navigator.
- `headerShown: false` (each screen draws its own header), `animation: 'none'`,
  `lazy: false` (all tabs mounted eagerly).

**6. Visual.** Tab bar: background `#1a1a2e` for scene, tab bar itself `#1a1a2e` with
`borderTopWidth: 0`, `elevation: 10`, height 60, `paddingBottom: 5`. Active tint `#c9a84c`,
inactive `gray`.

**Web note:** the auto-navigation is worth reproducing but must not fight browser
history — do it as a redirect on the app root only.

---

## 2. `app/(tabs)/index.tsx` — Home

**1. Purpose / navigation.** Route `/`. Tab 1. Landing surface: greeting, quote, routine
status, primary CTA, streak, daily counselor question. No deep-link params. Header actions:
settings gear → `/settings`; hamburger → opens `SideMenu`.

**2. Features, in layout order.**

1. **Name-capture modal** (`Modal`, fade, transparent). Shown when `user_settings.user_name`
   is empty and the per-session `namePromptSkipped` flag is false. Kicker "Welcome to Arete",
   title "What should we call you?", `TextInput` (placeholder "Your name", `maxLength 60`,
   autocapitalize words), gold **Continue** button (disabled while empty or saving; label
   becomes "Saving…"), and a muted **Skip for now** link. Save → `upsertUserSettings({user_name})`.
   Dismiss/skip sets `namePromptSkipped = true` for the session.
2. **`<WhatsNewModal />`** — rendered only when the name prompt is *not* visible.
3. **Top bar** — left: greeting line (`#888`, 20px) = "Good morning/afternoon/evening"
   (< 12 / < 17 / else), plus, in 32px bold white, `"{user_name} ⚔️"` or `"Welcome ⚔️"`.
   Greeting appends the first word of the name when set. Right: two square icon buttons
   (`#16213e`, radius 12, gold-33 border): settings gear (24px) and menu (26px).
4. **`<SideMenu visible={menuOpen} />`**.
5. **`<DispatchNudge />`**.
6. **Quote card** — `#16213e`, radius 14, 3px gold left border, giant gold `"` glyph (44px),
   italic quote `#e8e0d0` 14px, gold attribution `— {author}`. While loading: a 90px-tall
   40%-opacity skeleton block.
7. **"Meet Your Future Self" banner** — shown while `getKnowThyselfComplete()` is false and
   the session-level `futureSelfBannerDismissed` is false. Gold-tinted (`rgba(201,168,76,.09)`,
   gold-35 border), 44px circular icon with `✦`, kicker "PERSONALISE YOUR APP", title "Meet
   Your Future Self", gold pill **Begin** → `/onboarding`, and an `×` dismiss (session only).
8. **Status pill row** — three pills: ☀️ Morning (active style when `morning_done`) →
   `/morning`; 🏛️ Cabinet (**always** rendered active) → `/cabinet`; 🌙 Evening (active when
   `evening_done`) → `/evening`. Active = gold-18 fill + gold border + gold uppercase label;
   inactive label is `#444`.
9. **Primary CTA** — full-width gold button with arrow. Label/route by hour:
   `< 12` → "Begin Morning Routine" `/morning`; `< 17` → "Open the Cabinet" `/cabinet`;
   else → "Evening Reflection" `/evening`.
10. **Streak card** — 52px gold number, "Days of Discipline" + italic "Keep the chain
    unbroken.", flame icon. Skeleton (104px) until `cacheLoaded`.
11. **"TODAY'S QUESTION" prompt card** — deterministic pick from a hard-coded 14-entry
    `DAILY_PROMPTS` array indexed by `dayOfYear % 14` (see below). Tapping pushes
    `/counselor-chat?id={counselorSlug}&initialMessage={prompt}`.

`DAILY_PROMPTS` cycles counselors `marcus-aurelius`, `epictetus`, `david-goggins`,
`theodore-roosevelt` with 14 fixed questions (e.g. "What is the one thing you are avoiding
today, and why?", "Is the thing troubling you in your control, or not? Act accordingly.").
`dayOfYear = floor((Date.now() - Date(currentYear,0,0)) / 86400000)`.

**3. Data.**
- `getUserSettings()` → `user_settings` (`user_name`, `cabinet_members`).
- `upsertUserSettings({user_name})` → upsert `user_settings` on `user_id`.
- `getKnowThyselfComplete()` → `profiles.know_thyself_complete`.
- `getTodayCheckin()` → `check_ins` where `check_in_date = today` (`morning_done`, `evening_done`).
- `checkAndResetStreakIfMissed()` → reads `profiles.streak` + `profiles.streak_last_incremented_date`;
  scans `check_ins` between last date and today; **breaks the streak only after two
  consecutive fully-missed days** (a day with either routine done counts as engaged; today
  never counts against you). Writes `profiles.streak = 0` on break.
- `getRandomCabinetQuote(slugs)` → `counselors.name, counselors.quotes` for the user's
  `cabinet_members` (minus `futureSelf`, default `['marcus-aurelius','epictetus',
  'david-goggins','theodore-roosevelt']`), flattens all quotes and picks one at random.
- `prefetchDailyQuestion(normalizeCounselorId(slug), prompt)` — background pre-generation.

**Load sequence:** (1) paint from `arete:home_stats`; (2) fetch settings + KT + checkin +
streak in parallel; (3) rewrite the cache; (4) fire the prefetch. Runs on every focus
(`useFocusEffect`). The quote loads once on mount from `home_quote_cache`, refetching only
when the slot key changes.

**4. Server calls.** Indirect only, via `prefetchDailyQuestion` →
`POST {API_BASE_URL}/api/chat/counselor` with body
`{model:'claude-opus-4-5', max_tokens:1500, system, messages:[{role:'user',content:question}],
counselorSlug, tzOffsetMinutes, activeCounselorId, userId}` + `Authorization: Bearer`.
Result cached in `check_ins.daily_question_counselor` / `.daily_question_response` via
`saveDailyQuestionCache()`; skipped if today's cache already matches the counselor.

**5. Platform-only.** `useSwipeNavigation('/')` (PanResponder horizontal swipe between tabs)
— replace on web with nothing, or keyboard/arrow affordances.

---

## 3. `app/(tabs)/morning.tsx` — Morning Routine

**1. Purpose / navigation.** Route `/morning`, tab 2. Header: gold "Morning Routine ☀️",
right side shows an `n/m` badge and a pencil that opens the Edit Routine sheet. No params.

**2. Features, in order.**

1. **Header row** — title; badge `{completedCount}/{totalCount}` (gold-22 pill, gold-55
   border); pencil icon → Edit Routine modal.
2. **Affirmation card** — `#16213e`, 3px gold left border, sun icon + italic gold quote.
   Chosen by `new Date().getDay()` from a fixed 7-item array (Marcus/Epictetus/Seneca lines).
3. **Progress bar** — "Today's Progress" + gold percent; 12px track `#0d1526`, gold fill.
4. **Task list** — each task is a card (`#16213e`, gold-33 border) with a circle/check icon,
   title and optional grey note. Done state inverts to a **solid gold card with dark
   strikethrough bold text**. Skeletons (3 × 62px, 40% opacity) until loaded.
   - Tap an undone task → mark done immediately.
   - Tap a **done** task → confirm dialog "Uncheck this discipline?" with
     "Keep it done" / destructive "Uncheck".
   - **Swipe left** on a task reveals a trash action (`react-native-gesture-handler`
     `Swipeable`) → confirm "Remove Discipline". *(Web: replace with a hover/overflow
     delete button.)*
5. **Add Discipline** — dashed gold-44 outline button; expands into an inline input
   ("Name your discipline...") with Cancel / Add. Adds an ad-hoc task with `id = Date.now()`
   to *today's* list only (not to the template list).
6. **All-done card** — appears when every task is done and there is at least one:
   🏛️, "Morning Complete", "The morning belongs to the disciplined."
7. **Cabinet check-in** — when the last task is completed and today's checkin has no
   `cabinet_morning_response`: a loading row ("The Cabinet is responding…" + spinner), then
   a card labelled "🏛️ The Cabinet" with the reply and a right-aligned
   **View in Cabinet →** link → `/(tabs)/cabinet?morningMessage={reply}`.
8. **Edit Morning Routine modal** (bottom sheet, `maxHeight 70%`) — lists the persisted
   templates with per-row trash, plus an add row: 2-char emoji input + "Task name..." +
   gold `+` button.

**3. Data.**
- `getRoutineTemplates('morning')` → `routine_templates` filtered `user_id`+`type`, ordered
  by `sort_order`.
- First-run seeding (guarded by `morning_defaults_seeded`): `addRoutineTemplate` ×3 →
  🍳 Eat breakfast (0), 🥊 Train (1), 🌿 Meditate (2). Existing users with templates get the
  flag back-filled so seeding never repeats.
- `templateToTask(t)` → `{id: t.id, title: emoji ? '{emoji} {title}' : title, done: false}`;
  the `Train` template additionally gets `note: 'Boxing, running, or movement'`.
- `getTodayCheckin()` / `upsertTodayCheckin({morning_tasks, morning_done})` → `check_ins`
  (`morning_tasks` JSON, `morning_done`, `cabinet_morning_response`, `check_in_date`).
  If the stored checkin's `check_in_date` ≠ local today, the task list is rebuilt from
  templates and written back with `morning_done: false`.
- `incrementStreak()` → only increments when **both** `morning_done` and `evening_done`
  are true today, is idempotent per day (`profiles.streak_last_incremented_date`), and
  restarts at 1 if the streak was broken.
- `deleteRoutineTemplate(id)`, `addRoutineTemplate(type,title,emoji,sortOrder)`.
- `sendCheckInToCabinet('morning')` (see §4).

**4. Server calls.** `sendCheckInToCabinet('morning')` →
`POST {API_BASE_URL}/api/chat` with
`{model:'claude-opus-4-5', max_tokens:350, system:<full cabinet system prompt + app
context>, messages:[{role:'user', content:'[Morning check-in] {name} has just completed his
morning routine. Tasks: {title ✓/✗, …}. Affirmation shown: "…". Speak to him briefly as he
begins the day.'}], tzOffsetMinutes, user_id}` + Bearer auth. Response text is read from
`data.content[0].text`, appended to the `cabinet` thread
(`cabinet_conversations.messages`), and stored in `check_ins.cabinet_morning_response`.
On failure it returns the literal string "The Cabinet will speak when you return."

**5. Platform-only.** `useSwipeNavigation('/morning')`; `Swipeable` swipe-to-delete;
`Alert.alert` confirmations (web: modal/confirm).

**6. Visual.** Title 26px gold bold. Task card radius 14, padding 18, gap 14. Done card
`backgroundColor #c9a84c` with `#1a1a2e` text. Bottom-sheet modal `#16213e`, top radius 20.

---

## 4. `app/(tabs)/evening.tsx` — Evening Routine

**1. Purpose / navigation.** Route `/evening`, tab 3. Mirrors Morning with a Stoic Journal
block instead of an affirmation. No params.

**2. Features, in order.**

1. **Header row** — "Evening Routine 🌙" + `n/m` badge + pencil (Edit Evening Routine).
2. **Progress bar** (identical to Morning).
3. **Task list** — identical card/skeleton/toggle/confirm-uncheck/swipe-delete behaviour.
4. **Add Discipline** (identical inline input).
5. **Stoic Journal block** — card header (library icon + "Stoic Journal"), then today's
   prompt chosen by `new Date().getDay()` from a fixed 7-item array (e.g. "What could you
   have done better today? What would Epictetus say?").
   - Unsaved: multiline `TextInput` ("Write your thoughts...", 4 rows) + gold **Save**.
   - Saved: a fade-in "Saved" card (checkmark + gold label) showing the text, with a pencil
     that flips back to edit mode.
   - **Save side effects**: dismiss keyboard; `upsertTodayCheckin({stoic_answer})`; and,
     **only the first time per day** (`stoicJournalCreated` ref), `createJournalEntry({type:
     'reflection', content, source: 'evening_reflection', raw_input: <the prompt>})` — this
     is why the Journal tab renders a prompt line above such entries.
6. **All-done card** — 🌿, "Evening Complete", "Sleep sound. You have lived this day well."
7. **Cabinet check-in card** — same markup as Morning ("🌙 The Cabinet", "View in Cabinet →"
   → `/(tabs)/cabinet` **without** a param). **Note: dead code today.**
   `sendCheckInToCabinet` is imported and `checkinLoading` exists, but nothing ever calls it
   on this screen; the card only renders a pre-existing `check_ins.cabinet_evening_response`
   (written elsewhere, e.g. a server job). Flag this when porting.
8. **Edit Evening Routine modal** — identical to Morning's.

**3. Data.** Same helpers as Morning with `type='evening'`:
`getRoutineTemplates('evening')`, seeding **📜 Plan Tomorrow (0)** and **👁️ Reflect on Your
Day (1)** — note this seeding is **not** guarded by an AsyncStorage flag, so clearing all
evening templates re-seeds them; `upsertTodayCheckin({evening_tasks, evening_done,
stoic_answer})`; `incrementStreak()` when all evening tasks are done;
`createJournalEntry(...)` → `journal_entries`.

Cache: `arete:evening_tasks` holds a **bare array** (unlike Morning's date-stamped object),
so stale crossed-off items can flash on a new day until the fresh fetch lands.

**5. Platform-only.** Swipe navigation, `Swipeable`, `Alert`, `Animated` fade, `Keyboard.dismiss`.

---

## 5. `app/(tabs)/journal.tsx` — Journal + Goals

**1. Purpose / navigation.** Route `/journal`, tab 5. Two internal tabs — **📓 Journal** and
**Goals** — sharing one header. The entry composer is a full-screen sub-view (not a modal).
No deep-link params. Navigates out to `/dispatch?dispatch_id=…` and `/paywall`.

**2. Features, in order.**

**Header (both tabs)**
1. Tab switcher: two equal buttons; active = gold-22 fill + gold border + gold label.
2. *Journal tab only*: search box (`#16213e`, magnifier, "Search entries...", clear `×`).
3. *Journal tab only*: horizontal filter chips — **All / 📝 Reflection / 📖 Quote / 🧠 Idea**.
   Tapping the active chip toggles back to `all`.
4. *Goals tab only*: full-width gold **+ Add Goal** button.

**Journal feed**
5. **Daily Dispatch card** (`#1f2a4a`, gold-55 border) — eyebrow
   `☀️ Daily Dispatch · {weekday of dispatch_date}`, `×` dismiss, title, 2-line teaser,
   right-aligned gold "Read more →". Tap → `/dispatch?dispatch_id={id}`. Dismissal writes
   `dispatch_dismissed_date = dispatch_date`, so the card returns with the next day's dispatch.
6. **Weekly Insight card** (`#241f3d`, purple `#7b5ea755` border) — eyebrow
   `🦉 Weekly Insight · Week of {analysis_week}`, `×` dismiss, optional italic purple
   `dominant_theme` (`#b39ddb`), insight text clamped to **3 lines** unless expanded.
   **Tier gate:** free tier tapping the card routes to `/paywall?src=insight_tease` and the
   footer reads "Your counselors noticed a pattern this week. Unlock the full insight →";
   paid tiers toggle expand/collapse ("Read insight →" / "Show less"). Dismissal writes
   `insight_dismissed_week = analysis_week`.
   **Important:** the insight is fetched only when this tab is focused because the server
   marks it delivered on first fetch.
7. **Empty state** — book icon (52px, gold-22), "No entries yet.", "Tap + to add your first entry."
8. **Entry cards** — `#16213e`, gold-22 border. Meta row: gold type badge (`📝 Reflection` /
   `📖 Quote` / `🧠 Idea`) + date (`MMM d, yyyy`). Body:
   - *quote*: `"content"`; expanded shows `— {source}` or `📖 {bookTitle}` + `— {author}`;
     collapsed shows a single source line.
   - *other*: if `source === 'evening_reflection'` and `raw_input` exists, the prompt is
     rendered above the content; content is truncated to **120 chars + "..."** until expanded.
   - **Tap** toggles expansion; **long-press (500 ms)** opens a context menu.
   - Belief-type entries are filtered out of this list entirely (`e.type !== 'belief'`).
   - Sorting: `createdAt` descending, after filter + search (search matches content,
     bookTitle, author, source, topic, rawInput).
9. **FAB** (journal tab only) — round gold `+` → type-selector sheet.
10. **Type selector modal** — "What are you adding?" with three options carrying subtitles:
    Reflection ("Daily thoughts, free writing"), Quote ("Passage from a book"),
    Idea ("Seed for an essay or project"), plus Cancel.
11. **Long-press context menu** — shows a 60-char excerpt, **Edit** (pencil) and destructive
    **Delete** (with "Delete this entry? This cannot be undone." confirmation), plus Cancel.
12. **Composer sub-screen** — replaces the whole screen. Header: back arrow, title
    `New|Edit {type label}`, gold **Save**.
    - Quote: large multiline input `"Enter quote..."`, then a **Source** control — either a
      dropdown button opening a source picker, or a free-text field with a "← Back to list" link.
    - Source picker sheet: "None", one row per book (`title` + `author`) drawn from the
      user's reading data (`current_books` + `books_read`), and "Enter custom source...".
      A selected book stores the source as `"{title} — {author}"`; on edit, a source not
      matching any book switches the control into custom mode.
    - Reflection / Idea: single large multiline input with placeholder
      "What's on your mind?" / "What seed do you want to keep?".
    - Empty quote → alert "Required / Please enter a quote."; empty reflection/idea → no-op.

**Goals feed**
13. **Empty state** — flag icon, "No goals yet.", "Your goals from onboarding will appear
    here. You can also add your own."
14. **Active section** ("Active" label) — each goal is a card with a 3px left border tinted
    by category, an uppercase category label in that colour, title, optional description,
    optional "By {target_date formatted long}", and a right-side **status pill**.
    - **Status pill cycles locally**: `ACTIVE` → `IN PROGRESS` → (tap) confirm
      "Mark this goal as complete?" → `completeGoal`. The `active`/`in_progress` distinction
      is **component state only (`goalStatuses`), never persisted** — a reload resets it to ACTIVE.
    - Status colours: active `#c9a84c`, in_progress `#4a6fa5`, achieved `#4caf50`.
15. **Completed section** — collapsible toggle "Show completed (n)" / "Hide completed";
    each card is dimmed, title struck/greyed, shows "Completed {MMM d, yyyy}" and a green check.
16. **Toast** — gold-on-dark animated toast, "Goal achieved. 🏛️" (fade in 200 ms, hold 2 s,
    fade out 300 ms).
17. **Add Goal modal** — Title * (autofocus), Description (multiline), "Target date:
    YYYY-MM-DD (optional)", and a horizontal **Category** chip row over
    `GENERAL, PHYSICAL, BEHAVIORAL, HEALTH, FINANCIAL, MENTAL, CAREER, RELATIONSHIPS`
    (colours: `#c9a84c, #4a6fa5, #7b5ea7, #4caf50, #26a69a, #9c27b0, #e87040, #e84077`).
    Save is disabled until a title exists; label flips to "Saving...".
    `normalizeTargetDate`: `YYYY` → `YYYY-01-01`, `YYYY-MM` → `YYYY-MM-01`, else passthrough.

**3. Data.**
- `getJournalEntries()` → `journal_entries` for the user, ordered `created_at` desc.
  Mapped fields: `id, type, content, created_at, updated_at, book_title, author, source,
  raw_input, dialogue_history, encoded_belief, virtue_check{passed,concern,virtue},
  belief_stage, refined_statement, topic`.
- `createJournalEntry`, `updateJournalEntry(id, {...})` (also stamps `updated_at`),
  `deleteJournalEntry(id)` — all on `journal_entries`, scoped by `user_id`.
- `getReadingData()` → `reading_data` (`current_books`, `books_read`) for the source picker.
- `getGoals(userId)` → `goals` ordered `created_at` asc; `upsertGoal({user_id,title,
  description,target_date,category,source:'user',completed:false})`; `completeGoal(id)` sets
  `completed = true, completed_at = now()`.
- `supabase.auth.getUser()` for the goals `user_id`, `supabase.auth.getSession()` for the
  dispatch/insight bearer tokens.

**4. Server calls.**
- `GET {API_BASE_URL}/api/dispatch/today` (Bearer) → `{ dispatch: { id, title, teaser,
  dispatch_date } | null }`.
- `GET {API_BASE_URL}/api/user/insight` (Bearer) → `{ insight: { id, insight_text,
  dominant_theme, analysis_week } | null }`. **Fetching marks it delivered server-side.**

**5. Platform-only.** `useSwipeNavigation('/journal')`; `Alert.alert`; `Animated` toast;
long-press gesture (web: right-click / overflow menu).

**6. Visual.** Feed padding 16 with `paddingBottom: 100` to clear the FAB. Entry preview text
`#ccc`, expanded `#fff`. Dispatch and Insight cards are the only non-`#16213e` surfaces on
this screen and are deliberately distinct (navy and plum).

---

## 6. `app/(tabs)/progress.tsx` — Progress

**1. Purpose / navigation.** Route `/progress`, tab 8. Two internal tabs: **Overview** and
**Reading**. Header title "Progress 📊". Navigates to `/portrait`, `/weekly-review`, `/paywall`.

**2. Features — Overview tab, in order.**

1. **Portrait card** (only when `portrait.philosophical_portrait` exists) — deliberately
   first. Label "Portrait" + chevron, 3-line teaser of the portrait text, and a meta line
   `{weeks_analyzed} week(s) of your own writing`. Tap → `/portrait`.
2. **Streak hero** — 🔥, big gold number, "Day Streak".
3. **Stats row** (4 cards) — Journal Entries (count of `type==='reflection'`), Quotes Saved
   (`type==='quote'`), Books Finished (`books_read.length`), Read Today (formatted
   `today_reading_seconds`).
4. **📱 Screen Time card**:
   - `[NATIVE-ONLY — EXCLUDE]` **"Connect iOS Screen Time"** button + caption ("Your
     counselors will notice when you cross your daily goal, even when Arete is closed. Usage
     data never leaves your phone."), shown only when `attendIsSupported()` and not connected.
   - `[NATIVE-ONLY — EXCLUDE]` Connected status row: "Today: crossed {Xh Ym}" or "Today: under
     every threshold so far", a green/red `✓ under goal` / `⚠ over goal` badge (with
     "(your mark)" when a manual mark overrides it), "Monitored by iOS Screen Time", and a
     **Disconnect** link (confirm dialog).
   - `[NATIVE-ONLY — EXCLUDE]` Free-tier tease when connected: "✨ Your counselors could see
     this and hold you to it. Unlock with Premium →" → `/paywall?src=attend_context_tease`.
   - **KEEP for web:** the two-stat row — **Today** (`Under` / `Over` / `—`, coloured) and
     **Daily Goal** `{n}h ✎` (tap → `Alert.prompt` for hours, validated 0.25–16, persisted to
     `screen_time_goal_hours`; on native it also re-arms the monitor).
   - **KEEP for web:** the **manual mark** row — two buttons "✓ Under goal" / "⚠ Over goal"
     writing one bit per day into `screen_time_manual_log` (rolling 30 days), plus a list of
     the **5 most recent** marks rendered as `{MMM d}` + "Under goal ✅" / "Over goal ⚠️".
     The manual mark always overrides the automatic reading.
5. **This Week card** — 7 columns (oldest → today) each with weekday label, day number, and
   two dots (morning gold, evening `#4a6fa5`); today's label/number highlighted. Legend below.
   **Known limitation:** `calendarData` is initialised to `{}` and only *today* is filled in
   from `getTodayCheckin()`, so the other six days are always empty. A web port should query
   `check_ins` over a date range and fix this.
6. **Weekly Review card** — description ("Convene the Cabinet for an honest assessment of
   your week — what went well, what fell short, and what matters next.") + gold **View Weekly
   Review** button → `/weekly-review`.
7. **Month calendar card** — `‹ {Month YYYY} ›` navigation, `Su…Sa` labels, a grid of day
   cells each with the day number and the same two dots; today's cell highlighted. Same data
   limitation as above. Legend repeated.
8. **Milestones card** — 5 fixed milestones: 7 🔥, 30 ⚡, 60 💎, 100 👑, 365 🏆. Earned cards
   (streak ≥ days) get gold styling and a checkmark.

**Features — Reading tab, in order.**

9. **Books Finished hero** — 📚 + count.
10. **Reading streak card** — 📖🔥 + consecutive-day count. Computed client-side from
    `reading_sessions[].date` (which stores `Date.toDateString()`): walk backwards from today
    (or yesterday if today has no session yet), counting consecutive days present. Cursor is
    set to noon to dodge DST.
11. **Reading stats row** — Total Pages (`sum(pagesRead)`), Total Time (`sum(duration)`),
    Read Today.
12. **📖 Currently Reading** — rows with book icon, title, "by {author}", "Page {currentPage}";
    empty text "No books in progress. Start a session in the Timer!".
13. **📅 Reading History** — last **10** sessions: book title, `dateFormatted`,
    `pp. {startPage}→{endPage}`, duration.
14. **📚 Books Finished** — header with a small gold `+`; each row numbered descending
    (`books.length - i`), title, author, "Finished {dateFinished}", and a red trash
    (confirm "Delete Book / Remove this book from your list?").
    Empty: tappable "Add your first finished book!".
15. **Add Book modal** — "📚 Book Finished!", "Book title *" (autofocus), "Author (optional)",
    Cancel / Save. Saved book: `{title, author, dateFinished: 'Month d, yyyy'}` prepended to
    `books_read`. *(Note: books added here have no `id`, while the delete path filters by
    `b.id` — deleting such a row removes every id-less book. Worth fixing on web.)*

**3. Data.**
- `checkAndResetStreakIfMissed()` (see Home) → `profiles.streak`.
- `getLongitudinalPortrait()` → `user_longitudinal_models` selecting `persistent_themes,
  emerging_themes, fading_themes, growth_edges, counselor_affinity, preferred_entry_types,
  dominant_philosophical_orientation, emotional_tone_baseline, self_disclosure_depth,
  philosophical_portrait, portrait_updated_at, delta_summary, weeks_analyzed,
  first_analyzed_at, last_analyzed_at`. Row is absent until the weekly agent has enough history.
- `getJournalEntries()` → `journal_entries` (counts by type).
- `getReadingData()` / `upsertReadingData()` → `reading_data` (`books_read`, `current_books`,
  `reading_sessions`, `today_reading_seconds`, `today_reading_date`).
- `getTodayCheckin()` → `check_ins` (today's morning/evening dots).
- `getUserCabinet()` → `counselors` rows for the user's cabinet (used only to name counselors
  for Attend notifications — native).
- `lib/attend`: `attendIsSupported, requestAttendAuthorization, enableAttend, disableAttend,
  getAttendTodayStatus, recordAttendDay, updateAttendGoal, attendIsEnabled,
  ensureAttendArmedForVersion` `[NATIVE-ONLY — EXCLUDE]`; `getManualScreenLog,
  markManualScreenDay` (keep — pure AsyncStorage).

**4. Server calls.** None directly.

**5. Platform-only.** `useSwipeNavigation('/progress')`; the whole Attend/DeviceActivity
stack including the native `DeviceActivitySelectionSheetView` (FamilyActivityPicker) modal,
loaded via a guarded `require('react-native-device-activity')`; `Alert.prompt` (iOS-only API)
for the goal editor.

**6. Visual.** Section cards `#16213e` with gold-ish hairlines; hero numbers are large gold;
week/calendar dots are 6-ish px circles, gold for morning and `#4a6fa5` for evening.

---

## 7. `app/(tabs)/scrolls.tsx` — Your Scrolls, and `app/scrolls/[id].tsx`

### 7a. Scrolls list

**1. Purpose / navigation.** Route `/scrolls`, tab 7. Header: gold "Your Scrolls" + a gold
**+ Request a Scroll** button. No params. **This screen does not use swipe navigation**
(the only tab that doesn't).

**2. Features, in order.**
1. Header + Request button.
2. **The Library card** — single wide card ("The Library", subtitle "Reading Room ·
   Symposium · Observatory") → `/library`. *(Unlike SideMenu, this entry point is not
   tier-gated.)*
3. **Loading** spinner, or **empty state**: newspaper icon, "Your scrolls will appear here.",
   "Complete your Know Thyself profile to receive your first scroll, written for you by your
   Counselor."
4. **Scroll cards** — top row: uppercase gold counselor label (`marcus` → "Marcus Aurelius",
   `epictetus` → "Epictetus", `seneca` → "Seneca") and, when `read_count > 0`, a flame badge
   with the count. Then the title (17px), then a footer with `{MMM d, yyyy}` created date and,
   if present, italic "Last read {date}". Tap → `/scrolls/{id}`.
5. **Request a Scroll modal** (bottom sheet) — "What do you want to work on?", multiline
   input (placeholder "e.g. I want to stop procrastinating on hard decisions"), gold
   **Write My Scroll** button (disabled while empty/loading; while loading shows a spinner and
   "Your scroll is being written..."), Cancel.

**3. Data.** `getUserScrolls(userId)` → `scrolls` joined to `scroll_reads (read_count,
last_read_at)`, filtered `user_id`, ordered `created_at` desc. Scroll shape:
`{id, user_id, title, body, counselor: 'marcus'|'epictetus'|'seneca', goal_source,
request_type: 'auto'|'requested', created_at, read_count, last_read_at}`.
Insert after generation: `supabase.from('scrolls').insert({user_id, title, body, counselor,
goal_source, request_type: 'requested'})` — **the client writes the row, the server only
generates the text.**

**4. Server calls.** `POST {API_BASE_URL}/api/scrolls/generate` with
`{goal: <topic>, requestType: 'requested'}` (**no auth header on this call**) →
`{title, body, counselor}`.
Related: `lib/scrolls.triggerScrollGeneration(userId, userName, goalsText)` (called from
onboarding, not this screen) parses up to 3 goal lines out of the Know Thyself goals text
and posts each with `{goal, userName, requestType: 'auto'}` (5 s timeout), inserting each
result into `scrolls`.

### 7b. Scroll detail — `app/scrolls/[id].tsx`

**1. Purpose / navigation.** Route `/scrolls/[id]`; param `id` (the scroll uuid). Back arrow
does `router.replace('/(tabs)/scrolls')`.

**2. Features.**
- Header with back arrow only.
- Body, centred: uppercase gold counselor label (2px letter-spacing), 26px bold white title,
  italic byline "Written for you by {counselor}", hairline divider, then the body split on
  `\n\n` into 17px/30px-line-height paragraphs (`#ddd`, `selectable`).
- **URL linkification** inside paragraphs: matches `https?://…`, strips trailing `.,;:)`,
  and normalises any Amazon product URL to `https://www.amazon.com/dp/{ASIN}`. Links render
  gold + underlined and open via `Linking.openURL` (web: plain `<a target="_blank">`).
- **Read tracking**: a read is logged once per screen visit, whichever comes first —
  (a) 60 seconds on screen (`READ_THRESHOLD_MS = 60_000`), or (b) scrolling within 40px of
  the bottom. Guarded by a `readLoggedRef`.
- **Milestone toast** on reaching a specific read count: 3 → "You've read this 3 times. The
  words are starting to root."; 7 → "…becoming yours."; 10 → "…This is now part of you.";
  21 → "21 readings. The philosopher would be proud." Toast fades in 300 ms, holds 2.8 s,
  fades out 400 ms.
- **Read footer**: flame + "You've read this {n} time(s)", or "Reading now..." when 0.
- Loading and not-found states each render the header plus a centred grey line
  ("Loading scroll..." / "Scroll not found.").

**3. Data.** `getScroll(id)` → `scrolls` + `scroll_reads`. `logScrollRead(scrollId, userId)`
→ selects `scroll_reads` by `(scroll_id, user_id)`; if found, `update {read_count: n+1,
last_read_at: now}`, else `insert {scroll_id, user_id, read_count: 1, last_read_at}`;
returns the new count.

**4/5.** No Railway calls. Native bits: `Linking`, `Animated` toast.

**6. Visual.** This is the most "typographic" screen: centred title block, 28px page padding,
generous 30px line height, hairline `#c9a84c22` rules. A web port should use a measured
column (~65ch) and a serif or high-quality reading face.

---

## 8. `app/(tabs)/timer.tsx` — Focus

**1. Purpose / navigation.** Route `/timer`, tab 6, titled **"Focus ⏱️"**. Two internal
tabs: **Timer** and **History**. No params.

**2. Features — Timer tab, in order.**

1. **Pomodoro card**
   - Mode toggle: **"25 min Work"** / **"5 min Break"**. Switching cancels any scheduled
     notification, resets the countdown to 25:00 or 5:00, and stops the run.
   - Countdown display `MM:SS`.
   - Buttons: **Start/Pause** (toggles; on start it computes an absolute
     `pomodoroEndTime = Date.now() + timeLeft*1000`, schedules a local notification, and — in
     work mode — calls `startFocusBlock()`), **Reset**, and, while running in work mode, a
     **✓ Done** button that completes the session early.
   - On completion (work): stop focus block, increment session count, switch to break with
     5:00. On completion (break): switch back to work with 25:00.
   - **"Sessions completed today: {n}"** — persisted through
     `lib/cabinetSignals.setPomodoroCountToday()` into `arete:pomodoro_sessions`
     (`{ 'YYYY-MM-DD': count }`, rolling 30 days), which is what feeds
     `buildFocusContext()` into the Cabinet's system prompt.
   - Timer survives backgrounding by recomputing from the absolute end time on
     `AppState → active`.
2. **Today's stats card** — clock icon + "Today's Reading Time" and a line that is either
   `{Xh Ym} today` or `{Xh Ym} today · {n} pg/hr` when today's pages and minutes are both > 0.
3. **Reading timer card** — big `MM:SS`, a book label (`📖 {title} • p.{currentPage}` or
   "Select a book below to start"), and either a **Start** button or a **Pause/Resume + Stop**
   pair. Start without a selected book alerts "Select a Book". Start opens the **Starting
   Page** modal; Stop opens the **Session Complete** modal.
   - Pause/resume accounting uses `pausedDurationRef` so elapsed time excludes pauses.
4. **Currently Reading section** — header with a small gold `+`; each book row is selectable
   (tap selects, disabled while the timer runs), shows title / "by {author}" /
   "Page {currentPage||startPage}", a gold check when selected, and a red trash when not
   running (confirm "Remove Book").
   Empty state: tappable "Add a book you're reading!".

**Features — History tab**

5. **Session History** — every session, newest first: book title, "by {author}",
   `dateFormatted`, `p.{start} → p.{end} • {pagesRead} pages`, and duration on the right.
   Empty: "No sessions yet. Start reading!".

**Modals**

6. **Starting Page** — "📖 Starting Page", subtitle = book title, numeric input placeholder
   `Current page ({currentPage||1})`, Cancel / **Start ▶**. Validates > 0.
7. **Session Complete** — "✅ Session Complete!", subtitle `{title} • {duration}`,
   "What page did you stop on?" numeric input, Cancel / **Save**. Validates > 0.
8. **Add Book** — title *, author, "Starting page (default: 1)". Creates
   `{id: Date.now().toString(), title, author, startPage, currentPage, totalPages: ''}`.
9. **Finish Book** — 🎉 "Book Finished!", "Did you finish "{title}"?", **Not Yet** / **Yes! 🎉**.
   Triggered automatically when `endPage >= book.totalPages` (note `totalPages` is always `''`
   for books added here, so in practice this fires only for books seeded elsewhere).
   Confirming moves the book from `current_books` to `books_read` with
   `dateFinished: 'Month d, yyyy'`.

**Session save (`stopTimer`)** builds
`{id, bookId, bookTitle, bookAuthor, startPage, endPage, pagesRead: max(0, end-start),
duration: sessionSeconds, date: Date.toDateString(), dateFormatted: 'MMM d, yyyy'}`,
prepends it to `reading_sessions`, adds the duration to `today_reading_seconds`, sets
`today_reading_date` to the local `YYYY-MM-DD`, and updates that book's `currentPage`.
Then either the Finish modal or an alert "Session Saved! 📖 — {n} pages • {duration}".

**3. Data.** `getReadingData()` / `upsertReadingData({current_books, books_read,
reading_sessions, today_reading_seconds, today_reading_date})` → `reading_data`.
`lib/cabinetSignals.getPomodoroCountToday()` / `setPomodoroCountToday()` → AsyncStorage.
`lib/attend.startFocusBlock()` / `stopFocusBlock()` `[NATIVE-ONLY — EXCLUDE]`.

**4. Server calls.** None.

**5. Platform-only.** `expo-notifications` local notification with fixed identifier
`focus-timer-complete` (scheduled on pomodoro start, cancelled on pause/reset/mode change —
deliberately scoped so it never cancels the weekly counselor reminders scheduled in
Settings); `AppState` background reconciliation; `useSwipeNavigation('/timer')`;
`startFocusBlock` / `stopFocusBlock` (Screen Time shield) `[NATIVE-ONLY — EXCLUDE]`.
On the web, use the Notifications API or an in-page chime, and `document.visibilitychange`
plus absolute end timestamps for the same background-safe behaviour.

**6. Visual.** Two large monospace-feeling countdowns (pomodoro and session), gold buttons,
`#16213e` section cards. The selected book card gets a gold border.

---

## 9. `app/(tabs)/cabinet.tsx` — The Cabinet

The largest screen (~1800 lines). Three internal tabs: **Cabinet** (solo group chat),
**Shared** (only when a shared session exists), **Counselors**.

**1. Purpose / navigation.** Route `/cabinet`, tab 4.
**Deep-link params consumed** (each guarded by a `consumed…Ref` and cleared with
`router.setParams({...: undefined})` after use):

| Param | Behaviour |
|---|---|
| `beliefContext` | switches to the Cabinet tab and pre-fills the composer with the string (does not send) |
| `cabinetContext` | JSON `{counselorName, topic, counselorLastResponse}` — **escalate to cabinet**: builds a handoff message, shows it in the input, then after 600 ms clears the input and auto-sends it |
| `morningMessage` | appends the string as an assistant bubble (labelled "The Cabinet") without hitting the API; waits for `initialLoading` to finish so it lands after history |
| `sharedSessionId` + `sharedPartnerName` | flips the device into shared mode and opens the Shared tab (handed back by `/join-session`) |

The escalation handoff text is:
```
[Escalated from private session with {counselorName}]

I was discussing with {counselorName}: "{topic}"

{counselorName}'s perspective so far: "{counselorLastResponse}"

I'd like the full Cabinet to weigh in.
```
(the third paragraph is omitted when there is no last response).

**2. Features, in order.**

**Header**
1. Title "The Cabinet" (26px gold), subtitle "Your Council of Invisible Counselors",
   and a small-caps member line: the user's counselor names joined with ` · ` plus the
   Future Self name, which is `Future {user_name} (in {future_self_years} years)` or just
   "Future Self".
2. When in a shared session: `👥 Shared Session · {You} & {Partner}` plus, once a real
   partner is present, a green-dot "Partner connected" line.
3. Header buttons (Cabinet tab): **invite** (person-add) — **free tier routes to
   `/paywall?src=shared_invite_gate`**, paid opens the invite modal (only shown while
   `sessionType === 'solo'`); **search** toggle; **new session** (refresh icon, disabled when
   there are no messages) → confirm "New Session / Clear the conversation and start a new
   session with the Cabinet?" → clears local state and `clearThread('cabinet')`.
   Shared tab shows a single **exit** button instead (end shared session).
4. **Tab bar** — Cabinet / (Shared) / Counselors; active tab gets a 2px gold underline.
5. **Search bar** (Cabinet tab, when toggled) — filters messages client-side by substring and
   shows "{n} result(s) for '{q}'" above the filtered list.

**Cabinet (solo) tab**
6. **Initial loading**: full-screen gold spinner. **Error**: alert icon + message + a
   **Retry** button (`loadInitialThread`).
7. **Empty state** — people icon, "Bring your questions, struggles, and victories to the
   Cabinet.", then the user's counselor names listed vertically in gold plus the Future Self
   name (fallback list before load: Marcus Aurelius, Epictetus, David Goggins,
   Theodore Roosevelt). If Know Thyself is incomplete, a tappable banner:
   "📖 Your counselors don't know you yet — complete your Know Thyself profile for more
   personal responses." + "Complete Now →" → `/know-thyself`.
8. **Know-thyself nudge** (non-empty thread, dismissible for the session only):
   "💡 Tip: Complete your Know Thyself profile so the Cabinet can give you more personal
   responses. →" with an `×`. Incompleteness = `!user_settings.kt_goals?.trim()`.
9. **Message list** — user bubbles right-aligned (gold-15 fill, gold border, radius 16 with
   a squared bottom-right corner, white 15/22 text); counselor bubbles left-aligned
   (`#16213e`, gold-33 border, squared bottom-left) with a **label row**: uppercase gold
   counselor name (or "The Cabinet") and a **share icon** that opens `ShareQuoteModal` for
   that message. All text `selectable`.
10. **Loading bubble** — "The Cabinet" + spinner + "The Cabinet is convening...".
11. **Input bar** — multiline `TextInput` "Speak to the Cabinet...", `maxLength 2000`, and a
    round gold send button (disabled when empty / loading / limit reached).
12. **Free-tier counter** — under the input: "{max(0, maxMessages - messageCount)} messages
    remaining today" (free tier only; paid tiers show nothing).
13. **Daily-limit card** — replaces the input bar when the server returns `daily_limit_reached`:
    "The Cabinet was mid-counsel." / "Your 10 free messages are spent, and the conversation
    isn't finished. Premium continues it: 50 messages a day, deeper reasoning, all 23
    counselors." / gold "Upgrade to Premium →" (`/paywall?src=cabinet_limit_card`) /
    "Resets at midnight".

**Send flow (`handleSend`)**: read local `daily_messages_{date}`; if `maxMessages !== null &&
count >= maxMessages` → `/paywall?src=cabinet_daily_limit` and return. Otherwise append the
user message optimistically, call `sendMessageToCabinet(updatedMessages)`, append the replies,
increment the local counter, and persist `[user, ...assistant]` via `appendMessages('cabinet')`.
On error the optimistic user message is rolled back; `DailyLimitError` sets the limit card,
`MessageLimitError` routes to the paywall.

**Shared tab (Arete for Couples)**
14. **Participants row** — avatar chips with initials (2 letters) per member; pending
    invitees show a dimmed avatar and "· invited".
15. **Pending banner** — "Waiting for your partner to join — they can start talking as soon
    as they accept."
16. **Guest upsell banner** (free tier only, since only Premium can invite):
    "Enjoying this shared session? With Premium you can host your own. Upgrade →" →
    `/paywall?src=shared_guest_banner`.
17. **Message list** — same bubbles, plus: **system rows** (centred grey notices such as
    "{name} left the session") and a **sender label** above user bubbles.
18. **Input bar** — "Speak to the Cabinet together...". Same daily-limit gate but routing to
    `/paywall?src=shared_daily_limit`.
19. **Exit** — writes a system row "{name} left the session" into `session_messages`, then
    deletes the `session_participants` rows for that session, resets to solo, clears shared
    messages, and returns to the Cabinet tab.

**Counselors tab**
20. **✦ Customize Cabinet** button → `/my-cabinet`.
21. **Counselor rows** — circular gold-initials avatar, name, `category` (fallback
    "Counselor"), "Last active {timeAgo}" when there is thread history, a gold message-count
    badge, and a chevron. Tap → `/counselor-chat?id={slug}&name={name}&role={one_line}`.
    `timeAgo`: "just now" (<1 m), "{n}m ago", "{n}h ago", "{n}d ago".

**Modals**
22. **`ShareQuoteModal`** for any counselor message.
23. **Invite modal** — "Start a Shared Session", "Invite someone by email or phone number to
    join your Cabinet session. Both of your Know Thyself profiles will be shared with your
    counselors.", a single "Email or phone number" field, inline error text, Cancel / gold
    **Send Invite** (spinner while sending).
    - Validation: phone = `/^\+?\d{7,15}$/` after stripping `\s().-`; email = simple regex.
    - Email invites are sent server-side (Resend). **Phone invites open the inviter's own SMS
      composer**: `sms:{phone}{'&' on iOS | '?' on Android}body={encodeURIComponent(smsBody)}`;
      if that fails, an alert shows the `joinUrl` to share manually.

**Session restoration.** On mount the screen resolves `supabase.auth.getUser()` and
`getOrCreateCabinetConversationId()`, then determines shared mode two ways:
(a) *inviter side* — any `session_participants` row with `session_id = myConversationId`,
`status = 'active'`, `user_id != me` → shared, partners from those rows;
(b) *partner side* — my own active `session_participants` row whose `session_id` differs from
my conversation id → shared, `currentSessionId` becomes that session.

**Realtime.** Supabase channel `cabinet-session-{sessionId}` subscribed to `INSERT` on
`public.session_messages` filtered `session_id=eq.{id}`; rows authored by the current user are
skipped (already shown optimistically).

**Counselor-line absorption.** Listens on `DeviceEventEmitter` for
`CABINET_THREAD_UPDATED` (from `lib/counselorLines`, i.e. push-notification-seeded counselor
lines) and folds new messages into the view, de-duplicating assistant lines by
`counselorName + content` (not timestamp, since the same line can arrive via multiple paths
with different clocks). `[NATIVE-ONLY — EXCLUDE the notification source; keep the merge idea
if the web ever gets pushed lines.]`

**Default cabinet seeding.** Once per install (`cabinet_defaults_seeded`): if
`user_settings.cabinet_members` is empty, `saveCabinetSelection(['marcus','roosevelt'])`
(which appends `futureSelf` to the stored array).

**3. Data.**
- `services/threadService`: `loadThread('cabinet')`, `appendMessages`, `clearThread`,
  `getAllThreadSummaries()`, `normalizeCounselorId()`. Threads are stored in Supabase
  `cabinet_conversations` (`messages` JSON, `counselor_slugs`; `null` slugs = the group
  thread), capped at **200 stored messages**, with a **15-message context window**
  (`CONTEXT_WINDOW_SIZE`) plus a summary note when older history exists.
  `getAllThreadSummaries()` walks the fixed list
  `['marcus','epictetus','goggins','roosevelt','futureSelf','cabinet']`.
  `normalizeCounselorId` maps `marcus-aurelius→marcus`, `david-goggins→goggins`,
  `theodore-roosevelt→roosevelt`, `future-self→futureSelf`.
- `lib/db`: `getUserSettings()`, `getUserCabinet()` (tier-filtered), `saveCabinetSelection()`,
  `getOrCreateCabinetConversationId()`, and inside `sendMessageToCabinet`,
  `checkAndIncrementMessageCount()` (`profiles.daily_message_count`).
- Direct Supabase: `session_participants` (`session_id, user_id, display_name, status`),
  `session_messages` (`session_id, user_id, role, content, counselor_id, counselor_name,
  created_at`).

**4. Server calls.**
- `POST {API_BASE_URL}/api/chat/counselor` (`sendMessageToCabinet`), headers
  `Content-Type`, `x-subscription-tier: {tier}`, `Authorization: Bearer`. Body:
  ```jsonc
  {
    "model": "claude-opus-4-5",
    "counselorModels": {},            // user_settings.counselor_models
    "cabinetMembers": [],             // user_settings.cabinet_members
    "max_tokens": 400|600|1000,       // MAX_TOKENS_BY_TIER
    "system": "<system prompt + full app context [+ what's-new note] [+ summary note]>",
    "messages": [{"role":"user|assistant","content":"..."}],  // assistant lines prefixed "Name: "
    "tzOffsetMinutes": -300,
    "activeCounselorId": "cabinet",
    "userId": "<uuid>",
    "sessionType": "solo" | "shared",
    "sessionId": "<uuid|undefined>",
    "participantIds": ["<uuid>", ...] // shared only
  }
  ```
  Response: either `{mode:'parallel', responses:[{counselorId, counselorName, response}]}`
  (one bubble per counselor) or a single `{content:[{text}]}`. A `403` with
  `{error:'daily_limit_reached'}` throws `DailyLimitError`.
- `POST {API_BASE_URL}/api/sessions/invite` (Bearer) with
  `{sessionId, partnerEmail}` or `{sessionId, partnerPhone}` → `{success, smsBody?, joinUrl?, error?}`.

**System prompt context** (`gatherAppContext()` in `services/claudeService.ts`) — the web port
must reproduce this or the counselors lose their sight. It assembles, in order: today's date
header; a "has not completed Know Thyself" note; morning/evening routine task states
(suppressed if `attend_share_routines_with_cabinet` is off); evening reflection; stoic journal;
last 3 reflections; encoded beliefs; last 5 commonplace quotes; currently-reading books;
today's reading time (only if > 0); last 5 reading sessions; books finished; overall stats
(streak, journal count, quote count); encoded beliefs for cabinet reference; **focus sessions**
(`buildFocusContext`); **meta-signals** (`buildMetaSignalsContext` — journaling gaps and stale
goals); then, premium-gated (`tier !== 'free'`), `buildAttendContext`, `buildHealthContext`,
`buildCalendarContext` — each of which *always* emits a block, saying honestly what the
counselors cannot see, so a direct "how's my screen time?" never gets an invented number.
The last three are `[NATIVE-ONLY — EXCLUDE]` on web; keep the "honest blindness" contract.

**5. Platform-only.** `useSwipeNavigation('/cabinet')`; `DeviceEventEmitter`;
`Linking.openURL('sms:…')` for phone invites (web: `sms:` link or copy-to-clipboard);
`useSafeAreaInsets`; `KeyboardAvoidingView`.

**6. Visual.** Header with a gold-22 bottom hairline; tab bar `#16213e` with a 2px gold
active underline; counselor label uppercase gold 12px bold with 0.5 letter-spacing;
counselor body `#e0e0e0` 15/24; user body white 15/22.

---

## 10. Components

### 10.1 `components/SideMenu.tsx`
Right-slide drawer (width `min(300, 80vw)`), opened from Home's hamburger. Animated:
slide + fade, 220 ms in / 180 ms out. Backdrop `rgba(0,0,0,0.55)`, tap to close. Panel
`#16213e` with a gold-33 left border.
Header "EXPLORE" (gold, uppercase, 2px letter-spacing) + close `×`.
Two rows, each with a 40px round gold-tinted icon, title + a small outlined **PREMIUM** badge,
a subtitle, and a chevron:
- **The Academy** — "Courses and structured study in the classical tradition." → `/academy`
- **The Library** — "Read the original texts your counselors draw from." → `/library`
**Both are tier-gated**: free tier routes to `/paywall?src=menu_academy` or `menu_library`.
Footer, italic grey: "Arete · Be who you want to be."

### 10.2 `components/DispatchNudge.tsx` `[MOSTLY NATIVE]`
Primed permission ask for the Daily Dispatch push, rendered on Home above the quote.
Appears only when `getPushPermissionStatus() === 'undetermined'` and it hasn't been dismissed
within the last **7 days** (`dispatch_nudge_dismissed_at`). Card (`#16213e`, gold-44 border):
sun icon, "Your Daily Dispatch", "One line from your counselors each morning — a thought to
carry into the day. Allow notifications to receive it.", buttons **Not now** / gold **Enable**
("Enabling…" while busy). Enable calls `promptAndRegisterForDispatch(session)`
(`lib/pushNotifications`), which fires the single iOS system prompt.
*Web port:* the same card can drive the browser Notification permission prompt; the
registration path (Expo push token) does not translate.

### 10.3 `components/ShareQuoteModal.tsx`
Turns a counselor line into a branded shareable image. Props `{visible, onClose, quote,
counselorName}`.
- Text is trimmed to ≤ 320 chars, cut at the last sentence boundary past char 120 when
  possible, otherwise ellipsised.
- Card (`#101a30`, gold-55 border, radius 18): serif `❝` glyph (40px gold), serif quote
  (`#e8e2cf`, 19/30), a 48×2 gold rule, uppercase gold counselor name, grey "via the Cabinet",
  and a footer row with `A R E T E` (gold, 800 weight, 3px letter-spacing) and italic
  "Be who you want to be."
- **Cancel** / gold **Share**: captures the card with `react-native-view-shot` (`captureRef`,
  PNG) and hands it to `expo-sharing`.
*Web port:* render the same card and use `html-to-image`/canvas + the Web Share API or a
download; note artifact/CSP constraints if this ever runs inside a sandboxed page.

### 10.4 `components/WhatsNewModal.tsx`
Self-deciding one-time announcement, mounted on Home. Reads `Constants.expoConfig.version`;
shows nothing unless that exact version is a key in the hard-coded `WHATS_NEW` map, and
nothing if `whats_new_seen_version === version`.
Current entry — **1.4.0 "The Cabinet Sees More"**, intro "Your counselors can now speak to
the day you actually lived — each one only if you choose to show them.", with three rows:
👁 "Screen time, held to your limit"; ❤️ "Sleep and movement" (Apple Health, read-only);
🗓️ "The shape of your day" (calendar).
Primary button is tier-dependent: free → "See what Premium unlocks"
(`/paywall?src=whats_new_cabinet_sight`), paid → "Set it up in Settings" (`/settings`).
Secondary: "Later". Both paths write the seen-version key.
Style: `#1a1a2e` card, gold-44 border, gold uppercase eyebrow "NEW IN ARETE", cream
(`#E0D5B5`) 24px title, `#8A9BB0` body.
*Web port:* keep the mechanism; the 1.4.0 content is about native-only capabilities, so the
web's first entry should be different.

### 10.5 `components/PendingInviteModal.tsx`
App-wide (mounted in the tabs layout). Polls
`GET {API_BASE_URL}/api/sessions/pending-invite` (Bearer) on mount **and on every
`AppState → active`**; response `{invite: {token, inviterName}}`. Suppressed if
`dismissed_invite_{token}` is set. Card: people icon, "{inviterName} has invited you to a
shared Cabinet session", subtitle "In a shared session, you each bring your philosophical
profile and your counselors respond to both of you together.", buttons **Not now**
(permanently dismisses that token on this device) / gold **Join Session** →
`/join-session?token={token}` (which accepts and routes back to the Cabinet with
`sharedSessionId`).

### 10.6 `components/CabinetPreview.tsx`
Sticky bottom bar used by the cabinet-selection flow (`/my-cabinet/select`), not by a tab.
`#16213e` with a gold-22 top border. Label "YOUR CABINET" (gold uppercase), a horizontal pill
row where **Future Self is always the first pill** (gold border + gold-10 fill + gold text)
followed by one pill per selected counselor, and a full-width gold **Save Cabinet** button
("Saving…" while in flight, dimmed to 50% when `!canSave`).
Props: `{selectedCounselors, onSave, isSaving, canSave}`.

### 10.7 `components/CounselorCard.tsx`
Selection card used by the cabinet picker. Props `{counselor, isSelected, isDisabled,
isFutureSelf, isLocked, isStarter, onToggle, footer}`.
- Badge row: **category** badge with per-category colours — `stoics` gold, `warriors` red,
  `athletes` blue, `builders` green, `writers` purple, `spiritual` indigo (each `bg` at 0.2
  alpha with a light text colour); plus an optional **challenge level** badge —
  `direct` red `#f87171`, `firm` yellow `#fde047`, `gentle` green `#86efac`.
- Name (16px bold `#e0e0e0`), `one_line` clamped to 2 lines.
- State decorations: `isFutureSelf` → gold 2px border + "Always Present" and the card is
  **not tappable**; `isSelected` → gold 2px border + a gold `✓` bottom-right;
  `isDisabled && !isSelected` → 40% opacity; `isLocked` → 55% opacity, `#333` border, and a
  bottom-right lock badge reading "Arete"; `isStarter` → a top-right outlined "Starter" badge.
- `footer` slot renders extra content inside the card (used for the per-counselor model
  picker in My Cabinet).

---

## 11. Hooks

### 11.1 `hooks/useTierLimits.ts`
`useTierLimits(): {tier, maxMessages}`; loads `getSubscriptionTier()` once on mount
(initial optimistic state `free` / `10`). `MAX_MESSAGES_BY_TIER = {free: 10, premium: null,
pro: null}` — **null means "no local cap and no counter shown"**, not unlimited; paid tiers are
capped server-side (premium 50). Used by Journal (insight gate) and Cabinet (send gate).

### 11.2 `hooks/useSwipeNavigation.ts` `[NATIVE-ONLY — EXCLUDE]`
`PanResponder` horizontal swipe between tabs. Route order:
`['/', '/morning', '/evening', '/cabinet', '/journal', '/timer', '/progress']` — note this
list **omits `/scrolls`**, so swiping skips it entirely even though it is tab 7 in the tab bar.
Threshold 50px, engaged when `|dx| > 10 && |dx| > |dy|`; navigates with `router.replace`.
Screens spread the returned `panHandlers` onto their root view. Every tab uses it except
Scrolls.

---

## 12. Cross-cutting notes for the web port

1. **The streak rule is generous and non-obvious**: it breaks only after two consecutive
   fully-missed days, and it increments only when both routines are done, once per day.
   Reimplement `checkAndResetStreakIfMissed` / `incrementStreak` exactly against
   `profiles.streak` and `profiles.streak_last_incremented_date`.
2. **Two message-limit systems coexist**: a local per-device `daily_messages_{date}` counter
   used for the pre-flight gate and the "messages remaining" label, and the authoritative
   server-side `profiles.daily_message_count`. Ported faithfully, the web needs both or the
   counter will drift from the enforcement.
3. **Cabinet history lives in Supabase** (`cabinet_conversations`), not local storage, so the
   web already has access to the same threads. Respect the 200-message cap and the
   15-message context window.
4. **The system prompt is built client-side.** `buildSystemPrompt()` inlines full
   counselor-profile prose and `gatherAppContext()` inlines the user's app data; the server
   receives it as `system`. A web client must reproduce the same assembly or the counselors
   will behave differently across platforms.
5. **Free-tier cabinet filtering happens in `getUserCabinet()`**, not on the server — a free
   web user must see the same three counselors.
6. Tables touched by these screens: `profiles`, `user_settings`, `check_ins`,
   `journal_entries`, `goals`, `routine_templates`, `reading_data`, `counselors`,
   `cabinet_conversations`, `session_participants`, `session_messages`, `scrolls`,
   `scroll_reads`, `user_longitudinal_models`, `longitudinal_model_history`,
   `conversation_memory`, `beliefs`.
7. Railway endpoints used by these screens: `/api/chat`, `/api/chat/counselor`,
   `/api/dispatch/today`, `/api/user/insight`, `/api/scrolls/generate`,
   `/api/sessions/invite`, `/api/sessions/pending-invite` (and `/api/memory/summarize`
   from the counselor-chat path).
8. **Excluded from the web port**: all `lib/attend` Screen Time monitoring, focus blocking
   and watchlists; `lib/health` (HealthKit); `lib/calendar` (device calendar); Expo local and
   push notifications; haptics; `useSwipeNavigation`; `react-native-view-shot` capture (needs
   a web equivalent); `Alert.prompt`.
