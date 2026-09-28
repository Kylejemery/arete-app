# The Themata Project: findings (Phase 5 draft)

**Status: draft for specialist review. Not for publication** (guardrail 5).
None of the 38 ledger entries has yet been signed off by Kyle (guardrail 3),
so every result below is provisional on the ledger as it stands.

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
constrain the logic around them.**

- 59 of the 66 candidate rule sets fit the ledger under at least one
  parameter setting (188 candidate-settings out of 792). All 188 fits are
  proven: each required derivation was found, and each rejection is covered
  by a Lean theorem.
- The fits agree on two things, and those are the findings with the most
  content:
  1. **Contraction is needed and weakening never happens.** Every fit lets a
     repeated premise count once, either through the `set` view or through
     the merging cut (the dialectical theorem as we read it). Without that,
     the indifferently concluding argument (S011) and the duplicated
     conditional argument (S012) cannot be derived. At the same time, no
     candidate under any setting derives the redundant argument S016. This is
     proved through a relevance semantics in which contraction holds and
     weakening fails.
  2. **The contradictory must cancel a negation.** Every fit reads the
     contradictory of "not p" as p. Under the other reading ("not not p") the
     Sorites chain (S018) is not derivable, and that is proved, not just
     unfound.
- The attested third thema alone (`Attested`) fits, and so does Mates's
  reconstruction. On this suite they cannot be told apart, because no ledger
  item needs the first thema. That is a limit of the surviving evidence as
  the corpus holds it, not a result about the Stoics.
- The suite does not separate Chrysippus's policy on single-premise arguments
  from Antipater's. This follows from how those items were ruled (disputed).
  It is not a finding.

## 3. What was built

| Phase | Output | Where |
| --- | --- | --- |
| 1 | Evidence ledger: 19 argument forms, 19 rules/definitions, each quoting a passage verified by query against the corpus | `evidence/suite.yaml`, `evidence/rules.yaml`, `evidence/gaps.md` |
| 2 | Stoic propositional logic as its own object language in Lean 4; the five indemonstrables; parameters for the disputed readings | `lean/Stoic/*.lean` |
| 3 | 66 candidate rule sets: the attested third thema, Mates (two variants), and 63 generated variants | `lean/Stoic/Themata/`, `results/candidates.md` |
| 4 | Evaluation of every candidate × setting × item, with proofs of underivability | `lean/Stoic/Harness/`, `lean/Stoic/Soundness.lean`, `Sugihara.lean`, `Undergeneration.lean`, `results/matrix.md` |

Every interpretive decision, and the reason for it, is in `NOTES.md`.

### Parameters

The parameters are the places where the evidence does not settle the logic:

- **Conditional:** Philonian, Diodorean, Chrysippean, containment.
- **Single-premise arguments:** Chrysippus or Antipater.
- **The contradictory:** `toggle` (the contradictory of "not p" is p) or
  `negate` (it is "not not p").
- **Premise comparison:** `list`, `multiset` or `set`.
- **Redundancy:** `strict` or `narrow` (finding F1).

Derivability depends only on the single-premise policy, the contradictory and
the premise comparison, which gives 12 settings. The conditional and the
redundancy readings enter through the semantic table.

### How "underivable" is established

Guardrail 4 forbids reporting "not found within depth N" as "proven
underivable". The harness reports a rejection as proven only when a Lean
theorem covers it. There are five such routes, and none uses `sorry`:

| Route | Idea | Covers |
| --- | --- | --- |
| Philonian soundness | every rule preserves classical truth, so a classical countermodel rules an argument out | S006, S007; S014/S015 under Chrysippus |
| Sugihara soundness | every rule preserves validity in the relevance logic RM, where premises fuse and weakening fails | S016, S008 |
| Gödel G₃ soundness | under `negate`, every rule is sound where "not not p" ≠ p | the Sorites under `negate` |
| Two-premise invariant | without cut, contraposition keeps two premises | three-premise items for cut-free candidates |
| Lone-atom invariant | without the merging cut, no atom can stand in exactly one place | S011 for non-merging candidates |

The relevance semantics is a proof device, not a claim that the Stoics held
a relevance logic.

## 4. Results in detail

Full tables: `results/matrix.md` (and `matrix.csv` for every cell).

1. **No overgeneration anywhere.** No candidate, under any setting, derives
   anything the ledger rejects (S006, S007, S008, S016, and S014/S015 under
   Chrysippus). Every such cell is proven.
2. **Fits.**
   - 188 candidate-settings fit, across 59 candidates.
   - All of them use the `toggle` contradictory.
   - 118 of them use the `set` view.
   - The rest use the merging cut, under `multiset` (58) or `list` (12).
3. **The named candidates.**
   - `Attested` (third thema only) and `Mates` (first and third) fit under
     the `set` view.
   - `Mates + dialectical theorem` fits under `set` and `multiset`.
   - `Attested` and `Mates` agree on every cell of the matrix.
4. **Non-fits.**
   - 544 of the 604 non-fitting candidate-settings are proven not to fit.
   - The other 60 fail only on search-bounded cells:
     - 46 are the `list` view with the Sorites, where the ledger's premise
       order matters;
     - 14 are cut-free candidates under `set`.
   - So 188 is a proven lower bound on the number of fits. It is exact unless
     a derivation exists deeper than the search goes.
5. **The seven candidates that never fit** are those with no third thema.
   The composite arguments (S012, S013, S018) need cut.
6. **Redundancy (finding F1).**
   - S016 is valid by the Stoic validity criterion (DL 7.77) under every
     reading of the conditional. Its rejection therefore comes from
     redundancy alone, since the criterion is monotonic.
   - S009 and S011, both accepted, are redundant under the `strict` reading
     and not under `narrow`.
   - So the ledger is consistent only if the Stoics' notion of a redundant
     premise exempted indifferently concluding arguments.
7. **Asserted falsity is not negation.** S008 ("'p and q' is false; p;
   therefore not q"), which Diogenes calls conclusive but not syllogistic, is
   proven underivable by every candidate. That is the behaviour the ledger
   requires.

## 5. Negative and underdetermined results

- **The themata are underdetermined.** Most generated variants fit
  somewhere, so the suite cannot pick a reconstruction.
- **The first thema is untested.** No attested argument in the corpus needs
  it. The Probes section of the matrix (explicitly not evidence) shows which
  arguments would test it:
  - "p; not q; therefore not (if p, q)";
  - the "two conditionals" argument, "if p, q; if p, not q; therefore not p".
    As far as we recall, it is discussed in Sextus and in Origen, but it is
    not in the corpus.
- **Bobzien is not tested.** By ruling, no Bobzien module exists until her
  paper is in the corpus. The Mode 2 summary reports her reconstruction as
  monotonic and without contraction (R03). That is the opposite of what every
  fit here needs. This is the most pointed open question the project raises
  for a specialist.

## 6. Limits and caveats

- **The ledger is small and unsigned.**
  - It holds 17 formal items, with confidence spread high 9, medium 5, low 5
    (suite).
  - No entry has Kyle's sign-off yet.
  - The corpus lacks Sextus M VIII, Galen, Alexander and Origen (gaps.md).
    They are the main ancient sources for the themata.
- **Encoding choices matter.** S018 is run as a three-link Sorites, not ten
  links. S014 and S015 are one form, with the conditional as background
  theory. Under the `list` view, results depend on the order in which the
  ledger lists premises.
- **Mates is represented by a Mode 2 summary** (low confidence), not his
  text. Our reading of the dialectical theorem as a merging cut is our own.
- **T04 is pending.** Alexander's claim that the second, third and fourth
  themata come from the synthetic theorem rests on our reading of untranslated
  Greek.
- **The derivations the harness exhibits are evaluations** of the same rule
  functions the proofs are about. They are not kernel-checked certificates,
  except `S013_attested` and `S012_matesDT`, which are proved.
- **The search is bounded.**
  - It runs to depth 8, and results are identical at depths 4, 6 and 8.
  - Formulas are restricted to each item's subformulas and their
    contradictories.
  - Only the 60 unproven non-fits depend on these bounds.
- **The conditional reading does not affect derivability**, by design: the
  indemonstrables have the same form under every reading. It affects only the
  validity criterion. The Diodorean reading has no complete decision
  procedure here.

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
   - S018 (the Sorites form taken as valid)?
2. **Contraction.** Every fit needs a repeated premise to count once. Is that
   consistent with what is known of Stoic analysis? Does it conflict with
   Bobzien's reconstruction, which the summary reports as having no
   contraction?
3. **The contradictory.** Is reading the contradictory of "not p" as p
   (rather than "not not p") the standard view, given DL 7.69 on double
   negation?
4. **The third thema.** Is our encoding of Simplicius's description
   ("takes the conclusion and adds another premise") as a cut, with the
   conclusion first and one further premise, fair to the Greek?
5. **The dialectical theorem.** Is reading it as a merging cut defensible,
   or should it be a separate rule?
6. **T04.** Is our reading of Alexander's sentence right: that the Stoics
   made their second, third and fourth themata from the synthetic theorem?
7. **Sources.** Which texts would give attested arguments that need the
   first thema?

## 8. Before anything goes public

1. Kyle signs off the ledger entries (guardrail 3), or amends them. The
   matrix then needs regenerating (`lake exe harness`).
2. A specialist in Stoic logic reviews this file, the ledger and the
   encoding (guardrail 5).
3. Store the ancient texts named in gaps.md in `research_sources`, and add
   the items they support. The first thema can then be tested.
