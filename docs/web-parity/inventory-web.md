# Arete Web App — Full Inventory (`/home/user/arete-app/web`)

Snapshot date: 2026-09-02. Every file under `web/src` was read in full. Line counts are exact.

---

## 1. Toolchain and conventions

### 1.1 Toolchain (`web/package.json`)

| Item | Value |
|---|---|
| name / version | `arete-web` 1.0.0, private |
| Next.js | `^15.0.0` (App Router) |
| React / React DOM | `^19.0.0` |
| Supabase | `@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.99.1` |
| Stripe | `stripe ^22.3.1` (server SDK only — no `@stripe/stripe-js`) |
| Tailwind | `tailwindcss ^3.4.0` + `autoprefixer`, `postcss` (classic config, **not** v4) |
| TypeScript | `5.9.3`, `strict: true`, path alias `@/* → ./src/*` |
| ESLint | `eslint ^9`, flat config extending `next/core-web-vitals` + `next/typescript` |
| Scripts | `dev`, `build`, `start`, `lint` (`next lint`). **No test script, no test framework, no CI config in web/.** |
| UI libraries | **None.** No component library, no icon library, no markdown renderer, no date library, no state manager, no form library. Everything is hand-rolled JSX + inline `style` objects. |

Other config:
- `web/next.config.ts` — empty (`const nextConfig: NextConfig = {}`).
- `web/vercel.json` — Vercel/Next framework, `npm run build`, plus an `ignoreCommand` that skips the build when `web/` has no diff vs the previous SHA (monorepo guard).
- `web/postcss.config.js` — tailwind + autoprefixer.
- `web/public/manifest.json` — PWA manifest (standalone, portrait, bg `#0f1724`, theme `#c9a84c`, **`icons: []`** — empty, so no installable icon).
- `web/README.md` is stale: says "Open http://localhost:3001", claims data is local-only and that `NEXT_PUBLIC_API_BASE_URL` is the only env var. Neither is true any more.

### 1.2 Environment variables (`web/.env.example`, names only)

- `NEXT_PUBLIC_API_BASE_URL` — the Railway Express backend (chat, scrolls, sessions, onboarding).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; the only way `subscriptions` / entitlement columns get written.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_PRO`
- Referenced in code but **not** in `.env.example`: `NEXT_PUBLIC_DEV_MODE` (used by `lib/devMode.ts` and the `/profile` dev panel).
- `.env.example` ends with two "deploy nudge" comment lines dated 2026-08-28 marked safe to delete — leftover cache-busting cruft.

### 1.3 Routing & layout

- App Router, all pages are `'use client'` except `/privacy` (server component).
- `src/app/layout.tsx` (61 lines): loads three Google fonts via `next/font` — **Cormorant Garamond** (`--font-serif`, weights 400–700), **Inter** (`--font-sans`), **JetBrains Mono** (`--font-mono`). Renders `<ConstellationBg />`, `<Sidebar />`, `<PendingInviteToast />` and a `<main className="md:ml-[220px] pb-24 md:pb-0 h-full overflow-y-auto relative z-10">`. `body` is `h-full overflow-hidden`, so `main` is the scroll container — chat pages rely on this bounded height for `flex-1`.
- Metadata: title `Arete — Personal Excellence`, manifest `/manifest.json`, viewport device-width.

### 1.4 Auth (`src/middleware.ts`, 65 lines)

- Public routes (exact match): `/login`, `/privacy`, `/reset-password`.
- Bypassed (self-authenticating): `/api/stripe-webhook` (Stripe signature) and `/api/delete-account` (Bearer JWT; the mobile app calls it and must get JSON, not a 307 to HTML).
- If `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are unset → allow everything (dev mode escape hatch).
- Otherwise builds a `createServerClient` with cookie get/setAll, calls `supabase.auth.getUser()`; no user → redirect to `/login?redirectTo=<pathname+search>` (query string preserved so `/join?token=…` survives).
- Matcher: everything except `_next/static`, `_next/image`, `favicon.ico`, and image extensions. **Note:** `/api/create-checkout`, `/api/create-portal` and `/api/onboard` all pass through the cookie check.
- Client-side, essentially every page *also* re-checks auth in a `useEffect` (`supabase.auth.getUser()` → `router.replace('/login')`) and most also check `settings?.user_name` → `router.replace('/setup')`. This is a duplicated 5-line preamble in ~13 pages.

Supabase clients:
- `src/lib/supabase.ts` (6 lines) — browser client via `createBrowserClient`, falls back to `https://placeholder.supabase.co` / `placeholder-anon-key` when env is missing.
- `src/lib/supabaseServer.ts` (52 lines) — `requireEnv(name)` (throws), `createSupabaseServerClient()` (cookie-backed, async, uses `next/headers`), `createSupabaseAdminClient()` (service-role, `persistSession:false`).

### 1.5 Styling system

`web/tailwind.config.ts`:
- Content: `./src/**/*.{js,ts,jsx,tsx}`.
- Colors — legacy tokens: `arete-bg #0f1724`, `arete-surface #1a1a2e`, `arete-gold #c9a84c`, `arete-text #e6eef8`, `arete-muted #9aa0a6`, `arete-border #2a3a5c`. v2 tokens: `v2-bg`, `v2-gold`, `v2-text`, `v2-muted` (same hexes) — **the v2-* tokens are never used anywhere in `src/`.**
- Fonts map to the CSS vars; `borderColor.line = rgba(255,255,255,0.08)`.
- No plugins (so `line-clamp-*` used in `page.tsx`, `journal`, `CounselorCard` relies on Tailwind 3.3+ built-in line-clamp — fine; but `scrollbar-hide` used in `CounselorLibrary.tsx` is **not defined anywhere** and is a no-op class).
- **`bg-arete-card` is used in `/login` and `/setup` but is not defined in the Tailwind config** — those panels render transparent.

`src/app/globals.css` (72 lines):
- `:root` design tokens: `--bg #0f1724`, `--surface rgba(255,255,255,0.04)`, `--surface-solid #161f2e`, `--gold #c9a84c`, `--gold-dim`, `--text #e6eef8`, `--muted #9aa0a6`, `--border rgba(255,255,255,0.08)`, `--border-solid #2a3a5c`; font stacks; radii `--radius-sm/md/lg/xl/pill`.
- `body` background/color/font + font smoothing.
- Utility classes `.font-serif/.font-sans/.font-mono`, `.glass`, `.text-gold-gradient`.
- `@keyframes cabinetBubbleIn` (used only by `CabinetReplay`).
- Gold thin webkit scrollbars.

**Convention in practice:** the newer "v2" pages (home, morning, evening, journal, focus, goals, scrolls, profile, cabinet, cabinet/minds, onboarding) use inline `style={{ ... }}` with hard-coded hexes (`#c9a84c`, `#e6eef8`, `#9aa0a6`, `rgba(255,255,255,0.03)`) and `fontFamily: 'var(--font-serif, Georgia, serif)'`. The older pages (progress, beliefs, settings, privacy, upgrade, cabinet/select, login, setup, join, reset-password) use Tailwind `arete-*` classes. Neither the CSS variables nor the Tailwind tokens are used consistently; the hex literals are duplicated hundreds of times.

Recurring visual motifs: a "Chapter N · <Latin word>" eyebrow in mono uppercase + a two-line serif headline with a gold `<em>`; gold gradient CTA `linear-gradient(135deg, #e3c77a, #8a6f27)`; gold-on-dark pill tab switchers.

### 1.6 Shared components (`src/components/`)

| Component | Lines | Props | Used by |
|---|---|---|---|
| `GlassCard` | 27 | `children`, `className?`, `accent?` (4px gold left border) | home, morning, evening, focus, goals, profile, cabinet |
| `PageHeader` | 13 | `title`, `subtitle?` | progress, beliefs, settings, privacy, cabinet/select |
| `Sidebar` | 293 | none | layout (global) |
| `Tag` | 39 | `children`, `variant?: 'gold'\|'muted'\|'outline'`, `className?` | **nothing — dead code** |
| `StreakArc` | 92 | `day`, `total?=100`, `label?='Stade'` — SVG ring + Roman numeral + 10 tick marks | home only |
| `TimerOrbit` | 114 | `elapsed`, `total`, `isRunning` — 280px SVG orbit, 60 ticks, glow filter, mm:ss + Ready/In Progress/Paused | focus (Pomodoro only; the reading timer uses a plain number) |
| `ConstellationBg` | 26 | none — fixed dot-grid + vignette, `z-0`, `pointer-events-none` | layout |
| `ChapterRule` | 31 | `label?`, `className?` — hairline, optionally with a centered gold uppercase label | morning, evening, journal, focus, goals, scrolls, profile |
| `CabinetReplay` | 257 | none — auto-playing 5-exchange scripted chat reel with constellation SVG bg; every bubble is a button that opens the App Store URL `https://apps.apple.com/app/id6762371595` | landing page (guest state) only |
| `CounselorLibrary` | 85 | `selectedSlugs`, `onToggle(slug)`, `maxSelections?=5`; loads `getCounselors()`, category filter chips (`all/stoics/warriors/athletes/builders/writers/spiritual`), grid of `CounselorCard` | `/cabinet/select` only |
| `CounselorCard` | 77 | `counselor: Counselor`, `isSelected`, `isDisabled`, `onToggle` — category + challenge-level colour badges, name, dates, 2-line description, ✓ | `CounselorLibrary` |
| `CabinetPreview` | 56 | none — chips of `getUserCabinet()` + always-appended "Future Self" + `Customize →` link to `/cabinet/select` | **nothing — dead code** |
| `PendingInviteToast` | 81 | none — one-shot `GET {API_BASE_URL}/api/sessions/pending-invite` with Bearer JWT; renders a bottom-right toast "👥 {name} has invited you…" with **Join Session** (`/join?token=…`) and **Not now** (writes `dismissed_invite_${token}` to localStorage); hidden on `/join*` | layout (global) |

Note: `PendingInviteToast` defaults `API_BASE_URL` to `https://arete-app-production.up.railway.app`, whereas `claudeService.ts` and `scrolls/page.tsx` default to `http://localhost:3000`, and `join/page.tsx` again defaults to the Railway URL. Three different fallbacks for the same variable.

### 1.7 Storage layer

`src/lib/storage.ts` (92 lines) is a localStorage wrapper mirroring the AsyncStorage API: `getItem`, `setItem`, `removeItem`, `getAllKeys` (all SSR-guarded and try/catch-swallowed), plus a `STORAGE_KEYS` constant listing ~30 keys (userName, kt_*, cabinetMembers, morningTasks/Done, eveningTasks/Done, reflectionAnswer, stoicAnswer, streak, calendarData, journalEntries, commonplaceQuotes, unifiedJournalEntries, booksRead, currentBooks, readingSessions, readingStreak, todayReadingSeconds, beliefEntries, thread_* …).

**This module is imported by nothing.** It is entirely dead. The keys it declares (`morningTasks`, `stoicAnswer`, …) are also *not* the keys the app actually writes.

Real localStorage usage, all with `arete_`-prefixed ad-hoc keys written inline:

| Key | Written by | Read by |
|---|---|---|
| `arete_morning_intention` | `/morning` (`INTENTION_KEY`) | `/morning` only — **never sent to the Cabinet despite the placeholder "the Cabinet will hold you to"** |
| `arete_morning_done_ids` | `/morning` `persistDone()` | nothing |
| `arete_evening_done_ids` | `/evening` `persistDone()` | nothing |
| `arete_morning_tasks` / `arete_evening_tasks` | **nobody** | `claudeService.gatherAppContext()` and `sendCheckInToCabinet()` |
| `arete_reflection_answer` / `arete_stoic_answer` | **nobody** | `claudeService.gatherAppContext()` and `sendCheckInToCabinet()` |
| `dismissed_invite_<token>` | `PendingInviteToast` | `PendingInviteToast` |
| `arete_onboarding_banner_dismissed` | landing page (sessionStorage) | landing page |

So the Cabinet context builder reads four localStorage keys that no code path ever writes on the web — the morning/evening task summaries and both reflection answers are always "(no tasks)" / "(not answered)" in the prompt, even though the same data does exist in `check_ins`. This is a live correctness bug, not just dead code.

Everything else is Supabase (see §3 table map).

---

## 2. Navigation

### 2.1 Sidebar (`src/components/Sidebar.tsx`)

Desktop (`md:` and up), fixed 220px, gradient `#0d1520 → #111827 → #0d1520`, wordmark "Arete" (serif gold 28px) + tagline "be who you want to be" (mono, uppercase). Active item: gold text, `rgba(201,168,76,0.08)` background, 3px gold left-edge bar. Active detection is `pathname.startsWith(href)` (except `/`).

`navItems`, in order:

| # | Label | Route | Emoji |
|---|---|---|---|
| 1 | Home | `/` | 🏠 |
| 2 | Morning | `/morning` | ☀️ |
| 3 | Evening | `/evening` | 🌙 |
| 4 | Cabinet | `/cabinet` | 🎙️ |
| 5 | Journal | `/journal` | 📖 |
| 6 | Goals | `/goals` | 🎯 |
| 7 | Scrolls | `/scrolls` | 📜 |
| 8 | Focus | `/focus` | ⏱️ |
| 9 | Progress | `/progress` | 🏆 |
| 10 | Know Thyself | `/profile` | 👤 |
| 11 | Settings | `/settings` | ⚙️ |

Footer: `Privacy Policy` link + `Sign Out` (`supabase.auth.signOut()` → `/login`).

Mobile (`< md`): floating pill bottom nav with 5 tabs — Home, Morning, Cabinet, Journal, Focus — plus a **More** (☰) button opening a slide-up drawer with a 3-col grid of Evening, Goals, Scrolls, Progress, Know Thyself, Settings, and a Sign Out row. The "More" tab is highlighted gold when the current route is one of the drawer items.

**Not linked from the sidebar at all:** `/beliefs`, `/upgrade` (reachable from `/settings` and the cabinet paywall), `/cabinet/select`, `/cabinet/minds`, `/cabinet/conversation` (reachable from nowhere in the UI), `/onboarding` (only from the home banner), `/join`, `/setup`, `/login`, `/reset-password`, `/privacy`.

### 2.2 Landing page (`src/app/page.tsx`, guest state)

When `supabase.auth.getUser()` returns no user, the same route renders a marketing page on `#0a0a0f`:
1. Nav bar — "ARETE" wordmark; external link **The Library** → `https://academy.pursuearete.com/library`; **Sign In** pill → `/login`.
2. `<CabinetReplay />` hero — auto-cycling scripted counselor exchanges (Epictetus, Marcus ×3, Roosevelt).
3. CTA — "Download on the App Store" with an inline Apple SVG → `https://apps.apple.com/app/id6762371595`.
4. Footer — The Library + Privacy Policy.

Note the sidebar and the invite toast still render behind this (they are in the root layout), so the guest page shows the app chrome.

### 2.3 Auth / setup flows

- **`/login`** (338 lines) — three modes in one component: `signin`, `signup`, `forgot`. If `redirectTo` starts with `/join`, defaults to **signup** and shows an invite banner. `safeRedirectTo()` only allows same-origin paths. Sign-in → `supabase.auth.signInWithPassword` → `window.location.href = safeRedirectTo()`. Sign-up → `signUp`; if a session comes back (auto-confirm) it redirects, else shows "check your email". Forgot → `resetPasswordForEmail(email, { redirectTo: 'https://app.pursuearete.com/reset-password' })` — **hard-coded production URL, so password reset cannot be tested locally**. Footer link to the Library. Writes nothing but the Supabase session.
- **`/reset-password`** (173 lines) — handles the PKCE `?code=` flow: subscribes to `onAuthStateChange` (`PASSWORD_RECOVERY` *or* any session) and also polls `getSession()`; an 8s timeout flips to "link invalid". On submit: min 6 chars, match check, `supabase.auth.updateUser({ password })`, then `window.location.href = '/'` after 2s.
- **`/setup`** (102 lines) — single "Username" field → `upsertUserSettings({ user_name })` → `router.replace('/')`. This is the gate every other page enforces (`!settings?.user_name → /setup`).
- **`/onboarding`** (444 lines) — the conversational "Meet Your Future Self" Know Thyself flow. POSTs to the local `/api/onboard` proxy (which forwards to `{API_BASE_URL}/api/onboard-web`). Sends `{ messages, futureYears }`; on the very first call it injects a synthetic `user: "Hello."` so Claude has a message. Renders FS-avatar chat bubbles, a progress bar computed as `assistantTurns / 12` capped at 95%, and a "Reaching back through time…" loader. When the server returns `complete: true` it shows a **Profile Summary** card (Identity, Goals, Primary Obstacle, Core Strengths, Work & Meaning, Future Vision) and a **Save to Know Thyself** button → `saveOnboardingProfile(profile)` → `router.replace('/')` after 2s. It also regex-sniffs `\b(\d+)\s+year` out of assistant messages to guess `futureYears`.
  - `saveOnboardingProfile` (db.ts:961) maps: `identity→kt_identity`, `goals→kt_goals`, `obstacle→kt_weaknesses`, `virtues→kt_strengths`, `challenge_style→feedback_preference`, `work_meaning→kt_background`, `future_vision→future_self_description`, `future_years→future_self_years` on `user_settings`, then sets `profiles.know_thyself_complete = true`. Note `feedback_preference` is **not** in the `UserSettings` type. `kt_patterns` and `kt_major_events` are never populated by onboarding.
- **`/join`** (133 lines) — shared-session invite landing. Reads `?token=`, gets the session, looks up `user_settings.user_name` for a display name, POSTs `{token, partnerDisplayName}` to `{API_BASE_URL}/api/sessions/accept` with a Bearer JWT. States: joining / joined (→ "Open your Cabinet" + App Store link) / error ("Invites expire after 48 hours"). Guarded by an `attemptedRef` so React 18 double-effects don't double-accept.

---

## 3. Page-by-page inventory

Data functions live in `src/lib/db.ts` (999 lines) and `src/lib/claudeService.ts` (681 lines) unless noted.

### `/` — `src/app/page.tsx` (529 lines) — Home / Landing
**Purpose:** dual-mode — marketing landing for guests, daily dashboard for authenticated users.

Load sequence (`useEffect`): `supabase.auth.getUser()` → if none, `authState = 'guest'`. Else `Promise.all([getUserSettings, hasCheckInToday('morning'), hasCheckInToday('evening'), checkAndResetStreakIfMissed, getDailyQuestionCache, getKnowThyselfComplete])`; `!user_name → /setup`.

Authenticated layout, in order:
1. **Header** — "Wednesday · September 2" (serif italic gold), "Good {morning|afternoon|evening}, *{firstName}*." Right side: two quick-link pills to `/morning` and `/evening`, gold-filled with a ✓ when that routine is done.
2. Gold gradient hairline.
3. **Future Self onboarding banner** (conditional on `!know_thyself_complete` and no `sessionStorage['arete_onboarding_banner_dismissed']`) — "Personalise Your App / Meet Your Future Self", **Begin** → `/onboarding`, ✕ dismiss (sessionStorage).
4. **Streak row** — `<StreakArc day={streak} />` + "Day {roman} of C" + "{numberToWords(streak)} days of discipline in a row." + the fixed quote "The chain is heavier than it looks."
5. Gold hairline.
6. **Today's Question** card (`GlassCard accent`, wrapped in a `Link` to `/cabinet?q=<prompt>&counselor=<slug>`): counselor initials bust from a local `COUNSELOR_META` map, "{Counselor} asks", the prompt from `getDailyPrompt()` (day-of-year modulo a 14-entry list in `lib/quotes.ts`), and either a → button or a ✓ plus a 3-line preview of the cached response.
7. **Daily quote** — `DAILY_QUOTES[getDay() % 7]` in a gold-left-bordered card.
8. **Know Thyself nudge** (conditional on empty `kt_goals`) — "Complete Now →" → `/profile`.

Side effect: if there's no `getDailyQuestionCache()` row it fire-and-forgets `upsertTodayCheckin({ daily_question_counselor })` "so mobile can verify cache validity".

Tables: `user_settings`, `check_ins`, `profiles`. Tier gates: none.

Stale/odd: uses the deprecated `hasCheckInToday()` twice; `dailyQuestion.response` is only ever written by the mobile app (nothing on web writes `daily_question_response`), so the ✓/preview state is effectively mobile-only; the header hard-codes "of C" (100).

### `/morning` — `src/app/morning/page.tsx` (462 lines)
**Purpose:** morning routine — checklist, intention, Cabinet check-in. Header "Chapter I · Aurora / The morning *before you.*"

Load: `getRoutineTemplates('morning')` + `getTodayCheckin()`. Task source precedence: `checkin.morning_tasks` → routine templates (title + emoji concatenated) → `settings.morning_tasks` → `DEFAULT_TASKS` (Eat Breakfast, Meditate). `usingDefaults` tracks whether adds/removes should hit `routine_templates` or stay local-only.

Features in order: fixed Marcus quote; **progress strip** (`n of m` + % + one segmented bar per task); `<ChapterRule />`; **task list** (click row to toggle, ✕ to remove, gold glow dot when done); **Add a discipline** input (Enter to add, Escape to cancel); **Intention card** (`GlassCard accent`, textarea persisted to `localStorage['arete_morning_intention']` on every keystroke — never synced, never read by the Cabinet); **Send to Cabinet** gradient CTA → `sendCheckInToCabinet('morning')`; **Cabinet response** card.

Data fns: `getUserSettings`, `getRoutineTemplates`, `addRoutineTemplate`, `deleteRoutineTemplate`, `getTodayCheckin`, `upsertTodayCheckin`, `incrementStreak`, `sendCheckInToCabinet`.
Tables: `user_settings`, `routine_templates`, `check_ins`, `profiles` (streak), `cabinet_conversations` (the check-in appends to the cabinet thread).
Tier gates: none.

Nice detail worth preserving: a `visibilitychange` listener compares `toLocaleDateString('en-CA')` against `loadedDateRef` and bumps `refreshTrigger` so a tab left open overnight re-fetches for the new day. (`/evening` does **not** have this.)

Bug: toggling all tasks calls `upsertTodayCheckin({ morning_done: true })` and `incrementStreak()`, and the CTA does the same — so `morning_done` can flip true from the checklist alone, before any Cabinet check-in.

### `/evening` — `src/app/evening/page.tsx` (532 lines)
**Purpose:** evening routine. Header "Chapter II · Vesper / The day, *examined.*" with a Seneca quote and a dark gradient banner.

Same task machinery as morning (`routine_templates` type `evening`, defaults Plan Tomorrow / Reflect on the Day). Then:
- **Stoic Journal** card — one prompt per weekday from a local 7-entry `STOIC_JOURNAL_PROMPTS` array indexed by `getDay()` (documented as verbatim-matching iOS). Saving calls `upsertTodayCheckin({ stoic_answer })` **and**, once per day (guarded by `stoicJournalCreated` ref), `createJournalEntry({ type:'reflection', content, source:'evening_reflection', raw_input: prompt })`. Saved state shows a "✓ Saved to Journal" chip with an **Edit** button.
- **Seal the Day** CTA → `sendCheckInToCabinet('evening')` → `upsertTodayCheckin({ cabinet_evening_response, evening_done:true })` → `incrementStreak()`; completed state shows "Evening Complete" + the response.

Tables: `user_settings`, `routine_templates`, `check_ins`, `journal_entries`, `profiles`, `cabinet_conversations`. Tier gates: none.

Note: the evening page owns the daily reflection prompt, while `lib/quotes.ts` exports unused `REFLECTION_PROMPTS` / `STOIC_PROMPTS` / `JOURNAL_PROMPTS` arrays and a `getDailyItem` helper that nothing calls.

### `/cabinet` — `src/app/cabinet/page.tsx` (**1434 lines — the largest file in the app**)
**Purpose:** the Cabinet chat surface. Three tabs in one component: `cabinet` (solo), `shared` (Arete for Couples — only rendered when a shared session exists), `counselors` (1:1).

**Structure of the file:** one default-exported `CabinetPage` component holding **~26 `useState` hooks**, 3 refs, and **7 `useEffect`s**, followed by ~970 lines of inline JSX for the three tabs plus an invite modal. There are no sub-components — the assistant-bubble renderer (avatar + counselor label + `parseBlocks` quote/para rendering) is copy-pasted **three times** (cabinet ≈ lines 704–775, shared ≈ 932–1018, counselor ≈ 1198–1263), and the composer (textarea + gradient send button + Enter-to-send) is copy-pasted three times as well. `parseBlocks()` is duplicated verbatim in `/cabinet/conversation/page.tsx`.

Header: "The Council Convenes / Speak to the *Cabinet*"; overlapping counselor initial circles (max 5 + "+N"); "{n} counselors assembled"; buttons **+ Invite**, **Assign Minds** (`/cabinet/minds`), **Edit Cabinet** (`/cabinet/select`); a shared-session badge with **End**; then the tab pill switcher. A Know Thyself nudge card appears when `kt_goals` is empty.

Effects/state:
1. Reads `?q=` from `window.location.search` and pre-fills the composer (this is the home page's "Today's Question" hand-off — note `&counselor=` is read but ignored).
2. Auth + settings + `loadThread('cabinet')` + `getUserCabinet()` (falls back to the hard-coded `COUNSELOR_LIST`).
3. Resolves `currentUserId` and `getOrCreateCabinetConversationId()`, then restores shared mode from `session_participants` (inviter side: an active row on my conversation; partner side: my active row on someone else's).
4. Loads shared history from `session_messages` ordered by `created_at`.
5. Supabase **Realtime** channel `cabinet-session-<id>` on `INSERT` into `session_messages` filtered by session, skipping rows authored by me.
6–8. Three auto-scroll effects.

Actions: `handleSendCabinet` (optimistic append → `sendMessageToCabinet(messages)` → map replies to `ThreadMessage[]` with `counselorId`/`counselorName` → `saveThread`); `handleClearCabinet` (`confirm()` → `clearThread`); message **search** filter (client-side `includes`); `handleSendShared` (filters out `system` rows before sending, passes `{sessionType:'shared', sessionId, partnerIds}`); `handleSendInvite` (validates email vs phone, POSTs `{API_BASE_URL}/api/sessions/invite` with Bearer JWT; phone invites return a prewritten `smsBody` shown for manual copy since the web can't open Messages); `handleCopyInvite` (clipboard); `handleEndSharedSession` (inserts a "{name} left the session" system row, deletes **all** `session_participants` for the session, resets to solo); `handleSelectCounselor` / `handleSendCounselor` (per-counselor `loadThread(id)` / `saveThread(id)`).

**Tier gate:** `useSubscription()`; the **+ Invite** button routes free users to `/upgrade` (`if (!subLoading && !isPremium) router.push('/upgrade')`). Free users who were *invited* into a shared session see an upsell banner in the shared tab.

Tables: `user_settings`, `cabinet_conversations`, `session_participants`, `session_messages`, `counselors`, `profiles`. External: `POST {API_BASE_URL}/api/chat/counselor`, `POST {API_BASE_URL}/api/sessions/invite`.

**Serious wiring bug:** per-counselor threads don't persist. `threadService.loadThread(id)` → `db.getThread(id)` returns `[]` for anything but `'cabinet'`, and `upsertThread` is an explicit no-op for other ids ("stored locally, not in Supabase" — but nothing stores them locally either). So `saveThread(selectedCounselor, …)` silently discards, and reopening a counselor shows an empty thread. The same applies to `clearThread`.

### `/cabinet/select` — `src/app/cabinet/select/page.tsx` (137 lines)
Build Your Cabinet. Loads `getIsPremium()` + `getUserCabinet()`. Renders `<CounselorLibrary maxSelections={5} />`; `handleSave` requires ≥3 selections, calls `saveCabinetSelection(slugs)` (which always appends `futureSelf`), shows "Cabinet saved." then `router.push('/cabinet')` after 2000ms.
**Tier gate:** a full-screen `fixed inset-0 bg-black/70` modal overlay when `!isPremium` — "Custom Cabinet is a Premium Feature" → **Upgrade** (`/upgrade`) or **Not now** (`/cabinet`). The overlay is purely visual; the page underneath is still mounted and interactive-by-keyboard.
Tables: `counselors`, `user_settings`, `profiles`. Uses the older `PageHeader` + `arete-*` Tailwind styling.

### `/cabinet/minds` — `src/app/cabinet/minds/page.tsx` (177 lines)
"Assign *Minds*" — pick which LLM powers each counselor. Loads `getUserCabinet()` + `getIsPremium()` + `settings.counselor_models`. Renders a pinned **Future Self** card (model key `'future-self'`) plus one card per cabinet member, each with a pill row of `COUNSELOR_MODEL_OPTIONS` (`claude-opus-4-6`, `claude-sonnet-4-6`, `gpt-5.1`, `gemini-3-pro-preview`, `grok-4-fast-non-reasoning`; default `claude-opus-4-6`). Selecting one immediately fires `upsertUserSettings({ counselor_models })` (fire-and-forget, no toast). Slug→server-id mapping via `counselorModelKey()` in `lib/llmModels.ts`.
**Tier gate:** same full-screen paywall overlay pattern as `/cabinet/select`.
Tables: `user_settings`, `counselors`, `profiles`.

### `/cabinet/conversation` — `src/app/cabinet/conversation/page.tsx` (301 lines)
**Orphaned page — nothing links to it.** On mount it calls `createConversation(slugs)`, i.e. it **inserts a brand-new `cabinet_conversations` row on every page load**, which is destructive given that `getCabinetConversation()` (used by the main cabinet thread and by the shared-session id) reads the most recently updated row. Messages are appended one at a time via `appendMessage()` (read-modify-write of the whole `messages` array). Multiple counselor replies are flattened into one `**Name**\n text` block joined by `---`. Duplicates `parseBlocks`, the bubble renderer and the composer from `/cabinet`. This is the clearest stale page in the codebase and a strong candidate for deletion.

### `/journal` — `src/app/journal/page.tsx` (558 lines)
Header "Chapter IV · Examen / The examined *life.*" Types: `reflection` 📝, `quote` 📖, `idea` 🧠 — `belief` entries are explicitly filtered out by `dbToDisplay()`.

Features: search box (matches content/book/author); filter chips (All / Reflection / Quote / Idea, clicking the active one resets to All); entry feed sorted desc by `createdAt` with click-to-expand (120-char preview for non-quotes, `line-clamp-3` for quotes), hover `⋯` menu with **Edit** / **Delete** (`confirm()`); a floating **+** FAB opening a bottom-sheet type selector; a full-screen input form (Cancel / title / Save) with a quote variant (quote text, required book title, optional author) and a plain textarea variant.

Realtime: subscribes to `postgres_changes` `*` on `journal_entries` filtered by `user_id` and refetches everything on any change.

Data fns: `getJournalEntries`, `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, `getUserSettings`. Table: `journal_entries`. Tier gates: none.
Uses `alert()` for validation and `confirm()` for delete.

### `/goals` — `src/app/goals/page.tsx` (320 lines)
Header "Chapter V · Telos / Your path to *excellence.*" Active/Completed tab switcher with counts. Each goal card: category tag, "Onboarding" source tag, "✓ Done" tag; title (struck through when complete); description; a time-based progress track (`getMilestonePct` = elapsed fraction between `created_at` and `target_date`) with 25/50/75/100% milestone dots; Started/Target dates; **Mark Complete** and **Delete** (`confirm()`).
**There is no way to create a goal on the web** — the empty state literally says "Add goals via the mobile app."
Data fns: `getGoals(userId)`, `completeGoal`, `deleteGoal` (`upsertGoal` exists in db.ts but is unused). Table: `goals`. Tier gates: none.

### `/scrolls` — `src/app/scrolls/page.tsx` (330 lines)
Header "Chapter VI · Scrolls / Wisdom for *your goals.*" Loads `getScrolls(userId)` (which joins `scroll_reads` for `read_count`/`last_read_at`) and `getKnowThyselfComplete()`.
- Empty state: if Know Thyself is complete, shows the centered `RequestForm`; otherwise "Complete Know Thyself to receive your first scroll."
- Non-empty: a "New Scroll" request panel above an accordion list. Each row shows title, counselor label (marcus/epictetus/seneca), date, "Read N×", and the `goal_source` snippet; expanding reveals the body (`whitespace-pre-wrap`).
- `requestScroll()` POSTs `{goal, userName}` to `{API_BASE_URL}/api/scrolls/generate` with a Bearer JWT, then **inserts the returned row into `scrolls` from the client** (`supabase.from('scrolls').insert(...)`), refetches, and auto-expands the newest.
Tables: `scrolls`, `scroll_reads` (read-only), `user_settings`, `profiles`.
**Gap:** expanding a scroll does not increment `scroll_reads` — the read counter is display-only on web.
Tier gates: none (the Know Thyself completion check is the only gate).

### `/focus` — `src/app/focus/page.tsx` (599 lines)
Header "Chapter III · Concentration / The work *before you.*" Two independent tools in one page:
1. **Pomodoro** — work/break mode toggle (25 / 5 min), `<TimerOrbit />`, Start/Pause + Reset, "Sessions today: N". Auto-transitions work→break→work. `sessions` is component state only — **never persisted**, resets on navigation.
2. **Reading session** — big mm:ss readout; Start (asks for a starting page) → Pause/Resume → Stop (asks for an ending page) → `saveReadingSession()` writes a session `{bookTitle,startPage,endPage,pagesRead,duration,date,dateFormatted}` into `reading_data.reading_sessions` and updates `current_books[].currentPage`. Book list with **+ Add Book** (title/author), select-to-track, **Finished** (moves to `books_read` with `dateFinished`) and **✕** remove.
3. **Recent Sessions** card (last 5, reversed) when any exist.

Data fns: `getReadingData`, `upsertReadingData`, `getUserSettings`. Table: `reading_data`.
**Gap:** `today_reading_seconds` / `today_reading_date` are never written by the web, yet `claudeService.gatherAppContext()` reads them; and there is no reading-streak write. Timers are wall-clock `setInterval` and don't survive a reload or a backgrounded tab.
Tier gates: none.

### `/progress` — `src/app/progress/page.tsx` (295 lines) — **the stalest data page**
Two tabs, Overview and Reading, styled with the old `arete-*`/`PageHeader` conventions.
- Overview: big streak number, milestone label, "days to next milestone", a 7-day morning/evening block calendar, a 2×2 stats grid (Journal Entries, Quotes Saved, Beliefs Encoded, Beliefs In Progress), and milestone badges (7/30/60/100/365).
- Reading: Books Finished, Reading Streak, Pages Read, Total Reading Time; Currently Reading; Books Finished; last 10 sessions.

**It calls `checkAndResetStreakIfMissed()` nowhere — it hard-codes `setStreak(0)` (line 59) and `setReadingStreak(0)` (line 73).** So the streak card, the milestone label, the "days to milestone" line and every milestone badge are permanently zero/locked, while the home page shows the real streak. The belief counts come from `journal_entries` rows with `type='belief'`, which the web never creates (the `/beliefs` page writes to the separate `beliefs` table) — so those tiles only ever reflect mobile data.

Data fns: `getUserSettings`, `hasCheckInToday` ×2 (deprecated), `getReadingData`, `getCalendarData`, `getJournalEntries`. Tables: `user_settings`, `check_ins`, `reading_data`, `calendar_data`, `journal_entries`. `upsertCalendarData` exists in db.ts but nothing on the web ever writes `calendar_data`, so the weekly grid is empty except for today. Tier gates: none.

### `/profile` — `src/app/profile/page.tsx` (254 lines) — Know Thyself
Header "Know Thyself / Your Cabinet *reads this.*" Seven textarea sections driven by a `sections` array — Background & Life Story, Professional Identity & Pursuits, Goals, Strengths, Weaknesses, Patterns & Failure Modes, Major Life Events — plus a **Future Self** card with a 5/10/15/20-year pill selector and a description textarea. A sticky **Save Profile** button (turns green "✓ Profile Saved" for 3s) calls `upsertUserSettings` writing `kt_background, kt_identity, kt_goals, user_goals (= goals), kt_strengths, kt_weaknesses, kt_patterns, kt_major_events, future_self_years, future_self_description`.
Also contains a **DEV ONLY** panel (rendered only when `NEXT_PUBLIC_DEV_MODE === 'true'`) toggling `setDevPremiumOverride(false|null)` — a second, differently-worded copy of the same control that lives on `/settings`.
Table: `user_settings`. Tier gates: none.

### `/beliefs` — `src/app/beliefs/page.tsx` (196 lines)
**Not in the sidebar.** Old-style `PageHeader` + `arete-*` classes. Add-belief panel (textarea + a category pill row: philosophy / identity / principle / goal / habit) → `createBelief(content, category)`. List of belief cards with **Encode** (`encodeBelief` → `encoded = true`, card border turns gold) and **Delete** (`confirm()`).
Data fns: `getBeliefs(userId)`, `createBelief`, `encodeBelief`, `deleteBelief`. Table: `beliefs`.
**This is a plain CRUD list, not the mobile Belief Journal.** The full three-stage Socratic dialogue + virtue-check pipeline exists in `claudeService.sendBeliefJournalMessage()` (with `[REFINED_BELIEF]` / `[VIRTUE_CHECK]` tag parsing, `BeliefEntry` / `VirtueCheck` types) — **no page calls it**. Likewise `db.saveBelief()` and `db.getLegacyBeliefs()` (which read/write `raw_input`, `dialogue_history`, `encoded_belief`, `has_virtue_concern` on the same `beliefs` table) are unused. The web has two incompatible belief models coexisting in the lib layer.
Tier gates: none. It also skips the `user_name → /setup` check every other page does.

### `/settings` — `src/app/settings/page.tsx` (157 lines)
Sections: **Profile** (→ `/profile`), **Subscription** (→ `/upgrade`, "Manage Subscription"), **Account** (Sign Out; **Delete Account** behind two `window.confirm()` prompts → `POST /api/delete-account` with Bearer JWT → `signOut()` → `/login`), **Legal** (→ `/privacy`), **Dev Tools** (a toggle switch for `setDevPremiumOverride`). No notification settings, no theme, no data export, no email/password change. Old-style Tailwind.

### `/upgrade` — `src/app/upgrade/page.tsx` (212 lines)
See §5.

### `/privacy` — `src/app/privacy/page.tsx` (52 lines)
The only server component. Static copy, "Last updated March 5, 2026". **Materially inaccurate and a compliance risk:** it claims name/profile/journal data is "stored locally on your device only" and "not transmitted to our servers", which contradicts the Supabase-backed reality, and the contact address is the placeholder **`you@yourdomain.com`** (while `/settings` tells users to email `support@pursuearete.com`).

---

## 4. API routes (`src/app/api/`)

### `POST /api/create-checkout` (128 lines)
Auth: Supabase **cookie** session via `createSupabaseServerClient()`; 401 if absent.
Body: `{ plan: 'monthly'|'yearly'|'pro' }` (a raw `priceId` is accepted only if it matches one of the three env price ids). Resolves prices from `STRIPE_PRICE_*` through `requireEnv`.
Flow: looks up `subscriptions` (service role) where `user_id` + `billing_source='stripe'`; **trial eligibility** = the row has never held a `stripe_subscription_id` (so cancel-and-resubscribe never re-trials); reuses `stripe_customer_id`, verifying it with `stripe.customers.retrieve` and falling through to creation on `resource_missing`/`deleted` (guards against a sandbox→live id); persists the new customer id immediately (update or insert). Creates a `mode:'subscription'` Checkout Session with `success_url {origin}/upgrade?status=success`, `cancel_url …?status=cancelled`, `client_reference_id = user.id`, `metadata.supabase_user_id` on both session and subscription, `trial_period_days: 7` when eligible, and a 10-minute-bucketed **idempotency key** `checkout:{userId}:{priceId}:{floor(now/600000)}`. Returns `{ url }`.
Writes: `subscriptions.stripe_customer_id`, `billing_source`, `updated_at`.

### `POST /api/create-portal` (49 lines)
Auth: cookie session. Looks up `subscriptions.stripe_customer_id` (service role); 404 "No Stripe subscription found for this account" if none. Creates a `billingPortal.sessions` with `return_url {origin}/upgrade`. Returns `{ url }`. Writes nothing.

### `POST /api/stripe-webhook` (209 lines) — `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`
Auth: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`; 400 on missing/invalid signature. Middleware explicitly exempts this path.
Handled events: `checkout.session.completed` (re-retrieves the live subscription so redeliveries converge on current truth), `customer.subscription.created|updated|deleted|paused|resumed`. Everything else is ignored with a 200.
`syncStripeSubscription()`:
- Resolves the user id in order: `subscription.metadata.supabase_user_id` → session `client_reference_id` → `subscriptions` lookup by `stripe_customer_id`; logs and bails if unattributable.
- Tier resolution: **product-keyed first** (`prod_arete_premium → 'premium'`, `prod_arete_pro → 'pro'`), falling back to a price-keyed map built lazily from the three env price ids (monthly+yearly → `premium`, pro → `pro`). Logs an error for unmapped products but still records the row.
- Upserts one `subscriptions` row per user (select-then-update/insert because PostgREST can't target the partial unique index) with `stripe_customer_id, stripe_subscription_id, status, price_id, tier, current_period_end (from item.current_period_end), updated_at`.
- Entitlements: `GRANT_STATUSES = ['active','trialing']` + a known tier → `profiles.update({ tier, is_premium: true, updated_at })`. `REVOKE_STATUSES = ['canceled','unpaid','incomplete_expired','paused']` → downgrade to `{ tier:'free', is_premium:false }`, **but only if the user has no `apple` or `manual` `billing_source` row** (so a lapsed Stripe sub can't clobber an App Store or comped grant). `past_due` is deliberately in neither list (grace period).
- Any throw returns 500 so Stripe retries.
Tables written: `subscriptions`, `profiles`.

### `POST /api/delete-account` (88 lines) — `runtime = 'nodejs'`
Auth: **Bearer JWT only** (`admin.auth.getUser(token)`) — shared with the mobile app; middleware exempts it so mobile gets JSON.
Flow: (1) find `subscriptions` rows with `billing_source='stripe'` and a non-null `stripe_subscription_id`; cancel every one whose status is `active|trialing|past_due` via `stripe.subscriptions.cancel` — a failure here aborts the whole deletion ("better a still-existing account than an orphaned charge"). (2) Delete `user_id` rows from the FK-less `ORPHAN_TABLES`: `habit_logs, habits, beliefs, books, cabinet_conversations` (cascades `session_participants` + `session_messages`), `check_ins, courtyard_presence, milestones, sessions, weekly_reviews` — tolerating `42P01` (missing table). (3) `admin.auth.admin.deleteUser(user.id)`, which cascades `profiles`, `subscriptions`, `journal_entries`, etc.
Note: `goals`, `scrolls`, `scroll_reads`, `reading_data`, `calendar_data`, `routine_templates`, `user_settings` are **not** in `ORPHAN_TABLES` — they're presumed to cascade; worth verifying against `supabase/migrations/`.

### `POST /api/onboard` (20 lines)
A thin unauthenticated proxy: forwards the JSON body to `{NEXT_PUBLIC_API_BASE_URL}/api/onboard-web` and mirrors status. No auth header is attached and none is checked (middleware's cookie check is the only gate, and it applies since `/api/onboard` is not exempted). 502 on network failure.

---

## 5. Subscription model on the web

`src/lib/useSubscription.ts` (49 lines) — client hook returning `{ tier, isPremium, loading }`. Calls `supabase.auth.getUser()`, then in parallel `getIsPremium()` (the single source of the unlock decision) and `supabase.from('profiles').select('tier')` for the display label. Guards with a `cancelled` flag.

`db.getIsPremium()` (db.ts:535) — the authoritative predicate:
1. `getDevPremiumOverride()` — if non-null, returns it (in-memory, resets on reload).
2. Reads `profiles.is_premium, tier`.
3. `return isPremium || tier === 'premium' || tier === 'scholar'`.
**`tier === 'pro'` is not in that OR list** — a Pro subscriber is unlocked only because the webhook also sets `is_premium: true`. If `is_premium` is ever false for a Pro user (a manual grant, a partial write), Pro reads as free. The comment in the webhook acknowledges this ("Pro … unlocks via is_premium=true under getIsPremium()'s OR logic") — it's deliberate but fragile.

`/upgrade` page (212 lines): reads `useSubscription()`.
- Free users → three plan cards from a local `PLANS` array: Premium Monthly $9.99/mo, Premium Yearly $79.99/yr ("Best value"), Pro $19.99/mo. Each button POSTs `/api/create-checkout` with `{plan}` and `window.location.assign(data.url)`. Copy promises a 7-day free trial for new members.
- Premium users → a "Current plan" card using `TIER_LABELS` (`premium → Arete Premium`, `scholar → Arete Scholar`, `pro → Arete Pro`) and a **Manage subscription** button → `/api/create-portal`.
- Reads `?status=success|cancelled` to show a confirmation/cancellation banner. Wrapped in `<Suspense>` for `useSearchParams`.

**What tier actually gates on the web (complete list):**
1. `/cabinet` "+ Invite" (starting a shared session) — routes free users to `/upgrade`.
2. `/cabinet/select` (custom cabinet) — full-screen paywall overlay.
3. `/cabinet/minds` (assign LLM per counselor) — full-screen paywall overlay.
Nothing else is gated: chat volume, counselor 1:1s, scroll generation, journal, focus, goals are all free. There is no server-side enforcement of any of these on the web (the gates are purely client-side; the backend may enforce separately).

---

## 6. Things the web has that mobile might NOT — do not delete

1. **The marketing landing page** (`page.tsx` guest branch) with `CabinetReplay`, the App Store CTA, and the Library links. This is `app.pursuearete.com`'s public face; there is no mobile equivalent.
2. **`CabinetReplay`** — the scripted 5-exchange conversation reel with its curated copy. Purely a web asset.
3. **The whole Stripe stack** — `/api/create-checkout`, `/api/create-portal`, `/api/stripe-webhook`, `lib/stripe.ts`, and the `/upgrade` three-plan page. Mobile uses `app/paywall.tsx` + `lib/syncSubscription.ts` (App Store IAP). The webhook is the *only* thing that writes `profiles.tier`/`is_premium` for Stripe customers, and its `billing_source` guard exists specifically so Stripe and Apple can coexist.
4. **`/api/delete-account`** — hosted on the web but called by **both** platforms (the middleware exemption comment says so explicitly). Deleting it breaks the mobile App Review 5.1.1(v) requirement.
5. **`/join`** — the browser landing page for `?token=` invites, including the "sign up then accept" hand-off through `/login?redirectTo=`. Mobile has `app/join-session.tsx`, but the emailed/SMS link points at the web.
6. **`PendingInviteToast`** — site-wide pending-invite banner (mobile has `PendingInviteModal.tsx`, so this one may be a peer, but the localStorage dismissal key is web-only).
7. **`/reset-password`** — the PKCE recovery landing page; `supabase.auth.resetPasswordForEmail` in both apps redirects to `https://app.pursuearete.com/reset-password`. Web-only by necessity.
8. **`/goals`** as a standalone page with the time-based milestone progress track. Mobile has no `goals` route — goals live inside the journal tab.
9. **`/beliefs`** as a standalone CRUD page over the `beliefs` table (mobile's `belief-journal.tsx` is the dialogue flow; this simple list may have no mobile twin).
10. **Phone-invite copy flow** — `/api/sessions/invite` returning `smsBody`, shown in a copyable modal because the web can't open Messages. The UX around it is web-specific.
11. **Desktop-specific chrome** — the 220px sidebar, the More drawer, hover-reveal `⋯` menus in the journal, keyboard `Enter`/`Escape` handling in the composers and task inputs.
12. **PWA manifest** (`public/manifest.json`) and the `ignoreCommand` monorepo build guard in `vercel.json`.
13. **The morning `visibilitychange` day-rollover refetch** — a genuinely useful web-only fix for tabs left open overnight.

---

## 7. Code-quality observations for the port

### 7.1 Size and structure of `/cabinet`
1434 lines, one component, ~26 `useState` + 7 `useEffect`, three tabs, one modal, no sub-components, no reducer. The assistant-message renderer and the composer are each duplicated three times inside the file and once more in `/cabinet/conversation`. `parseBlocks()` and `getInitials()` are defined at module scope in `cabinet/page.tsx` and re-defined in `cabinet/conversation/page.tsx`. **Before adding anything to this page, extract `<MessageList>`, `<AssistantBubble>`, `<Composer>` and move `parseBlocks`/`getInitials` into `lib/`** — otherwise every future change is a 3× edit.

### 7.2 Duplicated logic
- **Auth/setup preamble** — `getUser() → /login`, `getUserSettings() → /setup` is copy-pasted in ~13 pages with small variations (`/beliefs` and `/settings` skip the setup check; `/focus` reorders the checks). A `useRequireUser()` hook or a layout-level guard would remove ~80 lines and the inconsistency.
- **Task list machinery** — `/morning` and `/evening` share ~200 near-identical lines (task precedence, `persistDone`, `toggleTask`, `addTask`, `removeTask`, progress strip, add-input, check-in CTA, response card) differing only in the `'morning'|'evening'` literal, the defaults and the copy. One parameterised `RoutinePage` would halve both files.
- **Paywall overlay** — `/cabinet/select` and `/cabinet/minds` have byte-similar full-screen modals with different hard-coded colors.
- **Dev "Simulate Free Tier" control** — implemented twice (`/profile` behind `NEXT_PUBLIC_DEV_MODE`, `/settings` always visible). The `/settings` one is shipped to production users.
- **Counselor display metadata** — `COUNSELOR_META` in `page.tsx` (initials for the daily question), `COUNSELOR_META`/`COUNSELOR_LIST` in `lib/counselors.ts`, `nameMap` inside `claudeService.buildCounselorSystemPrompt`, `COUNSELOR_LABELS` in `scrolls/page.tsx`, `SLUG_TO_SERVER_ID` in `lib/llmModels.ts`, and the `counselors` DB table — six overlapping sources of counselor identity, with slug drift (`marcus-aurelius` vs `marcus`, `futureSelf` vs `future-self`).
- **`toRoman()`** exists in both `page.tsx` and `StreakArc.tsx`.
- **`API_BASE_URL`** is re-derived in four files with three different fallbacks.

### 7.3 Inconsistent patterns between pages
- **Two styling generations.** "v2" inline-hex pages: home, morning, evening, journal, focus, goals, scrolls, profile, cabinet, cabinet/minds, onboarding, conversation. Old Tailwind-token pages: progress, beliefs, settings, privacy, upgrade, cabinet/select, login, setup, join, reset-password. Ports should pick one; the v2 look is clearly the current design language, but it hard-codes colors that the CSS variables already define.
- **Error handling.** `db.ts` swallows almost everything (`console.error` + return null/[]), but `getGoals`/`upsertGoal`/`completeGoal`/`deleteGoal`/`createBelief`/`updateBelief`/`createConversation`/`appendMessage` **throw**. Callers are inconsistent about which convention they expect.
- **Dialogs.** Native `confirm()`/`alert()` in `/cabinet`, `/journal`, `/goals`, `/beliefs`, `/settings`; custom modals elsewhere.
- **Loading states.** `return null` (`/morning`, `/evening`, `/profile`), a "Loading…" mono label (`/`, `/goals`, `/scrolls`, `/cabinet/minds`), `text-arete-muted` "Loading..." (`/upgrade`, `/cabinet/select`, `/beliefs`, `/setup`), or nothing at all (`/focus`, `/progress`, `/journal` — these render an empty shell first).
- **Redirects.** `router.replace` vs `router.push` vs `window.location.href` are all used for navigation after auth actions.

### 7.4 Pages/modules that are clearly stale
1. **`/cabinet/conversation`** — unreachable, uses a different data path (`createConversation`/`appendMessage` on `cabinet_conversations`) than the rest of the app (`threadService` → `saveCabinetConversation`), and **creates a new conversation row on every mount**, which can shadow the real cabinet thread and the shared-session id. Delete or rewire before the port.
2. **`/progress`** — hard-codes `streak = 0` and `readingStreak = 0`, calls the deprecated `hasCheckInToday`, reads `calendar_data` that the web never writes, and counts beliefs from `journal_entries` rows the web never creates. It's the one page whose numbers are simply wrong.
3. **`/beliefs`** — a different belief model from `claudeService`'s three-stage journal and from `db.saveBelief`/`getLegacyBeliefs`.
4. **`/privacy`** — factually wrong about data storage; placeholder contact email.
5. **`web/README.md`** — wrong port, wrong env var list, wrong storage claims.

### 7.5 Dead code to be aware of (don't rebuild it, decide about it)
- `src/lib/storage.ts` (whole module), `src/components/Tag.tsx`, `src/components/CabinetPreview.tsx`.
- `lib/quotes.ts`: `AFFIRMATIONS` (duplicated inline in `claudeService`), `REFLECTION_PROMPTS`, `STOIC_PROMPTS`, `JOURNAL_PROMPTS`, `getDailyItem`.
- `db.ts`: `upsertThread` (no-op for non-cabinet), `saveBelief`, `getLegacyBeliefs`, `upsertGoal`, `upsertCalendarData`, `hasCheckInToday`/`getLatestCheckIn`/`createCheckIn` (marked `@deprecated` but still called by `/`, `/progress` and `claudeService`), `getCounselorsByCategory`, `getDefaultCabinet`, `getConversations`.
- `claudeService.ts`: `sendBeliefJournalMessage` + `buildBeliefJournalSystemPrompt` + `BeliefEntry`/`VirtueCheck` types (no caller); `Message` interface (unused).
- `threadService.ts`: `getAllThreadSummaries`, `appendMessages` (only used by `sendCheckInToCabinet`).
- `llmModels.ts`: `modelForCounselor` (the server does the resolution; the web only writes the map).
- Tailwind `v2-*` color tokens; the `scrollbar-hide` class; `bg-arete-card` (used but undefined).

### 7.6 Functional bugs to fix during (or before) the port
1. `claudeService.gatherAppContext()` / `sendCheckInToCabinet()` read `arete_morning_tasks`, `arete_evening_tasks`, `arete_reflection_answer`, `arete_stoic_answer` from localStorage — **nothing writes them on web**. Task state and the Stoic answer are in `check_ins`; the prompt should read from there.
2. Per-counselor threads never persist (`db.getThread`/`upsertThread` only handle `'cabinet'`).
3. `/progress` hard-codes both streaks to 0.
4. `/cabinet/conversation` inserts a `cabinet_conversations` row on every mount.
5. Completing all checklist items marks the routine "done" and increments the streak without a Cabinet check-in (`/morning`, `/evening`).
6. `getIsPremium()` omits `'pro'` from its tier OR-list.
7. `saveCabinetConversation()` matches "today's" row with `.gte('created_at', todayUTC)` using `toISOString()` — UTC, while the rest of `db.ts` deliberately uses local dates (`localDateStr`). Late-evening writes can create a second row.
8. Reading `today_reading_seconds` is never written; `scroll_reads` is never incremented; `calendar_data` is never written.
9. `login` hard-codes `https://app.pursuearete.com/reset-password` as the recovery redirect.
10. `/beliefs` skips the `user_name → /setup` guard, so a fresh account can land there with no settings row.

### 7.7 Data-layer map (for planning the port)

| Table | Read by | Written by |
|---|---|---|
| `user_settings` | almost every page | `/setup`, `/profile`, `/onboarding`, `/cabinet/select`, `/cabinet/minds` |
| `profiles` | `getIsPremium`, streak fns, `getKnowThyselfComplete` | streak fns, `saveOnboardingProfile`, stripe-webhook |
| `check_ins` | `/`, `/morning`, `/evening`, `/progress` | `/`, `/morning`, `/evening` |
| `routine_templates` | `/morning`, `/evening` | `/morning`, `/evening` |
| `journal_entries` | `/journal`, `/progress`, `claudeService` | `/journal`, `/evening` |
| `beliefs` | `/beliefs` | `/beliefs` |
| `cabinet_conversations` | `/cabinet`, `/cabinet/conversation` | `/cabinet`, `/cabinet/conversation`, check-ins |
| `session_participants`, `session_messages` | `/cabinet` | `/cabinet` (+ the Railway server mirrors turns) |
| `counselors` | `CounselorLibrary`, `getUserCabinet`, `claudeService` | never (read-only reference data) |
| `reading_data` | `/focus`, `/progress`, `claudeService` | `/focus` |
| `calendar_data` | `/progress` | **never** |
| `goals` | `/goals` | `/goals` (complete/delete only) |
| `scrolls` | `/scrolls` | `/scrolls` (client-side insert after server generation) |
| `scroll_reads` | `/scrolls` (join) | **never** |
| `subscriptions` | checkout, portal, webhook, delete-account | checkout, webhook |

External backend endpoints the web depends on (all on `NEXT_PUBLIC_API_BASE_URL`): `POST /api/chat`, `POST /api/chat/counselor`, `POST /api/scrolls/generate`, `POST /api/sessions/invite`, `POST /api/sessions/accept`, `GET /api/sessions/pending-invite`, `POST /api/onboard-web`.
