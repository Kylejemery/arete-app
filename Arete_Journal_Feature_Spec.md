# Arete App — Journal Feature Spec

*For GitHub Copilot. Complete specification for building the Unified Journal and Belief Journal features. Implement exactly as described — do not simplify or combine stages without explicit instruction.*

---

## 1. Overview

The current app has three separate sections: Journal, Commonplace Book, and Belief Journal. These are being replaced by two things:

- A **Unified Journal** — one feed for all writing, filterable by type
- The **Belief Journal process** — retained in full, but entries now appear in the Unified Journal feed

The goal is lower friction. The user should not have to decide which tab to open before they write. Everything goes into one place and is tagged by type.

---

## 2. Unified Journal — Full Spec

### 2.1 Entry Types

Every entry is tagged with one of four types at the time of creation:

- 📝 **Reflection** — daily thoughts, free writing, anything that does not fit another category
- 📖 **Quote** — a quote from a book, with book title and author fields
- 💡 **Belief** — triggers the full Belief Journal refinement process (see Section 3)
- 🧠 **Idea** — seeds for essays, app features, philosophical fragments

### 2.2 The Feed

- Reverse chronological — newest entries at the top
- All entry types appear together in the same feed by default
- Each entry in the feed shows: type badge (emoji + label), date, and a text preview (first 2 lines or ~120 characters)
- Tapping any entry expands it to show the full content
- For Belief entries specifically, tapping opens the full cabinet dialogue history that led to the encoded belief

### 2.3 Filter Bar

A filter bar appears at the top of the Journal screen, above the feed.

- Filter options: **All | Reflection | Quote | Belief | Idea**
- Single tap to select a filter — tapping again or tapping All clears the filter
- Only one filter active at a time
- The feed updates immediately when a filter is selected — no page reload

### 2.4 Search

- A search bar accessible from the top of the Journal screen
- Full text search across all entry types
- Search covers: entry content, book titles, authors, entry tags
- Results update in real time as the user types
- Search and filter can be active simultaneously — search within a filtered type

### 2.5 Adding a New Entry

- One **"+" button** — always visible, fixed to bottom right of screen
- Tapping "+" opens a type selector: four options (Reflection, Quote, Belief, Idea)
- Tapping a type opens the appropriate input form for that type

Input forms by type:

- **Reflection:** Large text field, no additional fields. Placeholder: *"What's on your mind?"*
- **Quote:** Text field for the quote, text field for book title, text field for author. All three visible. Quote field is largest.
- **Belief:** Opens the Belief Journal flow (see Section 3). Does not open a simple text field.
- **Idea:** Large text field. Placeholder: *"What seed do you want to keep?"*

### 2.6 Editing and Deleting Entries

- Long press on any entry in the feed to reveal edit / delete options
- Editing opens the same input form used to create that entry type
- Belief entries cannot be edited directly — they can only be updated by starting a new refinement dialogue
- Delete requires a confirmation prompt: *"Delete this entry? This cannot be undone."*

---

## 3. Belief Journal — Full Spec

The Belief Journal is not a simple text entry. It is a structured cabinet dialogue that ends in an encoded belief. The process has three stages. **Do not collapse these stages. Each one is necessary.**

### 3.1 What the Belief Journal Is

The user comes to the Belief Journal with a half-formed thought — something they feel but cannot clearly articulate. The cabinet helps them sharpen it into a clear, personally owned philosophical statement. The final encoded belief is saved to the Unified Journal feed tagged as a Belief entry.

The philosophical purpose: articulating a belief clearly and reading it back to yourself encodes it more deeply — strengthening the neural pathways between belief and behavior. This is the central thesis of the app.

### 3.2 The Three Stages

**Stage 1 — Raw Input**

- The user writes their muddled thought. Raw, unfiltered, whatever is in their head.
- No length requirement. Could be one sentence or several paragraphs.
- Placeholder text: *"Write what you're thinking — messy is fine. The cabinet will help you find what you actually mean."*
- User taps "Send to Cabinet" to proceed

**Stage 2 — Cabinet Dialogue**

- The cabinet does **NOT** refine immediately. It asks clarifying questions first.
- The cabinet questions assumptions — probes whether the belief is genuinely the user's or something borrowed, unexamined, or performed.
- This dialogue may go back and forth multiple times. There is no fixed number of exchanges.
- When the cabinet judges that enough has been surfaced through dialogue, it offers a refined version of the belief.
- The refined version is presented with a question: *"Does this land? What needs to change?"*
- The cabinet also runs a **Stoic virtue check** throughout: it holds the belief against Wisdom, Justice, Courage, and Temperance. If the belief conflicts with genuine virtue, the cabinet names it — not harshly, but honestly.

**Stage 3 — Iteration and Encoding**

- The user can push back on the cabinet's refinement at any time.
- The process continues — the cabinet refines again based on the user's pushback.
- This iterates until the entry sounds exactly like the user. The test is: *"Does this sound like something I would have written myself?"*
- When the user is satisfied, they tap **"Encode this belief."**
- The encoded belief is saved to the Unified Journal feed as a Belief entry.

### 3.3 Format of the Encoded Belief

- Variable length. The cabinet should not impose a length — short or long depending on what the belief requires.
- Always: clear, sharp, and easy to retain after reading.
- Sometimes short — aphoristic, one or two sentences. Think: Enchiridion-style.
- Sometimes longer — when the idea requires fuller development to reach precision.
- The test is not length but clarity and retention.
- May include brief takeaways or summary lines where appropriate.

### 3.4 The Stoic Virtue Check

- The cabinet holds all refinements against the four cardinal virtues: Wisdom, Justice, Courage, Temperance.
- If a belief being encoded appears to conflict with genuine virtue, the cabinet must name it.
- This check is not an obstacle — it is a feature. The journal is for self-examination, not self-justification.
- If a concern was flagged during the dialogue, the encoded belief in the feed displays a small warning badge.
- Tapping the badge shows the cabinet's specific concern.

### 3.5 Triggers — Two Entry Points

**User-initiated:**

- User taps "+" in the Unified Journal and selects "Belief" as the entry type
- Opens directly to Stage 1 input

**Cabinet-prompted:**

- During morning or evening check-ins, if the cabinet identifies a half-formed thought in the user's input, or detects a gap between stated beliefs and described behavior, it can ask: *"This feels like something worth examining more carefully. Want to work through it in your Belief Journal?"*
- If the user says yes, the app navigates to the Belief Journal with the relevant text pre-populated in Stage 1

### 3.6 The Living Belief Canon

- All encoded beliefs are stored and visible in the Unified Journal feed filtered as Belief entries
- They are also accessible as a dedicated **"Canon" view** — a scrollable list of only encoded beliefs, displayed cleanly, one per card
- The Canon view is read-only — no editing of encoded beliefs directly
- To update a belief, the user starts a new Belief Journal entry
- The cabinet should reference past encoded beliefs during check-ins — if the user's described behavior contradicts a stated belief, the cabinet names it directly

### 3.7 Dialogue History

- Every Belief entry in the feed retains the full cabinet dialogue that produced it
- Tapping an encoded belief in the feed opens a view that shows: the original raw input, the full dialogue exchange, and the final encoded belief
- This dialogue history is read-only

---

## 4. Data Model

Base schema — all entry types share this:

```
id: string (UUID)
type: "reflection" | "quote" | "belief" | "idea"
content: string (main text)
createdAt: timestamp
updatedAt: timestamp
```

Additional fields by type:

```
Quote:
  bookTitle: string
  author: string

Belief:
  rawInput: string
  dialogueHistory: array of { role, content, timestamp }
  encodedBelief: string
  virtueConcern: string | null
  hasVirtueConcern: boolean
```

---

## 5. Navigation

- The Journal tab in the bottom navigation opens the Unified Journal feed
- The Canon view (encoded beliefs only) is accessible from a button within the Journal screen — e.g. a "Canon" icon or link in the header
- The Belief Journal dialogue flow opens as a modal or full-screen view — it should feel distinct from casual journal entry
- Back navigation from the Belief Journal dialogue always prompts: *"Your progress in this dialogue will be saved as a draft. Continue later?"*

---

## 6. What to Remove

Remove the following from the current codebase:

- The separate Journal tab
- The separate Commonplace Book tab
- The separate Belief Journal tab

Replace all three with the single Unified Journal screen as described in Section 2. The Belief Journal functionality is preserved — it just lives within the Unified Journal as the "Belief" entry type.

**Do not delete the Belief Journal logic or AI dialogue components — migrate them into the new entry flow.**

---

## 7. What Not to Change

- Cabinet check-in flows (morning and evening) — no changes
- Progress tracker — no changes
- Reading tracker — no changes
- Push notifications — no changes
- The five counselor profiles and their response logic — no changes
- Server infrastructure and authentication — no changes

---

*If anything in this spec is ambiguous, ask before building. Do not make assumptions that simplify the Belief Journal process — the three-stage structure and the Stoic virtue check are non-negotiable.*
