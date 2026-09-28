# Harness (Phase 4)

The harness is Lean code, so that it searches with the same rule definitions
the proofs are about. It lives in `../lean/`:

- `Stoic/Harness/Search.lean`: bounded forward proof search.
- `Stoic/Harness/Matrix.lean`: runs every candidate × setting × item.
- `Stoic/Soundness.lean`: the theorems behind every "proven underivable" cell.

This folder holds the one piece that is not Lean. `check_suite.py` confirms
that the harness runs the suite the ledger holds (ids, verdicts, `non_formal`
flags against `../evidence/suite.yaml`).

    cd ../lean
    lake exe harness                 # writes ../results/matrix.md and matrix.csv
    python3 ../harness/check_suite.py

Results: `../results/matrix.md`. Method and findings: `../NOTES.md`, Phase 4.
