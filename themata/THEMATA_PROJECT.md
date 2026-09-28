# The Themata Project

Machine checking reconstructions of Chrysippus's themata against the ancient evidence.

## Research question

Chrysippean logic reduces every valid argument to the five indemonstrables using four meta rules, the themata. Our sources preserve some of these rules clearly; the others have been reconstructed by modern scholars. The question:

**Which sets of rules, under which readings of the Stoic connectives, derive exactly the arguments the ancient sources call valid, and none of the ones they reject?**

Possible outcomes, all of them worth publishing:

1. One reconstruction fits uniquely.
2. Several fit, meaning the surviving evidence underdetermines the answer.
3. None fit, meaning the evidence, our reading of the connectives, or both need rethinking.

## Background the build must respect

The five indemonstrables (schematic):

1. If p, q; p; therefore q.
2. If p, q; not q; therefore not p.
3. Not (p and q); p; therefore not q.
4. Either p or q; p; therefore not q.
5. Either p or q; not p; therefore q.

Constraints that make this logic unlike the classical logic built into Lean:

**Disjunction is exclusive.** "Either p or q" means exactly one.

**Redundant premises invalidate an argument.** The Stoics treated an argument with a superfluous premise as invalid. The system is therefore not monotonic: adding a premise can destroy validity. Weakening must never be available as a rule.

**The conditional is contested.** Philonian (material) and Chrysippean (connexion: the contradictory of the consequent conflicts with the antecedent) readings produce different results. This is a parameter, not a decision.

**Single premise arguments.** Chrysippus rejected them; Antipater accepted them. Also a parameter.

## Guardrails

1. Every entry in the evidence ledger must cite a passage actually retrieved from the Arete corpus, either through the read only MCP server or by read only SELECTs against `rag_corpus`. Every passage must be verified, by query, as an exact substring (whitespace collapsed) of a live chunk, meaning `deprecated = false`, whose id is recorded as `corpus_ref`. No citations from model recall alone. *(Amended 2026-09-27; see NOTES.md.)*
   A passage from a text the corpus cannot hold verbatim may instead be cited from `research_sources`, the private store of full texts: record the source's id and a locator (for example `M VIII 223`), and quote only as much as the entry needs. The quotation must pass `research_source_contains(id, passage)` by query, which fails for a deprecated source or one whose licence is still `unconfirmed`. Where the corpus holds a Mode 2 summary of the same section, record its chunk id as `corpus_ref` as well. *(Amended 2026-09-28; see NOTES.md.)*
2. Every scholarly reconstruction encoded in Phase 3 must come from a retrieved text, with the source recorded.
3. Kyle signs off on each ledger entry before it enters the test suite.
4. Distinguish "not derivable within search depth N" from "proven underivable." Never report the first as the second.
5. No public claims until a specialist in Stoic logic has reviewed the ledger and the formalization.

## Phases

### Phase 1: Evidence ledger (the test suite)

Build `evidence/suite.yaml`. One entry per argument form:

```yaml
- id: S001
  schema: "if p, q; p; therefore q"
  verdict: valid          # valid | invalid | disputed | valid_nonsyllogistic
  kind: indemonstrable    # indemonstrable | derived | redundant | single_premise | sophism | other
  flags: []               # optional; non_formal = kept in the ledger, excluded from the formal suite
  source: "Sextus Empiricus, Against the Logicians"
  passage: "<retrieved text>"
  corpus_ref: "<chunk id from MCP>"
  notes: ""
  confidence: high        # high | medium | low
  verified_by_kyle: false
```

Sources to mine: Sextus Empiricus (Against the Logicians; Outlines of Pyrrhonism book 2), Diogenes Laertius book 7, Galen (Introduction to Logic), Alexander of Aphrodisias on the Prior Analytics, Origen (Against Celsus), plus any fragments in the corpus. Also collect every passage that states or paraphrases a thema, and the "synthetic theorem."

Deliverable: the ledger, plus `evidence/gaps.md` listing forms we expected but could not source.

### Phase 2: Base system in Lean 4

Encode Stoic logic as its own object language. Do not use Lean's `Prop` connectives as the logic, since they are classical and monotonic.

1. `Syntax.lean`: atoms, Stoic negation, conjunction, exclusive disjunction, conditional.
2. `Argument.lean`: an argument is a list of premises and a conclusion. Premise order and multiplicity may matter; represent both and test.
3. `Indemonstrables.lean`: the five as base cases of an inductive derivability predicate.
4. `Params.lean`: conditional reading, single premise policy, and anything else Phase 1 surfaces. Phase 1 surfaced: redundancy (at least `strict` and `narrow`), the reading of "contradictory" (double negation), and how premise order and multiplicity are compared.

Deliverable: a compiling base system with the five indemonstrables proven derivable, and a test showing a redundant premise argument is not derivable from the base cases alone.

### Phase 3: Candidate rule sets

Each candidate is a set of themata added as further constructors. Encode:

1. The attested themata as the sources state them.
2. Each published reconstruction found in the corpus (for example Bobzien's work on Stoic syllogistic, Frede, Mates), one module per author. No Bobzien module until the paper itself, not only a Mode 2 summary, is in the corpus (ruling of 2026-09-27).
3. Generated variants: systematic loosening and tightening of each rule, logged with how they were produced.

### Phase 4: Evaluation harness

For every candidate crossed with every parameter setting:

1. Attempt a derivation of each suite item by bounded proof search.
2. Record: derived, not found within depth N, or proven underivable (where an invariant or semantic argument is available).
3. Flag any rejected form that becomes derivable (overgeneration) and any valid form that does not (undergeneration). A `valid_nonsyllogistic` item passes only if it is valid under the validity criterion and not derivable. Deriving it is overgeneration. Items flagged `non_formal` are not run.

Output `results/matrix.md`: candidates as rows, suite items as columns, plus a summary of which candidates fit perfectly.

### Phase 5: Findings and review

Write up the outcome, including negative and underdetermined results. Send the ledger, the Lean code, and the matrix to a specialist for review before anything goes on the Substack or the podcast.

## Repo layout

```
themata/
  evidence/suite.yaml
  evidence/gaps.md
  lean/Stoic/Syntax.lean
  lean/Stoic/Argument.lean
  lean/Stoic/Indemonstrables.lean
  lean/Stoic/Params.lean
  lean/Stoic/Themata/<candidate>.lean
  harness/
  results/matrix.md
  NOTES.md          # every interpretive decision, with reasons
  FINDINGS.md       # Phase 5 write-up, for specialist review
```

(Phase 1 also added `evidence/rules.yaml` for themata, connectives and
reconstructions; see NOTES.md.)

## Kickoff prompt for Claude Code

> Read THEMATA_PROJECT.md. Do Phase 1 only. Using the read only Arete corpus MCP server, search for every passage that states a Stoic argument form as valid or invalid, every statement of a thema, and every statement of the synthetic theorem. Build evidence/suite.yaml per the schema, citing only retrieved passages with their chunk ids. Set verified_by_kyle to false on everything. Then write evidence/gaps.md listing forms or sources you expected but could not find in the corpus. Stop and report; do not start Phase 2.
