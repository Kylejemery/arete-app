# Themata Project: interpretive decisions

Every interpretive decision, with the reason for it. Newest phase at the
bottom. Nothing here is signed off until Kyle says so.

## Phase 1 (2026-09-27)

### Retrieval

Guardrail 1 asks for passages retrieved "through the read only MCP server".
That server (`server/routes/corpus-mcp.js`, `POST /mcp/corpus`) was not
connected to the session that built the ledger, and no `ARETE_MCP_TOKEN` was
available. Rather than cite from recall, the ledger was built from the table
the MCP server reads, `rag_corpus`, through the Supabase connector:

- read-only `SELECT`s only, filtered to `not coalesce(deprecated, false)`;
- keyword and regex search rather than embedding search. Exhaustiveness
  matters more than ranking here, and vector search misses the Greek
  technical terms (see gaps.md §3.1);
- every `corpus_ref` is a `rag_corpus.id`.

This path has one advantage over the MCP server: `search_corpus` does not
return chunk ids, so a ledger built through it could not fill `corpus_ref`
(gaps.md §3.9).

**Verification.** After writing, every `passage` in `suite.yaml` and
`rules.yaml` (38 entries) was checked by query. The cited row exists, is not
deprecated, and contains the passage as an exact substring after collapsing
whitespace. Twenty-five quotations inside `notes` that carry their own chunk
id were checked the same way, with quote marks normalised: some nested double
quotes were rendered as single quotes to keep the YAML readable, and no other
wording was changed. Three passages first failed the check because each
straddles two overlapping chunks. Each was repointed to the chunk holding the
whole passage (C04, S015, X01).

Kyle should decide whether this counts as meeting guardrail 1 or whether the
ledger must be re-derived through the MCP server once it returns ids.

### File layout

- `evidence/suite.yaml`: argument forms only. These become harness test items.
- `evidence/rules.yaml`: themata, the synthetic theorem, the dialectical
  theorem, connective definitions, the validity criterion, and the modern
  reconstructions the corpus holds. The brief asked Phase 1 to collect these
  passages, but they are not test items, and mixing them into the suite would
  make the harness skip non-arguments. Same fields as the suite, with
  `status` (attested / reported / context) in place of `verdict`.
- `evidence/gaps.md`: absences, corpus defects, and out-of-scope finds.

The suite schema is used exactly as the brief gives it. No fields were added.
Witness strength is carried in `source` and `confidence` instead.

### Witness strength and confidence

| Witness | Example | Max confidence |
| --- | --- | --- |
| Ancient text, public-domain translation | DL VII (Hicks 1925), Cicero (Yonge) | high |
| Ancient text quoted inside a secondary work | Alexander and Simplicius in Zeller's notes | medium |
| Modern author's report of an ancient text | Zeller's main text | medium |
| Mode 2 summary of modern scholarship | Mates, Bobzien | low |

A `high` entry can still carry a translation problem, which its `notes` flag
(S002, S003).

### Schema notation

`p, q, r` are propositional variables. "if p, q" is the conditional, with its
reading left to Params (rules C01–C03). "either p or q" is two-place exclusive
disjunction (rules C04). "not (p and q)" is negated conjunction. "not p" is the
contradictory, with double negation left open (rules C06). Premises are
separated by ";" and listed in the order the source gives them.

### Boundary cases that need Kyle's ruling

1. **S008, valid but not syllogistic.** DL says "'It is both day and night' is
   false; it is day; therefore it is not night" is conclusive but not
   syllogistic. The verdict enum has no value for this. For the harness it has
   to mean "must not be derivable, and deriving it is overgeneration". The
   entry is marked `valid`, and the harness will need a fourth expected
   outcome or a `kind`-based rule. Phase 2 must also decide whether "'p' is
   false" is an operator distinct from "not p".
2. **S011 against S016.** "Either p or q; p; therefore p" is accepted, yet its
   first premise does no work. The ledger records both at the confidence the
   evidence allows. It does not resolve the tension. Resolving it is what the
   project is for.
3. **S014 and S015, single-premise arguments.** Marked `disputed`, with the
   verdict to be computed from the single-premise parameter. The two examples
   are kept separate. They could be merged.
4. **S017, deficient disjunction.** A material defect, not a formal one. It is
   probably excluded from the formal harness.
5. **S018, the Sorites.** The form (chained negated conjunctions) looks valid
   given double-negation elimination, and Chrysippus's response concerns
   assent, not form. It is marked `disputed` until Kyle decides.
6. **S019, the Nobody.** Out of propositional scope. It is kept as a guard
   against surface-level matching and marked invalid because DL classes it as
   insoluble.
7. **Rules T04.** The translation of Alexander's last sentence is our own
   reading of the retrieved Greek, not a retrieved translation. Check it
   before Phase 3 relies on it.

### Assumptions carried into Phase 2 (not evidenced by the corpus)

- Conjunction is classical: true iff both conjuncts are true. The corpus
  defines it only syntactically (rules C05).
- The five indemonstrables are the complete base. DL says "Chrysippus makes
  them five" and "authorities differ" (S001 notes), and the brief takes
  Chrysippus's list.

### Rulings (Kyle, 2026-09-27)

- **Guardrail 1: accepted and amended.** Read-only SELECTs against
  `rag_corpus` are allowed, provided each passage is verified by query as an
  exact substring of a live chunk. THEMATA_PROJECT.md now says so. The MCP
  server's `search_corpus` now returns chunk ids (#282), so either route can
  meet the guardrail.
- **Ruling 1: new verdict `valid_nonsyllogistic`** (S008). The harness passes
  it only if the argument is valid under the validity criterion (rules C08)
  and not derivable through the themata.
- **Ruling 2: the Sorites chain (S018) is valid, `kind: sophism`.** The Nobody
  argument (S019) stays in the ledger flagged `non_formal` and leaves the
  formal suite. Its fault is equivocation, which propositional form cannot
  see.
- **Ruling 3: S017 is flagged `non_formal`** and leaves the formal suite.
- **Ruling 4 (T04): pending.** Kyle is checking the Alexander reading. Nothing
  in Phase 2 depends on it.
- **Redundancy: not resolved.** It is a parameter with at least two readings
  (below, and Params.lean), and the conflict is recorded as finding F1.
- **Bobzien: no module** until the paper itself is in the corpus.
- **Corpus fixes:** written as an unapplied migration in its own PR (#283):
  Zeller relabelled as scholarship with `contains_quoted_primary`; the Hicks
  and Yonge errors recorded in a new `rag_corpus_annotations` table, canon text
  untouched; a `greek_terms` column starting with θέμα at DL 7.78.

Vocabulary change: `flags` is a new optional list field on suite entries. Its
only value so far is `non_formal`.

### Finding F1: the ledger's evidence on redundancy is inconsistent

The brief's premise is that a superfluous premise invalidates an argument
(S016: "if p, q; p; r; therefore q" is invalid). The same ledger holds
arguments the Stoics accepted whose premises are not all needed:

- S011, "either p or q; p; therefore p" (ἀδιαφόρως περαίνων). The disjunction
  does no work. Zeller reports that the Stoics "attached importance" to such
  arguments.
- S009, "if p, p; p; therefore p" (διφορούμενος). The conditional does no work
  either, since "p; therefore p" already reaches the conclusion. Cicero puts
  it among "the arguments of Chrysippus".

If "redundant" means "some premise is idle", these are redundant and so
invalid. If the Stoics accepted them, they were not using that definition. The
evidence for S016 is also the weakest in the ledger (a Mode 2 summary of Mates
reporting Sextus, whom Mates suspects of error), while S009 and S011 have
primary or quoted-primary witnesses.

The project does not choose between them. `Params.lean` carries
`Redundancy.strict` (any idle premise makes the argument redundant) and
`Redundancy.narrow` (as strict, but indifferently concluding arguments,
whose conclusion is one of their premises, are exempt). The harness will
report the fit of each candidate under both. If only `narrow` lets a candidate
fit the suite, that is itself a result about what the Stoics meant by
παρέλκων.

## Phase 2 (2026-09-27)

A compiling base system is in `lean/` (Lean 4.22.0, no Mathlib). `lake build`
checks everything below. The proofs use only the axioms `propext` and
`Quot.sound`: no `sorry`, no `native_decide`.

### Deliverable

- **The five indemonstrables are derivable** under every parameter setting
  (`first_derivable` … `fifth_derivable`, with atom instances in `Tests`).
- **A redundant-premise argument is not derivable from the base cases
  alone.** `redundant_not_derivable` shows that `if p, q; p; r; therefore q` is
  not derivable for any p, q, r with r distinct from both premises, under
  every parameter setting and background theory. `S016_not_derivable` is the
  atom instance. It follows from a general result, `not_derives_three_distinct`:
  no argument with three pairwise-distinct premises is base-derivable,
  because every base argument has at most two premises and every premise view
  preserves membership.

This is non-derivability from the *base cases*. Whether themata can
manufacture redundant arguments is the Phase 3/4 question. Where proof search
is the only method, Phase 4 must report "not found within depth N", never
"proven underivable" (guardrail 4).

### Decisions

1. **Themata are values, not constructors.** The brief says to add each
   candidate's themata "as further constructors". A Lean inductive cannot be
   extended from another file, so `Derives P T R` takes the rule set `R` as
   a parameter, with one generic `thema` constructor. Each Phase 3 candidate
   is a `List Thema`, and all candidates share one base system and one
   harness. The effect is the same as adding constructors.
2. **`saidFalse` is its own operator** (S008). Semantically it is negation,
   syntactically it is not, so no indemonstrable applies to it.
   `S008_not_derivable` proves that the argument is not base-derivable, and a
   `#guard` shows it is valid by the criterion. That is exactly the
   `valid_nonsyllogistic` expectation.
3. **Third, fourth and fifth indemonstrables in both positions.** DL says "one
   of the conjoined propositions" and "one of the two alternatives", which
   does not fix a side. The major premise is always listed first, as in all
   of DL's examples. Whether that order binds is the premise-view parameter.
4. **Premise view** (`list | multiset | set`, default `multiset`) is the
   brief's "order and multiplicity may matter" made a parameter. Tests show
   what each setting changes. Under `list`, minor-premise-first is not
   derivable (`minor_first_list`). Under `multiset` it is
   (`minor_first_multiset`). Under `set`, a repeated premise collapses and
   `if p, q; p; p; therefore q` is derivable (`repeated_premise_set`), while
   under `list` and `multiset` it is not (`repeated_premise_not_derivable`).
   The default is not a claim about the Stoics. Nothing in the corpus bears
   on it (gaps.md §2).
5. **Contradictory** (`toggle | negate`, default `toggle`) is C06. Under
   `toggle` the contradictory of "not p" is "p", which is why the Sorites
   links (S018) are plain third indemonstrables.
6. **Single premise** (`chrysippus | antipater`). Antipater's arguments are
   base cases relative to a background `Theory` of accepted conditionals,
   since "it is day; therefore it is light" is an argument only because "if
   it is day, it is light" is held true. Under `chrysippus` no one-premise
   argument is derivable (proved for the list and multiset views).
7. **Conditional reading** lives in the semantics (`Semantics.lean`), not in
   derivability. The indemonstrables are the same under every reading.
   What changes is which arguments the validity criterion calls conclusive.
   Chrysippean is modelled as strict implication over a model's worlds, which
   is Mates's gloss. Containment is a labelled placeholder. Diodorean has
   truth conditions but no complete validity procedure yet, so its checks
   return `none` rather than a guess.
8. **Redundancy** (`strict | narrow`) is finding F1 made a parameter.
   "Idle" is defined semantically: the argument without that premise is still
   valid by the criterion. The `#guard`s show S016 redundant under both
   readings, S001 under neither, and S009 and S011 redundant under `strict`
   but not under `narrow`.
9. **Validity checks are evaluations, not proofs.** The criterion is decided
   by enumerating finite models (`#guard`, checked at build time). They are
   honest decision procedures for the Philonian reading, and, up to four
   atoms, for the Chrysippean one. They are not kernel-checked theorems.
   Phase 4 can promote them to certificates where "proven underivable" is
   claimed.

### Not started

Phase 3 (at the time of Phase 2; now superseded, see Phase 3 below): no
themata were defined, and `R = []` throughout. The ledger's open
items still stand for Phase 3: T04 (pending Kyle), no Bobzien module, and the
two Mates readings of the third thema (rules T03, T06).

## Research sources (2026-09-28)

The ledger's largest gaps (Sextus M VIII, Bobzien 1996) are texts the corpus
cannot hold verbatim, and a Mode 2 summary drops exactly what the project
needs: the argument forms, word for word. Guardrail 1 now allows a second
kind of citation, from `research_sources`:

- **The store.** `research_sources` (migration `20260928190000`) holds full
  texts with author, edition, translator, how the copy was obtained, licence
  status and a locator scheme. RLS is on with no policies, and anon and
  authenticated have no grants, so only the service role can read it. There
  is no embedding column. Nothing in it is retrievable by any agent, and no
  part of it is committed to git.
- **Adding a text.** The academy admin page `/admin/research` (plain text up
  to 4 MB), or `scripts/research-sources/add.mjs` (usage at its top) run
  with the service-role key for anything larger. Both normalise the text the
  same way and refuse a text already stored (same sha256). The page also
  settles a source's licence, deprecates it, and verifies a quotation.
- **Citing.** An entry records the source id, a locator, and the shortest
  quotation that carries the form. The quotation is verified with
  `research_source_contains(id, passage)`, the same whitespace-collapsed
  substring test used for `rag_corpus`. The function returns false for a
  deprecated source or one whose licence is `unconfirmed`, so registering a
  text does not by itself make it citable.
- **Witness strength.** A stored translation counts as its row in the witness
  table above (an ancient text in a modern translation is a primary witness,
  `high` at most), not as a Mode 2 summary.
- **Public claims.** Guardrail 5 still applies, and quotations from stored
  texts stay short enough to be quotation, not reproduction.

## Phase 3 (2026-09-28)

Candidate rule sets are in `lean/Stoic/Themata/`, and every candidate with its
provenance is logged in `results/candidates.md`, generated by `Log.lean`.
`lake build` checks everything below. No candidate has been run against the
suite; that is Phase 4.

### Two rule shapes

The ledger attests or reports only two kinds of thema, so every candidate is
built from two shapes (`Rules.lean`):

- **Contraposition**, the first thema as Mates's summary states it (T06).
- **Cut**, the third thema. Simplicius (T03), Zeller's gloss of him, and
  Mates's summary (T06) all describe joining an argument that concludes a
  proposition to an argument that uses it as a premise. They differ on where
  the proposition may stand and how many premises the using argument has.

Each shape has switches (which premise, how many premises, which position,
whether shared premises are merged). The named candidates and the generated
variants are settings of the same switches, so Phase 4 compares like with
like. Rules are computable forward steps (`Rule.step`), so the harness can
search with the same definitions the proofs use.

### Named candidates

1. **Attested** (T03): the third thema only, since it is the only thema whose
   content an ancient text in the corpus states. Encoded literally as
   `cut[two,first]`: the analysis "takes the conclusion", so the conclusion
   stands first, "and adds another premise", so the using argument has
   exactly two premises. The premises of the inference that reached the
   conclusion take its place, which is Zeller's gloss. That gloss adds nothing
   the Greek's "analysis" does not already imply, so there is no separate
   Zeller module.
2. **Mates** (R01, T06): the first thema as `contrapose[either,two]` and the
   third as `cut[two,any]`. The second and fourth are unknown in the summary
   and are left out rather than guessed.
3. **Mates + dialectical theorem** (T05): Mates conjectures that Sextus's
   dialectical theorem is the second thema. The summary does not state it as
   a rule. Our reading is a merging cut, `cut[any,any,merge]`: a conclusion
   reached in the analysis may be used anywhere, and premises it shares with
   the argument that uses it are stated once ("treated as implicitly present
   among the premises"). This reading is ours and is the most interpretive
   choice in Phase 3.

Not encoded: Bobzien (ruling of 2026-09-27; the paper is not in the corpus or
in `research_sources`); Frede, Mignucci and Barnes (not in the corpus); T04
(the synthetic theorem as the source of themata 2–4, pending Kyle's check).
When T04 is settled, themata 2–4 as a family from one chain rule would be a
new named candidate, and the cut switches already cover most of that family.

### Generated variants

`Generated.lean` takes the full product of the switches: 7 settings of the
first thema (absent, or 3 premise choices × 2 arities) × 9 of the third
(absent, or 2 arities × 2 positions × merge on/off) = 63. No setting was
picked by hand. The product includes the empty set (base cases only), which
is the control, and it includes the rule sets of `Attested` and `Mates`
(marked in the log). A rule that adds a premise (weakening) is never
generated, because the brief rules it out.

### Decisions

1. **Premise order in outputs.** Contraposition puts the contradictory of
   the conclusion after the premise kept, following "either premise combined
   with the negation of the conclusion". Cut puts the lemma's premises where
   the cut proposition stood. Under the default `multiset` view neither
   choice matters. Under `list` both do, and the harness will show where.
2. **"Negation" in Mates's first thema** is read as the contradictory
   (`Params.contra`), as in the indemonstrables (T06 notes the difference).
   Under `negate`, contraposing a second indemonstrable yields double
   negations rather than the first indemonstrable back (a `#guard` in
   `Themata/Tests.lean`).
3. **A thema's output is compared under the premise view**, exactly as the
   base cases are, so no candidate gets a different view from the base system.

### What the tests show

These are checks of the encoding, not findings:

- `S013_attested`: S013 is derivable under `Attested`, by a second
  indemonstrable cut into a third, and `S013_not_base` shows that it is not
  derivable from the base cases alone. The attested third thema therefore
  does real work.
- `S012_matesDT`: S012 is derivable under `Mates + dialectical theorem`.
  The plain cut, which every other candidate has, instead yields
  `if p, (if p, q); p; p; therefore q`, with p twice. So whether S012 is
  derivable without the merging cut turns on the premise view. This is
  where contraction enters, and it bears on Bobzien's "does not satisfy
  contraction" (R03).
- Soundness: every output of every rule shape, applied to one or two base
  instances over three atoms and a negated atom, is valid by the criterion
  under the Philonian reading, for both readings of the contradictory
  (7,536 outputs). A rule that dropped a premise fails this check.

## Phase 4 (2026-09-28)

The harness is `lake exe harness` (`lean/Stoic/Harness/`). It writes
`results/matrix.md`, with a summary and tables, and `results/matrix.csv`,
with every cell. `harness/check_suite.py` confirms that the encoded suite
matches `evidence/suite.yaml`. Nothing below has been reviewed by a
specialist (guardrail 5).

### What is run

- **Candidates**: all 66 from Phase 3.
- **Settings**: 12. Derivability depends only on the single-premise policy,
  the contradictory and the premise view (2 × 2 × 3). `Derives` never reads
  the conditional reading or the redundancy reading, so those two enter only
  the semantic table, which checks every item under each reading.
- **Items**: the 17 formal items. S017 and S019 are `non_formal` and are not
  run.
  - S014 and S015 are run with "if p, q" as background theory.
  - S018 is run as a three-link Sorites of the same shape as the ledger's
    ten-link chain.
- **Expectations**: `valid` must be derived, and `invalid` must not.
  `valid_nonsyllogistic` must not be derived. `disputed` (S014, S015) follows
  the single-premise policy: derived under Antipater, not under Chrysippus.

### Search and its bounds

The search runs forward from the base cases with the candidates' own
`Rule.step`, to depth 8. The bounds are:

- formulas stay within each item's subformulas and their contradictories;
- premises are at most one more than the item has;
- the search holds at most 20,000 arguments.

No run hit the size bound. The matrix is identical, cell for cell, at
depths 4, 6 and 8. Every search-bounded rejection (1,532 cells, `·s`)
*saturated*: nothing new was derivable within the bounds. That is still only "not found within depth 8". The bounds are not
proved complete, and the matrix never reports a failed search as a proof.

### Proven underivable: three routes (`lean/Stoic/Soundness.lean`)

1. **Countermodel** (`underivable_of_countermodel`, cell `■cm`). Every base
   case and every rule shape preserves truth under the Philonian reading,
   relative to the background theory. This is proved for the shapes, and then
   for all 66 candidates (`candidates_sound`). An item with a Philonian
   countermodel is therefore underivable by every candidate under every
   setting. Covers S006 and S007.
2. **Two premises** (`underivable_single_premise`, cell `■2p`). Under
   Chrysippus's policy with the `list` or `multiset` view, every derivable
   argument has at least two premises. Covers S014 and S015 there.
3. **Relevance** (`underivable_lone_atom`, cell `■rel`). For an atom, count
   the premises it occurs in, plus one for the conclusion. No base case gives
   any atom a count of exactly 1. Contraposition keeps every count, and plain
   cut cannot produce 1, so no candidate without the merging cut derives an
   argument with such an atom. This holds under the `list` or `multiset` view,
   with Chrysippus's policy or an empty theory. It covers S016, whose idle
   premise r has a count of 1. This is Phase 2's `redundant_not_derivable`
   carried from the base cases to every non-merging candidate.

A fourth route, `■base`, covers the control (no themata). There,
`Derives.base_only` makes derivability a finite check, and the base cases are
enumerated exhaustively.

The proofs use the standard axioms `propext`, `Quot.sound` and
`Classical.choice` (the last through `by_cases` and `simp`). None uses
`sorry` or `native_decide`.

### Results (search-bounded where marked `·`)

1. **188 of 792 candidate-settings fit**: no overgeneration, no
   undergeneration. 59 of 66 candidates fit under at least one setting. The 7
   that never fit are the ones with no third thema. Without cut, S010–S013
   (except S010, which is a base case) and S018 are not derived.
2. **No fit is proven.** Every fit rests on search-bounded rejections of
   S008 and S016, and 59 fits also on S014 and S015. *(Superseded: all 188
   fits are now proven. See "Closing the gaps" below.)* No overgeneration was
   found anywhere: no candidate derives S006, S007, S008 or S016 within the
   bounds, and none derives S014 or S015 under Chrysippus.
3. **Every fit uses contraction.** S011 ("either p or q; p; therefore p")
   and S012 ("if p, (if p, q); p; therefore q") are reached by chaining two
   indemonstrables that share a premise. The shared premise then appears
   twice, so they are derived only where a repeated premise collapses: under
   the `set` view (60 fits), or with the merging cut (the rest). Under the
   `list` and `multiset` views without the merging cut they are undergenerated
   (`UNDER`). S011 is the indifferently concluding argument of finding F1. The
   themata derive it only by contraction, which bears on Bobzien's reported
   "does not satisfy contraction" (R03) once her paper can be read.
4. **Contraction is also exactly what the redundancy proof cannot
   handle.** The relevance invariant fails for the merging cut and is not
   claimed under the `set` view. So in every setting where a candidate fits,
   the rejection of S016 is search-bounded, not proven. Whether contraction
   lets a system with themata manufacture a redundant argument is the open
   question at the centre of the brief. The search found no case within the
   bounds, but this is not proved. *(Superseded: proved. No candidate
   manufactures S016 under any setting. See "Closing the gaps" below.)*
5. **Every fit needs the `toggle` contradictory.** Under `negate` the
   Sorites (S018) is never derived. Chaining its third indemonstrables needs
   the contradictory of "not p" to be "p", not "not not p". The ledger's
   acceptance of the Sorites *form* as valid therefore commits to double
   negation dissolving in the contradictory (rules C06).
6. **The first thema changes little on this suite.** `Attested` (third
   thema only) and `Mates` (first and third) agree on every cell. A generated
   first thema changes whether a candidate fits only under the `list` view,
   where contraposition of any arity can reorder premises. The suite has no
   item that needs contraposition, which points to a gap in the ledger
   (gaps.md): no attested argument whose analysis needs the first thema.
7. **The suite does not separate Chrysippus from Antipater.** A candidate
   fits under one policy exactly when it fits under the other. This is by
   design (S014 and S015 are `disputed`, and their expectation follows the
   parameter).
8. **Semantic table.** S016 is valid by the criterion under every reading
   and redundant under both. So its rejection comes only from redundancy,
   because the criterion is monotonic (rules C08). S009 and S011 are redundant
   under `strict` and not under `narrow`, so under `strict` the ledger's
   "valid" for them conflicts with the semantics. This is finding F1, seen from
   the harness side. The Diodorean reading has no complete procedure (`?`).

### What would strengthen this

*(Written before the gaps were closed; see the next section for what was
done.)*

- A proof for S008. It is never derived, but no invariant yet covers
  "asserted falsity is not negation" beyond the base cases.
- A relevance-style invariant that survives contraction, or a
  counterexample. Either would settle result 4.
- Items that need the first thema, to test it at all (result 6).
- The ten-link Sorites and more composite arguments, once Sextus M VIII is in
  `research_sources`.

## Closing the gaps (2026-09-28)

After Phase 4 there were three gaps. Every fit rested on search-bounded
rejections of S008 and S016, S016 could not be proven under contraction, and
no item tested the first thema. Two are closed by proof, and the third is
narrowed to a sourcing task.

### S016 and S008: a relevance semantics (`lean/Stoic/Sugihara.lean`)

Classical semantics cannot reject S016, because it is monotonic. The Stoic
rules as encoded, however, are also sound in the Sugihara model of the
relevance logic RM:

- values are integers, and a value is designated when it is at least 0;
- premises are combined by fusion, which is commutative, associative and
  idempotent, but not monotonic;
- conjunction is fusion, "not both" is `p → not q`, and disjunction is
  `(not p → q) ∧ (q → not p)`.

Every base case holds in this model. Contraposition and cut, merging or not,
preserve holding under every premise view (`candidates_soundS`, for all 66
candidates).

- **S016** has a countermodel (p = q = 0, r = 1). So **no candidate derives
  S016 under any setting, with contraction or without.** This answers
  result 4 above: the themata as encoded never add a premise from nowhere, and
  the merging cut and the `set` view do not change that.
- **S008**: the rules never look inside "'p' is false", so the model may
  interpret it freely. With the identity, S008 has a countermodel
  (p = q = 1). This matches DL: "'p and q' is false" is not the negated
  conjunction the third indemonstrable needs.
- **S014, S015 under Chrysippus's policy**: that policy never reads the
  background theory (`Derives.drop_theory`), so a countermodel that ignores
  it suffices, in every view.

The model is a device for proving underivability. It is **not** a claim that
the Stoics held a relevance logic. The notable fact for the write-up is the
fit itself: the base cases and the themata as reconstructed are sound in a
logic that has contraction but not weakening. That is the profile the
redundancy doctrine suggests. It is the *opposite* of the profile the Mode 2
summary reports for Bobzien's reconstruction (R03): monotonicity, and no
contraction. Here every fit needs contraction (result 3) and none has
weakening. Whether the conflict is real, or an artefact of the summary, has
to wait for her paper.

**Result: all 188 fits are proven.** In each, every derivation was exhibited
by the search and every rejection is covered by a theorem. The exhibited
derivations are evaluations, using the same `Rule.step` the proofs are about,
not kernel-checked certificates. Two are also proved in Lean (`S013_attested`,
`S012_matesDT`).

### Proving that candidates fail (`lean/Stoic/Undergeneration.lean`)

A candidate-setting that does not fit fails on some `UNDER`. Three theorems
now prove many of those failures:

- **Gödel G₃ under `negate`** (`underivable_of_goedel`). When the
  contradictory always adds a negation, the rules are sound in three-valued
  Gödel logic, where "not not p" is not p. The Sorites (S018) has a G₃
  countermodel, so under `negate` it is underivable by every candidate.
- **No cut** (`underivable_no_cut`). Contraposition keeps two premises, so a
  candidate without cut cannot reach S013 or S018 under `list` or
  `multiset`.
- **Lone atom** (`underivable_lone_atom`, from Phase 4). This rules out S011
  for non-merging candidates under `list` or `multiset`.

**Result: 544 of the 604 non-fits are proven.** The other 60 fail only on
search-bounded `UNDER` cells:

- 46 are the `list` view with the Sorites (and sometimes S011). The Sorites
  under `list` depends on the order in which the ledger happens to list its
  premises.
- 14 are candidates without cut under the `set` view.

So the fit count, 188, is proven as a lower bound. It is exact unless one of
those 60 hides a derivation deeper than the search goes.

### The first thema: narrowed to a sourcing task

No text in the corpus or in `research_sources` gives an argument whose
analysis needs contraposition. The only corpus hits are modern summaries
saying that Bobzien assigns contraposition to the first thema. Guardrail 1
forbids adding an unsourced item, so the suite is unchanged.

The matrix now has a **Probes** section, of arguments that are explicitly
*not* evidence. It shows what kind of source would separate the candidates:

- "p; not q; therefore not (if p, q)" is derived only by candidates with a
  first thema.
- "if p, q; if p, not q; therefore not p" is never derived by `Attested`.
  `Mates` derives it only under the `set` view, and `Mates + dialectical
  theorem` under every view.

The second probe is the "two conditionals" argument. As far as we recall, it
is discussed in Sextus Empiricus (M VIII and PH II) and in Origen, *Against
Celsus* VII.15. That is recall, not a retrieved text. If a text giving it is
stored in `research_sources`, it becomes a ledger entry (guardrail 1), and
the harness will test the first thema directly.

### Axioms

`underivable_of_sugihara`, `underivable_of_countermodel_chrysippus` and
`underivable_of_sugihara_chrysippus` use `propext`, `Quot.sound` and
`Classical.choice`. `underivable_of_goedel_chrysippus` and
`underivable_no_cut` use `propext` and `Quot.sound`. Nothing uses `sorry` or
`native_decide`.

## Phase 5 (2026-09-28)

The write-up is `FINDINGS.md`, a draft for specialist review. It restates the
results of Phase 4 and of "Closing the gaps", together with their limits. It
also lists the questions a reviewer is asked to answer. It adds no new
interpretive decision. Two steps remain before anything is public: Kyle's
sign-off on the ledger (guardrail 3), which may change the matrix, and the
specialist review (guardrail 5).

## S020: the first thema tested (2026-09-28)

Origen, *Against Celsus* VII.15 (tr. Crombie, Ante-Nicene Fathers IV, 1885)
gives "the theorem of two propositions" and the Stoics' example: "If you
know that you are dead, you are dead; 2d, if you know that you are dead, you
are not dead. And the conclusion is—“you do not know that you are dead.”"
Kyle supplied the archive.org copy of the CCEL edition. It is suite entry S020,
"if p, q; if p, not q; therefore not p", with verdict `valid` and kind
`derived`.

- **Status.** Cited through `research_ref`. Guardrail 1 is met: both
  quotations pass `research_source_contains` against `research_sources`
  `4339bf26-71fa-4245-abe1-fbce3f35ea04`, the complete volume. A first upload
  was truncated (it ended in Tertullian, before Origen) and is deprecated
  (`c20ccbce-…`), not deleted.
- **Confidence: medium.** Origen reports the form as Stoic, but he is a later,
  non-Stoic witness. The general schema sentence in this copy is scrambled
  by OCR, and it rests on an editorial emendation (note 4701). The Stoic
  example does not.

### What it changes

- **Fits: 158 of 792 candidate-settings, across 50 of 66 candidates.** It
  was 188 across 59.
- **Every fit has a first thema.** `S020_needs_first_thema`
  (`lean/Stoic/FirstThema.lean`) proves that no candidate whose rules are all
  cuts derives S020, under any setting.
  - The proof uses *closed valuations*: truth assignments constrained only
    by the base cases.
  - Cut preserves truth in all of them. Contraposition does not, which is
    why the first thema matters.
  - The countermodel makes only S020's two conditionals true.
- **Attested (the third thema alone) no longer fits anywhere.** Mates (first
  and third) fits under `set`. Mates + dialectical theorem fits under `set`
  and `multiset`. The two named reconstructions now differ from the attested
  core, and the evidence decides against the attested core alone.
- **Unchanged:**
  - every fit uses the `toggle` contradictory and contraction;
  - there is no overgeneration;
  - all fits are proven.
- **Non-fits:** 580 of 634 are proven. The other 54 are search-bounded,
  mostly the Sorites and S020 under `list`, and cut-free candidates under
  `set`.
- **Which premise the first thema contraposes** (either, minor, major) does
  not matter on this suite. Each variant fits with some cut.

## Explorer data export (2026-09-29)

`results/explorer/` is the static data behind the public explorer page. The
page computes nothing, so this export is the only bridge between the research
and the page. The layout is in its README. Built by
`harness/build_export.py`, which runs `lake exe harness --export`
(`lean/Stoic/Harness/Export.lean`).

### Decisions

- **Every combination of the five parameters, 96 settings.** Derivability
  never reads `cond` or `redundancy`, but the export does not rely on that.
  Every run uses its full parameter record, and every cell matches
  `matrix.csv` under all eight (cond, redundancy) combinations. That makes
  114,048 run records.
- **Counts are distinct searches** (follow-up, same day). One candidate × one
  proof setting (`single`, `contra`, `view`) × one item is one search, 14,256
  in all. Each has eight identical run records, so counting records inflated
  every figure eightfold. `searches.json` folds them after checking that the
  eight agree on every field but `matches_ledger`, which varies only with
  `cond` and only for S008. From here on, figures are distinct searches.
- **Provenance and failure fields** (follow-up). `index.json` records the
  commit, an encoding version (a digest of `themata/lean/`), and an explicit,
  empty `failed_runs` list, with the reason it is empty. `items.json` flags
  every item whose witness is not a primary text (`non_primary`), which adds
  S011 and S014, the items resting on Zeller's quotation. `schema.json` covers
  every file, and the build validates against it.
- **The search records how it reached each argument** (`searchTrace`), and
  `search` is that record's outcome. The matrix and the export run the same
  code. `matrix.md` and `matrix.csv` regenerate byte-identical.
- **A reduction is the first derivation the breadth-first search found**, so it
  is a shallowest one. It is not necessarily the one an ancient analysis gives.
  Each reduction is replayed step by step before it is written.
- **The redundant variant adds a fresh atom, placed last** (S016's shape). A
  fresh atom is the one premise that is redundant under every reading, with no
  appeal to the semantics. Adding a related premise (a copy of an existing
  premise, or a consequence of one) would test contraction and the view,
  not redundancy.
- **A second variant duplicates the last premise** (added later the same day,
  on Kyle's decision). It tests exactly that: contraction, and whether the
  view lets a repeated premise count once. It sits beside the fresh-atom
  variant as `duplicate_variant` and does not replace it.
- **`matches_ledger` for S008** also needs the criterion (the brief's
  `valid_nonsyllogistic` rule). The matrix leaves that to its semantic table.
  Under `diodorean` it is `unknown`.
- **Secondary-summary flag.** It is read from the ledger `source`. S014 is
  also flagged, partially, because its notes say Chrysippus's rejection
  "appears in the corpus only through Mates's summary". Notes that cite a
  Mode 2 summary only as corroboration (S003, S006–S009, S011) are not
  flagged.

### What it shows

- Of 8,384 derived searches, every redundant variant loses derivability, and
  every loss is proven by a Sugihara countermodel (`■rm`). None is only "not
  found". The added atom makes the variant fail relevance, and the RM
  soundness proof covers every candidate and view, the merging cut included.
- `not_found_within_depth`: 1,016 searches, which are the matrix's 1,016
  `UNDER` cells. Every rejection is proven.
- **The duplicated premise separates the views.** There are 8,384 derived
  searches, each with a duplicate variant:

  | View | Still derived | Lost, not found within depth 8 | Lost, proven |
  | --- | --- | --- | --- |
  | `set` | 3,038 | 0 | 0 |
  | `list` | 28 | 2,538 | 32 |
  | `multiset` | 28 | 2,688 | 32 |

  Under `set` every one is still derived, since the view forgets multiplicity.
  Under `list` and `multiset` nearly every derivation is lost. Only the
  no-themata control's losses are proven (`■base`); every other loss is only
  search-bounded, and no theorem yet covers a repeated premise. 16 of the
  `list` searches did not saturate (S004, S005, S009 and S011 under
  `toggle`). The exceptions that stay derived are all S012
  (`if p, (if p, q); p; therefore q`) under a merging cut, 28 per view. S012's
  own analysis uses `p` twice, so a second copy of `p` has work to do.

## S015 merged into S014 (2026-09-30)

Kyle's ruling: S014 and S015 were one form ("p; therefore q" with "if p, q"
held true) kept apart only because their examples come down separately.
S014 now cites Zeller n.245, which gives both examples (ἡμέρα ἔστι, φῶς ἄρα
ἔστιν and ἀναπνεῖς, ζῇς ἄρα), and keeps Zeller's main text in its notes. The
id S015 is retired, not reused. The suite has 19 items, 17 formal.

The harness was rerun with Lean 4.22.0. Dropping S015 removes one column
from `results/matrix.csv`; every other cell, including every row's fit, is
unchanged, as it must be, since the two items encoded the same argument.
Export counts change only by S015's share: 13,464 distinct searches
(107,712 run records), 7,988 derived. Of the duplicated-premise variants,
2,906 stay derived under `set`, 28 under `list` and `multiset` each (all
S012), and 30 losses per view are proven (was 32; the other two were
S015's). Mentions of S015 above this entry are the record of earlier work
and are left as they were.

## Bury's Outlines replaces Mates; quotation_only (2026-10-05)

Kyle's rulings (2026-10-02, 2026-10-05): the PH II quotations come from
Bury's Loeb volume I (1933), not Mates; short scholarly quotation does not
depend on the renewal question; a new licence status says so and the database
enforces it.

- **The status.** `quotation_only` (migration `20261005184546`). The check is
  `research_quotation_problems(source, passage, attribution, locator)`, which
  returns its reasons; `research_source_contains` is true when there are none.
  For a `quotation_only` source the whole quotation (fragments joined by
  ellipses) is at most 60 words, the attribution names author, work,
  translator and edition year, and a locator is given. The ledger's `source`
  line is the attribution. Triggers keep such a work out of `rag_corpus` in
  both directions, and `full_text` is no longer readable through the API for
  any source, so the full text cannot be exported, to the Themata Machine page
  or anywhere else. `verify_ledger.py` and the auditor's
  `repo.themata_ledger` both send whole quotations now.
- **The text.** PH Book II, pp. 151-323, from the DLI scan
  `in.ernet.dli.2015.183761`, built by the same script as Against the
  Logicians; pp. 245-259 (the cited sections) and the Greek of 146-147
  proofread against the page images. `research_sources` `937d0561`.
- **S016.** Mates prints PH II 147's example as two premisses; Bury's English
  has a conjunct ("it is day and Dion also is walking"), like M VIII 431. The
  Greek (ἀλλὰ μὴν ἡμέρα ἔστιν, ἀλλὰ καὶ Δίων περιπατεῖ) can be read either
  way, and Sextus's definition calls the extra item a superfluous premiss
  (λῆμμα παρέλκον). The earlier contrast between the two works was an artefact
  of the translation. Both the English and the Greek are now quoted; the
  encoding question stays parked until after Kyle's sign-offs.

## Wallies's Alexander stored; one ledger check (2026-10-05)

- **The text.** CAG II.1 (Wallies 1883), `research_sources` `4543eb65`:
  in APr. 17.10-25, 18.1-20, 283.12-24, 284.10-18, transcribed by hand from
  the page images. Each passage is continuous text (words divided at line ends
  rejoined) followed by a line index, so quotations check as substrings and
  locators still go to page.line; the bearing apparatus entries follow each
  passage.
- **284.** The page image puts the Stoics' themata at 284.10-18 (Wallies's
  index pointed to 284.19). The Peripatetics handed down the synthetic theorem
  as far as use required; "those from the Stoa" took it, divided it, and made
  from it their second, third and fourth thema, neglecting the useful. At
  284.13 Στοᾶς is MS B's reading, the Aldine has τοῦ, and Wallies notes that B
  confirms Zeller's conjecture. The Stoic attribution rests on B.
- **S011.** in APr. 18.14-17 names the ἀδιαφόρως περαίνοντες of "the moderns",
  but ἀδιαφόρως is the Aldine's reading (BLM διαφόρως), and the example as
  printed (φῶς, LM) is a plain first indemonstrable; aB's ἡμέρα makes the
  conclusion repeat a premiss. The disjunctive schema S011 encodes is in in
  Top. 10.7-13 (CAG II.2, 1891), not stored.
- **One check.** `themata_ledger_problems(entries)` (migration
  `20261005191145`) holds guardrail 1: corpus_ref fragments against the live
  chunk, research_ref quotations through `research_quotation_problems` with
  the entry's `source` line as attribution. `verify_ledger.py` and the
  auditor's `repo.themata_ledger` only parse the YAML and report.

## First sign-offs (2026-10-05)

Kyle signed off S001-S007, S009 and S020. The ledger records it as
`verified_by_kyle: true` with `verified_on: "2026-10-05"`; the export carries
`verified_on` and refuses a sign-off without a date.

Fixes his review asked for before sign-off, added to the ledger notes as his:
- **S008**: why DL 7.78 calls it conclusive but not syllogistic: the first
  premise asserts that the conjunction is false, which is not the negated
  conjunction the third indemonstrable requires, so it has the third's shape
  but cannot be reduced to it.
- **S010**: "valid" records the Stoic position; Cicero (Ac. II.95-96) endorses
  the form only to turn it against them through the Liar.
- **S018**: valid in form with a false premise; listed by DL among the
  insoluble arguments, and Chrysippus did not accept it, falling silent before
  the failing step (Cicero Ac. II.93, Sextus M VII.416); the three-atom chain
  stands for the series to ten; in DL 7.82 the text sits under "the Veiled",
  likely a lacuna, which the excerpt's ellipsis hides.
- **S019**: non-formal, so the Machine page showed no evidence for it. The page
  now has a section "Outside the formal suite" with each non-formal entry's
  schema, verdict, source, passage and notes, and every item's evidence panel
  shows its ledger notes.

## S011: Alexander's in Topica stored (2026-10-06)

CAG II.2 (Wallies 1891), `research_sources` `36848d34`: in Top. 10.5-14,
transcribed from the page image with the apparatus for those lines. S011 now
quotes 10.7-12, where Alexander attributes to "those from the Stoa" both the
διφορούμενοι and the ἀδιαφόρως περαίνοντες, "in which the conclusion is the
same as one of the premisses", with the example "either it is day or it is
light; but it is day; therefore it is day".

The apparatus qualifies it. ἀδιαφόρως is Prantl's emendation; every
manuscript reads διαφόρως (the same split as in APr. 18.17, where only the
Aldine has ἀδιαφόρως). ἤτοι is added in P's margin by a later hand, and ἢ is a
correction in B; A reads εἰ, "if". So the disjunctive form of the example rests
on corrections and the name on an emendation. The Stoic attribution has no
variant. This is for Kyle's sign-off of S011 and for the specialist review.
