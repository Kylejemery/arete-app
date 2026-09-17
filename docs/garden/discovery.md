# Garden discovery — Part 0 findings

**Date:** 2026-09-16
**Scope:** the `kylejemery/arete-app` monorepo, the Supabase project
`zhaarabzemhantyxxckq`, and the Vercel account.
**Method:** case-insensitive content search across `.tsx`, `.ts`, `.jsx`, `.js`,
`.html`, `.md`, `.json` (excluding `node_modules`, `.next`, build output and
`package-lock.json`), a filename search, a search of the full git history
(`git log --all --grep`, plus every file ever added), a route inventory of both
Next.js apps and the Expo app, `information_schema` via the Supabase MCP tools,
and the Vercel MCP tools.

---

## Headline: there is no garden

**No garden exists in this monorepo, in the database, or in git history.**

- No file, directory, route, component, or table is named after a garden.
- `git log --all -i --grep="garden"` returns nothing. No file whose path
  contains "garden" has ever been added on any branch.
- No table in `public` on `zhaarabzemhantyxxckq` is garden-related. (The
  interactive-piece tables that do exist are `playground_comments`,
  `kosmopolis_lives`, `kosmopolis_worlds`, `kosmopolis_saves`.)

Every occurrence of the word "garden" in the repository is one of three
innocuous things:

| File | What it is |
|---|---|
| `academy/web/src/components/playground/KosmopolisWorld.tsx:1747–2023` | A `drawGarden()` canvas helper that paints tilled garden beds behind the dwellings in the Kosmopolis world map. Scenery inside a larger simulation, not a piece of its own. |
| `academy/web/src/components/HappinessScale.tsx:157` | The one-line blurb on the Epicurus marker: *"Simple garden life."* |
| `Montaigne_Cabinet_Reference.md`, `scripts/cabinet_conversations_extracted.md`, `academy/corpus-ingestion/texts/*.txt`, `supabase/migrations/20260320000001_seed_counselors.sql` | Prose — the word appearing in quoted source texts and counselor reference material. |

### Vercel

`list_teams` returns an empty list (personal account, no teams), and
`list_projects` fails without a team ID, so the Vercel project and deployment
list could not be enumerated from this session. There is no `.vercel/project.json`
anywhere in the repo either. **If a garden was built outside this monorepo and
deployed straight to Vercel, this search would not have found it** — see the
questions for Kyle below.

### Nearest candidate, and why it is not a match

**Kosmopolis** (`academy/web/src/app/playground/kosmopolis`) is the only piece
with any garden character: you seed souls into a world and watch them grow, and
the map literally draws garden plots. If Kyle's memory of "a garden" is really a
memory of Kosmopolis, that is the piece. But it is titled and described
everywhere as a *world*, not a garden, and nothing in the code, the copy, or the
schema calls it one. Calling it the garden would be a guess, so this document
does not make it.

---

## Inventory of existing interactive pieces

All of them live in one place: **`academy/web/src/app/playground/`** on the
Academy Next.js app (`academy.pursuearete.com`), with their components under
`academy/web/src/components/playground/` (plus `HappinessScale.tsx`, which sits
one level up in `components/`).

### Release gate

`academy/web/src/middleware.ts` holds `RELEASED_PLAYGROUND`:

```ts
const RELEASED_PLAYGROUND = ['happiness-scale', 'zenos-hand']
```

Everything under `/playground` that is not in that list — **the index page
included** — returns a hard 404. So only two pieces are reachable in public
today; the other five are built but gated. This list is effectively the current
`status = 'gallery'` flag, and it is the thing the exhibits table would replace.

### The pieces

| Piece | Route | Component | What it does | Data it touches | User-derived content on the page? |
|---|---|---|---|---|---|
| **The Scale of Happiness** | `/playground/happiness-scale` **(released)** | `components/HappinessScale.tsx` (+ `.module.css`) | Κλίμακα Εὐδαιμονίας. Drag a marker from Ataraxia to Epithumia, read the zones, see where named philosophers land. | **None.** No `supabase` import, no `fetch`, no API call. Entirely client-side. | **No.** |
| **Zeno's Hand** | `/playground/zenos-hand` **(released)** | `components/playground/ZenosHand.tsx` (+ `.module.css`), content in `content/playground/zenos-hand` | Zeno's four-position gesture for Stoic epistemology — open, curled, closed, gripped — as an animated SVG hand, then nine assent test cases from the ancient argument. | Renders `CorpusDiscussion`, which reads and writes `playground_comments` via `/api/playground/*`. | **Yes** — the discussion board below the piece shows visitor comments. See the privacy note. |
| **Kosmopolis** | `/playground/kosmopolis` *(gated)* | `components/playground/KosmopolisWorld.tsx` (187 KB, canvas) | A simulated world whose physics reward virtue. Seed souls, watch them evolve, spend the Oracle to awaken one to reason. | `kosmopolis_lives` (public-read ledger of awakenings and counsels, service-role writes only), `kosmopolis_worlds` (owner-only saved world, `auth.uid()` RLS), `kosmopolis_saves`; API under `api/playground/kosmopolis`. | **Yes** — the ledger is attributed to the signed-in visitor's `author_name` where present ("a wanderer" when anonymous), and `advice` text is visitor-written. |
| **The Situations Game** | `/playground/situations` *(gated)* | `components/playground/SituationsGame.tsx`, content in `content/playground/situations` | Everyday situations with the verdict the school would give; master–detail, selection in the URL hash. | `CorpusDiscussion` → `playground_comments`. | **Yes** — discussion board. |
| **The View from Above** | `/playground/view-from-above` *(gated)* | `components/playground/ViewFromAbove.tsx` (+ `.module.css`), content in `content/playground/instruments` | The Stoic exercise of rising until all of time is in view: universe as a year, Earth as a day, the species as an hour, with a hand set to your own age. | None found. | **No.** |
| **The Long Filter** | `/playground/the-long-filter` *(gated)* | `components/playground/LongFilter.tsx` (+ `.module.css`), content in `content/playground/long-filter` | The Fermi question as two conditions — malice against how fast we improve, error against how fast we learn. | None found. | **No.** |
| **The Passage** | `/playground/the-passage` *(gated)* | `components/playground/ThePassage.tsx` (+ `.module.css`), content in `content/playground/the-passage`, model in `lib/passage-model` | What the crossing to a sage civilization costs from the inside: set two clocks, drag the centuries, watch institutions dissolve. | None found. | **No.** |
| **Perspectives** | `/playground/perspectives/[slug]` *(gated)*; also public at `/perspectives/[slug]` | `content/perspectives` | Essay surface with a corpus discussion, not really an interactive piece. | `CorpusDiscussion` → `playground_comments`. | **Yes** — discussion board. |

### The Observatory (a candidate, not moved in this spec)

- Web: `academy/web/src/app/observatory/[kind]/[id]/page.tsx` + `layout.tsx`
- Mobile: `app/library/observatory.tsx`
- Server: `server/routes/observatory.js`, rate-limited via `observatory_rate_limits`

Public share pages over approved, `observatory_visible` data. Left alone, per
the spec's backlog.

---

## How the pieces reach the user today

### Mobile (Expo)

There is **no Explore tab**. The bottom tab bar (`app/(tabs)/_layout.tsx`) is
Home, Morning, Evening, Cabinet, Journal, Focus, Scrolls, Progress. Explore is a
**right-slide drawer**, `components/SideMenu.tsx`, opened from the Home screen's
menu button, titled "EXPLORE", with four entries:

```ts
const ROUTES = {
  academy: '/academy',
  library: '/library',
  agora:   '/agora',
  scale:   '/happiness-scale',
} as const;
```

`app/happiness-scale.tsx` is a **WebView over
`https://academy.pursuearete.com/playground/happiness-scale`** — deliberately
not a second native copy. It needs no sign-in handoff because the slug is in
`RELEASED_PLAYGROUND`, and any navigation away from that URL closes the WebView
and returns to the app. **This is already the `kind = 'web_embed'` pattern the
spec asks for, and it is the pattern to reuse.**

Zeno's Hand has **no mobile route at all** today, even though it is released on
the web.

### Web app (`web/`, app.pursuearete.com)

`web/src/components/Sidebar.tsx` has an **`Explore` section** (`heading:
'Explore'`) with: The Academy (external), The Library (external), The Agora
(in-app `/agora`), and The Scale of Happiness (external, straight to the Academy
playground URL). The comment there states the intent explicitly: the Scale stays
one implementation on the Academy rather than a second copy.

Zeno's Hand is **not linked from the web app** either.

So "add a Garden entry to the Explore tab alongside the Agora" means, concretely:
one new item in `components/SideMenu.tsx` (mobile) and one new item in the
`Explore` section of `web/src/components/Sidebar.tsx` (web).

---

## Two things Part 2 will run into

1. **The privacy rule has live counterexamples.** The spec says no exhibit may
   display user-derived content, enforced in code. Three of the eight pieces
   already do: `CorpusDiscussion` renders visitor comments from
   `playground_comments` under Zeno's Hand, the Situations Game and
   Perspectives, and the Kosmopolis ledger is attributed by `author_name`.
   Wrapping those pieces in the template without a decision here would either
   break the rule or silently drop a feature. **Kyle needs to rule on this
   before Part 2 is built** — see the questions below.

2. **There are two migration directories.** `supabase/migrations/` (timestamp
   prefixes, the one `CLAUDE.md` names) and `academy/supabase/migrations/`
   (numbered `006_`…`011_`, where all the playground tables live), both applied
   to the same project. The `exhibits` table needs to go in one of them
   deliberately; `CLAUDE.md` points at `supabase/migrations/`.

---

## Stop condition, and what happened after it

The spec's Part 0 stop condition was met: **no garden was found.** Work stopped
and Kyle was asked. His answers, and the state as of 2026-09-16:

| Question | Answer |
|---|---|
| Is Kosmopolis the garden? | **No.** Kosmopolis is the world simulation and nothing else. The garden remains unlocated, and may have to be rebuilt from scratch. |
| Privacy rule vs. the discussion boards | **Comments stay.** `CorpusDiscussion` is fine. The template therefore carries a named `discussion` slot below the exhibit frame, and the no-user-content rule applies to the exhibit's own fields. |
| Register the five gated pieces? | Still open. |
| Chrysippus's cylinder | **Built and in the gallery**, under Ethics. Off the backlog. |
| The Impression | **Built and in the gallery**, under Physics. All three branches are now planted. |
| The Five Indemonstrables | **Built and in the gallery**, under Logic, beside Zeno's Hand. Stoic propositional logic, quoted verbatim from Diogenes Laertius 7.66 to 7.81 in Hicks. |
| Register Zeno's Hand and the Scale? | **Yes, done.** Part 4 items 2 and 3 are built; item 1, the garden itself, still waits on the piece being found. |

Parts 1, 2, 3 and 5 were then built, and Part 4 followed for the two pieces
that exist (see `adding-an-exhibit.md`). **Zeno's Hand is live in the gallery**
under Logic. **The Scale of Happiness is registered but held at `workshop`**,
because the database refuses a gallery row with no source citation and none has
been chosen for it — it is reachable at `/garden/scale-of-happiness` and absent
from the index. Verified as an anonymous reader: the index sees one row, a full
table scan as `anon` returns one row, and both slugs resolve through
`exhibit_by_slug`.

### On the name

Worth knowing before any rebuild: **the Garden (ὁ Κῆπος) was Epicurus's
school**, not the Stoics'. The Stoics met in the Stoa Poikile, the Painted
Porch, which is where their name comes from. The image this spec is reaching
for is a *fertile field*, not a garden:

> Also to a fertile field; in which logic is the fence which goes round it,
> ethics are the fruit, and natural philosophy the soil, or the fruit-trees.
>
> — Diogenes Laertius, *Lives of Eminent Philosophers*, Life of Zeno XXXIII
> (tr. C.D. Yonge, 1853)

Both translations of that passage are already in the Corpus: Yonge 1853 (public
domain, `edition_year` recorded) and Hicks, which renders it "Logic being the
encircling fence, Ethics the crop, Physics the soil or the trees". The room
name is Kyle's call — "the Garden" is a good word and the Epicurean echo may be
a feature — but it is borrowed from the rival school, and the Happiness Scale
already marks Epicurus with "Simple garden life", so the two will sit near each
other in the same product.

### Still open for Kyle

1. **Where is the garden?** Still unlocated. Not in this repo, this database, or
   git history. If it is to be rebuilt, the exhibit machinery is now in place
   and it enters as one row.
2. **Register the five gated pieces?** Kosmopolis, the Situations Game, the View
   from Above, the Long Filter and the Passage are all built and sitting behind
   the Academy's 404. They can enter as `workshop` rows whenever wanted.
3. **Two migration directories.** `supabase/migrations/` (where `exhibits` went,
   per `CLAUDE.md`) and `academy/supabase/migrations/` (where the playground
   tables live), both applied to the same project. Worth collapsing one day.
4. **Cicero's *Academica* is OCR-damaged in the Corpus.** The chunk holding the
   Zeno's Hand passage (`ch. 2.47`) reads "afiirm" for "affirm", renders
   κατάληψις as `KaT(iX.r]^L<;`, and truncates mid-sentence at the fourth
   position of the gesture, so the exhibit quotes only the first three. The
   neighbouring chunk is worse ("compreliended", "probalnlity", "acutcness").
   The exhibit's `source_passage` repairs the scanner damage without changing
   Yonge's wording; the stored chunks are untouched. Re-ingesting *Academica*
   from a cleaner scan would be worth it, and `translator` is recorded but
   `edition_year` is null on it.
5. **~~The Hicks Diogenes Laertius row has no `edition_year`.~~ Fixed.** Set to
   1925 for all 87 chunks in
   `supabase/migrations/20260916190000_dl_hicks_edition_year.sql`. Hicks's Loeb
   translation was first published in 1925 in two volumes, Book VII in volume
   II; and the row's `source_url` is Wikisource, which can only host the
   public-domain printing, so the year is the first edition rather than a later
   revised reprint. That is also what puts the text inside the pre-1930
   copyright rule it was already relying on. **Not verified against the source
   URL:** `en.wikisource.org` is blocked by this environment's egress policy,
   so the year rests on the bibliography rather than on a fetch.
6. **A corpus identity split, noticed in passing.** Diogenes Laertius is in
   `rag_corpus` under two identities: `Lives of Eminent Philosophers` (544
   chunks, tr. Yonge, `edition_year` 1853) and `Lives Book7` (87 chunks, tr.
   Hicks, `edition_year` null). That is the duplicate-identity failure
   `CLAUDE.md` warns about, and the Hicks rows are missing `edition_year`. Not
   touched here; flagging it.

### TODO fields to fill

Both registerable pieces are in. One field still blocks one of them.

| Exhibit | Field | Note |
|---|---|---|
| The garden | everything | Piece not located. |
| Zeno's Hand | *(all fields)* | **Filled and live.** Branch `logic`, thinkers Zeno of Citium and Cicero, citation *Cicero, Academica 2.145*, passage quoted from Yonge in the Corpus. Change any of it with an `update`. |
| The Scale of Happiness | `branch`, `thinkers`, `concepts` | **Filled**: branch `ethics`; thinkers are the five the scale names on its markers (Epicurus, Epictetus, Seneca, Marcus Aurelius, Diogenes of Sinope); concepts are its own zone vocabulary (ataraxia, askesis, adiaphora, pleonexia, epithumia). Change with an `update`. |
| The Scale of Happiness | `source_citation`, `source_passage` | **The one thing blocking the gallery.** The piece is a synthesis across schools, not a gloss on one passage. The strongest candidate in the Corpus is Epicurus's classification of desires — natural and necessary, natural but not necessary, neither — which is the scale's actual axis, and which survives in Cicero, *De Finibus* 1.45 and *Tusculan Disputations* 5.93. Both are in `rag_corpus`, though both carry `translator: null`, which Part 5 of the acquisition plan requires. |
| Both | `academy_path`, `agora_prompt` | Optional. No Academy sessions are mapped to these pieces yet. |
