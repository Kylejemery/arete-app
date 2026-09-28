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
