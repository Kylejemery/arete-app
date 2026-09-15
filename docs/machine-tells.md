# Machine tells

The characteristics of machine-written prose that Scribe, Scribe chat, and the
Composer are told to avoid, and that the voice meter and the cold outside read
are told to flag. The list lives in code, in
`academy/web/src/lib/machine-tells.ts` (`MACHINE_TELLS_BLOCK`), and every
surface that writes or judges prose imports it from there, so one list governs
all of them. This page is the readable copy.

The first four came from Kyle's reading of Scribe drafts (September 2026). The
rest are the tells screeners key on. The rule under all of them is his:
**show it, do not say it.**

| # | Tell | Example | Instead |
|---|------|---------|---------|
| 1 | **The dash.** Em dash, en dash used as one, spaced hyphen used as one. | `the work — and the waiting — was his` | A period, colon, semicolon, comma, or parentheses; or rewrite the sentence. Hyphens inside compounds and ranges stay. |
| 2 | **The negation-first frame.** Deny a reading nobody offered, then correct it. | `This does not produce sympathy. It produces something colder and more useful.` / `This is not poetry about karma. It is a practical claim.` / `Not just X, but Y.` | State the positive claim on its own. If the denied reading is genuinely live, name who holds it and answer them. |
| 3 | **Announcing importance instead of showing it.** | `and the difference matters more than almost anything else in this essay:` / `Here is the thing.` / `This is the crux.` / `That changes everything.` | Cut the announcement. Put the idea where its weight is felt, after the concrete thing that makes it true, in plain words. |
| 4 | **Over-the-top comparison and hyperbole.** | `the loudest tell in the language` / `nothing less than` / `the single most` / `a quiet revolution` | Scale the claim to the evidence. A smaller exact claim outweighs a large one the reader discounts. |
| 5 | **The rule-of-three reflex.** | `clarity, purpose, and meaning` | Two is often stronger; one unexpected item stronger still. |
| 6 | **Signposting and scaffolding.** | `firstly`, `in conclusion`, `it is important to note`, `in other words`, `moreover`, `let that sink in`, `make no mistake` | The essay argues; it does not narrate its own argument. |
| 7 | **Thesaurus diction.** | `delve`, `tapestry`, `testament to`, `navigate the complexities`, `underscore`, `landscape`, `realm`, `nuanced`, `crucial`, `pivotal`, `profound` | The plain, exact word. |
| 8 | **The hedge stack.** | `While X is true, it is also worth noting that Y.` | Say the thing. |
| 9 | **Uniform rhythm.** Every sentence the same length. | | A long winding sentence, then a three-word one. A fragment is allowed. |
| 10 | **Abstract nouns where a thing belongs.** | `a reminder of loss` | The gutter he never fixed. Name the object, the person, the day. Strong verbs over adverbs. |
| 11 | **The rhetorical question that answers itself.** | `What does that mean? It means...` | Ask only if the question stays open. |
| 12 | **The manufactured punchline.** | `The answer: discipline.` / `Simple.` / `Full stop.` | Emphasis from the idea, not the typography. |
| 13 | **The summarizing ending.** | Restating the essay; a tidy moral. | Land somewhere the reader did not see coming but now finds inevitable. |
| 14 | **Talking to the reader about the reader or the writing.** | `You already know this.` / `Stay with me here.` | The prose does its work instead of commenting on itself. |

## Where it is enforced

- **Scribe chat** (`lib/scribe/chat.ts`): the block sits under PROSE PHYSICS in
  the system prompt and governs the draft and the commentary alike.
- **Scribe pipeline** (`lib/scribe/pipeline/draft.ts`): the block is in the
  Stage C system prompt.
- **Composer, In my voice** (`lib/composer.ts`, `VOICE_SYSTEM`): every variant
  must be free of the tells, and a sentence that carries one is rewritten
  without it.
- **Composer, markup** (`lib/interlocutor.ts`): the Interlocutor marks tells
  under Economy, names the tell, and holds its own comments to the list.
- **Voice meter** (`lib/scribe/voice-metrics.ts`, `PATTERN_TELLS`): the
  negation-first frame, announced importance, hyperbole, the self-answered
  question, and the punchline are detected by pattern and painted in the draft
  alongside the phrase list. Checks: `npx tsx src/scripts/machine-tells-smoke.ts`.
- **Cold outside read** (`lib/scribe/review.ts`): the `tells` category names
  the same list (`MACHINE_TELLS_SUMMARY`).
