# Your Scrolls — Feature Spec
**Arete: Know Thyself**
Version 1.0 | April 16, 2026

---

## Overview

**Your Scrolls** replaces the Beliefs tab. It is a personalized library of AI-generated articles — each one researched and written by a specific Counselor — designed to reinforce the user's goals through repeated reading.

Inspired by the **Clarkson Principle**: the act of deeply researching and writing about a belief transforms the believer. A well-crafted article written *for you*, read multiple times, creates neural pathways that passive reading cannot.

---

## Core Concept

When a user completes the Know Thyself onboarding, their goals are captured in their profile. For each goal, the app automatically generates a personalized "scroll" — a 600–900 word article authored by an assigned Counselor, written as if for that specific user, drawing on:

- Stoic philosophy and primary sources
- Historical examples and analogies
- Modern psychological research
- The user's specific struggle as stated in their profile

The user reads and re-reads their scrolls. The app tracks every read. Over time, the scroll library grows — either from new goals or on-demand requests.

---

## Navigation

**Tab Bar Change:**
- ❌ Remove: Beliefs tab
- ✅ Add: Scrolls tab (icon: scroll/parchment)

Route: `/(tabs)/scrolls`

---

## Automatic Scroll Generation

### Trigger
- Fires when the user completes Know Thyself onboarding
- One scroll generated per goal captured in the user's profile
- Generation happens server-side (Railway backend) to protect the system prompt

### Counselor Assignment
Each goal is assigned one Counselor as the author. Assignment logic:

| Goal Theme | Assigned Counselor |
|---|---|
| Anger / patience / parenting | Marcus Aurelius |
| Self-discipline / habits | Epictetus |
| Anxiety / control / acceptance | Epictetus |
| Purpose / meaning | Marcus Aurelius |
| Resilience / adversity | Seneca |
| Mortality / perspective | Seneca |
| Default / unmatched | Marcus Aurelius |

Assignment can be simple keyword matching on the goal text to start; can be upgraded to LLM-based routing later.

### Scroll Content Structure
Each scroll contains:
1. **Title** — evocative, not generic (e.g., "On the Voice You Raise")
2. **Byline** — "Written for [User Name] by Marcus Aurelius"
3. **Body** — 600–900 words, 4–6 paragraphs
4. **Closing line** — a single sentence of direct address to the reader

### System Prompt (per Counselor)
The generation prompt instructs the model to:
- Write in the first person voice of the Counselor
- Address the user by name
- Reference their specific goal/struggle directly in the opening
- Ground the article in 1–2 historical or philosophical examples
- Include at least one reference to primary Stoic texts (Meditations, Letters, Discourses)
- Close with a direct, personal challenge or commitment

---

## On-Demand Scroll Requests

Users can request a new scroll from the Scrolls tab at any time.

### UI Flow
1. User taps **"Request a Scroll"** button
2. Modal appears with:
   - Text field: "What do you want to work on?" (free text, no character limit)
   - Optional: Counselor selector (default: auto-assign)
   - Submit button
3. Loading state: "Your scroll is being written..."
4. Scroll appears in library on completion

### Constraints
- Free tier: 1 on-demand scroll per month
- Paid tier: unlimited on-demand scrolls
- (Paywall integration deferred to post-launch Stripe/RevenueCat phase)

---

## Reading Tracker

### Per-Scroll Data
Stored in Supabase alongside the scroll record:

```
scroll_reads: {
  scroll_id,
  user_id,
  read_count,       -- total times read
  last_read_at,     -- timestamp
  first_read_at     -- timestamp
}
```

### What Counts as a Read
A read is logged when the user:
- Opens the scroll
- Scrolls to the bottom (or spends >60 seconds on it)
- Closes/navigates away

### UI Display
- On the scroll card (library view): **"Read 7 times"** or a flame/streak icon
- On the scroll detail view: subtle read counter at the bottom — *"You've read this 7 times"*
- Milestone moments (3, 7, 10, 21 reads): brief toast — *"You've read this 7 times. The words are becoming yours."*

---

## Data Model

### `scrolls` table (Supabase)

```sql
CREATE TABLE scrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  counselor TEXT NOT NULL,         -- 'marcus' | 'epictetus' | 'seneca'
  goal_source TEXT,                -- the goal text that triggered generation
  request_type TEXT DEFAULT 'auto', -- 'auto' | 'requested'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scroll_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scroll_id UUID REFERENCES scrolls(id),
  user_id UUID REFERENCES auth.users(id),
  read_count INT DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  first_read_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Endpoints (Railway Backend)

### POST `/api/scrolls/generate`
Generates a scroll for a given goal.

**Request:**
```json
{
  "userId": "uuid",
  "goal": "I want to stop yelling at my children",
  "counselor": "marcus",       // optional — auto-assigned if omitted
  "requestType": "auto"        // "auto" | "requested"
}
```

**Response:**
```json
{
  "scrollId": "uuid",
  "title": "On the Voice You Raise",
  "counselor": "marcus",
  "body": "...",
  "createdAt": "..."
}
```

### POST `/api/scrolls/read`
Logs a read event.

**Request:**
```json
{
  "scrollId": "uuid",
  "userId": "uuid"
}
```

### GET `/api/scrolls/:userId`
Returns all scrolls for a user with read counts.

---

## Frontend Components

### `ScrollsTab` (`/(tabs)/scrolls.tsx`)
- Lists all user scrolls as cards
- Each card shows: title, counselor name, read count badge
- "Request a Scroll" button at top right

### `ScrollCard`
- Title
- Counselor attribution line
- Read count (flame icon + number)
- Last read date

### `ScrollDetail` (`/scrolls/[id].tsx`)
- Full scroll text (styled for reading — large type, generous line height)
- Counselor avatar/icon at top
- Read counter at bottom
- Milestone toast on read completion

### `RequestScrollModal`
- Text input for topic
- Counselor selector (optional)
- Submit / Cancel

---

## Design Notes

- **Aesthetic**: Parchment-adjacent — warm off-white backgrounds, serif or near-serif type for the body text, subtle aged texture if feasible
- **Counselor voice**: Each counselor has a distinct tone — Marcus is personal and reflective; Epictetus is direct and challenging; Seneca is warm and literary
- **No social features**: Scrolls are private. No sharing, no likes. This is a personal practice.

---

## Out of Scope (Post-Launch)

- Scroll editing or regeneration
- Audio narration of scrolls
- Counselor-voice TTS
- Scroll sharing
- Community/public scrolls

---

## Implementation Order

1. Replace Beliefs tab with Scrolls tab (routing + empty state)
2. Create Supabase tables (`scrolls`, `scroll_reads`)
3. Build `/api/scrolls/generate` endpoint on Railway
4. Wire auto-generation to onboarding completion
5. Build `ScrollsTab` list view + `ScrollDetail` view
6. Implement read tracking (log on scroll + time threshold)
7. Add read counter UI + milestone toasts
8. Build `RequestScrollModal` + `/api/scrolls/generate` for on-demand
9. Paywall hook (stub for now, wire to RevenueCat post-launch)

---

## Claude Code Prompt (Ready to Use)

> **Task:** Implement the "Your Scrolls" feature in the Arete app, replacing the Beliefs tab.
>
> **Spec reference:** YourScrolls_FeatureSpec.md
>
> **Phase 1 (this prompt — structure only, no AI generation yet):**
> 1. Remove the Beliefs tab from the tab bar; add a Scrolls tab with a scroll icon, route `/(tabs)/scrolls`
> 2. Create `ScrollsTab` component with empty state ("Your scrolls will appear here") and a "Request a Scroll" button (non-functional placeholder)
> 3. Create `ScrollDetail` screen at `/scrolls/[id]`
> 4. Create the two Supabase tables: `scrolls` and `scroll_reads` — add migration file to `/supabase/migrations/`
> 5. Create `lib/scrolls.ts` with typed functions: `getUserScrolls(userId)`, `getScroll(scrollId)`, `logScrollRead(scrollId, userId)`
>
> Do not implement AI generation yet — that is Phase 2.
> Scoped change only. Match existing tab bar styling.

---

*Spec complete. Next action: TestFlight build.*
