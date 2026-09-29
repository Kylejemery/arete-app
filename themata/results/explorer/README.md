# Explorer data export

Static data for the public Themata explorer page. The page is meant to show
these files and compute nothing, so every verdict it shows comes from a Lean
run. Everything here except this README and `schema.json` is generated. Don't
edit it by hand.

    pip install pyyaml jsonschema
    cd themata/lean && lake build
    python3 ../harness/build_export.py      # about three and a half minutes

`lake exe harness --export` writes `harness.json` and `runs/`, and
`build_export.py` joins the ledger into `items.json` and writes `index.json`.
The script copies ledger text and checks consistency. It computes no verdict.
It also folds the runs into `searches.json`, one record per distinct search.
It fails if the harness's items differ from `evidence/suite.yaml`, if an
example is not quoted from its passage, if any cell differs from
`results/matrix.csv`, if the invariance check below fails, or if any file does
not validate against `schema.json`.

**Counts are distinct searches.** A search is one candidate × one proof
setting (`single`, `contra`, `view`: 12 of them) × one formal item: 66 × 12 ×
18 = 14,256. `runs/` holds eight records per search, one per (`cond`,
`redundancy`), 114,048 in all. Quote the distinct figures (`index.json`
`counts`); `counts.run_records` is the record total.

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

That is 96 settings. The parameter names and values are the constructor
names in `lean/Stoic/Params.lean`, read from Lean's `Repr`. Derivability
reads only `single`, `contra` and `view`, so the 96 settings fold into 12
proof settings and 14,256 distinct searches. The harness still makes every run
under its full parameter record. `cond` and `redundancy` enter through
`semantics` and through the S008 criterion check.

## Invariance across `cond` and `redundancy`

The checked claim is that the conditional and redundancy readings change no
proof result. `lake exe harness --export` runs each search once under each of
the eight (`cond`, `redundancy`) combinations, and `build_export.py` compares
the eight records field by field:

- every field except `setting` and `matches_ledger` is identical in all eight
  records, for all 14,256 searches: `cell`, `status`, `depth`,
  `within_depth`, `saturated`, `truncated`, `proof`, the reduction, and both
  redundant variants' results;
- `matches_ledger` varies in 792 searches, every S008 search, and only with
  `cond`, never with `redundancy`. S008 is `valid_nonsyllogistic`, so its
  match also asks the DL 7.77 criterion, which reads `cond`: it is `unknown`
  under `diodorean` and `yes` under the other three.

The export fails if either statement stops holding. This is an observed check
over this suite and these candidates, made on Lean's own output. It is not a
theorem. The result is recorded in `index.json` and `searches.json` as
`invariance`. Separately, every cell agrees with `results/matrix.csv`, which
the matrix run of the same harness wrote.

For every run that derives its item, the same candidate and setting also run
two **redundant variants**, each the item with one premise added:

- `redundant_variant`: a fresh atom, the next after the item's own, placed
  last. This is the shape of S016.
- `duplicate_variant`: a second copy of the item's last premise, placed last.
  This is where the premise views part company. `set` ignores multiplicity, so
  the copy costs nothing. `list` and `multiset` count it, so the derivation
  has to use the premise twice.

Neither variant has a ledger verdict. Each records its own cell and status
and `derivation_lost`. A loss is `proven_underivable` only where a theorem
covers it. Otherwise it is `not_found_within_depth`, which proves nothing.
`index.json` `counts.variants_by_view` tallies both variants by view and
status.

## Files

### `index.json`

A manifest listing the files, the search bounds, the axis sizes, totals in
distinct searches, the invariance check, the review status, and the
cross-check result. It also records:

- `source.commit`: HEAD of the checkout the export was generated from, and
  `source.inputs_clean`, false if `themata/lean`, `themata/evidence` or
  `themata/harness` had uncommitted changes.
- `source.encoding_version`: a SHA-256 over the paths and contents of every
  tracked file under `themata/lean/`, with the file count and the Lean
  toolchain. Two exports with the same digest ran the same Lean code, whatever
  the commit. `source.ledger_sha256` does the same for `evidence/suite.yaml`.
- `failed_runs`: runs that errored or timed out. It is always empty, and
  `failure_policy` says why. The harness has no timeout: every search runs to
  its depth or size bound, and a search stopped by the size bound is recorded,
  not failed (`counts.size_bound_hits`, 0 at present). `build_export.py`
  stops on any error or failed check, and `lake exe harness --export` stops if
  any reduction fails to replay. An export that has been written therefore has
  no failed runs.

Because `index.json` records the commit, regenerating it at a later commit
changes that field even when nothing else changes. Every other file
regenerates byte for byte.

### `schema.json` (by hand)

A JSON Schema (draft 2020-12) with one definition per file: `index`,
`harness`, `items`, `searches`, and `runs` for each `runs/cNN.json`.
`build_export.py` validates every file against it before writing, so a change
to the export's shape must change the schema as well.

### `searches.json` (folded from Lean's runs)

The compact form, meant for the page's main grid: one record per distinct
search, with no copies.

```
{ "unit": "...",
  "proof_settings": [ { "id": "chrysippus/toggle/list", "single": ..., "contra": ...,
                        "view": ..., "run_settings": [0, 1, ...] }, ... ],
  "invariance": { ... },
  "searches": { "<proof setting id>": { "<candidate index>": { "<item id>": <search> } } } }
```

A search carries the fields of a run (below) except `item`, `setting` and
`ancient_verdict`, which its keys and `items.json` give. `reduction` indexes
the candidate's `runs/cNN.json`. `matches_ledger` is a single value, or a map
from `cond` to value where it varies with `cond` (S008 only). `run_settings`
lists the `harness.json` settings folded into each proof setting.

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
| `redundant_variant` | the fresh-atom variant: `{encoded, added_premise, semantics}` |
| `duplicate_variant` | the duplicated-premise variant, same fields; `added_premise` is the copy |
| `provenance` | `source`, `passage`, `corpus_ref`, `research_ref`, `verified_by_kyle`, `notes`, `witness`, `secondary_summary`, `non_primary` |

`provenance.witness` is read from the ledger `source`:

- `primary`: an ancient text in a public-domain translation.
- `ancient_text_via_secondary_work`: verbatim ancient text quoted in Zeller.
- `mode2_summary`: the corpus agent's paraphrase of a modern book.

`provenance.secondary_summary` is `{flag, scope, basis}`. It is flagged when
the source names a Mode 2 summary. Its scope is `whole`, or `partial` when the
source also names another witness (S015). S014 is flagged `partial` from its
notes: Chrysippus's rejection of single-premise arguments "appears in the
corpus only through Mates's summary".

`provenance.non_primary` is `{flag, witness, basis}`. It is flagged whenever
`witness` is not `primary`: a Mode 2 summary, or ancient text quoted in a
secondary work (Zeller). This is the flag the page should show. It covers
every Mode 2 item and also S011 and S014, which rest on Zeller's quotation and
which `secondary_summary` does not flag. Results that touch a flagged item are
provisional until milestone 4 (`SCOPE.md`).

### `runs/cNN.json` (from Lean), one per candidate

The full record: eight runs per distinct search, one per (`cond`,
`redundancy`), and the reductions.

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
| `redundant_variant` | if derived: `{cell, status, depth or within_depth, saturated, truncated, proof, reduction, derivation_lost}` for the fresh-atom variant |
| `duplicate_variant` | if derived: the same fields for the duplicated-premise variant |

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
