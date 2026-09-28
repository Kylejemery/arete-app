import Stoic.Indemonstrables

/-!
# Rule shapes for the candidate themata (Phase 3)

Every candidate in `Stoic/Themata/` is a list of `Rule`s built from two
shapes, because the ledger attests or reports only two kinds of thema:

* **Contraposition** (`contrapose`), the first thema as Mates's summary
  states it (rules T06): "if two premises jointly yield a conclusion, then
  either premise combined with the negation of the conclusion yields the
  negation of the other".
* **Cut** (`cut`), the third thema. Simplicius (rules T03) says only that an
  analysis "which takes the conclusion and adds another premise is completed
  according to what the Stoics call the third thema". Zeller's gloss and
  Mates's summary (T06) state it as a rule, differently. Both are cut: an
  argument that uses a proposition as a premise is joined to an argument that
  concludes it.

Each shape has switches, and the named candidates and the generated variants
are settings of them. A rule is computable: `step` takes the arguments already
derived and returns the arguments the rule licenses, so Phase 4 can search
forward with the same definitions the proofs use.

Conventions:

* Premise index 0 is the major premise (the base system lists it first, as DL
  does in every example).
* Contradictories use `Params.contra`, so the first thema's "negation" is read
  as the indemonstrables' "contradictory" (rules T06 notes the difference).
* A rule's output is compared with the argument it licenses under
  `Params.view`, exactly as the base cases are (`Rule.toThema`).
-/

namespace Stoic

/-- A thema as a computable forward step. -/
structure Rule where
  name : String
  /-- The switch settings that define the rule, e.g. `cut[two,first]`. Named
  rules keep the shape of the setting they use, so two candidates with the
  same shapes are the same rule set. -/
  shape : String
  /-- Returns the arguments licensed by the given, already derived, arguments,
  in the order the rule reads them. Wrong shapes return `[]`. -/
  step : Params → List Argument → List Argument
  /-- The rule states shared premises once (the merging cut). Such rules can
  contract, so the relevance invariant in `Soundness.lean` is not claimed for
  them. -/
  merging : Bool := false

/-- The thema a rule defines: `b` is licensed if some output of the step has
`b`'s conclusion and, under the premise view, `b`'s premises. -/
def Rule.toThema (r : Rule) : Thema where
  name := r.name
  apply P as b := ∃ b' ∈ r.step P as,
    b'.conclusion = b.conclusion ∧ P.view.Equiv b'.premises b.premises

/-! ## Switches -/

/-- How many premises the argument a rule rewrites must have. -/
inductive Arity where
  /-- Exactly two, as both Mates's first and third themata are stated. -/
  | two
  /-- Any number from one. -/
  | any
  deriving DecidableEq, Repr

def Arity.label : Arity → String
  | .two => "two"
  | .any => "any"

def Arity.ok : Arity → Nat → Bool
  | .two, n => n == 2
  | .any, n => n ≥ 1

/-- Which premise the first thema may contrapose. -/
inductive Which where
  /-- Either premise ("either premise combined with…", T06). -/
  | either
  /-- Only a minor premise (index > 0). Turns a first indemonstrable into a
  second. -/
  | minor
  /-- Only the major premise (index 0). -/
  | major
  deriving DecidableEq, Repr

def Which.label : Which → String
  | .either => "either"
  | .minor => "minor"
  | .major => "major"

def Which.ok : Which → Nat → Bool
  | .either, _ => true
  | .minor, i => i != 0
  | .major, i => i == 0

/-- Where the cut proposition may stand among the premises of the argument
that uses it. -/
inductive Position where
  /-- First: Simplicius's analysis "takes the conclusion and adds another
  premise". -/
  | first
  /-- Anywhere: Mates's "yield one of those premises". -/
  | any
  deriving DecidableEq, Repr

def Position.label : Position → String
  | .first => "first"
  | .any => "any"

def Position.ok : Position → Nat → Bool
  | .first, i => i == 0
  | .any, _ => true

/-! ## Contraposition (first thema) -/

/-- From `ps ⊢ c`, for each allowed premise `ps[i]`: the other premises and
the contradictory of `c` yield the contradictory of `ps[i]`. The contradictory
of the conclusion is placed last, after the premise kept ("either premise
combined with the negation of the conclusion"). -/
def contraposeStep (w : Which) (ar : Arity) (P : Params) : List Argument → List Argument
  | [⟨ps, c⟩] =>
    if ar.ok ps.length then
      (List.range ps.length).filterMap fun i =>
        match ps[i]? with
        | some x =>
          if w.ok i then
            some ⟨ps.eraseIdx i ++ [contradictory P.contra c], contradictory P.contra x⟩
          else none
        | none => none
    else []
  | _ => []

def contrapose (w : Which) (ar : Arity) : Rule :=
  let shape := s!"contrapose[{w.label},{ar.label}]"
  { name := shape, shape, step := contraposeStep w ar }

/-! ## Cut (third thema) -/

/-- Cut. Given a lemma `gs ⊢ c` and a user `qs ⊢ d` in which `c` stands at an
allowed position `i`, the lemma's premises replace `c` in place:
`qs[..i] ++ gs ++ qs[i+1..] ⊢ d`. The user argument's premise count is
checked with `userAr`.

With `merge`, a premise of the user that is already among the lemma's
premises is not repeated. This is one reading of the dialectical theorem
(rules T05): a conclusion reached in the analysis is "treated as implicitly
present among the premises", so the premises it came from are not stated a
second time. -/
def cutStep (userAr : Arity) (pos : Position) (merge : Bool) (_ : Params) :
    List Argument → List Argument
  | [⟨gs, c⟩, ⟨qs, d⟩] =>
    if userAr.ok qs.length then
      (List.range qs.length).filterMap fun i =>
        if qs[i]? = some c ∧ pos.ok i then
          let keep := fun (xs : List Formula) => if merge then xs.filter (· ∉ gs) else xs
          some ⟨keep (qs.take i) ++ gs ++ keep (qs.drop (i + 1)), d⟩
        else none
    else []
  | _ => []

/-- Cut does not depend on the parameters. -/
theorem cutStep_params (userAr : Arity) (pos : Position) (merge : Bool) (P : Params) :
    cutStep userAr pos merge P = cutStep userAr pos merge {} := rfl

def cut (userAr : Arity) (pos : Position) (merge : Bool) : Rule :=
  let shape := s!"cut[{userAr.label},{pos.label}{if merge then ",merge" else ""}]"
  { name := shape, shape, step := cutStep userAr pos merge, merging := merge }

/-! ## Candidates -/

inductive Provenance where
  /-- Stated in an ancient text in the corpus (rules `status: attested`). -/
  | attested
  /-- A modern reconstruction in the corpus, one module per author. -/
  | reconstruction
  /-- Produced mechanically from the rule switches (`Generated.lean`). -/
  | generated
  deriving DecidableEq, Repr

def Provenance.label : Provenance → String
  | .attested => "attested"
  | .reconstruction => "reconstruction"
  | .generated => "generated"

/-- A candidate rule set: what Phase 4 runs against the suite. -/
structure Candidate where
  name : String
  provenance : Provenance
  /-- Ledger ids and the reading taken, or the generating settings. -/
  source : String
  rules : List Rule

def Candidate.themata (c : Candidate) : List Thema := c.rules.map Rule.toThema

/-- A candidate derives an argument under a setting and background theory. -/
abbrev Candidate.Derives (c : Candidate) (P : Params) (T : Theory) (a : Argument) : Prop :=
  Stoic.Derives P T c.themata a

/-- Apply a candidate's rule to derived arguments, as a derivation step. -/
theorem Candidate.derives_rule {c : Candidate} {P : Params} {T : Theory} {r : Rule}
    (hr : r ∈ c.rules) {as : List Argument} (has : ∀ a ∈ as, c.Derives P T a)
    {b : Argument} (hb : b ∈ r.step P as) : c.Derives P T b :=
  .thema r.toThema (List.mem_map_of_mem hr) has
    ⟨b, hb, rfl, PremiseView.Equiv.refl _ _⟩

end Stoic
