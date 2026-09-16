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

## Stop condition

The spec's Part 0 stop condition has been met: **no garden was found.** Per the
spec, the inventory is committed here and work stops before Part 1.

### Questions for Kyle

1. **Where is the garden?** It is not in this repo, this database, or this
   repo's git history. Is it (a) Kosmopolis under another name, (b) a separate
   Vercel project outside this monorepo, (c) in another repository, (d) an
   artifact or a local sketch that was never committed, or (e) still just an
   idea? If it is on Vercel, the project name or URL is enough; the Vercel MCP
   tools returned no teams from this session, so I could not enumerate projects.
2. **The privacy rule vs. the discussion boards.** Should the exhibit template
   (a) forbid `CorpusDiscussion` entirely and drop it from Zeno's Hand and the
   Situations Game, (b) allow it as an explicitly exempted region below the
   exhibit frame, or (c) keep the rule to the exhibit's own fields only, letting
   a piece carry its own discussion internally? Same question for the Kosmopolis
   ledger's `author_name` attribution.
3. **Which of the five gated pieces should be registered?** The spec names only
   the garden, Zeno's Hand and the Scale of Happiness. Kosmopolis, the Situations
   Game, the View from Above, the Long Filter and the Passage are all built and
   sitting behind the 404. Do they enter as `status = 'workshop'` rows, or stay
   out of the table entirely for now?

### TODO fields to fill (Part 4)

Branch, source citation and thinkers cannot be filled confidently for the pieces
whose registration the spec requires. Filling them in would be guesswork, so
they are listed here instead:

| Exhibit | Field | Note |
|---|---|---|
| The garden | everything | TODO — piece not located. |
| Zeno's Hand | `branch` | TODO — Kyle to confirm. Reads as **logic** (it is the epistemology of assent and the criterion), but it is taught as the doctrine of the *kataleptic* impression, which some maps put under physics. |
| Zeno's Hand | `source_citation` | **Not a TODO — already established in the codebase.** `academy/web/src/content/playground/zenos-hand.ts:4` states the gesture is reported by **Cicero, *Academica* 2.145** (the Lucullus). That file also carries a per-case `source` for all nine assent cases (Sextus, Diogenes Laertius, Lucretius, Cicero) and a `definition` block credited *"After Sextus Empiricus, Against the Logicians 1.151–152"*. |
| Zeno's Hand | `source_passage` | TODO — Kyle to choose which passage the exhibit page shows. The content file's Cicero renderings are flagged as *close paraphrase, not quotation*, so they cannot be dropped in as a quoted passage without his say-so. |
| Zeno's Hand | `thinkers` | TODO — Zeno of Citium certainly; whether Cicero and Arcesilaus are listed as well is Kyle's call. |
| The Scale of Happiness | `branch` | TODO — reads as **ethics** (it is a map of the *telos*), but Kyle should confirm. |
| The Scale of Happiness | `source_citation`, `source_passage` | TODO — the piece is a synthesis across schools (Epicurus, the Stoics, the Cyrenaics), not a gloss on one passage, so there is no obvious single citation. Kyle to supply one, or to decide that a synthesis exhibit may cite a cluster. |
| The Scale of Happiness | `thinkers` | TODO — the scale names many philosophers on its markers; which of them are `thinkers` on the row rather than scenery is Kyle's call. |
| All three | `academy_path`, `agora_prompt` | TODO — optional fields, and no Academy sessions are mapped to these pieces yet. |
