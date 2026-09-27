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
