# Arete App — Custom Cabinet Feature Spec

*For GitHub Copilot. This spec covers the full Custom Cabinet feature: a library of 20-25 historical and modern counselors that users can browse and select from to build their own personal cabinet. Implement after the core app features are stable. This is a premium feature.*

---

## 1. Overview

The current app ships with a fixed default cabinet: Marcus Aurelius, Epictetus, David Goggins, Theodore Roosevelt, and Future Self. The Custom Cabinet feature replaces this with a curated library of 20-25 counselors across six categories. Users browse the library, read each counselor's profile, and select 3-5 to form their personal cabinet.

**Two rules that never change:**
- Future Self is always present in every user's cabinet. It cannot be removed.
- The user's cabinet must have a minimum of 3 counselors (plus Future Self) and a maximum of 5 (plus Future Self).

**Tier:** Premium feature. Free users see the library and can browse it, but cannot customize their cabinet. Free users get a default cabinet of 3 counselors: Marcus Aurelius, David Goggins, and Future Self.

---

## 2. The Counselor Library

### 2.1 Categories and Counselors

**Stoics and Philosophers**
- Marcus Aurelius — Roman Emperor, Stoic philosopher, author of Meditations
- Epictetus — Stoic philosopher, former slave, author of the Discourses and Enchiridion
- Seneca — Stoic philosopher, playwright, advisor to Nero
- Socrates — Greek philosopher, father of Western philosophy
- Aristotle — Greek philosopher, student of Plato, founder of logic and ethics

**Warriors and Military Leaders**
- Theodore Roosevelt — 26th US President, Rough Rider, naturalist, boxer
- Winston Churchill — British Prime Minister, wartime leader, Nobel laureate in literature
- Sun Tzu — Chinese general, military strategist, author of The Art of War
- Alexander the Great — Macedonian king, undefeated military commander

**Modern Athletes and Performers**
- David Goggins — Navy SEAL, ultramarathon runner, author of Can't Hurt Me
- Kobe Bryant — NBA champion, author of The Mamba Mentality
- Muhammad Ali — World heavyweight boxing champion, activist
- Serena Williams — Tennis champion, 23 Grand Slam titles

**Entrepreneurs and Builders**
- Benjamin Franklin — Founding Father, inventor, diplomat, author
- Steve Jobs — Co-founder of Apple, pioneer of personal computing
- Elon Musk — Founder of Tesla, SpaceX, and multiple companies
- Abraham Lincoln — 16th US President, led the nation through the Civil War

**Writers and Thinkers**
- Friedrich Nietzsche — German philosopher, author of Thus Spoke Zarathustra
- Ralph Waldo Emerson — American essayist, poet, philosopher of self-reliance
- Viktor Frankl — Austrian psychiatrist, Holocaust survivor, author of Man's Search for Meaning
- Henry David Thoreau — American author, philosopher, author of Walden

**Spiritual and Contemplative**
- Buddha (Siddhartha Gautama) — Founder of Buddhism, teacher of the middle way
- Rumi — 13th century Persian poet, Sufi mystic
- Nelson Mandela — South African anti-apartheid leader, 27 years in prison, President

### 2.2 Counselor Profile Structure

Each counselor in the library has the following fields stored in the database:

```
id: uuid
name: string
category: string
birth_year: integer (null if unknown)
death_year: integer (null if living or unknown)
one_line: string (max 100 chars — shown on card in browse view)
bio: string (3-4 sentences — shown on detail view)
philosophy: string (2-3 sentences — the core of what they believed)
communication_style: string (how they speak in the cabinet)
challenge_level: string ('direct' | 'firm' | 'gentle')
quotes: jsonb (array of quote strings)
is_active: boolean
```

### 2.3 The Challenge Level Field

Every counselor has a challenge level that describes how directly they will push back on the user. This is displayed in the library so users understand what they are choosing:

- **Direct** — will call out excuses without softening. Examples: Goggins, Epictetus, Nietzsche.
- **Firm** — challenges with conviction but with warmth. Examples: Marcus Aurelius, Roosevelt, Churchill.
- **Gentle** — questions and reframes rather than confronts. Examples: Buddha, Rumi, Frankl.

**Design rule:** The user's cabinet must include at least one counselor with a challenge level of 'direct' or 'firm'. If a user tries to save a cabinet with only 'gentle' counselors, show a warning: *"Your cabinet needs at least one voice that will challenge you directly. Consider adding someone who won't let you off the hook."* The user can override this warning and save anyway — it is a nudge, not a hard block.

---

## 3. Database Schema

### 3.1 New Table: `counselors`

```sql
create table counselors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in (
    'stoics_philosophers',
    'warriors_military',
    'modern_athletes',
    'entrepreneurs_builders',
    'writers_thinkers',
    'spiritual_contemplative'
  )),
  birth_year integer,
  death_year integer,
  one_line text not null,
  bio text not null,
  philosophy text not null,
  communication_style text not null,
  challenge_level text not null check (challenge_level in ('direct', 'firm', 'gentle')),
  quotes jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);
```

This table is read-only for users — no RLS policy needed for writes. All users can read all counselors. No user_id — this is a shared library.

```sql
-- Allow all authenticated users to read counselors
alter table counselors enable row level security;
create policy "Anyone can read counselors"
  on counselors for select
  using (true);
```

### 3.2 Update `user_settings` Table

Add a column to store the user's selected cabinet:

```sql
alter table user_settings add column if not exists cabinet_selection jsonb default '[]';
```

`cabinet_selection` stores an array of counselor IDs the user has selected:
```json
["uuid-marcus", "uuid-goggins", "uuid-seneca"]
```

Future Self is never stored here — it is always added automatically when the cabinet is assembled.

### 3.3 Seed the Counselors Table

After creating the table, seed it with all 20-25 counselors. Each counselor needs all fields populated including at least 5-8 quotes. See Section 6 for the seed data structure.

---

## 4. Feature UI

### 4.1 Access Point

The Custom Cabinet feature is accessible from two places:
- **Settings screen** — "Customize Your Cabinet" option
- **Setup flow Step 10** — the cabinet selection step is replaced with the new library browser for premium users (free users see the default selection and a prompt to upgrade)

### 4.2 Cabinet Browser Screen

The main screen of the feature. Shows:

**Header:**
- Title: "Your Cabinet"
- Subtitle: "Choose 3-5 counselors. Future Self is always with you."
- Current cabinet preview — small avatar circles showing currently selected counselors
- "Save Cabinet" button (disabled until valid selection is made)

**Category Filter Bar:**
- All | Stoics | Warriors | Athletes | Builders | Writers | Spiritual
- Single tap to filter by category

**Counselor Cards (grid or list):**
Each card shows:
- Counselor name
- Category badge
- One-line description
- Challenge level indicator (small colored dot — red for direct, amber for firm, green for gentle)
- Selected state (gold border + checkmark when selected)
- Tap to open detail view

**Selection Rules Enforced in UI:**
- Maximum 5 selected — once 5 are selected, all unselected cards dim
- Minimum 3 required to save
- Challenge level warning shown inline if all selected are 'gentle'

### 4.3 Counselor Detail View

Opens as a modal or slide-up sheet when a card is tapped. Shows:

- Name and dates (birth-death or birth-present)
- Category
- Challenge level with plain description
- Full bio (3-4 sentences)
- Core philosophy (2-3 sentences)
- Communication style description
- 2-3 sample quotes from the counselor
- "Add to Cabinet" / "Remove from Cabinet" button
- Back button

### 4.4 Save and Confirmation

When the user taps "Save Cabinet":
1. Validate: minimum 3 selected, challenge level warning if applicable
2. Show confirmation: "Your cabinet has been updated. [Name1], [Name2], [Name3] and your Future Self are ready."
3. Write selected counselor IDs to `user_settings.cabinet_selection` in Supabase
4. Navigate back to home or settings

### 4.5 Free User Experience

Free users can browse the full library and read every counselor's profile. They cannot select or save. When they tap "Add to Cabinet" on any counselor, show the paywall modal:

*"Building your own cabinet is a premium feature. Upgrade to choose the voices that will challenge you most."*

Free users always have the default cabinet: Marcus Aurelius, David Goggins, and Future Self.

---

## 5. Cabinet Integration — How It Affects AI Responses

### 5.1 The System Prompt

When a user opens any cabinet conversation (check-in, cabinet chat, belief journal), the system prompt passed to the Claude API must be updated to reflect the user's current cabinet selection.

Currently the system prompt hardcodes the five default counselors. This needs to change.

In `services/claudeService.ts` (or wherever the system prompt is constructed):

```typescript
// Current hardcoded approach — replace this
const systemPrompt = `You are a cabinet of five counselors: Marcus Aurelius, Epictetus, David Goggins, Theodore Roosevelt, and Future Self...`

// New dynamic approach
const userCabinet = await getUserCabinet(); // returns array of counselor objects
const systemPrompt = buildCabinetSystemPrompt(userCabinet, userSettings);
```

### 5.2 Building the Dynamic System Prompt

Create a function `buildCabinetSystemPrompt` that:

1. Takes the array of selected counselor objects (with their bios, philosophies, communication styles, and quotes)
2. Takes the user's profile (name, goals, Future Self description)
3. Constructs a system prompt that:
   - Introduces each counselor with their bio, philosophy, and communication style
   - Includes 3-4 representative quotes per counselor so the AI can match their voice
   - Explains the Future Self using the user's own description from setup
   - Instructs the AI on how to rotate between voices appropriately
   - Maintains the core cabinet rules: no sycophancy, genuine accountability, Stoic virtue check

### 5.3 Future Self Always Uses the User's Description

The Future Self counselor is unique — their profile is not drawn from the library but from what the user wrote in setup:

```typescript
const futureSelf = {
  name: `Future ${userSettings.user_name}`,
  years: userSettings.future_self_years,
  description: userSettings.future_self_description,
  communication_style: 'Warm, wise, unhurried. Sees the long arc clearly. Does not panic or catastrophize.'
}
```

---

## 6. Seed Data Structure

Each counselor entry should be seeded with this structure. Example for Marcus Aurelius:

```json
{
  "name": "Marcus Aurelius",
  "category": "stoics_philosophers",
  "birth_year": 121,
  "death_year": 180,
  "one_line": "Roman Emperor and Stoic philosopher who ruled the most powerful empire in the world while fighting a daily war against his own ego.",
  "bio": "Marcus Aurelius was Emperor of Rome from 161 to 180 AD. He governed the most powerful empire in the world while simultaneously waging a private war against his own anger, fatigue, and distraction. His Meditations — a private journal never intended for publication — is one of the most honest documents of self-examination ever written.",
  "philosophy": "Virtue is the only true good. Everything else — wealth, health, reputation — is a preferred indifferent. The obstacle is the way. Focus only on what is within your control and act with full integrity in the present moment.",
  "communication_style": "Calm, measured, deeply reflective. Does not lecture — invites the user to look inward. Reframes problems in terms of what is and is not within the user's control. Has quiet gravity. Most likely to ask what virtue demands in this moment.",
  "challenge_level": "firm",
  "quotes": [
    "You have power over your mind, not outside events. Realize this and you will find strength.",
    "The impediment to action advances action. What stands in the way becomes the way.",
    "Waste no more time arguing about what a good man should be. Be one.",
    "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.",
    "If it is not right, do not do it. If it is not true, do not say it.",
    "The best revenge is to be unlike him who performed the injustice.",
    "Confine yourself to the present."
  ]
}
```

Seed all 20-25 counselors with this same structure before the feature goes live. Each counselor needs at minimum 6-8 quotes that are authentic to their voice and philosophy.

---

## 7. lib/db.ts Functions to Add

```typescript
// Get all active counselors from the library
export async function getCounselors(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('is_active', true)
    .order('category')
  if (error) console.error('getCounselors error:', error)
  return data ?? []
}

// Get a single counselor by ID
export async function getCounselor(id: string): Promise<Counselor | null> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('id', id)
    .single()
  if (error) console.error('getCounselor error:', error)
  return data
}

// Get the user's current cabinet selection (array of counselor objects)
export async function getUserCabinet(): Promise<Counselor[]> {
  const userId = await getUserId()
  if (!userId) return []
  const { data: settings } = await supabase
    .from('user_settings')
    .select('cabinet_selection')
    .eq('user_id', userId)
    .single()
  if (!settings?.cabinet_selection?.length) return getDefaultCabinet()
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .in('id', settings.cabinet_selection)
  if (error) console.error('getUserCabinet error:', error)
  return data ?? []
}

// Save the user's cabinet selection
export async function saveCabinetSelection(counselorIds: string[]): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase
    .from('user_settings')
    .update({ cabinet_selection: counselorIds })
    .eq('user_id', userId)
  if (error) console.error('saveCabinetSelection error:', error)
}

// Get the default cabinet for free users
export async function getDefaultCabinet(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .in('name', ['Marcus Aurelius', 'David Goggins'])
  if (error) console.error('getDefaultCabinet error:', error)
  return data ?? []
}
```

---

## 8. TypeScript Types to Add

Add to `lib/types.ts`:

```typescript
export interface Counselor {
  id: string
  name: string
  category: 'stoics_philosophers' | 'warriors_military' | 'modern_athletes' | 'entrepreneurs_builders' | 'writers_thinkers' | 'spiritual_contemplative'
  birth_year: number | null
  death_year: number | null
  one_line: string
  bio: string
  philosophy: string
  communication_style: string
  challenge_level: 'direct' | 'firm' | 'gentle'
  quotes: string[]
  is_active: boolean
  created_at: string
}

export interface CabinetMember extends Counselor {
  is_future_self?: boolean
}
```

---

## 9. Quote Research Required

Before this feature goes live, quotes and voice profiles need to be researched and written for all 20-25 counselors. The Goggins reference document already exists. The same needs to be done for:

- Marcus Aurelius (Meditations — extensive source material)
- Epictetus (Discourses, Enchiridion)
- Seneca (Letters, Essays)
- Socrates (via Plato's dialogues)
- Aristotle (Nicomachean Ethics, Politics)
- Theodore Roosevelt (speeches, letters, autobiography)
- Winston Churchill (speeches, writings)
- Sun Tzu (The Art of War)
- Alexander the Great (historical accounts)
- Kobe Bryant (The Mamba Mentality, interviews)
- Muhammad Ali (interviews, autobiography)
- Serena Williams (interviews, autobiography)
- Benjamin Franklin (Poor Richard's Almanack, autobiography)
- Steve Jobs (interviews, Stanford commencement speech)
- Elon Musk (interviews)
- Abraham Lincoln (speeches, letters)
- Friedrich Nietzsche (Thus Spoke Zarathustra, Beyond Good and Evil)
- Ralph Waldo Emerson (Self-Reliance, essays)
- Viktor Frankl (Man's Search for Meaning)
- Henry David Thoreau (Walden, Civil Disobedience)
- Buddha (Dhammapada, sutras)
- Rumi (Masnavi, poems)
- Nelson Mandela (Long Walk to Freedom, speeches)

For each: minimum 6-8 quotes, bio, core philosophy, communication style, challenge level.

---

## 10. Order of Implementation

1. Create `counselors` table in Supabase with SQL from Section 3.1
2. Add `cabinet_selection` column to `user_settings`
3. Add TypeScript types to `lib/types.ts`
4. Add db functions to `lib/db.ts`
5. Seed counselors table with all 20-25 entries
6. Build Cabinet Browser screen (mobile first)
7. Build Counselor Detail view
8. Wire save/load to Supabase
9. Update `buildCabinetSystemPrompt` to be dynamic
10. Build Cabinet Browser screen for web
11. Add paywall gate for free users
12. Update setup flow Step 10 to use new library
13. Test end-to-end: select cabinet, have check-in, confirm counselors respond in their correct voices

---

## 11. What Not to Change

- Future Self logic — always present, always uses user's own description
- Check-in flow structure — no changes
- Journal feature — no changes
- Belief Journal — no changes
- Payments and subscription logic — no changes
- The core rule: no sycophancy, genuine accountability, Stoic virtue check on beliefs

---

*If anything in this spec is ambiguous, ask before building. The counselor seed data is the most important piece — do not launch this feature with thin or inauthentic profiles. Each counselor needs to sound genuinely like themselves.*
