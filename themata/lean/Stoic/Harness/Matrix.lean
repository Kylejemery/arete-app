import Stoic.Harness.Search
import Stoic.Semantics

/-!
# The evaluation matrix (Phase 4)

Every candidate × every derivation setting × every formal suite item.

**Settings.** Derivability depends only on `single`, `contra` and `view`:
`Derives` never reads `cond` or `redundancy`, which enter only the
semantics. So the matrix runs 2 × 2 × 3 = 12 derivation settings and reports
the semantic parameters in a separate table (`semanticTable`), where the
conditional reading and the two redundancy readings meet the ledger.

**Cells.**

| Cell | Meaning |
| --- | --- |
| `D0`, `D2`, … | derived at that depth, as the ledger requires |
| `OVER` + depth | derived, but the ledger rejects it: overgeneration |
| `UNDER` | not found within depth N, but the ledger requires it: undergeneration (search-bounded) |
| `UNDER■cl` | undergeneration, proven: S020 for a candidate with no first thema (`S020_needs_first_thema`, a closed-valuation countermodel) |
| `UNDER■g3`, `UNDER■2`, `UNDER■rel` | undergeneration, proven: a Gödel G₃ countermodel under `negate` (`underivable_of_goedel`), a candidate without cut facing an item that does not have two premises (`underivable_no_cut`), or an atom in one place with no merging cut (`underivable_lone_atom`) |
| `■cm` | not derived, and proven underivable: a Philonian countermodel (`underivable_of_countermodel`; under Chrysippus's policy the theory is dropped, `underivable_of_countermodel_chrysippus`) |
| `■rm` | not derived, and proven: a countermodel in the Sugihara model of the relevance logic RM (`underivable_of_sugihara`, and its Chrysippus form). Covers every candidate and view, merging cut included |
| `■2p` | not derived, and proven: under Chrysippus's policy and the `list` or `multiset` view no candidate derives an argument with fewer than two premises (`underivable_single_premise`) |
| `■rel` | not derived, and proven: some atom occurs in exactly one place, and the candidate has no merging cut; under the `list` or `multiset` view, with Chrysippus's policy or no background theory, no such candidate derives it (`underivable_lone_atom`) |
| `■base` | not derived, and proven: the candidate has no themata, so derivability is base-only (`Derives.base_only`) and the base cases were enumerated exhaustively |
| `·` | not found within depth N, as the ledger requires, but not proven. `·s`: the search saturated within its bounds |

A candidate **fits** a setting when no cell is `OVER` or `UNDER`. A fit is
**proven** only if every rejection in it is `■`.
-/

namespace Stoic.Harness

open Stoic.Themata

structure Setting where
  single : SinglePremise
  contra : Contradictory
  view : PremiseView
  deriving DecidableEq, Repr

def Setting.params (s : Setting) : Params :=
  { single := s.single, contra := s.contra, view := s.view }

def Setting.label (s : Setting) : String :=
  let a := match s.single with | .chrysippus => "chrysippus" | .antipater => "antipater"
  let b := match s.contra with | .toggle => "toggle" | .negate => "negate"
  let c := match s.view with | .list => "list" | .multiset => "multiset" | .set => "set"
  s!"{a}/{b}/{c}"

def settings : List Setting :=
  [SinglePremise.chrysippus, .antipater].flatMap fun s =>
    [Contradictory.toggle, .negate].flatMap fun m =>
      [PremiseView.list, .multiset, .set].map fun v => ⟨s, m, v⟩

/-- The Phase 2 defaults: Chrysippus, toggle, multiset. -/
def defaultSetting : Setting := ⟨.chrysippus, .toggle, .multiset⟩

inductive Cell where
  | ok (d : Nat)
  | over (d : Nat)
  | under (proof : Option String) (saturated truncated : Bool)
  | provenCountermodel
  | provenRelevanceModel
  | provenTwo
  | provenRelevance
  | provenBase
  | bounded (saturated truncated : Bool)
  deriving Repr, BEq

def Cell.label : Cell → String
  | .ok d => s!"D{d}"
  | .over d => s!"OVER{d}"
  | .under (some p) _ _ => s!"UNDER■{p}"
  | .under none _ true => "UNDER(t)"
  | .under none _ _ => "UNDER"
  | .provenCountermodel => "■cm"
  | .provenRelevanceModel => "■rm"
  | .provenTwo => "■2p"
  | .provenRelevance => "■rel"
  | .provenBase => "■base"
  | .bounded true _ => "·s"
  | .bounded _ true => "·t"
  | .bounded _ _ => "·"

def Cell.bad : Cell → Bool
  | .over _ | .under _ _ _ => true
  | _ => false

def Cell.proven : Cell → Bool
  | .ok _ | .provenCountermodel | .provenRelevanceModel | .provenTwo | .provenRelevance
  | .provenBase => true
  | _ => false

/-- Classify a search outcome. `required`: the ledger requires the item to be
derived under this setting (`Item.shouldDerive`). The proof routes are tried
in this order when it is not derived. -/
def classify (c : Candidate) (P : Params) (i : Item) (outcome : Outcome) (required : Bool) : Cell :=
  match outcome, required with
  | .derived d, true => .ok d
  | .derived d, false => .over d
  | .notFound _ sat tr, true => .under (underProof c P i) sat tr
  | .notFound _ sat tr, false =>
    if (countermodel? P i).isSome then .provenCountermodel
    else if sugiharaCountermodel P i then .provenRelevanceModel
    else if P.single == .chrysippus && P.view != .set && i.arg.premises.length < 2 then .provenTwo
    else if P.view != .set && (P.single == .chrysippus || i.theory.isEmpty) &&
        c.rules.all (!·.merging) && i.arg.atoms.any (slots i.arg · == 1) then .provenRelevance
    else if c.rules.isEmpty then .provenBase
    else .bounded sat tr

def cell (c : Candidate) (s : Setting) (i : Item) (b : Bounds) : Cell :=
  let P := s.params
  classify c P i (search P i.theory c.rules i.arg b) (i.shouldDerive P)

structure Row where
  candidate : Candidate
  setting : Setting
  cells : List (Item × Cell)

def Row.fits (r : Row) : Bool := !r.cells.any (·.2.bad)
def Row.provenFit (r : Row) : Bool := r.fits && r.cells.all (·.2.proven)

/-- Proven not to fit: some cell is an exhibited overgeneration or a proven
undergeneration. -/
def Row.provenNonFit (r : Row) : Bool :=
  r.cells.any fun (_, c) => match c with
    | .over _ | .under (some _) _ _ => true
    | _ => false

def runAll (b : Bounds) : List Row :=
  candidates.flatMap fun c => settings.map fun s =>
    { candidate := c, setting := s, cells := formalSuite.map fun i => (i, cell c s i b) }

/-! ## Semantic table -/

def condLabel : CondReading → String
  | .philonian => "philonian" | .diodorean => "diodorean"
  | .chrysippean => "chrysippean" | .containment => "containment"

def optB : Option Bool → String
  | some true => "yes" | some false => "no" | none => "?"

/-- For each item and each conditional reading: valid by the criterion
(DL 7.77), redundant under `strict` and under `narrow`. The background theory
is added to the premises for this check. -/
def semanticTable : String :=
  let readings := [CondReading.philonian, .chrysippean, .containment, .diodorean]
  let header := "| Item | Ledger | " ++ " | ".intercalate (readings.map fun r => condLabel r) ++ " |"
  let sep := "| --- | --- | " ++ " | ".intercalate (readings.map fun _ => "---") ++ " |"
  let rows := formalSuite.map fun i =>
    let a : Argument := ⟨i.theory ++ i.arg.premises, i.arg.conclusion⟩
    let cells := readings.map fun r =>
      let v := criterionValid { cond := r } a
      let rs := redundant { cond := r, redundancy := .strict } a
      let rn := redundant { cond := r, redundancy := .narrow } a
      s!"{optB v} / {optB rs} / {optB rn}"
    s!"| {i.id} | {i.verdict.label} | " ++ " | ".intercalate cells ++ " |"
  "\n".intercalate ([header, sep] ++ rows)

/-! ## Rendering -/

def itemHeader : String :=
  "| # | Candidate | " ++ " | ".intercalate (formalSuite.map (·.id)) ++ " |"

def itemSep : String :=
  "| --- | --- | " ++ " | ".intercalate (formalSuite.map fun _ => "---") ++ " |"

def rowLine (n : Nat) (r : Row) : String :=
  s!"| {n} | {r.candidate.name} | " ++ " | ".intercalate (r.cells.map (·.2.label)) ++ " |"

def csv (rows : List Row) : String :=
  let header := "candidate,provenance,setting," ++ ",".intercalate (formalSuite.map (·.id)) ++ ",fits,proven_fit"
  let esc := fun (s : String) => "\"" ++ s.replace "\"" "\"\"" ++ "\""
  "\n".intercalate <| header :: rows.map fun r =>
    s!"{esc r.candidate.name},{r.candidate.provenance.label},{r.setting.label}," ++
      ",".intercalate (r.cells.map (·.2.label)) ++ s!",{r.fits},{r.provenFit}"

def viewLabel : PremiseView → String
  | .list => "list" | .multiset => "multiset" | .set => "set"

open Formula in
/-- Probe arguments, not evidence (see the Probes section of the matrix). -/
def probes : List (String × Argument) :=
  [ ("if p, q; if p, not q; therefore not p", ⟨[cond p₀ p₁, cond p₀ (neg p₁)], neg p₀⟩),
    ("p; not q; therefore not (if p, q)", ⟨[p₀, neg p₁], neg (cond p₀ p₁)⟩),
    ("if p, q; if q, r; not r; therefore not p", ⟨[cond p₀ p₁, cond p₁ p₂, neg p₂], neg p₀⟩) ]

def matrixMd (rows : List Row) (b : Bounds) : String := Id.run do
  let named := [attested, mates, matesDT]
  let fits := rows.filter (·.fits)
  let mut out : Array String := #[]
  out := out.push "# Phase 4 evaluation matrix"
  out := out.push ""
  out := out.push "Generated by `themata/lean` (`lake exe harness`); do not edit by hand. Full cell grid: `matrix.csv`."
  out := out.push ""
  out := out.push s!"Search bounds: depth {b.depth}, at most {b.maxSize} arguments, formulas within each item's subformulas and their contradictories, premises at most one more than the item has. See `Stoic/Harness/Search.lean`."
  out := out.push ""
  out := out.push s!"{candidates.length} candidates × {settings.length} derivation settings × {formalSuite.length} formal items ({rows.length} candidate-settings). S017 and S019 are `non_formal` and not run."
  out := out.push ""
  out := out.push "Cells: `D`n derived at depth n as required · `OVER`n derived but rejected by the ledger · `UNDER` required but not found within the depth · `■cm` proven underivable by a Philonian countermodel · `■rm` proven underivable by a Sugihara (relevance) countermodel · `■2p` proven underivable, fewer than two premises under Chrysippus's policy · `■rel` proven underivable, an atom in exactly one place and no merging cut · `■base` proven underivable, base cases only · `·` rejected as required but only not found within the depth (`s`: search saturated, `t`: truncated)."
  out := out.push ""
  out := out.push "## Summary"
  out := out.push ""
  out := out.push s!"- Candidate-settings that fit (no `OVER`, no `UNDER`): **{fits.length}** of {rows.length}."
  out := out.push s!"- Of those, fits with every rejection proven: **{(fits.filter (·.provenFit)).length}**."
  let nonfits := rows.filter (!·.fits)
  out := out.push s!"- Candidate-settings that do not fit: {nonfits.length}. Proven not to fit (an exhibited `OVER` or a proven `UNDER■`): **{(nonfits.filter (·.provenNonFit)).length}**. The rest fail only on search-bounded `UNDER` cells."
  let fitNames := (fits.map (·.candidate.name)).eraseDups
  out := out.push s!"- Candidates that fit under at least one setting: **{fitNames.length}** of {candidates.length}."
  out := out.push ""
  if fits.isEmpty then
    out := out.push "No candidate fits under any setting."
  else
    out := out.push "| Candidate | Settings where it fits | Proven fits |"
    out := out.push "| --- | --- | --- |"
    for n in fitNames do
      let fs := fits.filter (·.candidate.name == n)
      out := out.push s!"| {n} | {", ".intercalate (fs.map (·.setting.label))} | {(fs.filter (·.provenFit)).length} |"
  out := out.push ""
  out := out.push "## Where each item fails"
  out := out.push ""
  out := out.push "Candidate-settings with an `OVER` or `UNDER` on the item, out of all candidate-settings."
  out := out.push ""
  out := out.push "| Item | Ledger | OVER | UNDER |"
  out := out.push "| --- | --- | --- | --- |"
  for i in formalSuite do
    let cs := rows.map fun r => (r.cells.find? (·.1.id == i.id)).map (·.2)
    let over := (cs.filter fun c => match c with | some (Cell.over _) => true | _ => false).length
    let under := (cs.filter fun c => match c with | some (Cell.under _ _ _) => true | _ => false).length
    out := out.push s!"| {i.id} | {i.verdict.label} | {over} | {under} |"
  out := out.push ""
  out := out.push s!"## Named candidates, all settings"
  out := out.push ""
  for c in named do
    out := out.push s!"### {c.name}"
    out := out.push ""
    out := out.push ("| # | Setting | " ++ " | ".intercalate (formalSuite.map (·.id)) ++ " | Fits |")
    out := out.push ("| --- | --- | " ++ " | ".intercalate (formalSuite.map fun _ => "---") ++ " | --- |")
    let rs := rows.filter (·.candidate.name == c.name)
    for (r, k) in rs.zipIdx do
      out := out.push (s!"| {k + 1} | {r.setting.label} | " ++ " | ".intercalate (r.cells.map (·.2.label)) ++ s!" | {if r.fits then "yes" else "no"} |")
    out := out.push ""
  out := out.push s!"## All candidates at the default setting ({defaultSetting.label})"
  out := out.push ""
  out := out.push itemHeader
  out := out.push itemSep
  let ds := rows.filter (·.setting == defaultSetting)
  for (r, k) in ds.zipIdx do
    out := out.push (rowLine (k + 1) r)
  out := out.push ""
  out := out.push "## Probes (not evidence)"
  out := out.push ""
  out := out.push "These arguments are **not** in the ledger and count toward nothing above. The first probe, the two conditionals argument, has since been sourced (Origen, VII.15) and entered the suite as S020; it stays here so its row can be compared with the others. Setting: Chrysippus, toggle."
  out := out.push ""
  out := out.push ("| Probe | " ++ " | ".intercalate (named.flatMap fun c => [PremiseView.list, .multiset, .set].map fun v => s!"{c.name} ({viewLabel v})") ++ " |")
  out := out.push ("| --- | " ++ " | ".intercalate (named.flatMap fun _ => [1, 2, 3].map fun _ => "---") ++ " |")
  for (label, a) in probes do
    let cells := named.flatMap fun c => [PremiseView.list, .multiset, .set].map fun v =>
      match search { view := v } [] c.rules a b with
      | .derived d => s!"D{d}"
      | .notFound _ true _ => "·s"
      | .notFound _ _ _ => "·"
    out := out.push (s!"| {label} | " ++ " | ".intercalate cells ++ " |")
  out := out.push ""
  out := out.push "## Semantic table"
  out := out.push ""
  out := out.push "Independent of candidates. Each cell: valid by the criterion (DL 7.77) / redundant under `strict` / redundant under `narrow`. `?`: no complete procedure (Diodorean). S014/S015 are checked with their background conditional added as a premise."
  out := out.push ""
  out := out.push semanticTable
  return "\n".intercalate out.toList ++ "\n"

end Stoic.Harness
