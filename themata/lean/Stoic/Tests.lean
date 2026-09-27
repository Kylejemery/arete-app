import Stoic.Indemonstrables
import Stoic.Semantics

/-!
# Phase 2 tests

Two kinds:

* `theorem`s about derivability from the base cases, which are proofs.
* `#guard`s on the semantic checks, which are evaluations of a decision
  procedure. They fail the build if the procedure disagrees with the ledger.

Suite ids refer to `evidence/suite.yaml`. Atoms: `p₀ p₁ p₂`.
-/

namespace Stoic
namespace Tests

open Formula

/-! ## The deliverable: the five indemonstrables are derivable, a redundant
argument is not -/

example (P : Params) (T : Theory) : Derives P T [] ⟨[cond p₀ p₁, p₀], p₁⟩ :=
  first_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) :
    Derives P T [] ⟨[cond p₀ p₁, contradictory P.contra p₁], contradictory P.contra p₀⟩ :=
  second_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) :
    Derives P T [] ⟨[neg (conj p₀ p₁), p₀], contradictory P.contra p₁⟩ :=
  third_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) :
    Derives P T [] ⟨[disj p₀ p₁, p₀], contradictory P.contra p₁⟩ :=
  fourth_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) :
    Derives P T [] ⟨[disj p₀ p₁, contradictory P.contra p₀], p₁⟩ :=
  fifth_derivable P T [] p₀ p₁

/-- The schematic forms of the brief, with atoms, under both readings of the
contradictory: `if p, q; not q; therefore not p`, and so on. -/
example (P : Params) (T : Theory) : Derives P T [] ⟨[cond p₀ p₁, neg p₁], neg p₀⟩ :=
  second_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) : Derives P T [] ⟨[neg (conj p₀ p₁), p₀], neg p₁⟩ :=
  third_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) : Derives P T [] ⟨[disj p₀ p₁, p₀], neg p₁⟩ :=
  fourth_derivable P T [] p₀ p₁
example (P : Params) (T : Theory) : Derives P T [] ⟨[disj p₀ p₁, neg p₀], p₁⟩ :=
  fifth_derivable P T [] p₀ p₁

/-- S016: `if p, q; p; r; therefore q` is not derivable from the base cases
alone, under every parameter setting and background theory. -/
theorem S016_not_derivable (P : Params) (T : Theory) :
    ¬ Derives P T [] ⟨[cond p₀ p₁, p₀, p₂], p₁⟩ :=
  redundant_not_derivable P T p₀ p₁ p₂ (by decide) (by decide)

/-! ## Premise multiplicity and order (`Params.view`) -/

/-- Under the set view a repeated premise collapses: `if p, q; p; p;
therefore q` is derivable. -/
theorem repeated_premise_set (P : Params) (T : Theory) (hv : P.view = .set) :
    Derives P T [] ⟨[cond p₀ p₁, p₀, p₀], p₁⟩ :=
  .base (qs := [cond p₀ p₁, p₀]) (.indemonstrable (.first p₀ p₁))
    (by rw [hv]; intro x; simp)

/-- Under the list and multiset views it is not: multiplicity matters. -/
theorem repeated_premise_not_derivable (P : Params) (T : Theory) (hv : P.view ≠ .set) :
    ¬ Derives P T [] ⟨[cond p₀ p₁, p₀, p₀], p₁⟩ := by
  intro h
  obtain ⟨qs, hb, he⟩ := h.base_only
  have h1 := he.length hv
  have h2 := hb.length_le
  simp at h1 h2; omega

/-- Under the multiset view order does not matter: minor premise first is
still a first indemonstrable. -/
theorem minor_first_multiset (P : Params) (T : Theory) (hv : P.view = .multiset) :
    Derives P T [] ⟨[p₀, cond p₀ p₁], p₁⟩ :=
  .base (qs := [cond p₀ p₁, p₀]) (.indemonstrable (.first p₀ p₁))
    (by rw [hv]; exact List.Perm.swap _ _ _)

/-- Under the list view it is not derivable: order matters. -/
theorem minor_first_list (P : Params) (T : Theory) (hv : P.view = .list) :
    ¬ Derives P T [] ⟨[p₀, cond p₀ p₁], p₁⟩ := by
  intro h
  obtain ⟨qs, hb, he⟩ := h.base_only
  rw [hv] at he; simp only [PremiseView.Equiv] at he; subst he
  rcases hb.shape with ⟨M, x, hq, hM⟩ | ⟨x, hq⟩
  · simp at hq; obtain ⟨rfl, -⟩ := hq; exact hM
  · simp at hq

/-! ## Single-premise arguments (`Params.single`, S014) -/

/-- Antipater: with "if it is day, it is light" accepted, "it is day;
therefore it is light" is derivable. -/
theorem antipater_single (P : Params) (hs : P.single = .antipater) :
    Derives P [cond p₀ p₁] [] ⟨[p₀], p₁⟩ :=
  .base (qs := [p₀]) (.monolemmatic p₀ p₁ hs (by simp)) (PremiseView.Equiv.refl _ _)

/-- Chrysippus: under the list and multiset views, no single-premise argument
is derivable, whatever the background theory. -/
theorem chrysippus_single (P : Params) (T : Theory) (hs : P.single = .chrysippus)
    (hv : P.view ≠ .set) (x c : Formula) : ¬ Derives P T [] ⟨[x], c⟩ := by
  intro h
  obtain ⟨qs, hb, he⟩ := h.base_only
  have hl := he.length hv
  cases hb with
  | monolemmatic _ _ ha _ => rw [hs] at ha; cases ha
  | indemonstrable hi => cases hi <;> simp at hl

/-! ## S008: valid but not syllogistic -/

/-- "'p and q' is false; p; therefore not q" is not derivable from the base
cases: the asserted falsity is not a negated conjunction, so no
indemonstrable applies. -/
theorem S008_not_derivable (P : Params) (T : Theory) :
    ¬ Derives P T [] ⟨[saidFalse (conj p₀ p₁), p₀], neg p₁⟩ :=
  not_derives_two_minor (fun h => h) (fun h => h) (by decide)

/-- Compare: the same argument with a negation *is* the third indemonstrable. -/
example (P : Params) (T : Theory) : Derives P T [] ⟨[neg (conj p₀ p₁), p₀], neg p₁⟩ :=
  third_derivable P T [] p₀ p₁

/-! ## The validity criterion (DL 7.77) on the formal suite

`#guard` evaluates at build time. `phil` and `chry` are the Philonian and
Chrysippean readings with defaults otherwise. -/

def phil : Params := { cond := .philonian }
def chry : Params := { cond := .chrysippean }
def philNarrow : Params := { cond := .philonian, redundancy := .narrow }
def chryNarrow : Params := { cond := .chrysippean, redundancy := .narrow }

-- The five indemonstrables are valid under both readings.
#guard criterionValid phil ⟨[cond p₀ p₁, p₀], p₁⟩ = some true
#guard criterionValid chry ⟨[cond p₀ p₁, p₀], p₁⟩ = some true
#guard criterionValid chry ⟨[cond p₀ p₁, neg p₁], neg p₀⟩ = some true
#guard criterionValid chry ⟨[neg (conj p₀ p₁), p₀], neg p₁⟩ = some true
#guard criterionValid chry ⟨[disj p₀ p₁, p₀], neg p₁⟩ = some true
#guard criterionValid chry ⟨[disj p₀ p₁, neg p₀], p₁⟩ = some true
-- The fourth needs exclusive disjunction: with inclusive "or" it would fail.
#guard criterionValid phil ⟨[disj p₀ p₁, p₀], neg p₁⟩ = some true

-- S006, S007: rejected forms are invalid.
#guard criterionValid chry ⟨[cond p₀ p₁, p₀], p₂⟩ = some false
#guard criterionValid phil ⟨[cond p₀ p₁, neg p₀], neg p₁⟩ = some false
#guard criterionValid chry ⟨[cond p₀ p₁, neg p₀], neg p₁⟩ = some false

-- S008: valid under the criterion (and not derivable: `S008_not_derivable`),
-- so it meets the valid_nonsyllogistic expectation.
#guard criterionValid phil ⟨[saidFalse (conj p₀ p₁), p₀], neg p₁⟩ = some true
#guard criterionValid chry ⟨[saidFalse (conj p₀ p₁), p₀], neg p₁⟩ = some true

-- S009, S010, S012, S013: valid.
#guard criterionValid chry ⟨[cond p₀ p₀, p₀], p₀⟩ = some true
#guard criterionValid chry ⟨[cond (conj p₀ p₁) p₂, conj p₀ p₁], p₂⟩ = some true
#guard criterionValid chry ⟨[cond p₀ (cond p₀ p₁), p₀], p₁⟩ = some true
#guard criterionValid chry ⟨[cond (conj p₀ p₁) p₂, neg p₂, p₀], neg p₁⟩ = some true

-- S018, the Sorites chain (three links): valid; its fault is in the premises.
#guard criterionValid chry
  ⟨[neg (conj p₀ (neg p₁)), neg (conj p₁ (neg p₂)), p₀], p₂⟩ = some true

-- The Diodorean reading has no complete procedure yet.
#guard criterionValid { cond := .diodorean } ⟨[cond p₀ p₁, p₀], p₁⟩ = none

/-! ## Redundancy (finding F1) -/

-- S016: redundant under both readings.
#guard redundant chry ⟨[cond p₀ p₁, p₀, p₂], p₁⟩ = some true
#guard redundant chryNarrow ⟨[cond p₀ p₁, p₀, p₂], p₁⟩ = some true
#guard stoicValid chry ⟨[cond p₀ p₁, p₀, p₂], p₁⟩ = some false
-- S001: not redundant.
#guard redundant chry ⟨[cond p₀ p₁, p₀], p₁⟩ = some false
#guard stoicValid chry ⟨[cond p₀ p₁, p₀], p₁⟩ = some true
-- S009 and S011: the conflict. Strict calls them redundant, narrow does not.
#guard redundant chry ⟨[cond p₀ p₀, p₀], p₀⟩ = some true
#guard redundant chryNarrow ⟨[cond p₀ p₀, p₀], p₀⟩ = some false
#guard redundant phil ⟨[disj p₀ p₁, p₀], p₀⟩ = some true
#guard redundant philNarrow ⟨[disj p₀ p₁, p₀], p₀⟩ = some false
#guard stoicValid philNarrow ⟨[disj p₀ p₁, p₀], p₀⟩ = some true
#guard stoicValid phil ⟨[disj p₀ p₁, p₀], p₀⟩ = some false

end Tests
end Stoic
