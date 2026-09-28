import Stoic.Themata.Generated
import Stoic.Semantics

/-!
# Phase 3 tests

These check that each candidate's rules do what their module says, and that
no rule shape is unsound on the base cases. They do not evaluate candidates
against the suite: that is Phase 4. Where a result below touches a suite item
(S012, S013), it is a sanity check of the encoding, not a finding.
-/

namespace Stoic.Themata.Tests

open Formula

/-! ## Each rule, one step -/

/-- The third thema completes Simplicius's analysis: S013, "if (p and q), r;
not r; p; therefore not q", is a second indemonstrable whose conclusion,
with the further premise p, makes a third. Derivable under `Attested`, for
every setting and background theory. From the base cases alone it is not
(three distinct premises). -/
theorem S013_attested (P : Params) (T : Theory) :
    attested.Derives P T ⟨[cond (conj p₀ p₁) p₂, neg p₂, p₀], neg p₁⟩ := by
  refine Candidate.derives_rule (r := thirdSimplicius) (by simp [attested])
    (as := [⟨[cond (conj p₀ p₁) p₂, neg p₂], neg (conj p₀ p₁)⟩, ⟨[neg (conj p₀ p₁), p₀], neg p₁⟩])
    ?_ (by simp only [thirdSimplicius, cut, cutStep_params]; decide)
  intro a ha
  simp only [List.mem_cons, List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl
  · exact second_derivable P T _ (conj p₀ p₁) p₂
  · exact third_derivable P T _ p₀ p₁

theorem S013_not_base (P : Params) (T : Theory) :
    ¬ Derives P T [] ⟨[cond (conj p₀ p₁) p₂, neg p₂, p₀], neg p₁⟩ :=
  not_derives_three_distinct (a := cond (conj p₀ p₁) p₂) (b := neg p₂) (d := p₀)
    (by simp) (by simp) (by simp) (by decide) (by decide) (by decide)

/-- S012, "if p, (if p, q); p; therefore q", chains two first
indemonstrables that share the premise p. The merging cut (Mates's
dialectical theorem, our reading) states p once, so S012 is derivable under
`Mates + dialectical theorem`. -/
theorem S012_matesDT (P : Params) (T : Theory) :
    matesDT.Derives P T ⟨[cond p₀ (cond p₀ p₁), p₀], p₁⟩ := by
  refine Candidate.derives_rule (r := dialecticalTheorem) (by simp [matesDT])
    (as := [⟨[cond p₀ (cond p₀ p₁), p₀], cond p₀ p₁⟩, ⟨[cond p₀ p₁, p₀], p₁⟩])
    ?_ (by simp only [dialecticalTheorem, cut, cutStep_params]; decide)
  intro a ha
  simp only [List.mem_cons, List.not_mem_nil, or_false] at ha
  rcases ha with rfl | rfl
  · exact first_derivable P T _ p₀ (cond p₀ p₁)
  · exact first_derivable P T _ p₀ p₁

-- The plain cut on the same two arguments repeats p. Whether that argument
-- is S012 depends on the premise view: under `set` it is.
#guard (cutStep .two .first false {} [⟨[cond p₀ (cond p₀ p₁), p₀], cond p₀ p₁⟩, ⟨[cond p₀ p₁, p₀], p₁⟩])
  == [⟨[cond p₀ (cond p₀ p₁), p₀, p₀], p₁⟩]

-- Mates's first thema on a first indemonstrable: contraposing the minor
-- premise gives the second indemonstrable, contraposing the major gives
-- "p; not q; therefore not (if p, q)".
#guard (contraposeStep .either .two {} [⟨[cond p₀ p₁, p₀], p₁⟩])
  == [⟨[p₀, neg p₁], neg (cond p₀ p₁)⟩, ⟨[cond p₀ p₁, neg p₁], neg p₀⟩]

-- Under the `negate` contradictory, contraposing a second indemonstrable
-- gives double negations rather than the first indemonstrable back.
#guard (contraposeStep .minor .two { contra := .negate } [⟨[cond p₀ p₁, neg p₁], neg p₀⟩])
  == [⟨[cond p₀ p₁, neg (neg p₀)], neg (neg p₁)⟩]
#guard (contraposeStep .minor .two {} [⟨[cond p₀ p₁, neg p₁], neg p₀⟩])
  == [⟨[cond p₀ p₁, p₀], p₁⟩]

-- Switches: Simplicius's position (first) against Mates's (any).
#guard (cutStep .two .first false {} [⟨[p₂], p₀⟩, ⟨[cond p₀ p₁, p₀], p₁⟩]) == []
#guard (cutStep .two .any false {} [⟨[p₂], p₀⟩, ⟨[cond p₀ p₁, p₀], p₁⟩])
  == [⟨[cond p₀ p₁, p₂], p₁⟩]
-- Arity: the user argument must have two premises unless `any`.
#guard (cutStep .two .any false {} [⟨[p₂], p₀⟩, ⟨[p₀], p₁⟩]) == []
#guard (cutStep .any .any false {} [⟨[p₂], p₀⟩, ⟨[p₀], p₁⟩]) == [⟨[p₂], p₁⟩]

/-! ## The candidate list -/

#guard generated.length = 63
#guard candidates.length = 66
-- The control: exactly one generated candidate has no rules.
#guard (generated.filter (·.rules.isEmpty)).length = 1
-- `Attested` and `Mates` coincide with generated settings; `Mates + DT`
-- does not (it has two cuts).
def shapes (c : Candidate) : List String := c.rules.map (·.shape)
#guard generated.any (shapes · == shapes attested)
#guard generated.any (shapes · == shapes mates)
#guard !generated.any (shapes · == shapes matesDT)

/-! ## Soundness of every rule shape on the base cases

Every output of every rule, applied to base instances over three atoms (and a
negated atom, to exercise the contradictory), is valid by the criterion
(DL 7.77) under the Philonian reading, for both readings of the
contradictory. A rule that fails this would derive an invalid argument from
indemonstrables in one step. -/

def terms : List Formula := [p₀, p₁, p₂, neg p₀]

def baseInstances (m : Contradictory) : List Argument :=
  terms.flatMap fun p => (terms.filter (· ≠ p)).flatMap fun q =>
    [ ⟨[cond p q, p], q⟩,
      ⟨[cond p q, contradictory m q], contradictory m p⟩,
      ⟨[neg (conj p q), p], contradictory m q⟩,
      ⟨[neg (conj p q), q], contradictory m p⟩,
      ⟨[disj p q, p], contradictory m q⟩,
      ⟨[disj p q, q], contradictory m p⟩,
      ⟨[disj p q, contradictory m p], q⟩,
      ⟨[disj p q, contradictory m q], p⟩ ]

def allRules : List Rule :=
  ([Which.either, .minor, .major].flatMap fun w => [Arity.any, .two].map fun a => contrapose w a) ++
  ([Arity.any, .two].flatMap fun a => [Position.any, .first].flatMap fun p =>
    [true, false].map fun m => cut a p m)

def soundOnBase (m : Contradictory) : Bool :=
  let P : Params := { cond := .philonian, contra := m }
  let bs := baseInstances m
  let inputs := bs.map (fun a => [a]) ++ bs.flatMap fun a => bs.map fun b => [a, b]
  allRules.all fun r => inputs.all fun as =>
    (r.step P as).all fun out => criterionValid P out == some true

#guard soundOnBase .toggle
#guard soundOnBase .negate

end Stoic.Themata.Tests
