# The Themata Project: findings (Phase 5 draft)

**Status: draft for specialist review. Not for publication** (guardrail 5).

- None of the 39 ledger entries has yet been signed off by Kyle (guardrail
  3), so every result below is provisional on the ledger as it stands.
- The newest entry, S020, still waits for its guardrail 1 check against the
  stored text.

## 1. The question

Chrysippus held that every syllogistic argument is either one of five
indemonstrables or reducible to them by four meta-rules, the *themata*. Only
some themata survive in the sources; the rest are modern reconstructions. The
project asks:

> Which sets of rules, under which readings of the Stoic connectives, derive
> exactly the arguments the ancient sources call valid, and none of the ones
> they reject?

The brief allowed three kinds of outcome: one reconstruction fits uniquely;
several fit, so the evidence underdetermines the answer; or none fit.

## 2. Answer in brief

**Several fit, so the evidence underdetermines the themata. It does, however,
fix three features of the logic.**

- **50 of the 66 candidate rule sets fit** the ledger under at least one
  parameter setting: 158 candidate-settings out of 792.
- **All 158 fits are proven.** Each required derivation was found, and each
  rejection is covered by a Lean theorem.

The fits agree on three things, and those are the findings with content:

1. **The first thema is required.**
   - The "two conditionals" argument (S020, "if p, q; if p, not q; therefore
     not p") is reported by Origen as a Stoic form, with the Stoics' own
     example.
   - No candidate without a first thema derives it. This is proved, not just
     unfound.
   - So the attested third thema alone does not fit. Every fitting candidate
     adds contraposition.
2. **Contraction is needed and weakening never happens.**
   - Every fit lets a repeated premise count once, either through the `set`
     view or through the merging cut (the dialectical theorem as we read it).
   - At the same time, no candidate under any setting derives the redundant
     argument S016. This is proved through a relevance semantics in which
     contraction holds and weakening fails.
3. **The contradictory must cancel a negation.** Every fit reads the
   contradictory of "not p" as p. Under the other reading ("not not p") the
   Sorites chain (S018) is provably underivable.

Two things the suite cannot settle:

- **Which premise the first thema contraposes, and which cut shape is used.**
  Every variant fits somewhere.
- **Chrysippus's policy on single-premise arguments against Antipater's.**
  This follows from how those items were ruled (disputed). It is not a
  finding.

## 3. What was built

| Phase | Output | Where |
| --- | --- | --- |
| 1 | Evidence ledger: 20 argument forms and 19 rules or definitions, each quoting a verified passage from the corpus or from a stored research source | `evidence/suite.yaml`, `evidence/rules.yaml`, `evidence/gaps.md` |
| 2 | Stoic propositional logic as its own object language in Lean 4; the five indemonstrables; parameters for the disputed readings | `lean/Stoic/*.lean` |
| 3 | 66 candidate rule sets: the attested third thema, Mates (two variants), and 63 generated variants | `lean/Stoic/Themata/`, `results/candidates.md` |
| 4 | Evaluation of every candidate × setting × item, with proofs of underivability | `lean/Stoic/Harness/`, `Soundness.lean`, `Sugihara.lean`, `Undergeneration.lean`, `FirstThema.lean`, `results/matrix.md` |

Every interpretive decision, and the reason for it, is in `NOTES.md`.

### Parameters

The parameters are the places where the evidence does not settle the logic:

| Parameter | Readings |
| --- | --- |
| Conditional | Philonian, Diodorean, Chrysippean, containment |
| Single-premise arguments | Chrysippus, Antipater |
| The contradictory | `toggle` (the contradictory of "not p" is p), `negate` (it is "not not p") |
| Premise comparison | `list`, `multiset`, `set` |
| Redundancy (finding F1) | `strict`, `narrow` |

Derivability depends only on the single-premise policy, the contradictory and
the premise comparison, which gives 12 settings. The conditional and
redundancy readings enter through the semantic table.

### How "underivable" is established

Guardrail 4 forbids reporting "not found within depth N" as "proven
underivable". The harness reports a failure as proven only when a Lean
theorem covers it. None of these uses `sorry`.

| Route | Idea | Covers |
| --- | --- | --- |
| Philonian soundness | every rule preserves classical truth, so a classical countermodel rules an argument out | S006, S007; S014/S015 under Chrysippus |
| Sugihara soundness | every rule preserves validity in the relevance logic RM, where premises fuse and weakening fails | S016, S008 |
| Closed valuations | cut preserves truth under any assignment closed under the base cases; contraposition does not | S020 for every candidate without a first thema |
| Gödel G₃ soundness | under `negate`, every rule is sound where "not not p" ≠ p | the Sorites under `negate` |
| Two-premise invariant | without cut, contraposition keeps two premises | three-premise items for cut-free candidates |
| Lone-atom invariant | without the merging cut, no atom can stand in exactly one place | S011 for non-merging candidates |

The relevance semantics and the closed valuations are proof devices. They are
not claims about the logic the Stoics held.

## 4. Results in detail

Full tables: `results/matrix.md` (and `matrix.csv` for every cell).

1. **No overgeneration anywhere.** No candidate, under any setting, derives
   anything the ledger rejects, and every such cell is proven.
2. **Fits.**
   - 158 candidate-settings fit, across 50 candidates.
   - All of them use the `toggle` contradictory.
   - 100 of them use the `set` view.
   - The rest use the merging cut, under `multiset` (50) or `list` (8).
3. **The named candidates.**
   - `Attested` (third thema only) fits nowhere: it fails on S020.
   - `Mates` (first and third) fits under the `set` view.
   - `Mates + dialectical theorem` fits under `set` and `multiset`.
4. **The sixteen candidates that never fit.**
   - Seven lack a third thema. The composite arguments S012, S013 and S018
     need cut.
   - Nine lack a first thema: `Attested` and the eight generated cut-only
     sets. S020 needs contraposition.
5. **Non-fits.**
   - 580 of the 634 non-fitting candidate-settings are proven not to fit.
   - The other 54 fail only on search-bounded cells. They are mostly the
     Sorites and S020 under the `list` view, where the ledger's premise order
     matters, and cut-free candidates under `set`.
   - So 158 is a proven lower bound on the number of fits.
6. **Redundancy (finding F1).**
   - S016 is valid by the Stoic validity criterion (DL 7.77) under every
     reading of the conditional, so its rejection rests on redundancy alone.
   - S009 and S011 are redundant under the `strict` reading and not under
     `narrow`.
   - So the ledger is consistent only if indifferently concluding arguments
     were exempt.
7. **Asserted falsity is not negation.** S008 ("'p and q' is false; p;
   therefore not q"), which Diogenes calls conclusive but not syllogistic, is
   proven underivable by every candidate, as the ledger requires.

## 5. Negative and underdetermined results

- **The themata are underdetermined.** The shape of the first thema (which
  premise it contraposes) and the shape of the cut cannot be decided from
  this suite.
- **The second and fourth themata are not isolated.** No attested argument in
  the ledger distinguishes a separate second or fourth thema from what the
  first thema and cut already give.
- **Bobzien is not tested.** By ruling, no Bobzien module exists until her
  paper is in the corpus. The Mode 2 summary reports her reconstruction as
  monotonic and without contraction (R03). That is the opposite of what every
  fit here needs. This is the most pointed open question the project raises
  for a specialist.

## 6. Limits and caveats

- **The ledger is small and unsigned.**
  - It holds 18 formal items.
  - No entry has Kyle's sign-off.
  - The main ancient sources for the themata are missing from the corpus:
    Sextus M VIII, Galen and Alexander. Origen is available through
    `research_sources`.
- **S020 rests on a later, non-Stoic witness.**
  - Origen reports the form as Stoic.
  - In this copy the OCR scrambles the general schema sentence, and that
    sentence rests on an editorial emendation (the translators' note 4701).
  - The Stoic example itself is clear.
  - Its guardrail 1 check against the stored text is pending.
- **Encoding choices matter.**
  - S018 is run as a three-link Sorites.
  - S014 and S015 are one form, with the conditional as background theory.
  - Under the `list` view, results depend on the order in which the ledger
    lists premises.
- **Mates is represented by a Mode 2 summary.** Our reading of the
  dialectical theorem as a merging cut is our own.
- **T04 is pending.** Alexander on the synthetic theorem rests on our reading
  of untranslated Greek.
- **The derivations the harness exhibits are evaluations** of the same rule
  functions the proofs are about. They are not kernel-checked certificates,
  except `S013_attested` and `S012_matesDT`.
- **The search is bounded.**
  - It runs to depth 8 over each item's own formulas.
  - Only the 54 unproven non-fits depend on these bounds.

## 7. For the reviewer

Please send the reviewer:

- `evidence/`
- `NOTES.md`
- `lean/` (builds with Lean 4.22.0, `lake build`)
- `results/matrix.md`
- this file

The questions we most need answered:

1. **The ledger.** Are the verdicts right, especially:
   - S011 (valid);
   - S016 (invalid, reported only through Mates);
   - S008 (valid but not syllogistic);
   - S018 (the Sorites form taken as valid);
   - S020 (the two conditionals argument, from Origen)?
2. **S020.** Is Origen's report of "the theorem of two propositions" good
   evidence that the Stoics treated the form as syllogistic, that is,
   reducible by the themata? Does the emendation in note 4701 affect that?
3. **Contraction.** Every fit needs a repeated premise to count once. Is that
   consistent with what is known of Stoic analysis? Does it conflict with
   Bobzien's reconstruction, which the summary reports as having no
   contraction?
4. **The contradictory.** Is reading the contradictory of "not p" as p
   (rather than "not not p") the standard view, given DL 7.69 on double
   negation?
5. **The third thema.** Is our encoding of Simplicius's description as a cut,
   with the conclusion first and one further premise, fair to the Greek?
6. **The dialectical theorem.** Is reading it as a merging cut defensible?
7. **T04.** Is our reading of Alexander right: that the Stoics made their
   second, third and fourth themata from the synthetic theorem?

## 8. Before anything goes public

1. The Origen volume is stored in `research_sources`, and S020 passes its
   guardrail 1 check.
2. Kyle signs off the ledger entries (guardrail 3), or amends them. The
   matrix then needs regenerating (`lake exe harness`).
3. A specialist in Stoic logic reviews this file, the ledger and the encoding
   (guardrail 5).
4. The remaining ancient texts named in gaps.md are stored: Sextus M VIII,
   Galen, Alexander.
