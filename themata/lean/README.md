# Stoic: base system, candidate themata and harness (Themata Project, Phases 2–4)

Lean 4.22.0, no dependencies (no Mathlib).

    cd themata/lean
    lake build

A successful build means that every theorem in `Stoic/Tests.lean` is proved
and every `#guard` evaluated to true. A failing guard fails the build.

| File | Contents |
| --- | --- |
| `Stoic/Syntax.lean` | `Formula`: atoms, `neg`, `conj`, exclusive `disj`, `cond`, `saidFalse` |
| `Stoic/Params.lean` | the parameters: conditional reading, single-premise policy, contradictory, premise view, redundancy |
| `Stoic/Argument.lean` | `Argument` (premise list and conclusion), premise equivalence per view |
| `Stoic/Indemonstrables.lean` | the five indemonstrables, `Base`, `Thema`, `Derives`, and the base-case invariants |
| `Stoic/Semantics.lean` | the validity criterion (DL 7.77) under each conditional reading, and redundancy |
| `Stoic/Tests.lean` | the Phase 2 deliverable and checks against `evidence/suite.yaml` |
| `Stoic/Themata/Rules.lean` | the two rule shapes (contraposition, cut) and their switches; `Rule`, `Candidate` |
| `Stoic/Themata/Attested.lean` | candidate: the third thema as Simplicius describes it |
| `Stoic/Themata/Mates.lean` | candidates: Mates's first and third themata, and with the dialectical theorem |
| `Stoic/Themata/Generated.lean` | the 63 generated variants and the full `candidates` list |
| `Stoic/Themata/Tests.lean` | one-step checks of each rule, and soundness of every shape on the base cases |
| `Stoic/Themata/Log.lean` | prints `../results/candidates.md` (not part of the build) |
| `Stoic/Soundness.lean` | the proofs the harness cites for "proven underivable": soundness (Philonian countermodels), the two-premise invariant, the relevance invariant |
| `Stoic/Sugihara.lean` | soundness in the Sugihara model of the relevance logic RM: proves S008 and S016 underivable under every setting; Chrysippus's policy drops the theory |
| `Stoic/Undergeneration.lean` | proofs that some candidates fail on valid items: Gödel G₃ semantics under `negate`, and the two-premise invariant without cut |
| `Stoic/Harness/Suite.lean` | the formal suite as the harness runs it |
| `Stoic/Harness/Search.lean` | bounded forward proof search, and countermodel search |
| `Stoic/Harness/Matrix.lean` | candidates × settings × items, and the rendering of `../results/matrix.md` |
| `Stoic/Harness/Tests.lean` | the search and the proof routes against the Phase 2–3 results |
| `Harness.lean` | `lake exe harness` |

After changing a candidate, regenerate the log:

    lake env lean Stoic/Themata/Log.lean > ../results/candidates.md

Run the harness (Phase 4), which writes `../results/matrix.md` and
`../results/matrix.csv`, and check that it runs the ledger's suite:

    lake exe harness               # depth 8 by default; --depth N to change
    python3 ../harness/check_suite.py

If `elan` cannot reach `release.lean-lang.org`, install the toolchain from
the GitHub release (`lean-4.22.0-linux.zip`), then run `elan toolchain link
lean-4.22.0 <dir>` and `elan override set lean-4.22.0` in this directory.
