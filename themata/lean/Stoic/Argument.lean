import Stoic.Params

/-!
# Arguments

An argument is its premises as a `List`, which keeps both order and
multiplicity, and a conclusion (DL 7.45: "a whole containing premisses and
conclusion"). Whether order or multiplicity *matter* is not decided here. It
is `Params.view`, applied when a derivation's premises are compared with an
indemonstrable's.
-/

namespace Stoic

structure Argument where
  premises : List Formula
  conclusion : Formula
  deriving DecidableEq, Repr, Hashable

/-- Premise lists that count as the same under a view. -/
def PremiseView.Equiv : PremiseView → List Formula → List Formula → Prop
  | .list, xs, ys => xs = ys
  | .multiset, xs, ys => xs.Perm ys
  | .set, xs, ys => ∀ x, x ∈ xs ↔ x ∈ ys

namespace PremiseView

theorem Equiv.refl (v : PremiseView) (xs : List Formula) : v.Equiv xs xs := by
  cases v
  · rfl
  · exact List.Perm.refl xs
  · intro x; exact Iff.rfl

/-- Every view preserves membership. -/
theorem Equiv.mem {v : PremiseView} {xs ys : List Formula} (h : v.Equiv xs ys)
    {x : Formula} (hx : x ∈ ys) : x ∈ xs := by
  cases v
  · simp only [Equiv] at h; subst h; exact hx
  · exact (List.Perm.mem_iff h).mpr hx
  · exact (h x).mpr hx

/-- The list and multiset views preserve length. The set view does not, which
is how it forgets multiplicity. -/
theorem Equiv.length {v : PremiseView} (hv : v ≠ .set) {xs ys : List Formula}
    (h : v.Equiv xs ys) : xs.length = ys.length := by
  cases v
  · simp only [Equiv] at h; subst h; rfl
  · exact List.Perm.length_eq h
  · exact absurd rfl hv

end PremiseView

/-- A list of at most two elements has no three pairwise-distinct members. -/
theorem no_three_distinct {qs : List Formula} (h : qs.length ≤ 2)
    {a b c : Formula} (ha : a ∈ qs) (hb : b ∈ qs) (hc : c ∈ qs)
    (hab : a ≠ b) (hac : a ≠ c) (hbc : b ≠ c) : False := by
  match qs, h with
  | [], _ => simp at ha
  | [x], _ =>
    simp at ha hb; exact hab (ha.trans hb.symm)
  | [x, y], _ =>
    simp at ha hb hc
    rcases ha with rfl | rfl <;> rcases hb with rfl | rfl <;>
      rcases hc with rfl | rfl <;> simp_all
  | _ :: _ :: _ :: _, h => simp at h

end Stoic
