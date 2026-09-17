# Adding an exhibit to the Garden

An **exhibit** is one interactive piece. Every exhibit lives in the Garden, and
the Garden is generated entirely from the `exhibits` table: the index has no
hardcoded list, and no exhibit's name appears anywhere in the app. Adding a
piece is inserting a row. Releasing it is one field.

**The rule: no exhibit enters the gallery without its branch, summary, and
source.** The database enforces the summary and the source; the branch is
`NOT NULL` and can only be `logic`, `physics` or `ethics`. What it cannot
enforce is that the values are *right*, which is what step 3 is for.

---

## 1. Build the piece

Two ways in, and the second is usually the better one.

### Host it and use `web_embed` (the default)

This is the established pattern in this codebase, and the reason is that it
keeps **one implementation instead of three**. Build the piece once on the
Academy (`academy/web/src/app/playground/<slug>/`), then point a row at its
URL. Mobile loads it in a `WebView`, the web app in a sandboxed `iframe`. This
is exactly how the Scale of Happiness already works (see
`app/happiness-scale.tsx`, which predates the Garden).

One gate to remember: **the Academy 404s any `/playground/*` path whose slug is
not in `RELEASED_PLAYGROUND`** in `academy/web/src/middleware.ts`. A `web_embed`
exhibit pointed at an unreleased Academy slug will show an empty frame. Add the
slug there when you release the exhibit.

```
RELEASED_PLAYGROUND = ['happiness-scale', 'zenos-hand']   // add yours
```

### Or build it native

A `native` exhibit is drawn in the app itself. Add one line to the registry:

```ts
// exhibits/registry.ts           (mobile)
// web/src/exhibits/registry.ts   (web app)
export const registry: Record<string, ComponentType<NativeExhibitProps>> = {
  'chrysippus-cylinder': ChrysippusCylinder,
};
```

There are two registry files, one per app, at the same path relative to each
app's source root. This is not a duplicate that should be collapsed: React
Native components and DOM components are not interchangeable, and the two apps
are separate TypeScript projects with no shared package (the repo's standing
convention for shared logic is a mirrored pair, as in `lib/agora.ts` ↔
`web/src/lib/agora.ts`). A key in neither file renders a plain "this build does
not carry it" note rather than a blank frame.

### `external`

`external` opens `embed_url` in the in-app browser and leaves the exhibit frame
behind it. Use it for something genuinely off-site.

---

## 2. Insert the row as `workshop`

```sql
insert into public.exhibits (slug, title, summary, branch, kind, embed_url, status)
values (
  'chrysippus-cylinder',
  'Chrysippus''s Cylinder',
  'A push starts the cylinder, but it rolls according to its own shape.',
  'ethics',
  'web_embed',
  'https://academy.pursuearete.com/playground/chrysippus-cylinder',
  'workshop'
);
```

**Writes are service-role only.** There is no user-facing write path, and RLS
has no insert, update or delete policy at all — the table is readable by the
public and writable only by something holding the service key. Run this through
the Supabase SQL editor or a service-role script.

A `workshop` exhibit is **unlisted but reachable**:

- it never appears in the Garden index, which reads `status = 'gallery'`;
- it opens at its own link for testing, at `/garden/<slug>` on either app.

That second half is what the `exhibit_by_slug()` function in the migration is
for. The `select` policy only exposes gallery rows, so a workshop row cannot be
read through the table or enumerated; the function takes an exact slug and
returns at most one row. Anyone who knows the slug can open a workshop exhibit,
which is the point — treat workshop as *unlisted*, not as *private*.

---

## 3. Fill every template field

The exhibit page draws these, in this order, and nothing else:

| Field | Required | What it is |
|---|---|---|
| `title` | yes | The name of the piece. |
| `branch` | yes | `logic`, `physics` or `ethics`. See below. |
| `summary` | yes | **One line, plain English.** The idea, not a pitch. |
| `source_citation` | for gallery | e.g. `Cicero, On Fate 42 to 43`. |
| `source_passage` | no, but fill it | The short passage shown on the page. |
| `thinkers` | no, but fill it | `{'Chrysippus','Cicero'}`. Renders as chips that filter the index. |
| `concepts` | no | For the thinker and concept pages to come. |
| `academy_path` | no | Shown as a "Go deeper" note, labelled forthcoming while the Academy is. |
| `agora_prompt` | no | Puts a "Write about this" button on the page. It opens the Agora composer with the prompt as the essay's title. |
| `sort_order` | no | Orders exhibits within their branch. Ties break on title. |

### Choosing the branch

The three branches are the Stoics' own division of philosophy, and the image
they used for it is where the Garden gets its shape:

> They liken Philosophy to a fertile field: Logic being the encircling fence,
> Ethics the crop, Physics the soil or the trees.
>
> — Diogenes Laertius, *Lives* 7.40, tr. R. D. Hicks

This is the passage the Garden index shows, from `FIELD_PASSAGE` and
`FIELD_CITATION` in `lib/exhibits.ts`. Both translations of it are in the
Corpus and both are public domain; the index uses Hicks because he renders the
third term "the crop", which is the word the branch glosses use, where Yonge
has "ethics are the fruit" and would contradict them on the same page.

- **Logic** is the fence: reasoning, argument, assent, what can be known.
- **Physics** is the soil and the trees: nature, fate, cause, the whole.
- **Ethics** is the crop: what to do, what is good, how to live.

Every exhibit belongs to exactly one. A piece that seems to sit across two
usually has one branch it is *taught from*: Chrysippus's cylinder is about fate
(physics) but is deployed to rescue responsibility (ethics), and it is the
second that makes it worth building.

### The privacy rule

**Exhibits are a public surface, and no exhibit may display user-derived
content.** This is enforced, not trusted:

1. The table has no user column, no author, and no user-facing write path.
2. Every row passes `assertNoUserContent()` (`lib/exhibits.ts`) before it
   reaches a screen. It reads an explicit allowlist of keys and throws on
   anything else, so widening a select to join `profiles`, or dragging in a
   comment count or an author name, fails loudly rather than rendering.

A **discussion board is the one exemption**, and it is not a hole in the rule:
it never travels on the exhibit row. It is passed to the template as its own
`discussion` slot and renders below the frame, visibly outside it. That is how
a piece like Zeno's Hand keeps its `CorpusDiscussion` without putting a
visitor's words inside the exhibit.

---

## 4. Flip to `gallery`

Only once every field above is filled.

```sql
update public.exhibits set status = 'gallery', sort_order = 10
where slug = 'chrysippus-cylinder';
```

The database will refuse the flip if the summary is blank or the source
citation is missing:

```
new row violates check constraint "exhibits_gallery_complete_check"
```

That constraint is the standing rule, made unforgettable rather than merely
written down. The branch is already guaranteed by `NOT NULL` and its own check.

The exhibit now appears in the Garden index under its branch, on both apps, with
no code change and no deploy.

---

## Worked example: the two pieces already built

Both are registered, in
`supabase/migrations/20260916170000_exhibits_seed_first_two.sql`. Neither had
its internals rewritten: both are `web_embed` rows pointed at the Academy pages
that already exist and are already in `RELEASED_PLAYGROUND`.

They went in at **different statuses, and the difference is the source** — which
is the gallery rule doing its job rather than a special case:

| | `zenos-hand` | `scale-of-happiness` |
|---|---|---|
| Branch | `logic` | `ethics` |
| Status | **gallery** — listed | **workshop** — unlisted, reachable at `/garden/scale-of-happiness` |
| Why | Cicero reports the gesture at *Academica* 2.145, and Yonge's public-domain translation of it is in the Corpus, so the row has a real citation and a real quoted passage. | The piece is a synthesis across schools, not a gloss on one passage. No citation has been chosen, so the gallery check refuses it. |

Flipping the Scale is one statement once a citation is settled:

```sql
update public.exhibits
set source_citation = '<the citation>', source_passage = '<the passage>', status = 'gallery'
where slug = 'scale-of-happiness';
```

### A third, built from scratch

**Chrysippus's Cylinder** (`chrysippus-cylinder`, Ethics) is the first exhibit
built for the Garden rather than moved into it, and it is the worked example of
the whole path in this document: piece built on the Academy, slug added to
`RELEASED_PLAYGROUND`, row inserted as a `web_embed` pointed at it, straight
into the gallery because it had its citation and passage from the start. See
`supabase/migrations/20260916210000_exhibit_chrysippus_cylinder.sql`.

It also shows the branch rule in use. The argument is about fate, which is
physics, but Chrysippus deploys it to save responsibility, and a piece that
sits across two branches belongs to the one it is taught from. So: ethics.

### A fourth, and the branch call that was close

**The Impression** (`the-impression`, Physics) is the case where the branch was
not obvious, and the reasoning is worth copying. Its subject is the impression
and the criterion, which for the Stoics sits in the *logical* division, and
Zeno's Hand already holds exactly that ground. But it asks a different
question, what happens to the soul when something appears to it, and answers
with a doctrine about what a soul is made of: pneuma under tension, altered
rather than dented. That is physics, and it is what the piece is taught from.

The thing that keeps the two exhibits from overlapping is not the branch label
but the handoff: The Impression ends where assent becomes possible and links to
Zeno's Hand, which starts there. **When a new exhibit is adjacent to an
existing one, say where one stops and the other starts, in the interface.**

It is also the first exhibit whose thinker filter does real work: Chrysippus now
returns two exhibits, in two different branches.

### Old links still work

The Scale used to be its own mobile screen at `/happiness-scale`, a WebView over
the Academy page. That route is now a redirect to `/garden/scale-of-happiness`,
so deep links, notifications and any build already in the wild still land on the
piece. The Explore entries on both apps point at the exhibit page instead of the
Academy URL. Zeno's Hand had no in-app route before, so there was nothing to
redirect; it is reached through the Garden.

The Scale keeps its own Explore entry for now **only because it is a workshop
exhibit** and therefore absent from the Garden index. When it is promoted, that
entry is redundant and should come out: the nav carries the room, not the
exhibits.

## Where things live

| | Mobile (Expo) | Web app (`web/`) |
|---|---|---|
| Data layer, privacy guard, labels | `lib/exhibits.ts` | `web/src/lib/exhibits.ts` (mirror) |
| Native registry | `exhibits/registry.ts` | `web/src/exhibits/registry.ts` |
| The exhibit frame | `components/exhibits/ExhibitTemplate.tsx` | `web/src/components/exhibits/ExhibitTemplate.tsx` |
| Garden index | `app/garden/index.tsx` | `web/src/app/garden/page.tsx` |
| One exhibit | `app/garden/[slug].tsx` | `web/src/app/garden/[slug]/page.tsx` |
| Explore entry | `components/SideMenu.tsx` | `web/src/components/Sidebar.tsx` |

Schema: `supabase/migrations/20260916140000_exhibits.sql`.

The room's name is one constant, `GARDEN_TITLE` in both `lib/exhibits.ts`
files. Renaming the Garden means editing those two lines and nothing else.
`lib/exhibits.ts` and `web/src/lib/exhibits.ts` are otherwise byte-identical
apart from the import line and the mirror note: keep them that way.
