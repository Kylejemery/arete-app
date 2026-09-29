# Explorer data export

Static data for the public Themata explorer page. The page is meant to show
these files and compute nothing, so every verdict it shows comes from a Lean
run. Everything here except this README is generated. Don't edit it by hand.

    cd themata/lean && lake build
    python3 ../harness/build_export.py      # about two minutes

`lake exe harness --export` writes `harness.json` and `runs/`, and
`build_export.py` joins the ledger into `items.json` and writes `index.json`.
The script copies ledger text and checks consistency. It computes no verdict.
It fails if the harness's items differ from `evidence/suite.yaml`, if an
example is not quoted from its passage, or if any cell differs from
`results/matrix.csv`.

**Review status.** No ledger entry is `verified_by_kyle`, and no specialist
has reviewed the ledger or the formalization. Guardrail 5 of
`THEMATA_PROJECT.md` says no public claims until that review. `index.json`
carries this as `review_status`.

## What was run

Each run is one candidate × one setting × one formal item.

| Axis | Values | Count |
| --- | --- | --- |
| candidate | the named reconstructions and generated variants, `Stoic/Themata/` | 66 |
| `cond` | `philonian`, `diodorean`, `chrysippean`, `containment` | 4 |
| `single` | `chrysippus`, `antipater` | 2 |
| `contra` | `toggle`, `negate` | 2 |
| `view` | `list`, `multiset`, `set` | 3 |
| `redundancy` | `strict`, `narrow` | 2 |
| formal item | `evidence/suite.yaml` without the `non_formal` S017, S019 | 18 |

That is 96 settings and 114,048 runs. The parameter names and values are the
constructor names in `lean/Stoic/Params.lean`, read from Lean's `Repr`.
Derivability reads only `single`, `contra` and `view`, but every run is still
made under its full parameter record. `cond` and `redundancy` enter through
`semantics` and through the S008 criterion check. The cross-check with
`matrix.csv` confirms that the cells don't vary with them.

For every run that derives its item, the same candidate and setting also run a
**redundant variant**: the item with one premise added. The added premise is a
fresh atom, the next after the item's own, placed last, which is the shape of
S016.

## Files

### `index.json`

A manifest listing the files, the search bounds, the axis sizes, totals
(runs by status, matches, variants), the review status, and the cross-check
result.

### `harness.json` (from Lean)

- `parameters`: each parameter's values, in code order.
- `settings[id]`: `{id, params: {cond, single, contra, view, redundancy}}`.
  Runs reference settings by `id`.
- `candidates[index]`: `{index, file, name, provenance, source, rules: [{name,
  shape, merging, cut}]}`.
- `items`: each ledger item as the harness encodes it. See `items.json`,
  which carries these fields.
- `base_rules`: what each base step's `rule` means (`first` … `fifthR`,
  `monolemmatic`).
- `cells`: the cell vocabulary.
- `proof_routes`: for each route key, the theorem, its file, and what it
  shows.

### `items.json` (the ledger join)

There is one entry per ledger item, S001–S020, including the two non-formal
items, which are not run.

| Field | From |
| --- | --- |
| `id`, `schema`, `kind`, `flags`, `ancient_verdict`, `confidence` | ledger |
| `in_formal_suite` | harness |
| `example` | `{text, language, note}`, quoted from the ledger `passage` (checked). Null when the passage has none. The quotations are chosen in `harness/explorer_inputs.yaml` |
| `encoded` | the argument the harness runs, `{premises, conclusion, text}` |
| `theory` | background conditionals held true (S014, S015) |
| `encoding_note` | where the encoding departs from the ledger schema (S014, S015, S018) |
| `semantics` | for each `cond` × `redundancy`: `criterion_valid` (DL 7.77), `redundant`, `stoic_valid`, each `yes`/`no`/`unknown`. `unknown` means no complete procedure exists (Diodorean) |
| `redundant_variant` | `{encoded, added_premise, semantics}` |
| `provenance` | `source`, `passage`, `corpus_ref`, `research_ref`, `verified_by_kyle`, `notes`, `witness`, `secondary_summary` |

`provenance.witness` is read from the ledger `source`:

- `primary`: an ancient text in a public-domain translation.
- `ancient_text_via_secondary_work`: verbatim ancient text quoted in Zeller.
- `mode2_summary`: the corpus agent's paraphrase of a modern book.

`provenance.secondary_summary` is `{flag, scope, basis}`. It is flagged when
the source names a Mode 2 summary. Its scope is `whole`, or `partial` when the
source also names another witness (S015). S014 is flagged `partial` from its
notes: Chrysippus's rejection of single-premise arguments "appears in the
corpus only through Mates's summary".

### `runs/cNN.json` (from Lean), one per candidate

```
{ "candidate": 2, "name": "...",
  "reductions": [ <reduction>, ... ],
  "runs": [ <run>, ... ] }
```

A run:

| Field | Meaning |
| --- | --- |
| `item`, `setting` | ids into `items.json` and `harness.json` |
| `ancient_verdict` | the ledger's verdict (checked against `suite.yaml`) |
| `ledger_requires_derivation` | what the harness takes the verdict to require under this setting. `disputed` items are required under `antipater` only |
| `cell` | the harness's own verdict, as in `matrix.md`: `D1`, `OVER2`, `UNDER`, `UNDER■g3`, `■cm`, `·s` … |
| `status` | `derived`, `not_found_within_depth`, or `proven_underivable`. The last two are never merged |
| `depth` | if derived: the round at which it was found (0 is a base case) |
| `within_depth`, `saturated`, `truncated` | if not derived: the depth N it was searched to, whether the frontier emptied, and whether the size bound stopped it (then N is the depth reached) |
| `proof` | if `proven_underivable`: the route key into `proof_routes` |
| `matches_ledger` | `yes`/`no`/`unknown` (see below) |
| `reduction` | if derived: an index into this file's `reductions` |
| `redundant_variant` | if derived: `{cell, status, within_depth, saturated, truncated, proof, derivation_lost}` for the variant |

`matches_ledger` is `no` when the cell is `OVER` or `UNDER`. For a
`valid_nonsyllogistic` item (S008), it is also `no` when the argument is not
valid by the criterion under this `cond`, and `unknown` when the criterion
cannot be decided (Diodorean). Otherwise it is `yes`.

A reduction is the derivation the search found:

```
{ "premises": [...], "conclusion": "...", "replayed": true,
  "steps": [ { "n": 1, "kind": "indemonstrable", "rule": "second", "from": [],
               "premises": ["if (p and q), r", "not r"], "conclusion": "not (p and q)" },
             { "n": 2, "kind": "indemonstrable", "rule": "thirdL", "from": [], ... },
             { "n": 3, "kind": "thema", "rule": "second? (Mates's conjecture, ...): cut[any,any,merge]",
               "shape": "cut[any,any,merge]", "from": [1, 2],
               "premises": ["if (p and q), r", "not r", "p"], "conclusion": "not q" } ] }
```

The steps are in order. A step's `from` lists the earlier steps it uses.

Step kinds:

- `indemonstrable` and `monolemmatic`: base cases.
- `thema`: a rule applied.
- `view`: the same argument with its premises reordered, as the `multiset` or
  `set` view allows.

Each step's conclusion is an intermediate conclusion. The last step is the
item itself. Every reduction is replayed step by step in Lean before it is
written. The replay uses the search's own definitions, so it checks the
reconstruction, not the rules.

## What "not found" means

`not_found_within_depth` means the bounded search did not find a derivation
within `within_depth` rounds, inside the formula and premise bounds in
`harness.json`. That is not a proof of anything. Saturated (`·s`) means
nothing more is derivable within those bounds, and the bounds themselves are
not proved complete.

`proven_underivable` means a theorem in `lean/Stoic/` covers the case, and the
theorem is named in `proof_routes`.
