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

> Also to a fertile field; in which logic is the fence which goes round it,
> ethics are the fruit, and natural philosophy the soil, or the fruit-trees.
>
> — Diogenes Laertius, *Lives of Eminent Philosophers*, Life of Zeno XXXIII
> (tr. C.D. Yonge, 1853; in the Corpus)

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

Neither of these is registered yet — see `discovery.md` for the fields still
waiting on a decision. When they are, they go in like this, as `web_embed` rows
pointed at the Academy pages that already exist and are already released:

```sql
insert into public.exhibits (slug, title, summary, branch, thinkers, kind, embed_url, source_citation, status, sort_order)
values
  ('zenos-hand',
   'Zeno''s Hand',
   'Zeno taught the whole of Stoic epistemology with one gesture: open, curled, closed, gripped.',
   'logic',
   '{"Zeno of Citium","Cicero"}',
   'web_embed',
   'https://academy.pursuearete.com/playground/zenos-hand',
   'Cicero, Academica 2.145',
   'workshop', 10),

  ('scale-of-happiness',
   'The Scale of Happiness',
   'Where the schools put the good life, from ataraxia to unchecked appetite, and where you sit on it.',
   'ethics',
   '{"Epicurus","Zeno of Citium"}',
   'web_embed',
   'https://academy.pursuearete.com/playground/happiness-scale',
   NULL,
   'workshop', 10);
```

Both go in as `workshop` deliberately: Zeno's Hand still needs its
`source_passage` chosen, and the Scale has no single citation yet, so neither
can pass the gallery check until those are settled.

---

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
