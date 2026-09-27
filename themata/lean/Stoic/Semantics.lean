import Stoic.Argument

/-!
# Semantics: the validity criterion and redundancy

DL 7.77 (rules C08): an argument is conclusive iff "the contradictory of the
conclusion is incompatible with combination of the premisses". That needs
truth conditions for the connectives, and the conditional's depend on
`Params.cond`:

* A model is a finite list of valuations `W` (moments, or worlds) and a
  position `t` in it.
* Philonian `if p, q` looks only at `t`. Diodorean looks at `t` and every
  later moment. Chrysippean looks at every member of `W`, which is Mates's
  strict-implication reading (rules C02). Containment is Chrysippean plus
  "antecedent differs from consequent", a placeholder (see `Params`).
* Disjunction is exclusive (C04). `saidFalse` means the same as `neg`.

The checks are decision procedures over finitely many models, run by
evaluation (`#guard` in `Tests.lean`), not kernel proofs. They answer
`none` where Phase 2 has no complete procedure: under the Diodorean
reading (validity would range over timelines of every length), and for
the world-quantifying readings when an argument has more than four atoms.
Phase 4 turns these into "proven underivable" certificates where it can.
-/

namespace Stoic

abbrev Val := Nat → Bool

/-- Truth of a formula at position `t` of the model `W`. -/
def holdsAt (r : CondReading) (W : List Val) : Nat → Formula → Bool
  | t, .atom n => (W.getD t (fun _ => false)) n
  | t, .neg p => !holdsAt r W t p
  | t, .saidFalse p => !holdsAt r W t p
  | t, .conj p q => holdsAt r W t p && holdsAt r W t q
  | t, .disj p q => holdsAt r W t p != holdsAt r W t q
  | t, .cond p q =>
    let ok := fun s => !(holdsAt r W s p) || holdsAt r W s q
    match r with
    | .philonian => ok t
    | .diodorean => (List.range W.length).all fun s => decide (s < t) || ok s
    | .chrysippean => (List.range W.length).all ok
    | .containment => decide (p ≠ q) && (List.range W.length).all ok

/-- Every valuation of the given atoms (others false). -/
def allVals : List Nat → List Val
  | [] => [fun _ => false]
  | n :: ns => (allVals ns).flatMap fun v =>
      [fun k => if k = n then true else v k, fun k => if k = n then false else v k]

/-- All sublists (subsets, as lists). -/
def subsets {α : Type} : List α → List (List α)
  | [] => [[]]
  | x :: xs => (subsets xs).flatMap fun s => [x :: s, s]

def Argument.atoms (a : Argument) : List Nat :=
  ((a.conclusion :: a.premises).flatMap Formula.atoms).eraseDups

/-- The models a validity check must range over, or `none` if Phase 2 has no
complete finite procedure for this reading and size. -/
def models (r : CondReading) (as : List Nat) : Option (List (List Val × Nat)) :=
  match r with
  | .philonian => some ((allVals as).map fun v => ([v], 0))
  | .diodorean => none
  | .chrysippean | .containment =>
    if as.length ≤ 4 then
      some ((subsets (allVals as)).flatMap fun W => (List.range W.length).map fun t => (W, t))
    else none

/-- DL 7.77: no model makes every premise true and the conclusion false. -/
def criterionValid (P : Params) (a : Argument) : Option Bool :=
  (models P.cond a.atoms).map fun ms => ms.all fun (W, t) =>
    !(a.premises.all (holdsAt P.cond W t ·) && !holdsAt P.cond W t a.conclusion)

/-- The conclusion is one of the premises: a duplicated or indifferently
concluding argument (suite S009, S011). -/
def Argument.indifferentlyConcluding (a : Argument) : Bool :=
  a.premises.contains a.conclusion

/-- Premise `i` is idle if the argument without it is still valid. -/
def idle (P : Params) (a : Argument) (i : Nat) : Option Bool :=
  criterionValid P ⟨a.premises.eraseIdx i, a.conclusion⟩

/-- Redundancy under `P.redundancy` (finding F1). -/
def redundant (P : Params) (a : Argument) : Option Bool := do
  let idles ← (List.range a.premises.length).mapM (idle P a)
  let anyIdle := idles.any id
  pure <| match P.redundancy with
    | .strict => anyIdle
    | .narrow => anyIdle && !a.indifferentlyConcluding

/-- Valid in the Stoic sense: conclusive by the criterion and not redundant.
Syllogistic validity (derivability) is separate. See `Indemonstrables`. -/
def stoicValid (P : Params) (a : Argument) : Option Bool := do
  let v ← criterionValid P a
  let r ← redundant P a
  pure (v && !r)

end Stoic
