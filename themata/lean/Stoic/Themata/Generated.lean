import Stoic.Themata.Attested
import Stoic.Themata.Mates

/-!
# Generated variants

Systematic loosening and tightening of the two rule shapes (brief, Phase 3
item 3). Every candidate is one setting of each switch in `Rules.lean`:

| Switch | Values | Loosens → tightens |
| --- | --- | --- |
| first thema | absent, or `contrapose[which, arity]` | |
| · which premise | `either`, `minor`, `major` | either → one side |
| · arity | `any`, `two` | any count → Mates's two |
| third thema | absent, or `cut[userArity, position, merge]` | |
| · userArity | `any`, `two` | any count → two (Simplicius, Mates) |
| · position | `any`, `first` | Mates → Simplicius |
| · merge | `true`, `false` | shared premises stated once → repeated |

That is 7 first-thema settings times 9 third-thema settings: 63
candidates, including the empty set (base cases only, the control). No
switch value is chosen by hand for a candidate; `generated` is the full
product, in the order above. Several coincide with a named candidate
(`Attested`, `Mates`); the log (`results/candidates.md`, from `Log.lean`)
marks which.

Not generated, and why:

* No rule that adds a premise to an argument (weakening). The brief rules
  it out: redundancy must stay able to invalidate.
* No second or fourth thema of new shape. The ledger reports none, and T04
  (the synthetic theorem as their source) is pending.
-/

namespace Stoic.Themata

def firstSettings : List (Option (Which × Arity)) :=
  none :: ([Which.either, .minor, .major].flatMap fun w => [Arity.any, .two].map fun a => some (w, a))

def thirdSettings : List (Option (Arity × Position × Bool)) :=
  none :: ([Arity.any, .two].flatMap fun a =>
    [Position.any, .first].flatMap fun p => [true, false].map fun m => some (a, p, m))

def settingName : Option (Which × Arity) → Option (Arity × Position × Bool) → String
  | f, t =>
    let fs := match f with
      | none => "no first"
      | some (w, a) => (contrapose w a).name
    let ts := match t with
      | none => "no third"
      | some (a, p, m) => (cut a p m).name
    s!"{fs} + {ts}"

def generated : List Candidate :=
  firstSettings.flatMap fun f => thirdSettings.map fun t =>
    { name := settingName f t
      provenance := .generated
      source := "product of the Generated.lean switches"
      rules := (f.map fun (w, a) => contrapose w a).toList ++
               (t.map fun (a, p, m) => cut a p m).toList }

/-- Every candidate for Phase 4: the named ones, then the generated ones. -/
def candidates : List Candidate := [attested, mates, matesDT] ++ generated

end Stoic.Themata
