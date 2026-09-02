# Arete Mobile App — Screen Inventory (non-tab screens, auth, onboarding, library, settings)

Source: `/home/user/arete-app` (Expo Router, React Native). This document covers the screens
assigned to this pass: root layout, index redirect, auth, both onboarding flows, know-thyself,
portrait, weekly-review, belief-journal, counselor-chat, my-cabinet (index + select), library
(index/reader/observatory/symposium), dispatch, paywall, settings, academy, privacy,
join-session, ErrorBoundary, and the four `lib/` modules requested.

It does **not** cover the `(tabs)` screens (home/morning/evening/journal/progress/timer/
cabinet/scrolls) except where a non-tab screen navigates to or from them.

---

## 0. Global conventions (apply to every screen below)

### 0.1 Design tokens

The whole app is one dark palette. There is no theming, no light mode, and no design-token
module — every screen hardcodes these hex values in a `StyleSheet.create` block.

| Token | Value | Use |
|---|---|---|
| Background (page) | `#1a1a2e` | Every screen's root background |
| Surface / card | `#16213e` | Cards, inputs, bubbles, sheets, footers |
| Surface alt | `#1e2a45` | User bubbles, refined-belief card (belief journal) |
| Gold (primary) | `#c9a84c` | Headings, icons, primary buttons, active states |
| Gold tints | `#c9a84c11 / 22 / 33 / 44 / 55 / 66` | Borders, hairlines, chips, badge fills |
| Text primary | `#fff` / `#e0e0e0` / `#e8e8ee` / `#e6eef8` | Body copy (varies by screen, unfortunately) |
| Text muted | `#888` (most common), `#9aa0a6`, `#7a7a90`, `#555` | Captions, hints, placeholders |
| Danger | `#ff4444` / `#ff6666` / `#f87171` / `#c0392b` | Errors, destructive actions |
| Paywall-only palette | NAVY `#0A1628`, SURFACE `#0F1E38`, BORDER `#1E3050`, MUTED `#8A9BB0`, TEXT `#E8EDF5`, GOLD `#C9A84C` | Paywall screen only — deliberately a different, darker navy |
| Reader "book" (paper) theme | bg `#f6efe0`, text `#2b2416`, gold `#6b4e14`, rule `#6b4e1433`, mark `#c98c1e55` | Library reader only |
| Observatory accent | `#5ab0c9` ("the corpus concludes" cyan) | Observatory only |

**Typography**
- Default system font everywhere except: Portrait and Library Reader, which use a serif
  (`Georgia` on iOS, `serif` on Android) for prose, and the Reader which additionally uses a
  monospace (`Menlo`/`monospace`) for paragraph numbers, running heads, handles, and labels.
- Section labels are near-universally: 10–13px, `fontWeight: '700'`, `textTransform: 'uppercase'`,
  `letterSpacing: 1–2`, colour gold.
- Body prose: 14–17px, line-height 20–29.
- Screen titles: 20–28px bold gold. Full-bleed header titles are sometimes white (`#fff`)
  and sometimes gold — not consistent; pick one on the web.

**Card style**: `backgroundColor:#16213e`, `borderRadius: 12–16`, `padding: 14–20`,
`borderWidth: 1`, `borderColor: '#c9a84c22'`. Selected/active cards get `borderColor:'#c9a84c'`
and often `borderWidth: 2`. Several screens add a 3px gold left border for "the Cabinet speaks"
(`borderLeftWidth: 3, borderLeftColor:'#c9a84c'`).

**Header pattern** (used on almost every non-tab screen): a row with back button (left,
`Ionicons arrow-back` or `chevron-back`, 22px gold), centred title, and a spacer or action on
the right, with `borderBottomWidth: 1, borderBottomColor: '#c9a84c22'`.

**Primary button**: gold fill `#c9a84c`, `borderRadius: 12–14`, `padding: 14–18`, label
`#1a1a2e` bold. **Secondary button**: transparent/`#16213e` fill, gold 1px border, gold label.
Disabled = `opacity: 0.35–0.6` or fill swapped to `#16213e`/`#3a3a4e`.

### 0.2 Server endpoints and base URLs

- `API_BASE_URL` = `process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'`, exported
  from `services/claudeService.ts` (line 550). This is the **Railway server**. Every server call
  in this inventory goes through it unless stated otherwise.
- `https://app.pursuearete.com` — the Next.js web app. Used directly for two things only:
  `POST /api/delete-account` (settings) and `https://app.pursuearete.com/upgrade` (paywall +
  settings, opened in an in-app browser).
- `https://academy.pursuearete.com` — the Academy, loaded in a WebView; also the Observatory's
  "full experience" outbound link (`/library`).
- Supabase is called directly from the client via `lib/supabase.ts` for all table reads/writes.

### 0.3 Tier model (critical for parity)

Two overlapping implementations exist. **They disagree**, and the web port needs to pick one.

`lib/useSubscription.ts` — `useSubscription()` returns `{ tier, isLoading }`, calling
`getSubscriptionTier()` (reads `profiles.tier`, `profiles.is_premium`) on mount and again on
every `AppState` → `active` transition (so a purchase made in Safari lands without a restart).
`useTierLimits()` in the same file returns:

| tier | maxMessages | maxCounselors | maxTokens |
|---|---|---|---|
| free | 10 | 3 | 400 |
| premium | 50 | 23 | 600 |
| pro | Infinity | 23 | 1000 |

`hooks/useTierLimits.ts` — a **different hook with the same name**, returning
`{ tier, maxMessages }` where `maxMessages` is `10` for free and `null` (uncapped client-side)
for premium and pro. This is the one `counselor-chat.tsx` imports. So the mobile counselor chat
does *not* enforce the 50/day premium cap locally; only the server does.

`lib/db.ts` canonical constants:
- `FREE_COUNSELOR_SLUGS = ['marcus','goggins','roosevelt']` (Epictetus moved behind the paywall
  2026-08-28).
- `STARTER_CABINET_SLUGS = ['marcus','roosevelt']`, `DEFAULT_CABINET_SLUGS = ['marcus','roosevelt']`.
- `FUTURE_SELF_SLUG = 'futureSelf'`.
- `MESSAGE_LIMITS = { free: 10, premium: 50, pro: null }`.
- `MAX_TOKENS_BY_TIER = { free: 400, premium: 600, pro: 1000 }`.
- `normalizeTier(raw, isPremium)` — `'pro'` → pro; `'premium' | 'arete' | 'scholar'` → premium;
  anything else falls back to `isPremium ? 'premium' : 'free'`. Legacy spellings must be
  supported on the web read path.
- `checkAndIncrementMessageCount()` — reads `profiles.{tier,is_premium,daily_message_count,
  message_count_date}`, resets the count when the date isn't today, refuses at the limit, else
  writes `daily_message_count` +1 and `message_count_date`. Pro short-circuits with no write.

`lib/syncSubscription.ts` — `syncTierToSupabase(tier)` is **a deliberate no-op** that only
logs. Entitlement is service-role-only; it is written by the Stripe webhook
(`web/src/app/api/stripe-webhook/route.ts`). The client must never write `profiles.tier` or
`profiles.is_premium`. This is a security constraint the web port must preserve.

`lib/devMode.ts` — an in-memory (never persisted, resets on reload) premium override:
`getDevPremiumOverride()`, `setDevPremiumOverride(boolean|null)`, `isDevMode()` reads
`process.env.EXPO_PUBLIC_DEV_MODE === 'true'`. `getIsPremium()` in `lib/db.ts` honours the
override before hitting Supabase. Only the settings screen's dev section writes it.

---

## 1. `app/_layout.tsx` — Root layout

### Purpose and navigation
Root of the Expo Router tree. Renders `<Slot />` inside `ErrorBoundary` →
`GestureHandlerRootView` → `SessionContext.Provider`. Exports `useSession()` — the app's only
auth-session accessor — and re-exports `ErrorBoundary` so Expo Router uses it for the root route.

### Behaviour, in order
1. `startBootDiagnostics()` from `lib/crashCapture` at module scope (safety net; normally
   started by `index.ts`).
2. `SplashScreen.preventAutoHideAsync()` at module scope.
3. Session resolution effect: `supabase.auth.getSession()` with a **3000 ms timeout** that
   forces `session = null` if Supabase doesn't answer; then `supabase.auth.onAuthStateChange`
   keeps it live. While `session === undefined` the tree renders only a bare `#1a1a2e` view
   (no spinner) — this is the boot screen.
4. Splash hides as soon as `session !== undefined`.
5. Foreground notification handler registered **in an effect, never at module scope**
   (`shouldPlaySound: true`, `shouldSetBadge: false`, `shouldShowBanner: true`,
   `shouldShowList: true`). The comment records that a module-scope call here was the original
   Build 44 iOS 26 SIGABRT.
6. Push registration: once per authenticated user id, calls
   `setupDispatchNotifications(session)` (skipped on web).

### Sub-components
**`DeepLinkHandler`** — uses `Linking.useURL()`; when the parsed path is `join-session` and a
`token` query param is present, `router.replace('/join-session', { token })`. Gated on
`useRootNavigationState().key` so it never fires before the navigator mounts; deduped by a ref.
URL scheme is `arete://` (`app.json` → `"scheme": "arete"`).

**`NotificationTapHandler`** — no-op on web. Handles:
- cold start via `Notifications.getLastNotificationResponseAsync()`;
- warm taps via `addNotificationResponseReceivedListener`;
- foreground deliveries via `addNotificationReceivedListener` (seeds silently, no navigation).
Routing rules from `notification.request.content.data`:
- `data.type === 'daily_dispatch'` → `push('/dispatch', { dispatch_id })`
- `data.route === '/cabinet'` → `push('/cabinet')`
Every delivery is also passed to `seedFromNotification()` (`lib/counselorLines`), which writes
the notification body into the Cabinet thread so a tapped reminder becomes the opening line of a
conversation. On mount and on every `AppState` → `active`, `seedMissedCounselorLines()` recovers
lines that fired while the app was closed, and `Notifications.setBadgeCountAsync(0)` clears the
icon badge.

### Platform-only
**All notification behaviour is native-only** and explicitly `Platform.OS === 'web'`-guarded.
The badge-clearing, cold-start tap recovery, and counselor-line seeding have no web analogue
(web push could partially replace them, but the "seed the notification into the thread" idea is
the part worth porting as a concept).

### Web parity note
The web equivalent is: a session provider + a router guard. The 3s timeout fallback and the
splash-hold are worth keeping as a pattern (never block the app on an unreachable Supabase).

---

## 2. `app/index.tsx` — Index redirect

18 lines. Renders `null` while `session === undefined`; `<Redirect href="/(auth)/login" />` when
signed out; `<Redirect href="/(tabs)/" />` when signed in. Comment is load-bearing: **new users
land on the home tab, not onboarding** — the Future Self onboarding is offered via a dismissible
banner on home and is never forced.

---

## 3. `app/(auth)/login.tsx` — Sign in / Sign up

Layout: `app/(auth)/_layout.tsx` is `<Stack screenOptions={{headerShown:false}} />`.

### Purpose and navigation
Route `/(auth)/login` (also reachable as `/login`). Reached from `app/index.tsx` when signed out,
from `join-session` when the invitee has no session, and from settings' Sign Out / Delete Account.

**Deep-link param consumed**: `inviteToken` (string). When present the screen (a) defaults `mode`
to `'signup'` (invitees usually have no account), (b) shows an invite banner, and (c) after a
successful auth redirects to `/join-session?token=<inviteToken>` instead of the normal target.

**Navigation out**:
- sign-in success, no invite → `router.replace('/')`
- sign-up success, no invite → `router.replace('/setup')` (which redirects to
  `/(onboarding)/setup`, the 11-step wizard)
- either, with invite → `router.replace('/join-session', { token })`

### Features in layout order
1. Header: `ARETE` wordmark (42px bold gold, `letterSpacing: 8`) and tagline
   *"Be who you want to be."* (14px italic `#888`).
2. Invite banner (conditional on `inviteToken`): gold-tinted card, text *"You've been invited to
   a shared Cabinet session. Sign in or create an account to join."*
3. Segmented mode toggle — two pills in a `#16213e` track, active pill gold fill with `#1a1a2e`
   label: **Sign In** / **Sign Up**. Switching clears the error.
4. Form:
   - **Email** — `keyboardType="email-address"`, `autoCapitalize:none`, `autoCorrect:false`,
     placeholder `you@example.com`.
   - **Password** — `secureTextEntry`, placeholder `••••••••`.
   - **Confirm Password** — only in signup mode, `secureTextEntry`.
5. Error box (red-tinted, `#ff444422` fill / `#ff444466` border, `#ff6666` text).
6. Submit button — gold, label `Sign In` / `Create Account`, shows an `ActivityIndicator` and
   `opacity 0.6` while loading.
7. Footer link toggling mode ("Don't have an account? **Sign Up**").

### Validation (exact)
Sign in: both email (trimmed, non-empty) and password required → *"Please enter your email and
password."* Sign up: same, plus `password !== confirmPassword` → *"Passwords do not match."*,
plus `password.length < 6` → *"Password must be at least 6 characters."* No email-format check.
Supabase's own `authError.message` is surfaced verbatim.

### Data / server
`supabase.auth.signInWithPassword({email: email.trim(), password})` and
`supabase.auth.signUp({email, password})`. No profile row is created client-side (a DB trigger
must be doing it). Note: `handleSubmit` logs `process.env.EXPO_PUBLIC_API_BASE_URL` to the
console — leftover debugging.

### Platform-only
`KeyboardAvoidingView` behaviour switch. Nothing else.

---

## 4. The two onboarding flows

There are two, and **only one is live**.

### 4a. `app/(onboarding)/setup.tsx` — the 11-step form wizard (LIVE, but only for password sign-ups)

**Route**: `/(onboarding)/setup`, reached via `app/setup.tsx` which is a bare
`<Redirect href="/(onboarding)/setup" />`. The only caller is `login.tsx` after a successful
**sign-up without an invite token**. So: every new email/password account sees this wizard once.
It is not reachable from anywhere else in the UI, and it can only be exited by completing it
(there is no skip-the-whole-flow escape and no close button).

**Structure**: `TOTAL_STEPS = 11`, `OPTIONAL_STEPS = [3,4,6,7,8]`. A progress-dot row is pinned
at the top: 8px dots, `#16213e` fill with `#c9a84c44` border; the current dot is gold and
stretched to 24px wide; completed dots are `#c9a84c55`.

Steps in order:

| # | Heading | Fields | Required? |
|---|---|---|---|
| 1 | `ARETE` + manifesto | none — three paragraphs of body copy explaining the Cabinet of Invisible Counselors, ending on the definition of *arete* | Button label is **Begin** |
| 2 | "What shall we call you?" | `name` (single line, `autoFocus`, `autoCapitalize:'words'`) | **Required** — `name.trim().length > 0` |
| 3 | "Your Background & Life Story" | `background` (multiline, 6 rows) | Optional — Skip button |
| 4 | "Who You Are Today" | `identity` (multiline, 6 rows) | Optional |
| 5 | "What are you here to build?" | `goals` (multiline, 5 rows) | **Required** |
| 6 | "Strengths & Weaknesses" | `strengths` + `weaknesses` (two multilines, 5 rows each, labelled) | Optional |
| 7 | "Patterns & Failure Modes" | `patterns` (multiline, 6 rows) | Optional |
| 8 | "Major Life Events" | `majorEvents` (multiline, 6 rows) | Optional |
| 9 | "Meet your Future Self" | `futureSelfYears` — a 4-button segmented picker with options **5 / 10 / 15 / 20** (default 10); `futureSelfDescription` (multiline, 6 rows) | **Description required** |
| 10 | "Your Cabinet" | Toggle list of 5 members | **≥1 optional member must stay selected** |
| 11 | "Your Commitment" | Read-only summary cards | Button label is **I commit to Arete** |

**Step 10 member list** (hardcoded in the file, *not* read from the `counselors` table):
- `marcus` — Marcus Aurelius, "Chair — always present", **locked** (lock icon, cannot toggle)
- `epictetus` — Epictetus, "Counselor"
- `goggins` — David Goggins, "Counselor"
- `roosevelt` — Theodore Roosevelt, "Counselor"
- `futureSelf` — Future Self, "Your future self — always present", **locked**

Initial selection is `['marcus','goggins','roosevelt','futureSelf']` — deliberately matching
`FREE_COUNSELOR_SLUGS` plus Future Self, because seeding a locked counselor would make it appear
mysteriously missing later. `toggleMember` refuses to unselect `marcus`/`futureSelf`, and refuses
to drop the last remaining optional member. Selected cards get a gold checkmark-circle icon;
unselected get an outline ellipse; locked get a gold padlock.

**Step 11 summary cards**: Name; Goals (truncated to 120 chars + `…`); Future Self
(`"{years} years from now — {description truncated to 100 chars}"`); Cabinet (comma-joined
display names).

**Footer buttons** (all steps): primary Continue/Begin/"I commit to Arete" (disabled at
`opacity 0.35` when `canContinue()` is false); a "Skip for now →" link on optional steps only;
a "Back" link on every step except 1.

**Commit** (`handleCommit`) → single `upsertUserSettings({...})` into `user_settings` with:
`user_name`, `user_goals` (same value as goals), `kt_background`, `kt_identity`, `kt_goals`,
`kt_strengths`, `kt_weaknesses`, `kt_patterns`, `kt_major_events`, `future_self_years`,
`future_self_description`, `cabinet_members` (array of slugs, including `futureSelf`). Then
`router.replace('/')`.

Note: this flow **does not set `profiles.know_thyself_complete`**. Only the conversational flow
does. So a user who completes this wizard still sees the "Meet Your Future Self" banner on home.
That is almost certainly a bug worth fixing in the port.

### 4b. `app/onboarding.tsx` — the conversational Future Self onboarding (the one the product surfaces)

**Route**: `/onboarding`. Reached from **one** place: the dismissible "Meet Your Future Self"
banner on the home tab (`app/(tabs)/index.tsx:299`), which renders when
`knowThyselfIncomplete && !bannerDismissed`. The dismiss is session-only (a module-level
`futureSelfBannerDismissed` flag, not persisted).

The file header says it *"Mirrors web/src/app/onboarding/page.tsx — same agent, same request
shape, same save mapping. One onboarding agent, two clients."* — so the web already has this;
parity work here is mostly cosmetic.

**Layout**
1. Header: circular "FS" badge (40px, gold-tinted), kicker `"{futureYears} Years From Now"` or
   `"Future Self"`, title **Know Thyself**, and a round close button (`×`) that
   `router.replace('/(tabs)/')`.
2. Progress bar: 4px track, gold fill. `progress = complete ? 100 : min(round(assistantTurns/12*100), 95)`.
   Caption: `"Profile complete"` / `"{n}% · {k} areas remaining"` / `"{n}% · almost done"`
   where `remaining = max(12 - assistantCount, 0)`.
3. Chat transcript. Assistant rows: FS badge + bubble (`rgba(255,255,255,0.03)` fill, 16px radius
   with a 4px top-left corner). User rows: right-aligned gold-tinted bubble
   (`rgba(201,168,76,0.12)`, 18px radius, 6px bottom-right corner). Both `selectable`.
   Loading bubble reads *"Reaching back through time…"* in italic.
4. Error block: `"Connection issue — please try again."` plus a **Retry** link that re-sends the
   current message array.
5. On completion, a **summary card** replaces further chat: kicker "YOUR PROFILE SUMMARY" and
   rows for Identity, Goals, Primary Obstacle, Core Strengths, Work & Meaning, Future Vision
   (only rows with values render). Then either a gold **"Save to Know Thyself"** button (with a
   spinner while saving) or `✓ Saved. Returning home…`.
6. Composer (hidden once `complete`): multiline input, placeholder *"Speak freely…"*,
   `maxLength={2000}`, and a 40px round gold send button with an arrow-forward icon; disabled
   when empty or loading.

**Flow**
- On mount, `sendToApi([])` fires immediately to get the opening greeting. Because Claude
  requires at least one message, an empty history is sent as `[{role:'user', content:'Hello.'}]`.
- Every turn: `POST {API_BASE_URL}/api/onboard-web` with body
  `{ messages: [{role, content}...], futureYears }`. No auth header.
- Response shape: either `{ complete: true, profile, futureYears }` or
  `{ message: string }`. When not complete, the screen also regexes the assistant message for
  `/\b(\d+)\s+year/i` to infer `futureYears` if not yet set.
- `handleSave` → `saveOnboardingProfile(profile)`; then, if `profile.goals` exists,
  fire-and-forget `triggerScrollGeneration(user.id, settings?.user_name, goals)` from
  `lib/scrolls.ts` — the post-onboarding payoff is the user's first Scroll. Then
  `setTimeout(() => router.replace('/(tabs)/'), 2000)`.

**Data mapping** — `saveOnboardingProfile` (lib/db.ts) writes into `user_settings`:
`identity → kt_identity`, `goals → kt_goals`, `obstacle → kt_weaknesses`,
`virtues → kt_strengths`, `challenge_style → feedback_preference`,
`work_meaning → kt_background`, `future_vision → future_self_description`,
`future_years → future_self_years`. Then `UPDATE profiles SET know_thyself_complete = true,
updated_at = now() WHERE id = user`.

**Which is live?** Both are wired, for different populations:
- The **11-step wizard** fires exactly once, right after email/password sign-up.
- The **conversational flow** is the one the product promotes afterwards, via the home banner,
  and is the only one that marks the profile complete. Invitees (sign-up with `inviteToken`)
  skip the wizard entirely and only ever see the banner.

For the web port, `web/src/app/onboarding/page.tsx` already implements 4b. 4a has no web
equivalent and, given that it doesn't set `know_thyself_complete`, is a candidate to drop.

---

## 5. `app/know-thyself.tsx` — Profile editor

### Purpose and navigation
Route `/know-thyself`. The manual editor for the same `user_settings` columns the two onboarding
flows write. Entered from **Settings** ("📖 Edit Your Know Thyself Profile", the first row) and
from the **Cabinet tab** (two call sites, `app/(tabs)/cabinet.tsx:875` and `:891`). Header has a
`← Back` text button (no icon), a centred gold title "Know Thyself" (20px bold,
`letterSpacing: 2`) and a 60px spacer. No deep-link params.

### Features in layout order
Intro paragraph (italic `#888`): *"Your profile gives the Cabinet deep context about who you
are. Update it any time — changes take effect on your next session."*

Then seven `#16213e` section cards, each with an uppercase gold section title and one or two
inputs. All multiline inputs use `textAlignVertical:'top'`, `minHeight: 110`.

1. **Background & Life Story** — label "Where are you from, and how did you get to where you are
   today?", placeholder `I grew up in...`, 6 rows → `kt_background`
2. **Professional Identity & Pursuits** — label "What do you do professionally? What are you
   pursuing outside of work?", placeholder `Professionally, I...`, 6 rows → `kt_identity`
3. **Goals** — label "What are you working toward?", placeholder `I am here to...`, 5 rows →
   `kt_goals` **and** `user_goals` (written to both)
4. **Strengths** — placeholder `I am strong at...`, 5 rows → `kt_strengths`
5. **Weaknesses** — placeholder `I struggle with...`, 5 rows → `kt_weaknesses`
6. **Patterns & Failure Modes** — label "What patterns do you notice in yourself? What tends to
   derail you?", placeholder `When under pressure, I tend to...`, 6 rows → `kt_patterns`
7. **Major Life Events & Defining Moments** — label "What crucible experiences shaped who you
   are?", 6 rows → `kt_major_events`
8. **Future Self** — "Years from now" (single-line, `keyboardType:'number-pad'`, placeholder
   `10`) → `future_self_years`; "Description" (multiline, 6 rows, placeholder
   `In ten years, I have...`) → `future_self_description`

Then a full-width gold **Save Profile** button.

### Validation and save
No validation at all. `saveProfile` trims every string and calls one `upsertUserSettings`.
`future_self_years` is only included when the trimmed string is non-empty, via
`parseInt(...)` — **an unparseable string yields `NaN`** and would be written as such. Worth
adding a numeric guard on the web. Success → `Alert.alert('✅ Profile Saved', 'Your Know Thyself
profile has been updated. Changes take effect on your next session.')`; failure →
`Alert.alert('Error', 'Could not save profile.')`.

### Data
`getUserSettings()` on mount (reads `user_settings.*` for the current user, `.single()`,
tolerating `PGRST116` = no row); `upsertUserSettings()` on save (upsert on `user_id`, sets
`updated_at`). No server calls, no platform-only bits.

---

## 6. `app/portrait.tsx` — The longitudinal portrait

### Purpose and navigation
Route `/portrait`, entered from the **Progress tab** (`app/(tabs)/progress.tsx:403`). Header is a
`chevron-back` icon plus a 26px bold gold title "Portrait". No params.

This is a pure **reading surface**. Nothing is computed on device. The row is rebuilt every
Monday by the server-side weekly agent (`server/longitudinal-user-model.js`) from the whole
`journal_analysis` history. The file's own comment sets the design brief: *"prose first, serif,
generous measure, no streaks, no scores-as-trophies, no emoji."*

### Data
- `getLongitudinalPortrait()` → `SELECT` on **`user_longitudinal_models`** (`.maybeSingle()` on
  `user_id`), columns: `persistent_themes, emerging_themes, fading_themes, growth_edges,
  counselor_affinity, preferred_entry_types, dominant_philosophical_orientation,
  emotional_tone_baseline, self_disclosure_depth, philosophical_portrait, portrait_updated_at,
  delta_summary, weeks_analyzed, first_analyzed_at, last_analyzed_at`. RLS: SELECT own row only.
- `getCounselorsBySlugs(slugs)` → `counselors` table `WHERE slug IN (...)`, used only to turn
  affinity slugs into display names. Failure is cosmetic (falls back to the raw slug).
- Refetch on `useFocusEffect` (every time the screen gains focus), with a `cancelled` guard.

### States and sections, in order
**Loading**: header + centred gold `ActivityIndicator`.

**Empty** (no row, or `philosophical_portrait` null — the normal state for an account under the
agent's 4-week threshold): centred serif title *"Your portrait is still forming."* and body
*"It is written from your own journal entries, and it needs about four weeks of them before there
is an arc worth describing. Keep writing. It will appear here on a Monday."* This must read as an
invitation, not a failure.

**Populated**, in order:
1. Dek: `"{n} week(s) of your own writing, read back to you."` (13px `#8a8aa0`)
2. **The portrait prose** — the hero. `philosophical_portrait` split on blank lines
   (`/\n\s*\n/`) into paragraphs, rendered serif 17/29 in `#e8e8f0`, 20px bottom margin each.
3. **"What moved this week"** — `delta_summary`, but **suppressed when it equals the literal
   string `"First model generated."`** (the agent's placeholder on a first build; showing it
   would be a delta with no information).
4. **"Where you are still working"** — note *"Questions you have returned to without settling."*
   then each `growth_edges` string as a serif 16/27 paragraph.
5. **"What persists"** — `persistent_themes`, note *"Present across most of the weeks you have
   written."*
6. **"What is new"** — `emerging_themes`, note *"Appearing for the first or second time."*
7. **"What has quieted"** — `fading_themes`, note *"Once constant, absent from your recent weeks."*
8. **"Register"** — a label/value list: Orientation (`dominant_philosophical_orientation`),
   Tone (`emotional_tone_baseline`), Candor (`self_disclosure_depth`). Values are
   `textTransform: 'capitalize'`. The whole section is hidden if all three are null.
9. **"Who you have been sitting with"** — top 5 `counselor_affinity` entries, each a row of
   display name (left) and `"{count} conversation(s)"` (right).
10. **Colophon**: `"Rebuilt {portrait_updated_at ?? last_analyzed_at, formatted as 'Month D, YYYY'}.
    Written from your journal entries alone, and visible only to you."`

**Theme list behaviour** (`ThemeList` component): shows the first `THEMES_COLLAPSED = 5` themes,
then a "**{n} more**" link that expands (one-way — there is no collapse). Each theme is a row with
a 3px gold-tinted vertical rule on the left, the theme text, and — only when `weeks_seen > 1` —
a trailing `"  ·  {n} weeks"` in muted grey. A section with zero themes renders nothing.

### Visual notes for parity
Sections are separated by a top hairline (`borderTopWidth: 1, borderTopColor: '#c9a84c22'`) with
24px of padding above, not by cards. `paddingHorizontal: 28` for a generous measure. Serif for
prose, edges, delta, and both empty-state strings; sans for section titles, notes, theme rows,
and register values. No emoji, no icons except the back chevron.

### Server / platform
None. Pure Supabase read. Fully portable.

---

## 7. `app/weekly-review.tsx` — Weekly Review

### Purpose and navigation
Route `/weekly-review`, entered from the **Progress tab** (`app/(tabs)/progress.tsx:615`).
Header: `← Back` text link, 26px bold gold title "Weekly Review", subtitle showing the date
range. No params.

### AsyncStorage (important for parity)
Key **`weeklyReviews`** — a JSON array of `WeeklyReview` objects
(`{ id, weekEnding, content, generatedAt }`), newest first, capped at
`MAX_SAVED_REVIEWS = 12`. **Reviews are not stored in Supabase at all** — they live only on the
device. On the web this needs a real table (or at least localStorage with an explicit decision
that history is per-browser).

### Week labels
`getWeekLabel()` computes, from `new Date()`:
- `weekEnding` = today formatted `"Monday, March 2, 2026"` (weekday, month, day, year)
- `subtitle` = `"{today-6 as 'Mar 24'} – {today as 'Mar 2, 2026'}"`

Note the subtitle is recomputed on render, so **past reviews in the archive show today's date
range**, not their own. A porting bug to fix or replicate deliberately.

### Features in layout order
1. Header block (back / title / subtitle) plus the **Generate button**, which lives in the
   header, not the scroll body:
   - No current review → full gold button, *"Generate This Week's Review"*
   - Current review exists → outlined gold button, *"Regenerate"*
   - `opacity 0.5` while loading
2. While loading: an animated *"The Cabinet is convening…"* line, gold italic, pulsing between
   `opacity 1` and `0.4` on an 800 ms loop (`Animated.loop` + `Animated.sequence`, native driver).
3. Error card (dark red `#2a1a1a`, `#ff444433` border): the thrown message plus an outlined
   **Try Again** button.
4. **Current review card** — `#16213e`, 3px gold left border, containing: kicker "WEEK OF",
   the `weekEnding` line, the subtitle, a gold hairline divider, the review body (15/26), and an
   italic footer `"Generated {Mar 2, 2026} {3:45 PM}"`.
5. **Empty state** card: 📜 emoji (40px), *"No review yet this week."*, and the explanatory line
   *"The Cabinet reviews a week's worth of data — routines, journal entries, reading, and
   reflections — and gives you an honest assessment."*, plus a second gold Generate button.
6. **Past Reviews** archive — only when `pastReviews.length > 1`; skips index 0 (that's the card
   above). Each is a collapsed card with the header *"Week ending {weekEnding}"* and a ▼/▲ chevron;
   tapping toggles `expandedId` (accordion, one open at a time) to reveal the full text.

### Data / server
`generateWeeklyReview()` from `services/claudeService.ts`:
- Gathers `gatherWeeklyContext()` — which pulls, all from Supabase via `lib/db.ts`:
  `user_settings` (name), `check_ins` (today's `reflection_answer`, `stoic_answer`,
  `morning_tasks`, `evening_tasks`), a 7-day morning/evening completion grid,
  `journal_entries` filtered to the last 7 days (content truncated to 300 chars each),
  `reading_data` (`reading_sessions` in the last 7 days, `current_books`, `books_read`), and the
  last 5 `journal_entries` of type `quote`.
- Then `POST {API_BASE_URL}/api/chat` with `Authorization: Bearer <supabase access_token>` and
  body:
  ```json
  { "model": "claude-opus-4-5", "max_tokens": 2000, "system": "<long Cabinet review prompt>",
    "messages": [{"role":"user","content":"<weeklyContext>\n\nThe week has ended. Give me your honest assessment."}],
    "tzOffsetMinutes": <Date.getTimezoneOffset()>, "user_id": "<uuid>" }
  ```
- Reads `data.content[0].text`. Non-2xx throws
  `"The Cabinet is temporarily unavailable. (Error {status})"`; an empty body throws
  `"The Cabinet did not respond. Please try again."`
- The system prompt names the four counselors (Marcus as Chair, Epictetus, Goggins, Roosevelt),
  demands 600–800 words, no sycophancy, Marcus opens and closes.

Note: this call does **not** go through `checkAndIncrementMessageCount()` — weekly reviews don't
consume the daily message quota, and there is no tier gate on this screen at all.

### Platform-only
None (the pulse animation is `Animated`, trivially replaceable with CSS).

---

## 8. `app/belief-journal.tsx` — Belief Journal (three-stage dialogue)

### Purpose and navigation
Route `/belief-journal`. **Currently orphaned**: a repo-wide grep finds no `router.push` to it
from any screen. It is reachable only by direct URL / deep link. The journal tab reads and filters
belief entries but never opens this screen. Flag this — either the entry point was lost in a
refactor, or the feature is parked.

**Params consumed**: `prefill` (seeds the raw-thought textarea) and `entryId` (resumes a saved
draft).

**Navigation out**: `router.back()` (with a confirmation), or on encode → `router.replace('/journal')`.

### The three stages

**Stage 1 (no entry yet) — raw capture.**
Header: `×` close, centred gold "Belief Journal". Body: headline *"What do you believe?"* (26px
bold white), subhead *"The Cabinet will help you find what you actually mean."*, and one large
textarea (`minHeight: 200`, 16/26, `#16213e`, gold-tinted border) with the placeholder *"Write
what you're thinking — messy is fine. The Cabinet will help you find what you actually mean."*
It `autoFocus`es unless a `prefill` param was given. Footer: full-width gold **"Send to Cabinet →"**,
disabled while empty or loading (fill becomes `#3a3a4e`), showing a spinner while working.

On submit: `createJournalEntry({ type:'belief', content, raw_input, dialogue_history: [],
belief_stage: 1, topic })` where `topic = rawInput.trim().substring(0,60)`. The row is created
**first**, to get a real UUID before any dialogue exists. If creation fails, error text
*"Could not save entry. Please try again."* Then it immediately calls the Cabinet at stage 1.

**Stage 1 (with entry) — questioning.**
Header becomes: back-arrow, the entry `topic` (1 line, ellipsised), spacer.
Scroll body:
- **Raw Thought card** — `#16213e`, 3px `#555` left border, uppercase grey label "RAW THOUGHT",
  the original text in `#ccc`.
- Dialogue bubbles. Cabinet: left-aligned, `#16213e`, 3px **gold** left border, max 90% width,
  with an uppercase gold label "THE CABINET". User: right-aligned `#1e2a45`, no label.
- Loading: a Cabinet bubble containing only a gold spinner.
- Error: a red-tinted tappable card, `⚠ "The Cabinet is unavailable. Tap to retry."` — tapping
  re-invokes `callCabinet` at the current stage.

Input area: a multiline field (`maxHeight: 100`, `minHeight: 44`) with placeholder *"Respond to
the Cabinet..."* and a gold square send button. Below it, **once the user has sent at least one
dialogue turn** (`canProposeRefinement` = stage 1 && ≥1 user turn), a gold button with a
sparkles icon: **"Propose a refined version"** → calls the Cabinet at stage 2.

**Stages 2 & 3 — refinement and encoding.**
Adds a **Proposed Encoded Belief** card above the input: `#1e2a45` fill, gold border, uppercase
gold label, the `refinedStatement` at 15/24. If `virtueCheck.passed === false`, a warning badge
sits inside it: gold warning icon plus `"{Virtue capitalised}: {concern}"` on a `#c9a84c11` chip.

The input area becomes a three-button action panel:
1. **"🔒  This lands — encode it"** — primary gold, rendered only when `refinedStatement` exists.
2. **"✏️  Not quite — adjust it"** — toggles a secondary textarea (placeholder *"Push back,
   adjust, or ask to iterate..."*) plus send button; sending calls the Cabinet at stage 3 with
   the user's text.
3. **"⚔️  Push harder"** — calls stage 3 with a hardcoded challenge string:
   *"I want you to push harder on this belief. Hold it against the four cardinal virtues more
   rigorously — Wisdom, Justice, Courage, Temperance. Where does it fail? Where is it
   self-serving? Where is it borrowed rather than lived?"*

**Encode** (`encodeBelief`) does two writes:
- `updateJournalEntry(id, { belief_stage: 'encoded', encoded_belief, content: encodedText,
  ... })` on `journal_entries` — where `encodedText = refinedStatement || content`, plus
  `hasVirtueConcern` and `virtueConcern` derived from the virtue check.
- `saveBelief({ raw_input, dialogue_history, encoded_belief, has_virtue_concern, virtue_concern })`
  → `INSERT` into the separate **`beliefs`** table.
Then `router.replace('/journal')`.

### Back navigation
If nothing has been started, plain `router.back()`. Otherwise a three-option
`Alert.alert('Leave Belief Journal?', 'Your progress in this dialogue will be saved as a draft.
Continue later?')`:
- **Save Draft** → `router.back()` (the row already exists, so nothing more to do)
- **Discard** (destructive) → `deleteJournalEntry(entry.id)` then back
- **Cancel**

### Data
- `getJournalEntries()` (on `entryId` resume) → `journal_entries` ordered `created_at desc`.
- `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry` → `journal_entries`. Columns
  touched: `type, content, raw_input, dialogue_history (jsonb), encoded_belief,
  refined_statement, virtue_check (jsonb), belief_stage, topic, user_id, created_at, updated_at`.
- `saveBelief` → `beliefs` (`raw_input, dialogue_history, encoded_belief, has_virtue_concern,
  virtue_concern, user_id`).

### Server
`sendBeliefJournalMessage(entry, stage)` → `POST {API_BASE_URL}/api/chat` with the auth header
and body `{ model:'claude-opus-4-5', max_tokens: 2000, system: <stage-specific prompt>,
messages: [{role:'user', content: rawThought}, ...dialogue turns mapped user/assistant],
user_id }`.

The response is parsed for two tag blocks the prompt asks the model to emit:
```
[REFINED_BELIEF] … [/REFINED_BELIEF]
[VIRTUE_CHECK] {"passed": bool, "virtue": null|"wisdom"|"justice"|"courage"|"temperance", "concern": null|string} [/VIRTUE_CHECK]
```
Both blocks are stripped from the displayed text. Malformed virtue-check JSON is silently
ignored. Non-2xx throws `"The Cabinet is unavailable. (Error {status})"`.

No tier gate, no message-count increment on this screen.

### Platform-only
`Alert.alert` (a modal on web) and `KeyboardAvoidingView`. Nothing else.

---

## 9. `app/counselor-chat.tsx` — One-on-one counselor conversation

### Purpose and navigation
Route `/counselor-chat`. Entered from:
- the **Cabinet tab** counselor cards (`app/(tabs)/cabinet.tsx:1167`) with
  `{ id: counselor.slug, name: counselor.name, role: counselor.one_line }`;
- the **home tab** daily-prompt card (`app/(tabs)/index.tsx:374`) with
  `{ id: dp.counselorSlug, initialMessage: dp.prompt }`.

**Params consumed**: `id` (required, defaults to `'marcus'`), `initialMessage`, `name`, `role`.

**Navigation out**: back button and the Android hardware back both `router.replace('/(tabs)/cabinet')`.
"Bring to the Cabinet" pushes `/(tabs)/cabinet` with a `cabinetContext` param. Paywall pushes
carry `src` labels.

`normalizeCounselorId` (`services/threadService.ts`) maps long DB slugs to canonical short thread
ids: `marcus-aurelius→marcus`, `david-goggins→goggins`, `theodore-roosevelt→roosevelt`,
`future-self→futureSelf`. Everything else passes through. This guarantees one thread per counselor.

`COUNSELOR_META` (hardcoded in the file) supplies fallback display name/role for the five core
counselors: marcus ("Emperor & Stoic — Chair"), epictetus ("Philosopher & Former Slave"),
goggins ("Navy SEAL & Endurance Athlete"), roosevelt ("26th President & Adventurer"),
futureSelf ("Years From Now"). For `futureSelf` the name is personalised to
`"{user_name}'s Future Self"` from `getUserSettings()`.

### Features in layout order
1. **Header**: back chevron; name (22px bold gold) + role (12px `#888`); a "New Session" refresh
   button (`#16213e` square with gold border), disabled and greyed when the thread is empty.
   Tapping it raises `Alert.alert('New Session', 'Clear this conversation with {name} and start
   fresh?')` with Cancel / **New Session** (destructive) → clears local state and
   `clearThread(counselorId)` (which upserts an empty message array).
2. **Empty state**: a 56px muted person icon, the italic line *"Begin your private conversation
   with {name}."* and the role in gold.
3. **Messages**: user bubbles right-aligned (`rgba(201,168,76,0.15)` fill, full gold border, 16px
   radius with a 4px bottom-right corner, max 80%); counselor bubbles left-aligned (`#16213e`,
   `#c9a84c33` border, 4px bottom-left corner, max 85%) with an uppercase gold name label and,
   on the same row, a **share icon** that opens `ShareQuoteModal` with that message. All message
   text is `selectable`.
4. **Loading bubble**: name label + spinner + italic *"Composing a response..."*.
5. **"Bring to the Cabinet →"** bar — appears once `messages.length >= 2`. It builds
   `cabinetContext = JSON.stringify({ counselorName, topic: <last user message>,
   counselorLastResponse: <last assistant message truncated to 200 chars + '...'> })` and pushes
   that to the Cabinet tab as a param.
6. **Input bar**: multiline input (`maxHeight: 120`, `maxLength={2000}`, placeholder
   `Speak to {name}...`) and a round gold send button.
7. **Limit counter** (free tier only): a thin strip reading
   `"{max(0, maxMessages - messageCount)} messages remaining today"`.

### Modals / overlays
- **`ShareQuoteModal`** (`components/ShareQuoteModal.tsx`) — renders the quote on a card,
  captures it to PNG via `react-native-view-shot`'s `captureRef`, and hands it to
  `expo-sharing`'s `shareAsync`. **Platform-only** in its current form; on the web this becomes
  a canvas/SVG render plus a download or the Web Share API.
- **Access-blocked overlay** — a full-screen `#1a1a2eee` scrim over a `#16213e` panel:
  title "Counselor Locked", body *"Free members have access to Marcus Aurelius, Epictetus, and
  David Goggins. Upgrade to Arete to unlock all 23 counselors."* (⚠️ this copy is **stale** —
  `FREE_COUNSELOR_SLUGS` is now marcus/goggins/roosevelt, Epictetus is paid), a gold
  **"Upgrade to Arete"** button → `/paywall?src=locked_counselor`, and a **"Go Back"** link →
  `/(tabs)/cabinet`. Shown when `getSubscriptionTier() === 'free'` and the counselor id is not in
  `FREE_COUNSELOR_SLUGS`. The overlay renders *over* a functioning chat — it does not unmount it.

### Tier limits and the daily counter
Two independent mechanisms, both active:
1. **Client-side, AsyncStorage.** Key `daily_messages_YYYY-MM-DD` (e.g.
   `daily_messages_2026-09-02`), an integer string. Read on mount into `messageCount`. Before
   each send, re-read; if `maxMessages !== null && count >= maxMessages` →
   `router.push('/paywall', { src: 'counselor_daily_limit' })` and the send is abandoned. On a
   successful reply the key is incremented. `maxMessages` comes from `hooks/useTierLimits` →
   **10 for free, `null` (unlimited) for premium and pro**. Old date keys are never cleaned up.
2. **Server-side, Supabase.** `sendMessageToCounselor` calls `checkAndIncrementMessageCount()`
   first, which enforces `MESSAGE_LIMITS` (free 10 / premium 50 / pro unlimited) against
   `profiles.daily_message_count` + `profiles.message_count_date`. On refusal it throws
   `MessageLimitError`, which the screen catches → same paywall push with the same `src`.

On any send failure the optimistic user message is rolled back (`prev.slice(0, -1)`).

### Data
- `loadThread(counselorId)` / `appendMessages` / `clearThread` (`services/threadService.ts`) →
  `getThread`/`upsertThread` in `lib/db.ts` → the **`cabinet_conversations`** table (thread id
  `'cabinet'` maps to the group conversation; anything else to a per-counselor row).
  Threads are capped at `MAX_STORED_MESSAGES = 200` on write. Timestamps below `1e12` are
  treated as seconds and multiplied by 1000 (iOS notification dates arrive in seconds).
- `getUserSettings()` (Future Self naming, counselor model assignment).
- `getSubscriptionTier()` → `profiles.tier`, `profiles.is_premium`.

### Server call
`sendMessageToCounselor(counselorId, messages)`:
1. `checkAndIncrementMessageCount()` (see above).
2. Context window: last `CONTEXT_WINDOW_SIZE = 15` messages, with a `summaryNote` prepended when
   older history exists: `"[Conversation context: This is an ongoing conversation. {n} earlier
   messages exist. The most recent 15 are included below.]"`
3. System prompt = counselor persona + memory block (`conversation_memory` table) +
   `gatherAppContext()` + an optional "what's new" note.
4. `POST {API_BASE_URL}/api/chat/counselor`, headers
   `{ 'Content-Type': 'application/json', 'x-subscription-tier': tier, Authorization: 'Bearer <jwt>' }`,
   body:
   ```json
   { "model": "<per-counselor assigned model>", "max_tokens": <MAX_TOKENS_BY_TIER[tier]>,
     "system": "<full system prompt>", "messages": [{role, content}...],
     "userProfile": {<Know Thyself fields>}, "counselorSlug": "<id>",
     "tzOffsetMinutes": <n>, "activeCounselorId": "<id>", "userId": "<uuid>" }
   ```
   Response read as `data.content[0].text`. A non-2xx returns (does not throw) the string
   `"Your counselor is temporarily unavailable. (Error {status})"`, which is then rendered as the
   counselor's reply — sloppy, worth fixing on the web.
5. **Background memory summarisation** — when `messages.length >= 4`, fire-and-forget
   `POST {API_BASE_URL}/api/memory/summarize` with
   `{ counselorSlug, counselorName, userName, messages }`; the returned `summary` is written to
   the **`conversation_memory`** table via `saveConversationMemory`.

`gatherAppContext()` assembles, from Supabase: today's date, a "Know Thyself not complete" note
if applicable, morning/evening routine task completion from `check_ins` (**gated on the
`getShareRoutinesWithCabinet()` AsyncStorage flag**), the evening reflection and stoic journal
answers, the last 3 `reflection` journal entries (truncated to 300 chars), and encoded beliefs.
Sibling context builders — `buildAttendContext` (Screen Time), `buildHealthContext` (HealthKit),
`buildCalendarContext` — are also composed into counselor prompts; the first two are
**platform-only** (see §17).

### Platform-only
Share-to-PNG (`react-native-view-shot` + `expo-sharing`); `BackHandler` (Android hardware back);
`KeyboardAvoidingView`. The Attend and Health context blocks that feed the prompt are iOS-only —
on the web they should degrade to the honest "you cannot see it because …" text those builders
already emit.

---

## 10. `app/my-cabinet/index.tsx` — My Cabinet

Layout: `app/my-cabinet/_layout.tsx` is a headerless `Stack`.

### Purpose and navigation
Route `/my-cabinet`, entered from the **Cabinet tab** (`app/(tabs)/cabinet.tsx:1154`). Header:
back arrow → `router.push('/(tabs)/cabinet')`, title "My Cabinet" (22px bold gold), spacer.
The Customize button routes to `/my-cabinet/select` for premium users, or opens a paywall modal
for free users.

Reloads on `useFocusEffect` (so a save in `/select` is reflected on return).

### Features in layout order
1. **Future Self card**, pinned first: gold 2px border, uppercase gold label "ALWAYS PRESENT",
   name "Future Self", description *"Your ideal self, years from now, guiding you forward."*,
   and the model picker keyed `'future-self'`.
2. **One `CounselorCard` per cabinet member** from `getUserCabinet()`, each rendered
   `isSelected` and non-interactive (`onToggle` is a no-op), with the model picker injected as
   the card `footer`. Model key = `modelKeyForSlug(slug)` = `normalizeCounselorId(slug)`, except
   `futureSelf` → `'future-self'`.
3. Empty state: *"No counselors selected yet."*
4. **Footer**: full-width `#16213e` outlined button **"✦ Customize Cabinet"**.

### The model ("Mind") picker
A wrapping chip row inside each card: a 10px uppercase label "MIND" then one pill per option from
`lib/llmModels.ts`:

| id | label | provider |
|---|---|---|
| `claude-opus-4-6` | Claude Opus | Anthropic |
| `claude-sonnet-4-6` | Claude Sonnet | Anthropic |
| `claude-haiku-4-5` | Claude Haiku | Anthropic |
| `gpt-5.1` | GPT-5.1 | OpenAI |
| `gemini-3-pro-preview` | Gemini 3 Pro | Google |
| `grok-4-fast-non-reasoning` | Grok 4 | xAI |

`DEFAULT_COUNSELOR_MODEL = 'claude-opus-4-6'`. Unselected chip: `#1a1a2e` fill, `#2a2a3e` border,
`#888` text. Selected: `#c9a84c18` fill, gold border, gold text. Selecting one immediately
`upsertUserSettings({ counselor_models: {...} })` — optimistic, with only a `console.warn` on
failure and **no tier gate in the UI**. The file comment is explicit that this list is
presentation only: *"The server clamps whatever the client sends to the subscription tier
(free → Haiku, premium → Sonnet/Haiku, pro → everything)"*, and the list must stay in sync with
`ALLOWED_COUNSELOR_MODELS` in `server/index.js`.

### Paywall modal (free tier taps "Customize Cabinet")
A transparent fade modal over `#000000bb`: `#16213e` panel, title "Custom Cabinet", subtitle
*"Custom Cabinet is a Premium feature"*, body *"Choose from 23 counselors across 6 categories to
build your ideal advisory board."*, gold **"Upgrade to Premium"** → `/paywall?src=custom_cabinet`,
and a **"Maybe Later"** dismiss.

### Data
`getUserCabinet()` — reads `user_settings.cabinet_members` (falling back to
`['marcus','roosevelt']`), strips `futureSelf`, **and for free-tier users filters to
`FREE_COUNSELOR_SLUGS`** (falling back to the defaults if that empties the list), then
`getCounselorsBySlugs()` → `counselors` table. `getIsPremium()` → `profiles.tier`/`is_premium`
with the dev override applied first. `getUserSettings()` → `counselor_models`.

### Platform-only
None.

---

## 11. `app/my-cabinet/select.tsx` — Counselor Library (cabinet selection)

### Purpose and navigation
Route `/my-cabinet/select`, reached only from My Cabinet's Customize button (premium only).
Header: back arrow → `router.push('/my-cabinet')`, title "Counselor Library" (20px bold gold).
Save → `saveCabinetSelection()` then `router.back()`. Reloads on `useFocusEffect`; if there is no
authenticated user it immediately `router.back()`.

### Features in layout order
1. **Category filter bar** — horizontal scrolling pills. Categories are hardcoded:
   `All, Stoics, Warriors, Athletes, Builders, Writers, Spiritual` (values `all, stoics,
   warriors, athletes, builders, writers, spiritual`). Active pill = gold fill, `#1a1a2e` label.
2. **Selection counter row**: `"{n} of {max} selected"` in gold on the left; when `n < 3`, the
   hint *"Select at least 3"* in grey on the right.
3. Error line (`#f87171`): *"Failed to save. Please try again."*
4. **Counselor list** (`FlatList`), with the Future Self card as `ListHeaderComponent`
   (always-selected, non-interactive; if the `futureSelf` row is missing from the DB, a plain
   placeholder card renders instead). The list itself excludes `FUTURE_SELF_SLUG`, filters by the
   active category, and **sorts `STARTER_CABINET_SLUGS` (`marcus`, `roosevelt`) to the top**.
5. **`CabinetPreview`** pinned at the bottom: uppercase gold "YOUR CABINET", a horizontal pill row
   with Future Self always first (gold-tinted pill) followed by each selected counselor, and a
   full-width gold **"Save Cabinet"** button (label becomes "Saving…"; `opacity 0.5` when
   `canSave` is false).

### Tier limits and gating
- `maxCounselors = tier === 'free' ? 3 : 5`. Note this is the *cabinet size* cap and is unrelated
  to `useSubscription`'s `maxCounselors` (3/23/23), which counts *accessible* counselors.
- `isLockedForTier(slug)` = free tier && slug not in `FREE_COUNSELOR_SLUGS`.
- Tier state initialises to `'free'` and **fails closed** deliberately, so locked counselors never
  flash as selectable during the initial fetch.
- On load, a free user's pre-selected set is filtered down to only the free slugs.
- Tapping a locked card opens the **Counselor Locked** modal (not a toggle): body *"Upgrade to
  Arete to unlock all 23 counselors across 6 categories and build your ideal advisory board."*,
  gold button **"Upgrade to Arete — $9.99/mo"** → `/paywall?src=cabinet_select_locked`, plus
  "Maybe Later".
- Toggling at the cap is a silent no-op (the card is rendered `isDisabled` at `opacity 0.4`).
- **Save is blocked below 3 selections** (`handleSave` returns early; the button is disabled).

### `CounselorCard` visual spec (shared with My Cabinet)
`#16213e`, 12px radius, 14px padding, 1px `#2a3a5c` border, 10px bottom margin. Selected /
Future Self → gold 2px border. Disabled → `opacity 0.4`. Locked → `opacity 0.55`, `#333` border.
Contents in order: a badge row (category badge, then challenge-level badge), the name (16px bold
`#e0e0e0`), `one_line` (13/18 `#888`, 2 lines max), then conditional adornments — "Always
Present" (gold, Future Self only), a "Starter" badge (top-right, gold-tinted), a gold `✓`
(bottom-right, selected non-Future-Self non-locked), a lock badge (bottom-right, `#222` chip
with padlock + the word "Arete"), and finally the optional `footer` node.

Badge colours by category: stoics gold `rgba(201,168,76,0.2)`/`#c9a84c`; warriors red
`rgba(239,68,68,0.2)`/`#fca5a5`; athletes blue `rgba(59,130,246,0.2)`/`#93c5fd`; builders green
`rgba(34,197,94,0.2)`/`#86efac`; writers purple `rgba(168,85,247,0.2)`/`#d8b4fe`; spiritual indigo
`rgba(99,102,241,0.2)`/`#a5b4fc`. Challenge level: direct `#f87171`, firm `#fde047`,
gentle `#86efac`.

### Data
`getCounselors()` → `counselors` ordered by `sort_order`; `getUserCabinet()`;
`getSubscriptionTier()`; `saveCabinetSelection(slugs)` → `upsertUserSettings({ cabinet_members:
[...slugs without futureSelf, 'futureSelf'] })` — Future Self is always appended last.
`Counselor` columns used: `id, name, slug, category, one_line, bio?, challenge_level?,
is_active?, is_default?, sort_order?`.

### Platform-only
None.

---

## 12. `app/library/index.tsx` — The Reading Room

### Purpose and navigation
Route `/library`. Entered from the **Side menu** (`components/SideMenu.tsx`, "The Library" item —
**premium-gated**, free users get `/paywall?src=menu_library`) and from the **Scrolls tab**
(`app/(tabs)/scrolls.tsx:112`). Header: back arrow, "The Reading Room". No params.

Navigates to `/library/reader` (with `{author, work, title}`, plus `page` from a search hit),
`/library/symposium`, `/library/observatory`.

### Features in layout order
1. Intro line (italic, centred): *"Every primary source, in full — the Stoics first, and the
   wider tradition beside them."*
2. **Symposium door** — a gold-tinted card (`#c9a84c11` fill, `#c9a84c44` border) with a 44px
   round icon showing the glyph `⟡`, title "The Symposium", subtitle *"Sit with a master and put
   your question to the tradition."*, and a chevron.
3. **Observatory door** — same card style, telescope icon, title "The Observatory", subtitle
   *"What the corpus is thinking — open questions, tensions, and where it converges."*
4. **Global search row** — a text input (placeholder *"Search every work on the shelves…"*,
   `returnKeyType="search"`), an inline clear `✕` (only when non-empty), and a square gold search
   button. **Minimum query length is 3 characters** (the button is inert below that and the icon
   greys to `#555`).
5. Search results, when `searchHits !== null`: shelf label "FOUND IN THE STACKS" then one card per
   hit showing `"{author} · {title}[ · {section}]"` in gold and a 3-line italic snippet wrapped in
   ellipses (`…{snippet}…`). Tapping opens the reader at that hit's `page`. Zero hits →
   *"Nothing found for that on the shelves."*
6. **Three shelves**, each rendered only if non-empty, each with an uppercase gold shelf label:
   - **The Stoic Shelf** (`tradition === 'stoic'`)
   - **The Wider Tradition** (`tradition === 'wider'`)
   - **Syntheses** (`tradition === 'synthesis'`)
   Sorted by author then title. Each work is a `#16213e` card: uppercase gold author,
   17px white title, a 2-line italic excerpt (`#8890a8`), and a footer row with `era` on the left
   and `"{n} passages"` on the right, both 11px `#555`.

### States
Loading → centred gold spinner. Error → a muted library icon plus *"The shelves could not be
reached."* (or the server's `error` string).

### Server calls (all public, no auth)
- `GET {API_BASE_URL}/api/library/texts` → `{ texts: LibText[] }` where `LibText =
  { id, author, work, title, era, textType: 'primary'|'synthesis',
  tradition: 'stoic'|'wider'|'synthesis', passages: number, translator: string|null,
  excerpt: string }`.
- `GET {API_BASE_URL}/api/library/search?q={query}` → `{ results: [{author, work, title,
  section: string|null, page: number, snippet: string}] }`.

### Platform-only
None. Fully portable.

---

## 13. `app/library/reader.tsx` — The Reader (the most complex screen in this pass)

### Purpose and navigation
Route `/library/reader`. Entered from the Reading Room (a work card or a search hit), and from the
Symposium's "Read the source" card.

**Params consumed**: `author` (required), `work` (required), `title` (display fallback),
`page` (initial folio index, parsed with `Math.max(0, parseInt(...) || 0)`), `p` (initial
paragraph index — only accepted if it matches `/^\d+$/`).

Navigates back via `router.back()`, and to `/paywall` when the corpus gate fires.

### View modes and theming
A **scroll (dark)** and a **book (paper)** view, toggled by a header button
(`reader-outline` ⇄ `book-outline`) and persisted to AsyncStorage key **`lib-reader-view`**
(values `'scroll' | 'book'`). Two full theme objects:
- `INK`: bg `#1a1a2e`, title `#fff`, text `#e8e8ee`, first-paragraph `#f4ead5`, muted `#7d7f88`,
  gold `#c9a84c`, rule `#c9a84c33`, track `#2a2a3e`, disabled `#555`, search mark `#c9a84c55`,
  flash `#c9a84c2a`, gutter number `#5a5c66`.
- `PAPER`: bg `#f6efe0`, text/title `#2b2416`, muted `#7a6a4a`, gold/heading `#6b4e14`,
  rule `#6b4e1433`, track `#e6dcc6`, disabled `#b5a88c`, mark `#c98c1e55`, flash `#c98c1e33`,
  number `#a89877`.

In **book** view the masthead is replaced by a running head (author left, title right, mono 9px
uppercase `letterSpacing: 1.6`), body text is justified (17/27), chapter openers get a **40px
drop cap**, and a folio footer reads `folio {n} of {m}`. In **scroll** view the folio opens with a
centred masthead: uppercase gold author, 24px serif title, an italic meta line
`"{era}  ·  trans. {translator}"`, and a 40%-width gold divider.

### Header and chrome
Back arrow; the work title (15px bold, 1 line, centred); then four right-side buttons: view
toggle, **search** (`search-outline`), **outline** (`list-outline`). A 2px progress bar under the
header shows `((page+1)/totalPages)*100` in gold, rendered only when `totalPages > 1`.

### Paragraph rendering
The folio body is split on `/\n\n+/`. For each paragraph:
- **Headings** are detected heuristically by `isHeading()`: length ≤ 72 **and** (no lowercase
  letters at all, or matching `/^(Chapter|Book|Letter|Part|Section)\s+[IVXLCDM0-9]+\.?$/`).
  Headings render as mono 11px uppercase gold with `letterSpacing: 2.2`, indented 40px, and have
  no gutter.
- **Drop caps** (book view only) apply when the paragraph is the first prose paragraph after a
  heading, or the very first paragraph of page 0 — never a folio's first paragraph that merely
  continues a sentence.
- Every non-heading paragraph has a **34px gutter** containing the 1-based paragraph number
  (mono 9px) and a **note badge**: either `✎ {n}` in gold on a gold-tinted chip when notes exist,
  or a small grey `+` when they don't. Tapping the badge opens the marginalia sheet.
- Search matches are wrapped in a highlighted span using the theme's `mark` background. The
  highlighter bails out if accent-folding changed the string length (so offsets stay valid).
- A jumped-to paragraph **flashes** with the theme's `flash` background for 2400 ms.

### Jump resolution (the clever bit)
`Jump = { page, para?, marker?, query?, snippet?, open? }`. After a folio loads, `resolvePara`
finds the target paragraph by, in order:
1. explicit `para` index (if in range);
2. a `marker` (an outline heading) matched against accent-folded, trailing-period-stripped
   paragraph text, allowing prefix matches;
3. a `query` — all paragraphs containing the folded query are candidates; if there is more than
   one and a `snippet` is available, the snippet is chopped into overlapping 14-char windows and
   the candidate matching the most windows wins.

The actual scroll happens on the target paragraph's `onLayout` (refs, not state, because native
layout events can beat a re-render), offsetting `y - 90`.

### Modals (three bottom sheets)
All share: `rgba(0,0,0,0.55)` scrim, a tap-to-dismiss area above, a `#16213e` sheet with 20px top
corners, a gold-tinted top border, a 40×4 grey drag handle, and an uppercase gold sheet title.

**1. Contents (outline)** — lazy-loads on first open:
`GET {API_BASE_URL}/api/library/outline?author=&work=` → `{ sections: [{label, page, level?, key?,
marker?}] }`. Rows show the label (serif 15px `#e0d5b5`; `level > 1` gets 16px indent, 13.5px,
`#9a9280`) and the 1-based page on the right (mono 11px). The row matching the current folio is
highlighted gold with a `#c9a84c11` background. Empty → *"This text carries no section markers.
Move by folio or search instead."*

**2. Search this text** — input (`autoFocus`, placeholder *"A phrase, a theme, a word…"*, min 3
chars) + gold search button.
`GET {API_BASE_URL}/api/library/search?q=&author=&work=` → same shape as the global search.
Hint: *"Tap a passage to go to it, then mark the paragraph to leave a note."* Each hit shows
`"Folio {n}[ · {section}]"` in gold and a 3-line italic snippet. Tapping sets `activeQuery`
(which turns on in-folio highlighting) and jumps. A **"clear search marks"** link appears at the
bottom of the folio while `activeQuery` is set. Empty → *"Nothing found for that in this text."*

**3. Marginalia — "Notes on ¶ {n}"** (`ThreadSheet`), max height 86%:
- **The passage box**: gold 2px left border, `#ffffff08` fill, mono label "THE PASSAGE", and the
  paragraph excerpt (truncated to 200 chars on a word boundary + `…`).
- **"✶  Ask the corpus"** button (mono uppercase gold on a gold-tinted chip; label becomes
  *"✶  The corpus is reading…"* while working) with the hint *"the whole tradition weighs in,
  citing its shelves"*.
- **Pro gate**: a `CorpusGateError` (HTTP 403 with `error: 'pro_required'`) renders the line
  *"Conversing with the Library is an Arete Pro feature. Reading is always free."* with an
  underlined **"See Pro"** that closes the sheet and pushes `/paywall`. Note: **no `src` param**
  here, unlike every other paywall entry — worth adding.
- **Threads**: root notes and their replies (replies-to-replies flatten under the root, walking up
  a max of 20 hops). Each note row shows a mono uppercase handle (gold if it's yours or the
  corpus's) plus a relative timestamp (`just now`, `{n}m ago`, `{n}h ago`, `{n}d ago`, then an
  absolute date past 30 days). Corpus notes render as `✶ The Corpus` on a gold-bordered card, with
  a trailing sources line: `"drawing on {Author}, {Title} · …"`. Replies are indented 14px behind a
  gold hairline. Actions per note: `reply` (always) and `remove` (only when
  `c.user_id === viewer.userId`, or the note is a corpus note the viewer requested).
  Delete confirms via `Alert.alert('Remove this note?', 'Replies to it will be removed too.')`.
- **Composer**, three states:
  - *No handle yet*: hint *"Choose the handle other readers will see beside your notes."*, an
    input (`maxLength 20`, `autoCapitalize:none`, placeholder `your_handle`) and a checkmark
    button. Validation `HANDLE_RE = /^[a-z0-9_]{3,20}$/i`; failure →
    *"A handle is 3 to 20 letters, numbers, or underscores."*; a save error →
    *"That handle could not be saved. It may already be taken."*
  - *Has handle*: an optional "Replying to {handle}" chip with a `✕`, a multiline input
    (placeholder *"What does this say to you, and why does it matter?"*, or *"Your reply…"*), an
    up-arrow send button, and the footer `"as {handle} · public"`. Replying to a reply
    pre-fills the draft with `@{handle} `.
  - *Not signed in*: *"Sign in to write in the margin."*
- Empty threads → *"No notes here yet. If this passage struck you, say why, for the next reader."*

### Note anchoring (`seated`)
`ANCHOR_CHARS = 120`. Each comment stores the first 120 characters of the paragraph it was written
on. On render, if the paragraph now at `c.para_index` no longer starts with the stored anchor
(compared on the first 40 folded chars, in either direction), the reader searches the folio for a
paragraph that does and **re-seats the note there**. This makes notes survive a re-paragraphed
folio. The web port must implement the same logic or notes will drift.

### Data — `lib/libraryComments.ts` → Supabase table **`library_comments`**
Columns: `id, text_author, text_work, page, para_index, anchor_text, quote, parent_id, user_id,
handle, body, created_at, is_corpus, requested_by, sources (jsonb array of {author, work, title})`.
- `loadComments(author, work, page)` — `SELECT *` filtered on all three, ordered `created_at asc`.
- `postComment({...})` — `INSERT` (anchor sliced to 120 chars), returning the row.
- `deleteComment(id)` — `DELETE`.
- `getViewer()` — `supabase.auth.getSession()` then `SELECT handle FROM profiles WHERE id = user`
  (`maybeSingle`). Returns `{ userId, handle }` or `null`.
- `saveHandle(userId, handle)` — `UPDATE profiles SET handle`.

### Server calls
- `GET {API_BASE_URL}/api/library/text?author=&work=&page={n}` (public) →
  `{ author, work, title, era, translator, page, totalPages, totalPassages, body }`.
  The server paginates at **30 passages per folio**.
- `GET {API_BASE_URL}/api/library/outline?author=&work=` (public).
- `GET {API_BASE_URL}/api/library/search?q=&author=&work=` (public).
- `POST {API_BASE_URL}/api/library/annotate` with `Authorization: Bearer <jwt>` and body
  `{ author, work, page, paraIndex, anchorText, passage, quote, parentId }` →
  `{ comment, existing?, remaining? }`. 403 + `error:'pro_required'` → `CorpusGateError`.
  If `existing` comes back true the sheet shows *"The corpus already wrote here."*

### Pager
When `totalPages > 1`, a bottom bar with **Prev** / **Next** (disabled and dimmed at the ends) and
a centre label `"Folio {n} of {m}[  ·  {k} note(s)]"`.

### Platform-only
`AsyncStorage` for the view preference (→ localStorage), `Alert.alert` for delete confirmation,
`KeyboardAvoidingView`. Nothing structural.

---

## 14. `app/library/observatory.tsx` — The Observatory

### Purpose and navigation
Route `/library/observatory`, entered from the Reading Room's Observatory door. Header: back arrow,
"The Observatory". No params. Links out to `https://academy.pursuearete.com/library` via
`Linking.openURL`.

The file comment states the design intent: the phone gets a **filterable feed of compact cards**;
*"the live star map stays web-only"*. Since the web port is the place the star map lives, this
screen is the one where the mobile version is the reduced one.

### Server calls (five, all public, in parallel; any failure yields `null` for that slice)
- `GET {API_BASE_URL}/api/observatory/world` → `{ world: { dominantSignal, tension, authors[], week } }`
- `GET .../api/observatory/tensions` → `{ tensions: [{id, title, firstSentence, authors[]}] }`
- `GET .../api/observatory/inquiries` → `{ inquiries: [{id, question, confidence, authorCount}] }`
- `GET .../api/observatory/dreams` → `{ dreams: [{id, dreamType, title, content, firstLine, seedAuthors[]}] }`
- `GET .../api/observatory/convergences` → `{ convergences: [{id, title, conclusion, entailment,
  novelty, authors[], traditions[], spread, pursuit, breakpoint, starred}] }`

### Feed assembly
One unified list, in this order: **convergences → inquiries → tensions → dreams → world**.

| kind | tag | line | meta | dot colour |
|---|---|---|---|---|
| `conclude` | "The corpus concludes" (+ " · starred" when `starred`) | `title` | `"{n} voices · spread {spread.toFixed(2) or 'n/a'}"` | `#5ab0c9` |
| `inquiry` | "Open inquiry" | `question` | `"Pursued across {n} author(s)[, {confidence}]"` | `#c9a84c` |
| `tension` | "Open tension" | `title` | `firstSentence — authors joined` | `#d97a6a` |
| `imagines` | "The corpus imagines" | `content \|\| title \|\| firstLine \|\| 'A thought'` | `"Dreamed from {seedAuthors}"` | `#9a7ad9` |
| `world` | "The corpus is responding to" | `dominantSignal` | first 3 authors | `#d99a6a` |

### Features in layout order
1. Intro (italic, centred): *"What the corpus is working through right now. Filter by kind, then
   open one to read it in full."*
2. **Filter chips** — horizontally scrolling pills, `All` plus **only the kinds that actually have
   items**. Each chip has a coloured dot matching its kind. Active chip: `#c9a84c17` fill,
   `#c9a84c73` border, `#f4ead5` text. Labels: `Concludes / Inquiries / Tensions / Imagines / World`.
3. **Feed cards** — `#ffffff05` fill, 12px radius, 1px `#c9a84c1a` border, and a **3px left border
   in the kind's colour**. Contents: dot + uppercase 9px tag row; the line (16/22 `#f4ead5`,
   3 lines max); for convergences, a pill row with `entailment` (cyan pill) and `novelty`
   (underscores replaced with spaces); the meta line (11px `#888`, 2 lines max); and for
   convergences a gold CTA `"READ THE REASONING →"`. **Only convergence cards are tappable.**
4. When a filter yields nothing: *"Nothing of this kind right now."*
5. **"Explore the full Observatory"** — a full-width gold button (planet icon + external-link
   icon) opening the academy URL, with the hint *"The living star map of the corpus — on the web at
   academy.pursuearete.com"*.
6. Global empty state (nothing loaded at all): telescope icon + *"The sky is quiet tonight. Check
   back soon."*

### Convergence modal
A bottom sheet (`#121b36`, cyan `#5ab0c966` border, max 88% height) containing, in order:
tag row + close `✕`; the `title` (22px `#f4ead5`); the `conclusion` (16/24); a bordered italic
**disclosure** box — *"A conclusion the corpus assembled from passages that sit far apart in it,
reviewed by a human before appearing here. It is not a source text, and not the claim of any
single thinker."* (this is a content-integrity statement and must survive the port verbatim);
a pill row (`entailment · {x}`, `novelty · {x}`, `"{n} voices · {m} traditions"`); then
**"THE BREAKPOINT · REMOVE THIS AND IT COLLAPSES"** in a cyan-tinted box with italic text;
**"THE PURSUIT"** as plain prose; and **"ASSEMBLED FROM"** listing authors joined by ` · `.

### Platform-only
`Linking.openURL` (→ a plain `<a target="_blank">`). Otherwise fully portable.

---

## 15. `app/library/symposium.tsx` — The Symposium

### Purpose and navigation
Route `/library/symposium`, from the Reading Room's Symposium door. Header: back arrow, title
"The Symposium" (18px `#e0d5b5`), subtitle *"Sit with a master of the tradition"*, and — once
known — a right-aligned `"{n} left today"` counter. Navigates to `/library/reader` from a
source card.

### Masters (hardcoded, 7)
| id | name | voice | initial | `oracleAuthor` |
|---|---|---|---|---|
| `corpus` | The Corpus | Many minds, one counsel | `✶` | `null` |
| `socrates` | Socrates | Asks until you know | `Σ` | `null` |
| `zeno` | Zeno of Citium | Founder of the Porch | `Z` | `null` |
| `epictetus` | Epictetus | Unsparing, exact | `E` | `'Epictetus'` |
| `marcus` | Marcus Aurelius | Calm, reflective | `M` | `'Marcus Aurelius'` |
| `seneca` | Seneca | Warm, worldly | `S` | `'Seneca'` |
| `montaigne` | Michel de Montaigne | Curious, candid | `M` | `'Michel de Montaigne'` |

Each carries a bespoke `greeting` shown as the opening bubble (e.g. Epictetus: *"Begin here: in
this trouble of yours, what is actually yours to command? Name it plainly and we will start."*).
Socrates and Zeno have no `oracleAuthor` filter, so they answer from the whole corpus in a
distinct voice.

### Features in layout order
1. **Master picker** — horizontal row of 84px-wide chips, each a 40px round avatar showing the
   initial plus the name below. Active: avatar filled gold with `#1a1a2e` initial, chip background
   `#c9a84c11`, name `#e0d5b5` semibold. **Switching master clears the transcript.**
2. **Thread**: the seated master's greeting bubble first (label `"{name} · {voice}"`), then the
   exchange. User bubbles are right-aligned with a **solid gold fill** and `#1a1a2e` text (unlike
   every other chat in the app, which tints); master bubbles are `#16213e` with a gold-tinted
   border, a gold name label, and `#e0d5b5` text. Thinking state: spinner + *"{name} considers…"*.
3. **Source card** — when a reply carries a usable source, an inline gold-tinted card with a book
   icon reading `"Read the source: {title}"` and a chevron; tapping pushes the reader with
   `{author, work, title}`. Sources whose `textType === 'paper_summary'` are **excluded** (a
   summary is not a readable shelf).
4. **Input bar**: multiline (`maxLength={500}`), placeholder `Ask {name}…`, round gold send
   button. Both are **disabled entirely when `remaining === 0`**.

### Server call
`POST {API_BASE_URL}/oracle` — note this is at the server root, **not** under `/api`. Public, no
auth. Body: `{ question, author: master.oracleAuthor, history }`, where `history` is the last 6
messages remapped to `{role: 'user'|'assistant', content}`.

Response: `{ answer, sources: [{author, work, title, textType}], remaining: number }`.
`remaining` drives the header counter. **HTTP 429** sets `remaining = 0` and pushes the server's
`message` (or the fallback *"You have reached the free dialogues for today. Return tomorrow."*)
into the thread as a master turn. Rate limiting is **IP-based, 15/day, enforced server-side** —
there is no per-user tier gate on this screen. Network failure → *"The Oracle is unreachable.
Please try again."*; a missing answer → *"The Oracle is silent."*

### Platform-only
None. Fully portable.

---

## 16. `app/dispatch.tsx` — Daily Dispatch reader

### Purpose and navigation
Route `/dispatch`. Two entry points:
- **Notification tap** (`app/_layout.tsx:90`) with `dispatch_id`;
- **Journal tab's "Today's Dispatch" card** (`app/(tabs)/journal.tsx:731`), also with the id.
With no `dispatch_id` param it falls back to today's dispatch.

Header: back arrow, centred white "Daily Dispatch", spacer.

### Server call
```
GET {API_BASE_URL}/api/dispatch/{id}      // when dispatch_id is present
GET {API_BASE_URL}/api/dispatch/today     // otherwise
Headers: { Authorization: 'Bearer <supabase access_token>' }
```
Response `{ dispatch: { id, dispatch_date, title, body, teaser, practice,
community_themes?: [{theme, frequency}], corpus_context?: { latestSynthesisTitle,
latestSynthesisConcept, recentNewAuthors: string[] } } }`.

### States and layout
- No session → *"Please sign in to read the dispatch."*
- Non-2xx → the server's `error` or *"Could not load the dispatch."*
- 200 with no `dispatch` → *"Today's dispatch hasn't arrived yet. Check back this morning."*
  (all errors render with a faint `sunny-outline` icon, centred)
- Loading → gold spinner.
- Loaded, in order:
  1. **Date** — `dispatch_date + 'T00:00:00'` formatted `"Monday, March 2"` (weekday, month, day),
     uppercase gold 12px with `letterSpacing: 1.2`, centred.
  2. **Title** — 24px bold white, centred, 32 line-height.
  3. A 40%-width centred gold divider.
  4. **Body** — 17/28 `#e8e8ee`.
  5. Another divider.
  6. **"TODAY'S PRACTICE"** label (uppercase gold 13px) and the practice text in **italic white
     16/26**.
  7. Footer, only if `corpus_context.recentNewAuthors` has entries: `"Grounded in: {a, b, c}"`
     (12px `#666`, centred).

Note: `teaser` and `community_themes` are typed but **never rendered** on this screen.

### Platform-only
None on the screen itself; its primary entry point (the push notification) is native-only.

---

## 17. `app/settings.tsx` — Settings (1446 lines)

### Purpose and navigation
Route `/settings`, entered from the home tab's gear icon (`app/(tabs)/index.tsx`). Header: back
arrow plus the title "⚙️ Settings" (28px bold gold). Whole screen is one `ScrollView` with 25px
padding; sections are `#16213e` cards with 16px radius and a gold hairline border.

### Section order (top to bottom)
1. Know Thyself shortcut
2. ☀️ Morning Check-In
3. 🌙 Evening Check-In
4. 📋 Midday Task Reminder
5. 💪 David Goggins — Workout Reminder
6. 📖 Reading Reminder
7. 🔮 {Future Self label} — Daily Check-In
8. 🛡️ Attend & Cabinet Privacy *(conditional: `attendIsSupported()`)*
9. ❤️ Health & Cabinet *(conditional: `healthIsSupported()`)*
10. 🗓️ Calendar & Cabinet *(conditional: `calendarIsSupported()`)*
11. Upgrade to Premium / Manage Subscription
12. Privacy Policy
13. Save & Schedule Notifications
14. Sign Out
15. Delete Account
16. Footer note
17. DEV ONLY section *(conditional: `EXPO_PUBLIC_DEV_MODE === 'true'`)*

### 17.1 Know Thyself shortcut
A single `#16213e` row button: **"📖 Edit Your Know Thyself Profile"** → `/know-thyself`.

### 17.2 The six notification reminders — **entirely native, out of scope for the web port's core**

Each is a card with an emoji title, a `Switch` (track `#333` off / `#c9a84c` on, white thumb), a
quotation subtitle, and — when enabled — a time button that opens a native time picker.

| Section | State key(s) | Default | Subtitle |
|---|---|---|---|
| Morning Check-In | `morningEnabled`, `morningHour/Minute` | on, 7:00 | *"Begin at once to live, and count each separate day as a separate life."* |
| Evening Check-In | `eveningEnabled`, `eveningHour/Minute` | on, 20:00 | *"Confine yourself to the present."* |
| Midday Task Reminder | `taskReminderEnabled`, `taskReminderHour/Minute` | on, 12:00 | *"Your counselors rotate midday — keeping you on task."* |
| Workout Reminder | `workoutReminderEnabled`, … | on, 6:00 | *"Stop making excuses and get after it."* |
| Reading Reminder | `readingReminderEnabled`, … | on, 21:00 | *"The impediment to reading? There is none. Only the choice."* |
| Future Self Daily Check-In | `futureKyleEnabled`, … | **off**, 15:00 | *"Is what you're doing right now something I would recognize? — {Future Name}"* plus the inline hint *"Off by default — opt in when ready."* |

The Future Self card's label is `"Future {first name}"` resolved from `user_settings.user_name`
(falling back to "Future Self"). The state variable names are `futureKyle*` for AsyncStorage
back-compat.

**Time picker**: tapping the time opens a transparent bottom-sheet `Modal` containing a native
`DateTimePicker` (`mode="time"`, `display="spinner"` on iOS, `"default"` on Android,
`textColor="#fff"`), with a gold **Done** button on iOS only (Android dismisses on change).
Display format is 12-hour: `"{h}:{mm} {AM|PM}"`.

**AsyncStorage key `notificationSettings`** — a JSON object with all 18 fields
(`morningEnabled, morningHour, morningMinute, eveningEnabled, eveningHour, eveningMinute,
taskReminderEnabled, taskReminderHour, taskReminderMinute, workoutReminderEnabled,
workoutReminderHour, workoutReminderMinute, readingReminderEnabled, readingReminderHour,
readingReminderMinute, futureKyleEnabled, futureKyleHour, futureKyleMinute`). Every switch toggle
calls `persistAndReschedule({...override})`, which writes the key and reschedules **silently**.
Time changes are only persisted by the explicit Save button.

**Scheduling** (`scheduleNotifications`):
- Checks permission; if not granted (and not silent) alerts *"Notifications Disabled — Please
  enable notifications in your phone settings to schedule reminders."* and returns false.
- `Notifications.cancelAllScheduledNotificationsAsync()` — **wipes everything**, then rebuilds.
- Resolves the Future Self name and the user's **actual cabinet** (`getUserCabinet()`) fresh at
  schedule time; falls back to `['Marcus Aurelius','Epictetus','David Goggins','Theodore
  Roosevelt']` if empty. Senders = cabinet names + the Future Self label.
- Schedules **7 weekly repeating notifications per enabled reminder** (one per weekday), rotating
  through both a 7-message array and the sender list, with a per-reminder-type offset
  (`senderFor(day, offset)` where offsets are morning 0, evening 1, task 2, workout 3, reading 4)
  so one day doesn't hear from the same counselor across every reminder.
- Each notification's content: `title` (usually `"{Sender} — {Reminder name}"`), `body`,
  `sound: true`, **`badge: 1`**, and `data: { route: '/cabinet', counselorName: title.split(' — ')[0],
  seedMessage: body }` — the data the root layout uses to seed the line into the Cabinet thread.
- Trigger: `{ type: CALENDAR, weekday: day+1 (1=Sunday…7=Saturday), hour, minute, repeats: true }`.
- The five message arrays (`MORNING_MESSAGES`, `EVENING_MESSAGES`, `TASK_MESSAGES`,
  `WORKOUT_MESSAGES`, `READING_MESSAGES`) each hold 7 strings; `futureSelfMessages(name)` builds
  its 7 dynamically, each signed `"— Future {Name}"`.
- On explicit Save, a success alert: `"✅ Saved! Your notification settings have been updated.
  {enabledCount × 7} reminders scheduled."`

On mount the screen also **requests notification permission immediately** and, on Android, creates
the `'default'` channel (`importance: MAX`, vibration pattern, `lightColor: '#c9a84c'`). An
un-granted permission raises *"Permissions Required — Please enable notifications in your phone
settings to use reminders."*

**Web port**: all six reminder cards, the scheduler, the time picker and the message arrays are
local-notification machinery with no browser equivalent. If reminders matter on the web they must
be re-implemented server-side (the Daily Dispatch push path already exists for that). The
*message copy* and *sender rotation* are worth preserving as content.

### 17.3 🛡️ Attend & Cabinet Privacy — **iOS Screen Time. EXPLICITLY OUT OF SCOPE for the web port.**

Rendered only when `attendIsSupported()` (the `react-native-device-activity` native module is
present). Everything in it depends on iOS's `FamilyActivityPicker` / DeviceActivity /
ManagedSettings APIs, which have no web analogue. Documented here only so it is clearly *left out*.

Contents, in order:
- Toggle **"Cabinet sees Screen Time signals"** — free tier shows a `PREMIUM` tag, renders as off,
  and any tap routes to `/paywall?src=attend_cabinet_sight` instead of toggling. Hint: *"Goal
  crossings only — never exact usage, never raw data."* Backed by `setShareScreenWithCabinet`.
- Toggle **"Cabinet sees routine completion"** — **not** tier-gated. Hint: *"Morning and evening
  checklists, done or not done."* This one **does** have a web analogue: it gates the routine
  block inside `gatherAppContext()`, which the web counselor chat also builds. Port this flag.
- Toggle **"Block distractions during Focus"** — free tier taps route to
  `/paywall?src=attend_focus_block`. Turning it on with no blocklist immediately opens the picker.
- Button **"Choose apps & websites to block…" / "Edit blocked apps & websites"** — requests Screen
  Time authorisation, then opens the native `DeviceActivitySelectionSheetView` in a modal with
  header *"What should the Cabinet block during Focus?"*. Denied → *"Screen Time Access Needed —
  Enable Screen Time access for Arete in iOS Settings."*
- **Typed domain blocklist** — a list of `🌐 {domain}` rows each with a remove `✕`, plus a
  **"Block a website…"** button that (free → paywall) opens `Alert.prompt('Block a website during
  Focus', 'Type the site (e.g., reddit.com or youtube.com)')`. Invalid input →
  *"Invalid website — Enter a domain like reddit.com"*. Exists because Apple's picker can't accept
  a URL but the web-content filter can.
- **Watchlists** — header plus the explanation *"Name a group of apps ("Instagram", "Games") and
  the Cabinet can call out when it crosses 30m, 1h, 2h and beyond. Names are yours; Apple never
  shows the app names to Arete."* Each watchlist is a `👁 {label}` row with a remove `✕`
  (confirmed via `Alert.alert('Remove watchlist?', 'Stop watching "{label}"?')`). **"Add a
  watchlist…"** → free tier goes to `/paywall?src=attend_watchlists`; at
  `MAX_WATCHLISTS = 5` alerts *"Watchlist limit — iOS allows up to 5 watchlists."*; otherwise
  requests authorisation, `Alert.prompt`s for a name, then opens the picker with the header
  `What counts as "{label}"?`.

`lib/attend.ts` also defines the escalation ladders `ATTEND_LADDER = [30,60,90,120,180,240,300]`
and `ATTEND_NIGHT_LADDER = [15,30,60,120]` (minutes), and activity ids `attend-daily` /
`attend-night` / `attend-selection`.

### 17.4 ❤️ Health & Cabinet — **iOS HealthKit. Platform-only.**

Rendered only when `healthIsSupported()` (iOS + `@kingstinct/react-native-healthkit` present +
`isHealthDataAvailable()`).

- **Not connected**: hint *"Connect Apple Health (read-only: sleep, steps, exercise minutes) so
  your counselors can speak to your real days — short sleep, a still afternoon, a strong morning."*
  and a **"Connect Apple Health…"** button. `connectHealth()` requests read access for
  `HKCategoryTypeIdentifierSleepAnalysis`, `HKQuantityTypeIdentifierStepCount`,
  `HKQuantityTypeIdentifierAppleExerciseTime` and sets AsyncStorage `health_connected = 'true'`.
  Failure → *"Could not connect — Apple Health did not respond. Try again from Settings."*
  (Apple deliberately hides whether read access was granted, so "connected" only means the sheet
  was resolved once; empty query results are treated as "no data recorded".)
- **Connected**: toggle **"Cabinet sees Health signals"** (free tier → `PREMIUM` tag, renders off,
  taps go to `/paywall?src=health_cabinet_sight`; AsyncStorage `health_share_with_cabinet`,
  default on) with the hint *"Last night's sleep, today's steps and exercise minutes — read on
  your device when you open a conversation, never stored elsewhere."*, plus a **"Disconnect Apple
  Health"** button confirmed by *"Disconnect Apple Health? The Cabinet stops seeing sleep, steps,
  and exercise. To fully revoke access, also remove Arete in the Health app."*

### 17.5 🗓️ Calendar & Cabinet — **native module, but the concept is portable**

Rendered when `calendarIsSupported()` (i.e. `expo-calendar` resolves; iOS **and** Android).

- **Not connected**: hint *"Connect your calendar (read-only) so your counselors can speak to the
  shape of your day — what's next, how packed it is, whether tomorrow starts early."* and
  **"Connect Calendar…"**. `connectCalendar()` → `requestCalendarPermissions()`, sets AsyncStorage
  `calendar_connected`. Denied → *"Calendar Access Needed — Enable calendar access for Arete in
  system Settings."*
- **Connected**: toggle **"Cabinet sees today's calendar"** (free → `PREMIUM` tag + paywall at
  `src=calendar_cabinet_sight`; AsyncStorage `calendar_share_with_cabinet`, default on), hint
  *"Today's events and tomorrow's first — read on your device when you open a conversation, never
  stored elsewhere."*, and **"Disconnect Calendar"** with the confirmation *"Disconnect Calendar?
  The Cabinet stops seeing your schedule. To fully revoke access, also remove it in system
  Settings."*

`lib/calendar.ts` (`getTodayAgenda`) reads all calendars from start-of-today to end-of-tomorrow,
producing `{ events (today, sorted), scheduledMinutes (timed only, ignoring anything ≥24h),
next (first timed event still ahead), tomorrowFirst }`. `buildCalendarContext(cabinetCanSee)`
turns that into a prompt block; critically it **always returns something**, emitting an honest
*"You cannot see their calendar: …"* with the specific reason (not available in this build / not
connected / user disabled sharing / free tier / read failed) plus the instruction *"Never invent
events or times."* On the web this maps cleanly to a Google/Microsoft calendar connector, and the
never-invent guard rail must be preserved.

### 17.6 Subscription row
A single row: label **"Upgrade to Premium"** when `tier === 'free'` → `/paywall?src=settings_upgrade`;
label **"Manage Subscription"** otherwise → `WebBrowser.openBrowserAsync('https://app.pursuearete.com/upgrade')`.
Accessibility labels are set. The comment confirms: no IAP in this app, management happens through
the Stripe Customer Portal reached from the web upgrade page.

### 17.7 Privacy Policy row → `/privacy`.

### 17.8 Save button
Full-width gold **"Save & Schedule Notifications"** → `saveSettings()` (writes
`notificationSettings` and reschedules, with the success alert).

### 17.9 Sign Out
`Alert.alert('Sign Out', 'Are you sure you want to sign out?')` → Cancel / **Sign Out**
(destructive) → `supabase.auth.signOut()` then `router.replace('/(auth)/login')`.

### 17.10 Delete Account (App Review 5.1.1(v))
**Two nested confirmations**, both required:
1. `Alert.alert('Delete Account', 'This permanently deletes your account and all of your data —
   conversations, journal entries, beliefs, progress, and subscription records. This cannot be
   undone.')` → Cancel / **Continue** (destructive)
2. `Alert.alert('Are you absolutely sure?', 'Your account and every trace of your data will be
   gone forever.')` → **Keep My Account** / **Delete Everything** (destructive)

Then `handleDeleteAccount`:
```
POST https://app.pursuearete.com/api/delete-account
Headers: { Authorization: 'Bearer <supabase access_token>' }
(no body)
```
Expects `{ success: true }`. The web API cancels any live Stripe subscription, deletes all data,
and removes the auth user. On failure → *"Deletion failed — {server error} … or contact
support@pursuearete.com."*; on network failure → *"Could not reach the server. Please try again."*
On success: `supabase.auth.signOut()`, then `Alert.alert('Account Deleted', 'Your account and all
of your data have been permanently deleted.')` → OK → `/(auth)/login`. The button label becomes
"Deleting Account…" and is disabled while in flight.

### 17.11 Footer note
*"Note: Notifications work on physical devices. They may not appear in web/simulator."*

### 17.12 DEV ONLY section
Rendered only when `process.env.EXPO_PUBLIC_DEV_MODE === 'true'`. A "DEV ONLY" label, the heading
"Developer Tools", and a single row **"Simulate free tier"** (subtitle *"Overrides isPremium in
memory. Resets on restart."*) with a red-tracked switch (`#2a3a5c` off, `#ef4444` on) wired to
`setDevPremiumOverride(val ? false : null)`. When on, a warning line: *"⚠ Premium overridden to
FALSE. Restart app to reset."* The override is read back on load as
`getDevPremiumOverride() === false`.

### Data summary for this screen
`getUserSettings()` (Future Self first name, at load and again at schedule time),
`getUserCabinet()` (notification senders), `useSubscription()` → `getSubscriptionTier()` →
`profiles.tier` / `profiles.is_premium`. All the Attend/Health/Calendar preferences live in
**AsyncStorage, not Supabase**: `health_connected`, `health_share_with_cabinet`,
`calendar_connected`, `calendar_share_with_cabinet`, plus the attend keys behind `lib/attend.ts`.
Notification settings live in AsyncStorage key `notificationSettings`.

---

## 18. `app/academy.tsx` — The Academy (WebView)

Route `/academy`, entered from the **Side menu** ("The Academy", **premium-gated** — free users
get `/paywall?src=menu_academy`).

A `react-native-webview` over `https://academy.pursuearete.com` with native chrome: a header row
with a gold `close` button (`router.back()`) on the left, the centred title "Arete Academy"
(`#e0d5b5`, 16px bold, `letterSpacing: 0.5`), and a gold in-page **back arrow** on the right that
calls `webRef.current.goBack()`, disabled at `opacity 0.3` when `!canGoBack`.

WebView props: `sharedCookiesEnabled` (so the Academy sign-in persists across visits — the Academy
shares the app's Supabase project, so the same credentials work),
`allowsBackForwardNavigationGestures`, `startInLoadingState`. The loading overlay is a full-bleed
`#1a1a2e` panel with a large gold spinner and the italic line *"Entering the Academy…"*; a small
spinner also floats at `top: 60, right: 16` while any load is in flight.

**Web parity**: on the web this is simply a link (or an iframe). The premium gate on the side-menu
entry is the part that must be ported.

---

## 19. `app/privacy.tsx` — Privacy Policy

Route `/privacy`, entered from Settings. A static `ScrollView` on `#0f1724` (note: **not** the app
background `#1a1a2e` — an inconsistency). Gold `#c9a84c` title and headings, `#e6eef8` body,
`#9aa0a6` for the "Last updated March 5, 2026" line.

Sections: intro; **Information We Collect** (a bulleted list: first name, personal profile
information, journal entries, messages to the Cabinet); **How We Use Your Information**;
**Data Storage**; **Children's Privacy**; **Contact**.

⚠️ **The content is stale and inaccurate.** It claims the first name, profile, and journal entries
are *"stored locally on your device only"* and that *"Your profile and journal data remains on
your device and is not transmitted to our servers"* — but everything in this inventory shows those
are Supabase rows. The contact address is the placeholder `you@yourdomain.com`. This text must be
rewritten before it ships on the web, not merely ported.

---

## 20. `app/join-session.tsx` — Shared Cabinet session invite landing

### Purpose and navigation
Route `/join-session`. The bounce target of `arete://join-session?token=…`, which is itself the
redirect target of the email invite's `/api/sessions/join`. Routed here by the root layout's
`DeepLinkHandler`, or directly by `login.tsx` after an invitee authenticates.

**Param consumed**: `token`.

**Navigation out**:
- no `token` → error state, *"This invite link is missing its token."*
- not signed in → `router.replace('/login', { inviteToken: token })`
- success → `router.replace('/cabinet', { sharedSessionId, sharedPartnerName })`
- error → error state with a **"Return to Cabinet"** button → `/cabinet`

An `attemptedRef` guard ensures the accept is attempted exactly once per mount.

### Server call
```
POST {API_BASE_URL}/api/sessions/accept
Headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <supabase access_token>' }
Body:    { token, partnerDisplayName }
```
`partnerDisplayName` = `user_settings.user_name` → falling back to the auth email → falling back to
`'Partner'`. **The backend derives the joining user from the JWT, not from the body** — the display
name is cosmetic. Expects `{ success: true, sessionId }`; otherwise shows `data.error` or
*"This invite has expired or is invalid."* A thrown error gives *"Something went wrong joining the
session. Please try again."*

### Layout
Centred, 32px horizontal padding, 16px gaps. Working state: a 56px gold `people-outline` icon, the
line *"Joining shared Cabinet session..."* (`#e0d5b5`, 16px semibold), and a large gold spinner.
Error state: a 48px gold `alert-circle-outline`, the error text (`#888`, 15/22, centred), and a
gold-tinted outlined button **"Return to Cabinet"**.

### Data
`getUserSettings()` → `user_settings.user_name`; `supabase.auth.getSession()`.

### Platform-only
The `arete://` deep-link scheme. On the web this becomes an ordinary
`https://…/join-session?token=…` route, which is strictly simpler.

---

## 21. `components/ErrorBoundary.tsx`

A 50-line class component (`getDerivedStateFromError` + `componentDidCatch`) wrapping the entire
app from `_layout.tsx`, and also re-exported as `ErrorBoundary` so Expo Router uses it for the
root route.

On error it renders a scrollable **black** (`#000`) page with 60px top padding containing:
`🔴 Startup Error` (20px bold `#ff4444`), a `Message:` label (`#888`, 12px) with the error message
in white 14px, and a `Stack:` label with the full stack in `#aaa` 11px **monospace**. It also
`console.error`s the error and the React error info.

This is a **developer-facing** screen shown to end users — raw stack traces in production. The web
port should keep the boundary but replace the surface with something user-facing (and log the
stack instead of rendering it).

---

## 22. Cross-cutting inventory for the web port

### 22.1 AsyncStorage keys used by the screens in this pass
| Key | Screen | Contents |
|---|---|---|
| `weeklyReviews` | weekly-review | JSON array of up to 12 `{id, weekEnding, content, generatedAt}` — **the only store for review history** |
| `daily_messages_YYYY-MM-DD` | counselor-chat | integer string, today's message count |
| `notificationSettings` | settings | JSON object with 18 reminder fields |
| `lib-reader-view` | library/reader | `'scroll'` \| `'book'` |
| `health_connected`, `health_share_with_cabinet` | settings / lib/health | `'true'`/`'false'` |
| `calendar_connected`, `calendar_share_with_cabinet` | settings / lib/calendar | `'true'`/`'false'` |
| attend keys (see `lib/attend.ts`) | settings | Screen Time prefs — out of scope |

### 22.2 Supabase tables touched by these screens
`user_settings` (know-thyself, onboarding, cabinet_members, counselor_models),
`profiles` (tier, is_premium, daily_message_count, message_count_date, know_thyself_complete,
handle, streak), `counselors`, `cabinet_conversations` (threads), `conversation_memory`,
`journal_entries`, `beliefs`, `check_ins`, `reading_data`, `user_longitudinal_models`,
`library_comments`, `paywall_events`, `scrolls` / `scroll_reads` (via onboarding's
`triggerScrollGeneration`).

### 22.3 Every server endpoint referenced in this pass
| Endpoint | Auth | Used by |
|---|---|---|
| `POST /api/chat` | Bearer JWT | weekly-review, belief-journal |
| `POST /api/chat/counselor` | Bearer JWT + `x-subscription-tier` | counselor-chat |
| `POST /api/memory/summarize` | Bearer JWT | counselor-chat (background) |
| `POST /api/onboard-web` | none | onboarding (conversational) |
| `GET /api/dispatch/{id}`, `GET /api/dispatch/today` | Bearer JWT | dispatch |
| `GET /api/library/texts` | none | library index |
| `GET /api/library/search?q=[&author=&work=]` | none | library index, reader |
| `GET /api/library/text?author=&work=&page=` | none | reader |
| `GET /api/library/outline?author=&work=` | none | reader |
| `POST /api/library/annotate` | Bearer JWT | reader ("Ask the corpus"), Pro-gated |
| `GET /api/observatory/{world,tensions,inquiries,dreams,convergences}` | none | observatory |
| `POST /oracle` | none, IP rate-limited 15/day | symposium |
| `POST /api/sessions/accept` | Bearer JWT | join-session |
| `POST /api/user/push-token` | Bearer JWT | lib/pushNotifications — native only |
| `POST /api/user/timezone` | Bearer JWT | lib/pushNotifications |
| `POST https://app.pursuearete.com/api/delete-account` | Bearer JWT | settings |
| `https://app.pursuearete.com/upgrade` | — | paywall, settings (in-app browser) |
| `https://academy.pursuearete.com` | shared cookies | academy WebView |
| `https://academy.pursuearete.com/library` | — | observatory outbound link |

### 22.4 Paywall `src` labels emitted by these screens
`counselor_daily_limit`, `locked_counselor` (counselor-chat); `custom_cabinet` (my-cabinet);
`cabinet_select_locked` (my-cabinet/select); `attend_cabinet_sight`, `attend_focus_block`,
`attend_watchlists`, `health_cabinet_sight`, `calendar_cabinet_sight`, `settings_upgrade`
(settings); `menu_academy`, `menu_library` (side menu). The reader's Pro gate pushes `/paywall`
with **no `src`** — an omission.

Other `src` values the paywall has copy for but which are emitted elsewhere:
`attend_context_tease`, `whats_new_cabinet_sight`.

---

## 23. `app/paywall.tsx` — Paywall

*(Placed last because it is referenced by nearly every other screen.)*

### Purpose and navigation
Route `/paywall`. Presented from ~12 call sites, always with a `src` param (except the reader).
Dismissed by a floating `✕` at `top: 56, right: 20` → `router.back()`.

**Param consumed**: `src` (string) — used for both telemetry and headline copy.

### The single most important architectural fact
**There is no in-app purchase.** The header comment is emphatic: subscriptions are bought on the
web via Stripe and unlock the app through Supabase (the Stripe webhook writes `profiles.tier`;
`useSubscription` re-reads on foreground, so returning from Safari after paying updates
entitlement automatically). `react-native-purchases-ui` must not be reintroduced — it broke the
New Architecture build in May 2026. So the mobile paywall is a **marketing page with a link out**,
and the web is already the system of record. RevenueCat appears nowhere in the live code.

### Storefront gating
`IS_US_STOREFRONT = (getLocales()[0]?.regionCode ?? 'US') === 'US'` (from `expo-localization`).
External-purchase links are permitted without an entitlement **only** on the US storefront
(App Review Guideline 3.1.1a). Outside the US — including EU/DMA terms — links, prices, and even
naming the purchase site require entitlements and commissions, so the non-US paywall shows the
feature table only, with **no plan cards, no CTA, no prices**, and the note:

> *"In-app upgrades aren't available in your region. If your Arete account has an active plan,
> Premium unlocks here automatically."*

The web port doesn't inherit this constraint, but must not lose the fact that the paid tiers'
prices and names live here.

### Telemetry
On first render (guarded by a ref), fire-and-forget
`supabase.from('paywall_events').insert({ user_id, source: src ?? 'unknown' })`. One row per view.
Failures are swallowed.

### Layout, in order
1. **Header** — eyebrow `ARETE` (11px, `letterSpacing: 3`, gold, uppercase); a title and subtitle
   that are **source-specific**; and, on US storefronts, the gold line *"New members start with a
   7-day free trial"*.

   `SOURCE_COPY` (title / subtitle, `\n` = deliberate line break):
   | `src` | Title | Subtitle |
   |---|---|---|
   | *(default)* | Unlock Your Cabinet | More counselors. More conversations. / The discipline to actually use them. |
   | `attend_cabinet_sight` | Let Them See Your Hours | Your counselors see your screen-time signals — / and hold you to the limit you set yourself. |
   | `attend_context_tease` | They Could See This | *(same as above)* |
   | `attend_watchlists` | Name Your Distractions | Watchlists let the Cabinet call it out by name: / "your Instagram list crossed two hours today." |
   | `attend_focus_block` | The Cabinet Holds the Door | Your chosen apps and websites stay shielded / for the length of every focus session. |
   | `health_cabinet_sight` | Let Them See Your Nights | Sleep, steps, and training — your counselors / speak to the day you actually lived. |
   | `calendar_cabinet_sight` | Let Them See Your Day | Your counselors read today's calendar and hold it / beside the things you said matter. |
   | `whats_new_cabinet_sight` | The Cabinet Sees More | Screen time, sleep, and your calendar — / counselors who speak to the day you actually lived. |

2. **Feature comparison table** — 4 columns (blank / Free / Arete / Pro), Pro column in gold,
   header row on `#0F1E38`, alternating rows on `#0D1A30`, label column `flex: 1.4` and
   left-aligned in `#8A9BB0`:

   | Feature | Free | Arete | Pro |
   |---|---|---|---|
   | Messages/day | 10 | 50 | Unlimited |
   | Counselors | 3 | 23 | 23 |
   | Reasoning depth | Standard | Deeper | Deepest |
   | Cabinet sight (screen · sleep · day) | — | ✓ | ✓ |
   | Watchlists & Focus blocking | — | ✓ | ✓ |
   | Custom cabinet | — | ✓ | ✓ |
   | Shared sessions | — | ✓ | ✓ |
   | Weekly insights | Preview | Full | Full |

3. **Plan cards** (US only) — all three tap through to the same web checkout:
   | identifier | label | price | period | badge | description |
   |---|---|---|---|---|---|
   | `premium_monthly` | Arete | $9.99 | /mo | — | 50 messages/day · All 23 counselors · Shared sessions |
   | `premium_yearly` | Arete Annual | $79.99 | /yr | **BEST VALUE** (highlighted, gold-tinted border) | $6.67/mo · Save 33% · Everything in Arete |
   | `pro_monthly` | Arete Pro | $19.99 | /mo | **UNLIMITED** | Unlimited messages · Deepest reasoning · Model choice |

4. **CTA** — full-width gold **"Subscribe on the Web"** →
   `WebBrowser.openBrowserAsync('https://app.pursuearete.com/upgrade')`.
5. **Sync note** — *"Payment is handled securely at pursuearete.com. / Your subscription unlocks
   this app automatically."*
6. **Legal** — *"Subscriptions auto-renew. Manage or cancel anytime from your account on the web."*
   (11px `#4A5A70`).

### Visual notes
This screen alone uses the navy palette (`#0A1628` page, `#0F1E38` surface, `#1E3050` border,
`#8A9BB0` muted, `#E8EDF5` text, `#C9A84C` gold). Title 28px/700 centred; plan cards 14px radius
with a small square gold badge above the row.

### Platform-only
`expo-localization` region detection (a web build would use `Intl` or a server-side geo lookup),
`expo-web-browser` (just a link on the web). No RevenueCat, no StoreKit, no haptics anywhere in
this file.

---

## 24. Things a web implementer should know before starting

1. **The paywall is already web-first.** Mobile links out to `app.pursuearete.com/upgrade`;
   entitlement is written only by the Stripe webhook. The web port must keep
   `profiles.tier`/`is_premium` service-role-only and never self-grant (`lib/syncSubscription.ts`
   exists purely as a monument to that bug).
2. **Two conflicting tier-limit modules** (`lib/useSubscription.ts` vs `hooks/useTierLimits.ts`).
   Pick one. The server is authoritative in either case
   (`checkAndIncrementMessageCount` + `MESSAGE_LIMITS`).
3. **`belief-journal` has no navigation entry point** anywhere in the app. Decide whether to port
   it with a real entry point or leave it out.
4. **The 11-step setup wizard doesn't set `know_thyself_complete`**, so users who finish it are
   still nagged by the home banner. The conversational onboarding is the one to port
   (and it already exists at `web/src/app/onboarding/page.tsx`).
5. **Weekly reviews are device-local only** (`AsyncStorage.weeklyReviews`). Web needs a table, or
   an explicit decision that history is per-browser.
6. **The privacy policy is factually wrong** about local-only storage and has a placeholder email.
   Rewrite, don't port.
7. **The reader's note re-anchoring** (`ANCHOR_CHARS = 120`, prefix match on the first 40 folded
   chars) is subtle and load-bearing. Copy it exactly or notes will drift when a folio is
   re-paragraphed.
8. **Screen Time / Attend is out of scope**, but the sibling flag *"Cabinet sees routine
   completion"* (`getShareRoutinesWithCabinet`) is not Screen Time — it gates
   `gatherAppContext()`'s routine block and should be ported.
9. **The "never invent" guard rails** in `buildCalendarContext` (and its Health/Attend siblings)
   are a product commitment: when a signal is unavailable, the prompt says *why* rather than
   letting the model confabulate. Preserve that shape for any web connector.
10. **Copy drift**: the counselor-chat lock overlay still names Epictetus as free, but
    `FREE_COUNSELOR_SLUGS` is `marcus / goggins / roosevelt`. Fix on the way through.
