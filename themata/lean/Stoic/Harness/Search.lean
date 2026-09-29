import Std.Data.HashSet
import Stoic.FirstThema
import Stoic.Harness.Suite

/-!
# Bounded proof search (Phase 4)

Forward search for a derivation of one item, by one candidate, under one
setting. It uses the candidates' own `Rule.step` functions, so it searches the
system the proofs are about.

**Bounds.** A search that fails proves nothing, and the matrix says so. The
bounds are:

* **Formulas**: every formula in a searched argument lies in the item's
  *universe*: the subformulas of its premises, its conclusion and its
  background theory, and their contradictories. A derivation that passes
  through any other formula is not explored.
* **Premises**: at most one more than the item has. Contraposition keeps the
  premise count and plain cut never lowers it, so for candidates without the
  merging cut this bound loses nothing. The merging cut can lower it, hence
  the one spare.
* **Depth**: rounds of rule application after the base cases.
* **Size**: the search stops if it holds more than `maxSize` arguments, and
  the result is marked truncated.

**Premise views.** A derived argument stands for its whole view class, so the
search stores each argument with its variants: all orderings under
`multiset`, and all orderings of the premises without repeats under `set`
(so intermediate arguments never carry a repeated premise under `set`; the
goal is still matched with repeats allowed). The goal is matched under the
view, exactly as `Derives.base` does.

If the frontier empties before the depth runs out, the search `saturated`:
nothing more is derivable within the formula and premise bounds. That is
still not a proof of underivability, because the bounds are not proved
complete.
-/

namespace Stoic.Harness

open Formula

def subformulas : Formula → List Formula
  | f@(.atom _) => [f]
  | f@(.neg p) | f@(.saidFalse p) => f :: subformulas p
  | f@(.conj p q) | f@(.disj p q) | f@(.cond p q) => f :: (subformulas p ++ subformulas q)

def formulaUniverse (m : Contradictory) (g : Argument) (T : Theory) : List Formula :=
  let s := ((g.conclusion :: g.premises) ++ T).flatMap subformulas |>.eraseDups
  (s ++ s.map (contradictory m)).eraseDups

/-- Base instances whose major premise is in the universe, and Antipater's
single-premise arguments from the theory when the policy admits them. Each is
labelled with the `Indemonstrable` or `Base` constructor it instantiates. -/
def labeledBaseInstances (P : Params) (T : Theory) (W : List Formula) : List (String × Argument) :=
  let m := P.contra
  let ind := W.flatMap fun p => W.flatMap fun q =>
    (if W.contains (cond p q) then
      [("first", ⟨[cond p q, p], q⟩), ("second", ⟨[cond p q, contradictory m q], contradictory m p⟩)] else []) ++
    (if W.contains (neg (conj p q)) then
      [("thirdL", ⟨[neg (conj p q), p], contradictory m q⟩),
       ("thirdR", ⟨[neg (conj p q), q], contradictory m p⟩)] else []) ++
    (if W.contains (disj p q) then
      [("fourthL", ⟨[disj p q, p], contradictory m q⟩), ("fourthR", ⟨[disj p q, q], contradictory m p⟩),
       ("fifthL", ⟨[disj p q, contradictory m p], q⟩), ("fifthR", ⟨[disj p q, contradictory m q], p⟩)] else [])
  let mono := if P.single == .antipater then
      T.filterMap fun t => match t with
        | .cond p q => some ("monolemmatic", ⟨[p], q⟩)
        | _ => none
    else []
  ind ++ mono

def baseInstances (P : Params) (T : Theory) (W : List Formula) : List Argument :=
  (labeledBaseInstances P T W).map (·.2)

partial def perms : List Formula → List (List Formula)
  | [] => [[]]
  | xs => xs.eraseDups.flatMap fun x => (perms (xs.erase x)).map (x :: ·)

def variants (v : PremiseView) (a : Argument) : List Argument :=
  match v with
  | .list => [a]
  | .multiset => (perms a.premises).map (⟨·, a.conclusion⟩)
  | .set => (perms a.premises.eraseDups).map (⟨·, a.conclusion⟩)

def viewEq : PremiseView → List Formula → List Formula → Bool
  | .list, xs, ys => xs == ys
  | .multiset, xs, ys => xs.isPerm ys
  | .set, xs, ys => xs.all ys.contains && ys.all xs.contains

def goalMatches (P : Params) (g b : Argument) : Bool :=
  b.conclusion == g.conclusion && viewEq P.view b.premises g.premises

structure Bounds where
  depth : Nat := 4
  maxSize : Nat := 20000
  deriving Repr

inductive Outcome where
  /-- Derived, at this depth (0: a base case). -/
  | derived (depth : Nat)
  /-- Not found. `saturated`: the frontier emptied within the bounds;
  `truncated`: the size bound was hit. -/
  | notFound (depth : Nat) (saturated truncated : Bool)
  deriving Repr, BEq

/-- How the search first reached an argument. The argument itself is a view
variant (a reordering, under `multiset` or `set`) of the argument named here,
or that argument itself. -/
inductive Origin where
  /-- A base instance, with the constructor it instantiates. -/
  | base (label : String) (inst : Argument)
  /-- The output of a rule applied to arguments already known, in the order
  the rule read them. -/
  | rule (name : String) (inputs : List Argument) (out : Argument)
  deriving Repr

/-- The search, with a record of how each argument was first reached, and the
argument that matched the goal when it was derived. `search` is this without
the record, so the matrix and the export run the same code. -/
def searchTrace (P : Params) (T : Theory) (rules : List Rule) (g : Argument) (b : Bounds) :
    Outcome × Option Argument × Std.HashMap Argument Origin := Id.run do
  let W := formulaUniverse P.contra g T
  let Wset : Std.HashSet Formula := Std.HashSet.ofList W
  let cap := g.premises.length + 1
  let ok := fun (a : Argument) =>
    a.premises.length ≤ cap && !a.premises.isEmpty &&
      Wset.contains a.conclusion && a.premises.all Wset.contains
  let mut known : Std.HashSet Argument := {}
  let mut origin : Std.HashMap Argument Origin := {}
  let mut all : Array Argument := #[]
  let mut frontier : Array Argument := #[]
  for (lbl, a) in labeledBaseInstances P T W do
    for x in variants P.view a do
      if ok x && !known.contains x then
        known := known.insert x
        origin := origin.insert x (.base lbl a)
        all := all.push x
        frontier := frontier.push x
  if let some hit := all.find? (goalMatches P g) then return (.derived 0, some hit, origin)
  for d in [1:b.depth + 1] do
    let mut next : Array Argument := #[]
    for r in rules do
      let mut outs : Array (Argument × List Argument) := #[]
      for a in frontier do
        outs := outs ++ ((r.step P [a]).map (·, [a])).toArray
        for c in all do
          outs := outs ++ ((r.step P [a, c]).map (·, [a, c])).toArray
          outs := outs ++ ((r.step P [c, a]).map (·, [c, a])).toArray
      for (o, ins) in outs do
        for x in variants P.view o do
          if ok x && !known.contains x then
            known := known.insert x
            origin := origin.insert x (.rule r.name ins o)
            next := next.push x
    if let some hit := next.find? (goalMatches P g) then return (.derived d, some hit, origin)
    if next.isEmpty then return (.notFound d true false, none, origin)
    all := all ++ next
    frontier := next
    if all.size > b.maxSize then return (.notFound d false true, none, origin)
  return (.notFound b.depth false false, none, origin)

def search (P : Params) (T : Theory) (rules : List Rule) (g : Argument) (b : Bounds) : Outcome :=
  (searchTrace P T rules g b).1

/-! ## Proofs of underivability the harness may cite -/

/-- All valuations of the given atoms (others false), for `ev`. -/
def valuations : List Nat → List (Nat → Bool)
  | [] => [fun _ => false]
  | n :: ns => (valuations ns).flatMap fun v =>
      [fun k => if k = n then true else v k, fun k => if k = n then false else v k]

/-- The theory a countermodel must respect. Under Chrysippus's policy the
theory is idle and dropped (`Derives.drop_theory`). -/
def effectiveTheory (P : Params) (i : Item) : Theory :=
  if P.single == .chrysippus then [] else i.theory

def itemAtoms (i : Item) : List Nat :=
  ((i.arg.conclusion :: i.arg.premises) ++ i.theory).flatMap Formula.atoms |>.eraseDups

/-- A Philonian countermodel: theory and premises true, conclusion false.
By `underivable_of_countermodel` (or its Chrysippus form), no Phase 3
candidate derives the item under the setting. -/
def countermodel? (P : Params) (i : Item) : Option (Nat → Bool) :=
  let T := effectiveTheory P i
  (valuations (itemAtoms i)).find? fun v =>
    T.all (ev v) && i.arg.premises.all (ev v) && !ev v i.arg.conclusion

/-- Sugihara valuations of the given atoms over `-2 … 2` (others 0). -/
def intValuations : List Nat → List (Nat → Int)
  | [] => [fun _ => 0]
  | n :: ns => (intValuations ns).flatMap fun v =>
      [-2, -1, 0, 1, 2].map fun (x : Int) => fun k => if k = n then x else v k

/-- The interpretations of asserted falsity tried: negation and identity. -/
def sigmas : List (Int → Int) := [fun x => -x, id]

/-- A Sugihara countermodel: theory designated, fusion of the premises above
the conclusion. By `underivable_of_sugihara` (or its Chrysippus form), no
Phase 3 candidate derives the item under the setting. -/
def sugiharaCountermodel (P : Params) (i : Item) : Bool :=
  let T := effectiveTheory P i
  sigmas.any fun σ => (intValuations (itemAtoms i)).any fun v =>
    T.all (fun t => decide (0 ≤ sv σ v t)) &&
      decide (sv σ v i.arg.conclusion < fusL (i.arg.premises.map (sv σ v)))

/-! ## Proofs of undergeneration the harness may cite -/

def natValuations : List Nat → List (Nat → Nat)
  | [] => [fun _ => 0]
  | n :: ns => (natValuations ns).flatMap fun v =>
      [0, 1, 2].map fun (x : Nat) => fun k => if k = n then x else v k

/-- Why a required item is provably not derived by this candidate under this
setting, if one of the undergeneration theorems applies. -/
def underProof (c : Candidate) (P : Params) (i : Item) : Option String :=
  let T := effectiveTheory P i
  let lean := P.view != .set && (P.single == .chrysippus || i.theory.isEmpty)
  if P.contra == .negate && (natValuations (itemAtoms i)).any (fun v =>
      T.all (fun t => gv v t == 2) &&
        decide (gv v i.arg.conclusion < meetL (i.arg.premises.map (gv v)))) then
    some "g3"
  else if (P.single == .chrysippus || i.theory.isEmpty) && c.rules.all (·.isCut) &&
      i.arg == ⟨[.cond p₀ p₁, .cond p₀ (.neg p₁)], .neg p₀⟩ then some "cl"
  else if lean && c.rules.all (!·.isCut) && i.arg.premises.length != 2 then some "2"
  else if lean && c.rules.all (!·.merging) && (itemAtoms i).any (slots i.arg · == 1) then some "rel"
  else none

end Stoic.Harness
