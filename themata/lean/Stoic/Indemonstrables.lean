import Stoic.Argument

/-!
# The indemonstrables and derivability

`Indemonstrable m a`: `a` is one of Chrysippus's five indemonstrables (DL
7.80–81, suite S001–S005), with "the contradictory" read according to `m`.

The third, fourth and fifth are stated with the minor premise on either side
("one of the conjoined propositions", "one of the two alternatives"), because
DL does not fix which conjunct or disjunct comes first. The major premise is
always listed first, as in every example DL gives. Whether that order binds is
`Params.view`.

`Derives P T R a`: `a` is derivable from the base cases, closed under the
themata in `R`. Phase 2 has no themata, so `R = []` is "the base cases
alone". Phase 3 supplies candidate themata as values of `Thema`, not as new
constructors. A Lean inductive cannot be extended from another file, and one
`Derives` parameterised by the rule set lets every candidate share the base
system and the harness.
-/

namespace Stoic

inductive Indemonstrable (m : Contradictory) : Argument → Prop
  /-- If the first, the second; the first; therefore the second. -/
  | first (p q : Formula) : Indemonstrable m ⟨[.cond p q, p], q⟩
  /-- If the first, the second; not the second; therefore not the first. -/
  | second (p q : Formula) :
      Indemonstrable m ⟨[.cond p q, contradictory m q], contradictory m p⟩
  /-- Not both the first and the second; the first; therefore not the second. -/
  | thirdL (p q : Formula) :
      Indemonstrable m ⟨[.neg (.conj p q), p], contradictory m q⟩
  | thirdR (p q : Formula) :
      Indemonstrable m ⟨[.neg (.conj p q), q], contradictory m p⟩
  /-- Either the first or the second; the first; therefore not the second. -/
  | fourthL (p q : Formula) :
      Indemonstrable m ⟨[.disj p q, p], contradictory m q⟩
  | fourthR (p q : Formula) :
      Indemonstrable m ⟨[.disj p q, q], contradictory m p⟩
  /-- Either the first or the second; not the first; therefore the second. -/
  | fifthL (p q : Formula) :
      Indemonstrable m ⟨[.disj p q, contradictory m p], q⟩
  | fifthR (p q : Formula) :
      Indemonstrable m ⟨[.disj p q, contradictory m q], p⟩

/-- Background conditionals held true: the "if it is day, it is light" that
makes Antipater's "it is day; therefore it is light" an argument (suite S014).
-/
abbrev Theory := List Formula

/-- The base cases: the indemonstrables, plus Antipater's single-premise
arguments when the policy admits them. -/
inductive Base (P : Params) (T : Theory) : Argument → Prop
  | indemonstrable {a : Argument} : Indemonstrable P.contra a → Base P T a
  | monolemmatic (p q : Formula) :
      P.single = .antipater → Formula.cond p q ∈ T → Base P T ⟨[p], q⟩

/-- A thema: a rule licensing a new argument from arguments already derived.
Phase 3 defines the candidates. -/
structure Thema where
  name : String
  apply : Params → List Argument → Argument → Prop

inductive Derives (P : Params) (T : Theory) (R : List Thema) : Argument → Prop
  | base {qs ps : List Formula} {c : Formula} :
      Base P T ⟨qs, c⟩ → P.view.Equiv qs ps → Derives P T R ⟨ps, c⟩
  | thema {as : List Argument} {b : Argument} (t : Thema) :
      t ∈ R → (∀ a ∈ as, Derives P T R a) → t.apply P as b → Derives P T R b

/-! ## The five indemonstrables are derivable -/

section
variable (P : Params) (T : Theory) (R : List Thema) (p q : Formula)

theorem Derives.ofIndemonstrable {a : Argument} (h : Indemonstrable P.contra a) :
    Derives P T R a :=
  .base (qs := a.premises) (.indemonstrable h) (PremiseView.Equiv.refl _ _)

theorem first_derivable : Derives P T R ⟨[.cond p q, p], q⟩ :=
  .ofIndemonstrable P T R (.first p q)

theorem second_derivable :
    Derives P T R ⟨[.cond p q, contradictory P.contra q], contradictory P.contra p⟩ :=
  .ofIndemonstrable P T R (.second p q)

theorem third_derivable :
    Derives P T R ⟨[.neg (.conj p q), p], contradictory P.contra q⟩ :=
  .ofIndemonstrable P T R (.thirdL p q)

theorem fourth_derivable :
    Derives P T R ⟨[.disj p q, p], contradictory P.contra q⟩ :=
  .ofIndemonstrable P T R (.fourthL p q)

theorem fifth_derivable :
    Derives P T R ⟨[.disj p q, contradictory P.contra p], q⟩ :=
  .ofIndemonstrable P T R (.fifthL p q)

end

/-! ## Invariants of the base cases -/

/-- Every base argument either has exactly two premises, the first of which
is a major premise (conditional, negated conjunction or disjunction), or has
exactly one premise (Antipater). -/
theorem Base.shape {P : Params} {T : Theory} {a : Argument} (h : Base P T a) :
    (∃ M x, a.premises = [M, x] ∧ M.IsMajor) ∨ (∃ x, a.premises = [x]) := by
  cases h with
  | monolemmatic p q _ _ => exact .inr ⟨p, rfl⟩
  | indemonstrable hi =>
    left
    cases hi <;> exact ⟨_, _, rfl, trivial⟩

/-- With no themata, every derivable argument's premises are, under the view,
those of a base argument. -/
theorem Derives.base_only {P : Params} {T : Theory} {a : Argument}
    (h : Derives P T [] a) :
    ∃ qs, Base P T ⟨qs, a.conclusion⟩ ∧ P.view.Equiv qs a.premises := by
  cases h with
  | base hb he => exact ⟨_, hb, he⟩
  | thema t ht _ _ => simp at ht

/-- Base arguments have at most two premises. -/
theorem Base.length_le {P : Params} {T : Theory} {a : Argument} (h : Base P T a) :
    a.premises.length ≤ 2 := by
  rcases h.shape with ⟨M, x, hp, _⟩ | ⟨x, hp⟩ <;> simp [hp]

/-- **Redundancy, general form.** From the base cases alone, no argument with
three pairwise-distinct premises is derivable, whatever the parameters or
background theory. Adding a new premise to an indemonstrable always gives
such an argument. -/
theorem not_derives_three_distinct {P : Params} {T : Theory} {ps : List Formula}
    {c a b d : Formula} (ha : a ∈ ps) (hb : b ∈ ps) (hd : d ∈ ps)
    (hab : a ≠ b) (had : a ≠ d) (hbd : b ≠ d) :
    ¬ Derives P T [] ⟨ps, c⟩ := by
  intro h
  obtain ⟨qs, hb', he⟩ := h.base_only
  exact no_three_distinct hb'.length_le (he.mem ha) (he.mem hb) (he.mem hd) hab had hbd

/-- **Redundancy, the brief's test.** A first indemonstrable with an unrelated
extra premise, `if p, q; p; r; therefore q` (suite S016), is not derivable
from the base cases alone. -/
theorem redundant_not_derivable (P : Params) (T : Theory) (p q r : Formula)
    (hpr : p ≠ r) (hcr : Formula.cond p q ≠ r) :
    ¬ Derives P T [] ⟨[.cond p q, p, r], q⟩ :=
  not_derives_three_distinct (a := .cond p q) (b := p) (d := r)
    (by simp) (by simp) (by simp) (Formula.cond_ne_left p q) hcr hpr

/-- Two premises, neither of which can be a major premise, are never a base
argument. Used for S008. -/
theorem not_derives_two_minor {P : Params} {T : Theory} {x y c : Formula}
    (hx : ¬ x.IsMajor) (hy : ¬ y.IsMajor) (hxy : x ≠ y) :
    ¬ Derives P T [] ⟨[x, y], c⟩ := by
  intro h
  obtain ⟨qs, hb, he⟩ := h.base_only
  have mx := he.mem (x := x) (by simp)
  have my := he.mem (x := y) (by simp)
  rcases hb.shape with ⟨M, z, hq, hM⟩ | ⟨z, hq⟩
  · simp only at hq; subst hq
    simp at mx my
    rcases mx with rfl | rfl
    · exact hx hM
    · rcases my with rfl | rfl
      · exact hy hM
      · exact hxy rfl
  · simp only at hq; subst hq
    simp at mx my; exact hxy (mx.trans my.symm)

end Stoic
