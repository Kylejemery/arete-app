# Web parity port — shared contract

Repo: /home/user/arete-app. Mobile app (source of truth for behaviour): `app/`, `lib/`, `services/`, `components/`.
Web app (target): `web/` (Next 15 App Router, React 19, Tailwind 3, Supabase SSR, no UI libs).
Branch: `claude/duplicate-appearance-issue-wragcr` (already checked out). Do NOT commit or push; the integrator commits.

Inventories (read the ones relevant to your work package; they are exhaustive):
- docs/web-parity/inventory-mobile-tabs.md
- docs/web-parity/inventory-mobile-other.md
- docs/web-parity/inventory-data-layer.md
- docs/web-parity/inventory-web.md

## Non-negotiables
1. OUT OF SCOPE: iOS Screen Time / "Attend" monitoring, focus blocking, watchlists, screen-time goal, manual screen-time marks, HealthKit, expo local/push notifications, RevenueCat. Do not port any of it. The Cabinet prompt must still say honestly that it cannot see screen time / health on the web (never invent).
2. Never write `profiles.tier` or `profiles.is_premium` from the client. Entitlement is written only by the Stripe webhook.
3. Keep the web-only things: marketing landing (guest `/`), `CabinetReplay`, Stripe routes + `/upgrade`, `/api/delete-account`, `/join`, `/reset-password`, `PendingInviteToast`, `vercel.json`, PWA manifest.
4. `cd web && npx tsc --noEmit` must pass when you finish. Also run `cd web && npx next lint --dir src/<your area>` (or the whole thing) and fix errors you introduced. Do not disable rules.
5. Only edit the files assigned to your work package. If you need something from another package, use the contract below; if the contract is missing something, add a NEW file rather than editing a shared one, and say so in your final report.
6. Styling: use the "v2" design language the newer pages use (inline styles / Tailwind with the CSS variables in `globals.css`: `--bg`, `--surface`, `--gold`, `--text`, `--muted`, `--border`, serif headline with gold `<em>`, `ChapterRule`, `GlassCard`). Mobile colour tokens: bg `#1a1a2e`-ish (web uses `#0f1724`, keep web's), surface `#16213e`, gold `#c9a84c`, evening blue `#4a6fa5`, success `#4caf50`, danger `#ff4444`. No emoji-as-icons in headers where the mobile app uses none; emoji are fine where mobile uses them.
7. Replace `Alert.alert` confirmations with the shared `ConfirmDialog` and native `alert()` with `Toast` where a shared primitive exists; never leave `window.confirm` in new code.
8. Every page keeps the existing auth preamble pattern OR uses the shared `useRequireUser()` hook (preferred for new pages).
9. Copy user-facing strings from the mobile app verbatim unless they reference native-only features.

## Foundation contract (WP0 provides these; everyone else consumes them)

### `web/src/lib/api.ts` (new)
- `export const API_BASE_URL: string` — single source (env `NEXT_PUBLIC_API_BASE_URL`, fallback `https://arete-app-production.up.railway.app`).
- `export async function authHeaders(extra?: Record<string,string>): Promise<Record<string,string>>` — `Content-Type: application/json` + `Authorization: Bearer <jwt>` only when a session exists.
- `export async function apiFetch(path: string, init?: RequestInit & { auth?: boolean }): Promise<Response>`.

### `web/src/lib/storage.ts` (rewritten, real)
- `getItem/setItem/removeItem` (SSR-safe localStorage) and typed helpers:
- `getDailyMessageCount(dateKey?)`, `incrementDailyMessageCount(dateKey?)` — key `daily_messages_YYYY-MM-DD` (local date).
- `getShareRoutinesWithCabinet(): boolean` (default true), `setShareRoutinesWithCabinet(v)`.
- `getTodayDateKey(): string` local `YYYY-MM-DD`.

### `web/src/lib/types.ts`
Superset of mobile `lib/types.ts` + web's existing types. `Counselor` = the DB row shape (web's current one). Adds `SubscriptionTier = 'free'|'premium'|'pro'`, `LongitudinalPortrait` family, `WeeklyReview { id, week_start, week_end, generated_review, created_at }`, `DailyCheckin` with `daily_question_*`, `UserSettings` with all real columns.

### `web/src/lib/db.ts` (extended; existing exports keep their names)
Constants: `FREE_COUNSELOR_SLUGS`, `STARTER_CABINET_SLUGS`, `DEFAULT_CABINET_SLUGS`, `FUTURE_SELF_SLUG`, `MESSAGE_LIMITS`, `MAX_TOKENS_BY_TIER`.
Functions added/fixed:
- `normalizeTier(raw, isPremium): SubscriptionTier`, `getSubscriptionTier(): Promise<SubscriptionTier>`, `getIsPremium()` (built on normalizeTier; honours dev override).
- `checkAndIncrementMessageCount(): Promise<MessageLimitStatus>` (`{ allowed, tier, used, limit }`).
- `getUserCabinet()` tier-filtered like mobile; default `['marcus','roosevelt']`.
- `getCabinetConversation()` filters `.is('counselor_slugs', null)`; `getCounselorConversation(id)`, `saveCounselorConversation(id, msgs)`; `getThread`/`upsertThread` work for every thread id (`'cabinet'` → group row, else per-counselor row via `counselor_slugs` contains).
- `saveCabinetConversation` uses local date, not UTC.
- `getKnowThyselfProfile()`, `getRandomCabinetQuote(slugs)`, `saveDailyQuestionCache(slug, response)`, `getProfileStreak()`.
- `getConversationMemory(slug)`, `saveConversationMemory(slug, summary)`.
- `getLongitudinalPortrait()`, `getPortraitHistory()`.
- `getCheckinsRange(startISO, endISO): Promise<DailyCheckin[]>` (for the progress week/month grids).
- `getWeeklyReviews(): Promise<WeeklyReview[]>` (desc, max 12), `saveWeeklyReview({ week_start, week_end, generated_review })` — table `weekly_reviews` exists.
- Remove the broken belief CRUD (`createBelief/updateBelief/encodeBelief/getBeliefs(userId)`) and the unused `createConversation/appendMessage/getConversations/getConversation`; keep `saveBelief`, `getLegacyBeliefs`.
- Goals: `getGoals`, `upsertGoal`, `completeGoal`, `deleteGoal` unchanged.
- `getCalendarData/upsertCalendarData` stay (web writes it from morning/evening: WP-Routines).

### `web/src/lib/scrolls.ts` (new, from mobile `lib/scrolls.ts`)
`Scroll` type, `getUserScrolls(userId)`, `getScroll(id)`, `logScrollRead(scrollId, userId)`, `requestScroll(goal, userName)`, `triggerScrollGeneration(userId, userName, goalsText)`. Keep `getScrolls` alias in db.ts for the existing page until it is replaced.

### `web/src/lib/llmModels.ts`
Adds `claude-haiku-4-5`. Keeps web's `counselorModelKey` map (+ `futureSelf → future-self`).

### `web/src/lib/threadService.ts`
`normalizeCounselorId()`, `CONTEXT_WINDOW_SIZE = 15`, `normalizeTimestamp`, `loadThread/saveThread/appendMessages/clearThread` persisting every thread.

### `web/src/lib/cabinetSignals.ts` (new)
`buildMetaSignalsContext({ journalEntries, goals })` (copy verbatim from mobile), `getPomodoroHistory()`, `getPomodoroCountToday()`, `setPomodoroCountToday(n)` on localStorage key `arete:pomodoro_sessions`, `buildFocusContext()`.

### `web/src/lib/claudeService.ts` (rewritten for parity)
Exports: `MessageLimitError`, `DailyLimitError`, `gatherAppContext()`, `buildSystemPrompt()`, `sendMessageToCabinet(messages, sessionOptions?)`, `sendCheckInToCabinet('morning'|'evening')`, `sendMessageToCounselor(counselorId, messages)`, `generateWeeklyReview(): Promise<string>`, `prefetchDailyQuestion(counselorId, question)`, `sendBeliefJournalMessage(entry, stage)`, `CabinetReply`, `BeliefEntry`, `VirtueCheck`, `BeliefDialogueTurn`, `MORNING_AFFIRMATIONS` (7), `EVENING_STOIC_PROMPTS` (7).
Behaviour matches mobile (see inventory-data-layer §4): app context from `check_ins`, quota, tier header, `max_tokens` by tier, per-counselor model, `userProfile` + `counselorSlug`, memory block + background summarise, 15-message window, model `claude-opus-4-6` for the group, honest "cannot see" lines for screen time / health / calendar ("not available in the web app").

### `web/src/lib/useSubscription.ts`
`useSubscription(): { tier: SubscriptionTier, isPremium, loading }` re-reading on `visibilitychange`; `useTierLimits(): { tier, maxMessages: number|null }` (free 10, paid null).

### `web/src/hooks/useRequireUser.ts` (new)
`useRequireUser({ requireName?: boolean }) → { user, settings, loading, reload }` — redirects to `/login` / `/setup` like the existing preamble.

### Shared UI (`web/src/components/ui/`) — new, provided by WP0
- `Modal` (`open, onClose, title?, children, sheet?: boolean` bottom-sheet on mobile widths)
- `ConfirmDialog` (`open, title, message, confirmLabel, destructive?, onConfirm, onCancel`)
- `Toast` + `useToast()` provider mounted in `layout.tsx` (`toast.show(message)`)
- `PaywallOverlay` (`open, title, body, src, onDismiss`) → links to `/upgrade?src=`
- `Spinner`
- `AssistantBubble` (`counselorName?, content, onShare?`), `UserBubble`, `Composer` (`value, onChange, onSend, placeholder, disabled, maxLength`) — extracted from the cabinet page.
- `ShareQuoteModal` (`open, onClose, quote, counselorName`) — renders the branded card to a `<canvas>` and offers Download PNG / Web Share when available.

## Work packages (after WP0)
- WP-Cabinet: `web/src/app/cabinet/**` (refactor with ui primitives; message limits; params `q`, `counselor`, `cabinetContext`, `beliefContext`, `morningMessage`; counselors tab → `/cabinet/chat/[id]` 1:1 page with persistence, locked overlay, "Bring to the Cabinet"; `/cabinet/select` tier rules; delete `/cabinet/conversation`).
- WP-Home: `web/src/app/page.tsx` (authenticated branch only) + `web/src/lib/quotes.ts`.
- WP-Routines: `web/src/app/morning/**`, `web/src/app/evening/**`, new `web/src/components/RoutinePage.tsx`.
- WP-Journal: `web/src/app/journal/**`, `web/src/app/goals/**`, `web/src/app/beliefs/**` (becomes the three-stage Belief Journal), `web/src/app/dispatch/**`.
- WP-Progress: `web/src/app/progress/**`, `web/src/app/weekly-review/**`, `web/src/app/portrait/**`.
- WP-Focus: `web/src/app/focus/**`.
- WP-Scrolls: `web/src/app/scrolls/**`.
- WP-Library: `web/src/app/library/**`, `web/src/lib/libraryComments.ts`.
- WP-Settings: `web/src/app/settings/**`, `web/src/app/privacy/**`, `web/src/app/upgrade/**`, `web/src/app/profile/**`.
- Integrator (me): `Sidebar.tsx`, `layout.tsx`, README, docs, final build.
