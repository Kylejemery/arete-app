# Claude Code Prompt — PHIL 705 Website Implementation

## Context

Arete Academy is a Next.js 15 / Vercel frontend with a Railway Node/Express backend and Supabase (Postgres + RLS + realtime). The existing course infrastructure supports two patterns:

- **Seminar courses** (PHIL 701, 702): `SeminarPage` component — Socratic Proctor agent (Claude Opus), Pre-Seminar Briefing panel, session list sidebar, RAG-powered chat.
- **Language courses** (GREK 101, LATN 101): `LanguageCoursePage` component — Haiku drill agent, vocabulary tables, quiz scoring.

PHIL 705 uses the seminar model. Session 1 content already exists in `academy/web/src/data/seminars.ts` (or similar — check the actual file). Sessions 2–20 have been written and need to be wired in. This prompt implements everything needed to make PHIL 705 fully live.

---

## Task Overview

Do the following in order. Commit after each part.

---

## Part 1 — Admin Bypass for Course Access

Add an admin flag to Supabase that allows Kyle's account to access all courses and all sessions without completing prerequisites or passing quizzes.

### 1a — Supabase: Add `is_admin` to profiles

Run this migration in the Supabase SQL editor (do not create a migration file — run directly):

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set Kyle's account as admin (replace with actual user ID from auth.users)
-- Kyle will run this manually with his user UUID:
-- UPDATE profiles SET is_admin = true WHERE id = '<kyle-user-uuid>';
```

Add a comment in the migration explaining: `is_admin = true bypasses all course locks and session prerequisites. Development use only until role system is built.`

### 1b — Backend: `isAdmin` helper

In `server/index.js` (or `server/auth.js` if auth helpers are extracted), add a helper that checks admin status:

```javascript
async function isAdmin(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}
```

### 1c — Frontend: Admin bypass in course/session locking

In the component or hook that determines whether a course card is locked (dashboard) and whether a session is accessible (course page), add an admin bypass:

```typescript
// Wherever course lock state is evaluated:
const adminBypass = profile?.is_admin === true;
const isLocked = adminBypass ? false : /* existing lock logic */;
```

Apply the same bypass to:
- Dashboard course cards (the lock icon / disabled state)
- Session list items in `SeminarPage` (session prerequisite locking)
- Quiz score gates (if any are enforced on the frontend)

The admin bypass is purely frontend — it does not affect backend JWT enforcement or message limits.

### 1d — Visual indicator

When `is_admin` is true, show a small gold `ADMIN` pill badge in the top-right corner of the dashboard header (not on every course card — just once in the nav/header). This confirms admin mode is active without being intrusive.

---

## Part 2 — PHIL 705 Data Layer

### 2a — Create `phil705.ts`

Create `academy/web/src/data/phil705.ts`. This file exports the full 20-session course data for PHIL 705.

**Session structure** (TypeScript type — define it in this file or import from existing types):

```typescript
export interface Phil705Session {
  id: number;                        // 1–20
  title: string;                     // e.g. "Introduction: Why Stoic Logic?"
  block: string;                     // e.g. "Block A", "Block B", etc.
  primarySources: string;            // e.g. "L&S 33A–C; Sextus Empiricus AM 8.11–12"
  keyConcepts: string;               // e.g. "Lekton; incorporeal; signifier / signified / thing"
  preSeminarBriefing: {
    problem: string;
    whyItMatters: string;
    whatToWatchFor: string;
    yourTask: string;
  };
  parts: Array<{
    title: string;
    content: string[];               // Array of paragraphs
  }>;
  exercises: Array<{
    title: string;
    body: string;
    answer: string;
  }>;
  quiz: Array<{
    question: string;
    options: string[];               // 4 options, each starting with "A)" "B)" etc.
    correct: string;                 // The letter: "A", "B", "C", or "D"
  }>;
  isSeminar?: boolean;               // true for sessions 10, 15, 19 — no lecture parts
  seminarPrompts?: string[];         // For seminar sessions only
}
```

**Session 1 data** is already in `seminars.ts` / the existing data layer — do NOT duplicate it. Read the existing Session 1 structure and match the format exactly.

**Sessions 2–20**: Populate using the content from the five session documents provided. The content for each session is fully written — this is a data-entry task, not a content-creation task. Copy the content faithfully:

- Pre-Seminar Briefing: The four fields (Problem, Why It Matters, What to Watch For, Your Task)
- Parts 1–3: Paragraph content (strings, one paragraph per array element)
- Exercises 1–4: Title, body, answer
- Quiz: All 10 questions with options and correct answer letter
- Seminar sessions (10, 15, 19): `isSeminar: true`, include `seminarPrompts` array, no `parts` array

Session-to-block mapping:
```
Block A: Sessions 2–3
Block B: Sessions 4–6
Block C: Sessions 7–8
Block D: Sessions 9–10
Block E: Sessions 11–13
Block F: Sessions 14–15
Block G: Sessions 16–18
Block H: Sessions 19–20
```

**Important**: Session 20 is the Final Examination — no Pre-Seminar Briefing, no parts, no quiz. It has a special `examFormat` field with the three exam parts. Handle it as a special case — `isFinalExam: true`.

Export:
```typescript
export const PHIL_705_SESSIONS: Phil705Session[] = [ /* sessions 1–20 */ ];

export const PHIL_705_COURSE = {
  id: 'phil-705',
  title: 'Stoic Logic & Epistemology',
  code: 'PHIL 705',
  track: 'Logic',
  year: 2,
  description: 'The propositional logic system Chrysippus built 300 years before Frege. Twenty sessions from the lekton through the five indemonstrables to the Liar Paradox — and back to the examined life.',
  sessions: PHIL_705_SESSIONS,
  agent: 'socratic-proctor',
  prerequisite: 'phil-701',
  totalSessions: 20,
};
```

### 2b — Update `seminars.ts`

If Session 1 content is already in `seminars.ts`, ensure it is consistent with the new `Phil705Session` type. If the data structure differs, write an adapter or migrate it into `phil705.ts` directly. Do not leave two conflicting sources of truth for Session 1.

---

## Part 3 — Course Page Routing

### 3a — Route dispatcher

In `academy/web/src/app/dashboard/courses/[courseId]/page.tsx`, add `phil-705` to the course dispatcher:

```typescript
if (courseId === 'phil-705') {
  return <SeminarPage courseId="phil-705" sessions={PHIL_705_SESSIONS} />;
}
```

Verify `SeminarPage` accepts a `sessions` prop (or reads from its own data source by `courseId`). If it reads by `courseId`, register `phil-705` in whatever lookup the component uses.

### 3b — Session routing

Each session is accessed at `/dashboard/courses/phil-705/session/[sessionId]`. Verify this route works for all 20 sessions. If session routing is handled inside `SeminarPage`, no changes needed — just confirm it.

---

## Part 4 — Pre-Seminar Briefing Integration

`PreSeminarBriefing.tsx` already exists (built in v24). It reads from `seminars.ts` keyed by `courseId.sessionId`.

Update the `SEMINARS` record in `seminars.ts` (or wherever `PreSeminarBriefing` reads its data) to include all 20 PHIL 705 sessions. The briefing data for each session is the `preSeminarBriefing` field from `phil705.ts`.

Key: `phil-705.session-{N}` for N = 1–20.

For seminar sessions (10, 15, 19), the Pre-Seminar Briefing contains the seminar format, central problem, and the four Socratic prompts — this content is longer than a standard briefing. Make sure the collapsible panel handles longer content gracefully (scroll within the panel if needed, not overflow).

For Session 20 (Final Exam), the Pre-Seminar Briefing should show the exam instructions and concept bank — no problem/task/watch-for structure.

---

## Part 5 — Dashboard Unlock

In `academy/web/src/app/dashboard/page.tsx`:

1. Find the PHIL 705 course card (currently locked with "Logic Track" badge and lock icon).
2. Change its status from locked to accessible — route to `/dashboard/courses/phil-705`.
3. Keep the "Year 2" and "Logic Track" badges.
4. The prerequisite lock (requires PHIL 701 completion) should remain in place for non-admin users. Admin bypass (from Part 1) overrides it.

---

## Part 6 — Backend: PHIL 705 Socratic Proctor Agent

The Socratic Proctor is already running for PHIL 701/702 at `POST /api/academy/agent`. Verify that:

1. The `socratic-proctor` agent type routes to Claude Opus (check `agentRouter` in `server/index.js`).
2. The system prompt for the Socratic Proctor does not hardcode PHIL 701 content — it should work for any Stoic philosophy course. If it references PHIL 701 specifically, refactor to make it course-agnostic, with course context injected from the frontend payload.
3. The `enforceMessageLimit` middleware is applied to the PHIL 705 agent route.

If the agent route accepts a `courseContext` field in the request body, pass the session's `primarySources` and `keyConcepts` as context so the Proctor is grounded in the session's material.

If the Proctor system prompt needs updating for PHIL 705's logical content (the Proctor will be asked to evaluate formal logic exercises, not just ethical arguments), add a conditional: when `courseId === 'phil-705'`, append the following to the system prompt:

```
This course covers formal Stoic logic — propositional calculus, the five indemonstrables, the lekton, the cognitive impression, and the conditional. When evaluating logic exercises, assess: (1) whether the student has correctly identified the argument form; (2) whether their analysis is valid; (3) whether their answer engages with the Stoic technical vocabulary from the session. Be rigorous — logical errors should be identified precisely, not glossed over with encouragement.
```

---

## Part 7 — Block Headers in Session List

The PHIL 705 session list sidebar should show block groupings. Add visual block headers between session groups:

```
BLOCK A — The Lekton
  Session 2 · Session 3

BLOCK B — Impressions & Assent
  Session 4 · Session 5 · Session 6

... etc.
```

If `SeminarPage` renders a flat session list, group sessions by `block` field from `phil705.ts` and render a small section header (navy text, 11px, caps, DM Mono font) between groups.

---

## Part 8 — Session Type Indicators

In the session list, add a small visual indicator for session type:

- Regular sessions: no indicator
- Seminar sessions (10, 15, 19): a small gold `SEMINAR` pill
- Final exam (20): a small gold `EXAM` pill

These should be consistent with the existing badge/pill styles in the Academy UI.

---

## Part 9 — TypeScript and Build

After all changes:

1. Run `npx tsc --noEmit` in `academy/web/` — fix all TypeScript errors before committing.
2. Run the dev server locally and verify:
   - Dashboard shows PHIL 705 unlocked for admin user
   - Clicking through to PHIL 705 loads the course page
   - Session list shows all 20 sessions with block headers
   - Pre-Seminar Briefing panel renders for Session 1
   - Clicking a session loads the session view with Proctor chat
   - Seminar sessions (10, 15, 19) show the seminar prompts in the briefing
   - Session 20 shows exam format
3. Push to GitHub → Vercel deploys automatically.

---

## Commit Strategy

Commit after each part:

```
git add -A && git commit -m "PHIL 705: Add is_admin bypass for admin course access"
git add -A && git commit -m "PHIL 705: Add phil705.ts data layer — sessions 1-20"
git add -A && git commit -m "PHIL 705: Wire course route and session dispatcher"
git add -A && git commit -m "PHIL 705: Wire Pre-Seminar Briefings for all 20 sessions"
git add -A && git commit -m "PHIL 705: Unlock dashboard card"
git add -A && git commit -m "PHIL 705: Verify Socratic Proctor agent for logic course"
git add -A && git commit -m "PHIL 705: Block headers and session type indicators in sidebar"
```

---

## Notes

- **PowerShell on Windows**: all commands must be PowerShell-compatible. No `&&` chaining — use separate commands or `;` separator.
- **Do not touch GREK 101 or LATN 101**: those courses are live and tested. The only shared component that may need updating is `SeminarPage` — make all changes backward-compatible.
- **Session 1 data**: already exists — do not overwrite or duplicate it. Read the existing structure first.
- **Admin UUID**: Kyle will manually run the SQL to set `is_admin = true` after the migration runs. Do not hardcode any user ID in the codebase.
- **RAG**: the Socratic Proctor already has RAG retrieval wired. No changes to `server/retrieval.js` needed for this implementation — the existing corpus will ground responses adequately. PHIL 705-specific corpus expansion is a separate future task.
