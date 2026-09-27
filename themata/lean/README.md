# Stoic: Lean 4 base system (Themata Project, Phase 2)

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

If `elan` cannot reach `release.lean-lang.org`, install the toolchain from
the GitHub release (`lean-4.22.0-linux.zip`), then run `elan toolchain link
lean-4.22.0 <dir>` and `elan override set lean-4.22.0` in this directory.
