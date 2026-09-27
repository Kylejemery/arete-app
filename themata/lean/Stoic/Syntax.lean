/-!
# Stoic object language

Stoic propositional logic as its own syntax. Lean's `Prop` connectives are
classical and monotonic, so they are never used as the logic. They appear
only in the metatheory, when we state what is and is not derivable.

The connectives are the ones the five indemonstrables need
(`evidence/rules.yaml` C01–C06), plus one operator that Phase 1 showed is
required:

* `neg`: Stoic negation, prefixed to the whole proposition ("not: it is day").
* `conj`: coupled proposition, "both p and q" (C05).
* `disj`: disjunction, which is **exclusive**: exactly one disjunct is true
  (C04).
* `cond`: conditional, "if p, q". Its truth conditions are a parameter
  (`Params.CondReading`, rules C01–C03).
* `saidFalse`: "'p' is false". Diogenes Laertius 7.78 counts "'It is both
  day and night' is false; it is day; therefore it is not night" as
  conclusive but *not* syllogistic (suite S008), so asserting falsity must
  not be the same syntax as negation, or the third indemonstrable would apply
  to it. Semantically it is negation.

The inferential ("since"), causal ("because") and comparative connectives
(rules C07) are left out on purpose. No indemonstrable uses them.
-/

namespace Stoic

inductive Formula where
  | atom (n : Nat)
  | neg (p : Formula)
  | conj (p q : Formula)
  | disj (p q : Formula)
  | cond (p q : Formula)
  | saidFalse (p : Formula)
  deriving DecidableEq, Repr, Inhabited

namespace Formula

/-- Atoms occurring in a formula, left to right, with repeats. -/
def atoms : Formula → List Nat
  | atom n => [n]
  | neg p | saidFalse p => atoms p
  | conj p q | disj p q | cond p q => atoms p ++ atoms q

/-- The forms a major premise (τροπικόν) of an indemonstrable can take: a
conditional, a negated conjunction, or a disjunction. -/
def IsMajor : Formula → Prop
  | cond _ _ => True
  | neg (conj _ _) => True
  | disj _ _ => True
  | _ => False

theorem cond_ne_left (p q : Formula) : cond p q ≠ p := by
  intro h; have := congrArg sizeOf h; simp at this; omega

end Formula

/-- Numbered atoms, the Stoics' "the first", "the second" (DL 7.76). -/
abbrev p₀ : Formula := .atom 0
abbrev p₁ : Formula := .atom 1
abbrev p₂ : Formula := .atom 2

end Stoic
