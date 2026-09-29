import Lean.Data.Json
import Stoic.Harness.Matrix

/-!
# Data export for the explorer page

`lake exe harness --export DIR` runs every formal item, under every candidate
and every combination of the five parameters in `Params` (4 × 2 × 2 × 3 × 2 =
96 settings), and writes what each run found. The explorer page shows these
files and computes nothing, so every verdict it shows comes from here.

* `DIR/harness.json`: the axes (parameters with their values as spelled in
  `Params.lean`, the 96 settings, the candidates and their rules), the items as
  encoded, the cell vocabulary and the proof routes with the theorems they
  cite, and the semantic table (DL 7.77 validity and redundancy) for every
  item and its redundant variant under every conditional and redundancy
  reading.
* `DIR/runs/cNN.json`: one file per candidate, one record per (setting, item).

**Settings.** Derivability does not read `cond` or `redundancy` (see
`Matrix.lean`), but the export does not rely on that: every run is made under
its full parameter record.

**Redundant variants.** When a run derives its item, the item is run again,
same candidate and setting, with one premise added: a fresh atom, the next
one after the item's own atoms, placed last (the shape of S016). The variant
has no ledger verdict; the export records whether derivability was lost, and
whether the loss is proven or only not found within the depth.

**Reductions.** For a derived run, the derivation the search found, as ordered
steps: each base instance (the `Indemonstrable` or `Base` constructor), each
thema applied (with the steps it used), and each reordering the premise view
allows, ending in the item. Every reduction is replayed step by step against
`labeledBaseInstances`, the rules' own `step` functions and `viewEq` before it
is written; the export fails if any step does not replay. Replay reuses the
search's definitions, so it checks the reconstruction, not the definitions.
-/

namespace Stoic.Harness.Export

open Lean (Json toJson)
open Stoic.Themata

/-! ## Names as the code spells them -/

/-- The constructor name, from `Repr`, so the export cannot drift from the
code: `Stoic.CondReading.philonian` gives `philonian`. -/
def ctorName {α : Type} [Repr α] (a : α) : String :=
  ((reprStr a).splitOn ".").getLast!

def allCond : List CondReading := [.philonian, .diodorean, .chrysippean, .containment]
def allSingle : List SinglePremise := [.chrysippus, .antipater]
def allContra : List Contradictory := [.toggle, .negate]
def allView : List PremiseView := [.list, .multiset, .set]
def allRedundancy : List Redundancy := [.strict, .narrow]

/-- Every combination of the five parameters. -/
def fullSettings : List Params :=
  allCond.flatMap fun c => allSingle.flatMap fun s => allContra.flatMap fun m =>
    allView.flatMap fun v => allRedundancy.map fun r =>
      { cond := c, single := s, contra := m, view := v, redundancy := r }

def paramsJson (P : Params) : Json :=
  Json.mkObj [("cond", ctorName P.cond), ("single", ctorName P.single),
    ("contra", ctorName P.contra), ("view", ctorName P.view),
    ("redundancy", ctorName P.redundancy)]

/-! ## Rendering -/

def atomName : Nat → String
  | 0 => "p" | 1 => "q" | 2 => "r" | 3 => "s"
  | n => s!"p{n}"

/-- A formula in the ledger's schematic style: `if (p and q), r`,
`not (p and q)`, `either p or q`, `'p and q' is false`. -/
def render : Formula → String
  | .atom n => atomName n
  | .neg p => "not " ++ paren p (render p)
  | .saidFalse p => "'" ++ render p ++ "' is false"
  | .conj p q => paren p (render p) ++ " and " ++ paren q (render q)
  | .disj p q => "either " ++ paren p (render p) ++ " or " ++ paren q (render q)
  | .cond p q => "if " ++ paren p (render p) ++ ", " ++ paren q (render q)
where
  paren (f : Formula) (s : String) : String :=
    match f with
    | .conj .. | .disj .. | .cond .. => "(" ++ s ++ ")"
    | _ => s

def renderArg (a : Argument) : String :=
  "; ".intercalate (a.premises.map render) ++ "; therefore " ++ render a.conclusion

def argJson (a : Argument) : Json :=
  Json.mkObj [("premises", Json.arr (a.premises.map (Json.str ∘ render)).toArray),
    ("conclusion", render a.conclusion), ("text", renderArg a)]

/-! ## Redundant variant -/

/-- The item with one premise added: a fresh atom, the next after the item's
atoms (theory included), placed last. -/
def _root_.Stoic.Harness.Item.redundantVariant (i : Item) : Item :=
  let n := (itemAtoms i).foldl max 0 + 1
  { i with id := i.id ++ "+r", arg := ⟨i.arg.premises ++ [.atom n], i.arg.conclusion⟩, note := "" }

/-! ## Reductions -/

structure Step where
  /-- `indemonstrable`, `monolemmatic`, `thema` or `view`. -/
  kind : String
  /-- The `Indemonstrable`/`Base` constructor, the thema's name, or the view. -/
  rule : String
  shape : String := ""
  uses : List Nat := []
  arg : Argument

structure Recon where
  steps : Array Step := #[]
  ids : Std.HashMap Argument Nat := {}

abbrev ReconM := StateT Recon (Except String)

def emit (s : Step) : ReconM Nat := do
  let st ← get
  if let some i := st.ids[s.arg]? then return i
  let i := st.steps.size
  set { st with steps := st.steps.push s, ids := st.ids.insert s.arg i }
  return i

partial def build (P : Params) (rules : List Rule) (origin : Std.HashMap Argument Origin)
    (x : Argument) : ReconM Nat := do
  if let some i := (← get).ids[x]? then return i
  match origin[x]? with
  | none => throw s!"no origin for {renderArg x}"
  | some (.base lbl inst) =>
    let kind := if lbl == "monolemmatic" then "monolemmatic" else "indemonstrable"
    let i ← emit { kind, rule := lbl, arg := inst }
    if x == inst then return i
    emit { kind := "view", rule := ctorName P.view, uses := [i], arg := x }
  | some (.rule name ins out) =>
    let us ← ins.mapM (build P rules origin)
    let shape := ((rules.find? (·.name == name)).map (·.shape)).getD ""
    let i ← emit { kind := "thema", rule := name, shape, uses := us, arg := out }
    if x == out then return i
    emit { kind := "view", rule := ctorName P.view, uses := [i], arg := x }

/-- The found derivation as ordered steps, ending in the goal itself. -/
def reduction (P : Params) (rules : List Rule) (origin : Std.HashMap Argument Origin)
    (hit g : Argument) : Except String (Array Step) := do
  let (i, st) ← (build P rules origin hit).run {}
  if hit == g then return st.steps
  let s : Step := { kind := "view", rule := ctorName P.view, uses := [i], arg := g }
  return st.steps.push s

/-- Every step follows from the steps it uses, and the last is the goal. -/
def replay (P : Params) (T : Theory) (rules : List Rule) (g : Argument) (steps : Array Step) : Bool :=
  let base := labeledBaseInstances P T (formulaUniverse P.contra g T)
  let ok := fun (k : Nat) (s : Step) =>
    s.uses.all (· < k) &&
    let ins := s.uses.map fun j => (steps.getD j s).arg
    match s.kind with
    | "indemonstrable" | "monolemmatic" => s.uses.isEmpty && base.contains (s.rule, s.arg)
    | "thema" => match rules.find? (·.name == s.rule) with
      | some r => (r.step P ins).contains s.arg
      | none => false
    | "view" => match ins with
      | [a] => a.conclusion == s.arg.conclusion && viewEq P.view a.premises s.arg.premises
      | _ => false
    | _ => false
  !steps.isEmpty && (steps.back?.map (·.arg)) == some g &&
    (steps.toList.zipIdx.all fun (s, k) => ok k s)

def stepJson (steps : Array Step) (k : Nat) (s : Step) : Json :=
  let _ := steps
  Json.mkObj ([("n", toJson (k + 1)), ("kind", s.kind), ("rule", s.rule)] ++
    (if s.shape.isEmpty then [] else [("shape", Json.str s.shape)]) ++
    [("from", Json.arr (s.uses.map fun j => toJson (j + 1)).toArray),
     ("premises", Json.arr (s.arg.premises.map (Json.str ∘ render)).toArray),
     ("conclusion", render s.arg.conclusion)])

def reductionJson (g : Argument) (steps : Array Step) : Json :=
  Json.mkObj [("premises", Json.arr (g.premises.map (Json.str ∘ render)).toArray),
    ("steps", Json.arr (steps.toList.zipIdx.map fun (s, k) => stepJson steps k s).toArray),
    ("conclusion", render g.conclusion), ("replayed", true)]

/-! ## Cells as the export reports them -/

def _root_.Stoic.Harness.Cell.status : Cell → String
  | .ok _ | .over _ => "derived"
  | .under none _ _ | .bounded _ _ => "not_found_within_depth"
  | _ => "proven_underivable"

def _root_.Stoic.Harness.Cell.route : Cell → Option String
  | .under p _ _ => p
  | .provenCountermodel => some "cm"
  | .provenRelevanceModel => some "rm"
  | .provenTwo => some "2p"
  | .provenRelevance => some "rel"
  | .provenBase => some "base"
  | _ => none

/-- The run agrees with the ledger: the harness's cell is not `OVER` or
`UNDER`, and a `valid_nonsyllogistic` item is also valid by the criterion
under this conditional reading (brief, Phase 4). `unknown`: the criterion
has no complete procedure for this reading. -/
def matchesLedger (P : Params) (i : Item) (c : Cell) : String :=
  if c.bad then "no"
  else if i.verdict == .validNonsyllogistic then
    match criterionValid P ⟨i.theory ++ i.arg.premises, i.arg.conclusion⟩ with
    | some true => "yes"
    | some false => "no"
    | none => "unknown"
  else "yes"

structure RunOut where
  cell : Cell
  fields : List (String × Json)
  reduction : Option Json

/-- One search, classified, with its reduction if it derived the item. -/
def runOne (c : Candidate) (P : Params) (i : Item) (b : Bounds) (required : Bool) :
    Except String RunOut := do
  let (outcome, hit, origin) := searchTrace P i.theory c.rules i.arg b
  let cl := classify c P i outcome required
  let searchFields : List (String × Json) := match outcome with
    | .derived d => [("depth", toJson d)]
    | .notFound d sat tr =>
      [("within_depth", toJson (if tr then d else b.depth)), ("saturated", Json.bool sat),
       ("truncated", Json.bool tr)]
  let red ← match hit with
    | some h =>
      let steps ← reduction P c.rules origin h i.arg
      if !replay P i.theory c.rules i.arg steps then
        throw s!"reduction does not replay: {c.name}, {i.id}, {reprStr P}"
      pure (some (reductionJson i.arg steps))
    | none => pure none
  let fields := [("cell", Json.str cl.label), ("status", Json.str cl.status)] ++ searchFields ++
    (match cl.route with | some r => [("proof", Json.str r)] | none => [])
  return { cell := cl, fields, reduction := red }

/-! ## Files -/

def triB : Option Bool → Json
  | some true => "yes" | some false => "no" | none => "unknown"

def semanticsJson (i : Item) : Json :=
  let a : Argument := ⟨i.theory ++ i.arg.premises, i.arg.conclusion⟩
  Json.arr <| (allCond.flatMap fun r => allRedundancy.map fun rd =>
    let P : Params := { cond := r, redundancy := rd }
    Json.mkObj [("cond", ctorName r), ("redundancy", ctorName rd),
      ("criterion_valid", triB (criterionValid P a)),
      ("redundant", triB (redundant P a)),
      ("stoic_valid", triB (stoicValid P a))]).toArray

def itemJson (i : Item) : Json :=
  let v := i.redundantVariant
  Json.mkObj [("id", i.id), ("ancient_verdict", i.verdict.label),
    ("non_formal", Json.bool i.nonFormal),
    ("encoded", argJson i.arg),
    ("theory", Json.arr (i.theory.map (Json.str ∘ render)).toArray),
    ("encoding_note", if i.note.isEmpty then Json.null else Json.str i.note),
    ("semantics", if i.nonFormal then Json.null else semanticsJson i),
    ("redundant_variant", if i.nonFormal then Json.null else
      Json.mkObj [("encoded", argJson v.arg),
        ("added_premise", render (v.arg.premises.getLastD (.atom 0))),
        ("semantics", semanticsJson v)])]

def ruleJson (r : Rule) : Json :=
  Json.mkObj [("name", r.name), ("shape", r.shape), ("merging", Json.bool r.merging),
    ("cut", Json.bool r.isCut)]

def fileName (k : Nat) : String :=
  s!"c{if k < 10 then "0" else ""}{k}.json"

def candidateJson (k : Nat) (c : Candidate) : Json :=
  Json.mkObj [("index", toJson k), ("file", s!"runs/{fileName k}"), ("name", c.name),
    ("provenance", c.provenance.label), ("source", c.source),
    ("rules", Json.arr (c.rules.map ruleJson).toArray)]

def cellsJson : Json := Json.mkObj
  [("D<n>", "derived at depth n, as the ledger requires"),
   ("OVER<n>", "derived at depth n, but the ledger rejects it (overgeneration); for a redundant variant: derived despite the added premise"),
   ("UNDER", "the ledger requires it; not found within the depth (undergeneration, search-bounded)"),
   ("UNDER(t)", "as UNDER, and the size bound stopped the search early"),
   ("UNDER■<route>", "the ledger requires it; proven underivable (undergeneration, proven)"),
   ("■<route>", "not derived, as required, and proven underivable"),
   ("·", "not derived, as required, but only not found within the depth"),
   ("·s", "as ·, and the search saturated: nothing more is derivable within its formula and premise bounds, which are not proved complete"),
   ("·t", "as ·, and the size bound stopped the search early")]

def routesJson : Json :=
  let r := fun (k thm file what : String) =>
    (k, Json.mkObj [("theorem", Json.str thm), ("file", Json.str file), ("meaning", Json.str what)])
  Json.mkObj
  [ r "cm" "underivable_of_countermodel (underivable_of_countermodel_chrysippus when Chrysippus's policy drops the theory)"
      "Stoic/Soundness.lean, Stoic/Sugihara.lean" "a Philonian countermodel: every candidate is sound for two-valued truth",
    r "rm" "underivable_of_sugihara (underivable_of_sugihara_chrysippus)" "Stoic/Sugihara.lean"
      "a countermodel in the Sugihara model of the relevance logic RM; covers every candidate and view",
    r "2p" "underivable_single_premise" "Stoic/Soundness.lean"
      "fewer than two premises, under Chrysippus's policy and the list or multiset view",
    r "rel" "underivable_lone_atom" "Stoic/Soundness.lean"
      "an atom in exactly one place and no merging cut, under the list or multiset view",
    r "base" "Derives.base_only" "Stoic/Indemonstrables.lean"
      "the candidate has no themata, and the base cases were enumerated exhaustively",
    r "g3" "underivable_of_goedel (underivable_of_goedel_chrysippus)" "Stoic/Undergeneration.lean"
      "a Gödel G₃ countermodel under the negate reading of the contradictory",
    r "2" "underivable_no_cut" "Stoic/Undergeneration.lean"
      "the candidate has no cut and the item does not have two premises",
    r "cl" "S020_needs_first_thema" "Stoic/FirstThema.lean"
      "S020 for a candidate with no first thema (a closed-valuation countermodel)" ]

def baseRulesJson : Json := Json.mkObj
  [ ("first", "first indemonstrable: if p, q; p; therefore q"),
    ("second", "second indemonstrable: if p, q; the contradictory of q; therefore the contradictory of p"),
    ("thirdL", "third indemonstrable: not (p and q); p; therefore the contradictory of q"),
    ("thirdR", "third indemonstrable: not (p and q); q; therefore the contradictory of p"),
    ("fourthL", "fourth indemonstrable: either p or q; p; therefore the contradictory of q"),
    ("fourthR", "fourth indemonstrable: either p or q; q; therefore the contradictory of p"),
    ("fifthL", "fifth indemonstrable: either p or q; the contradictory of p; therefore q"),
    ("fifthR", "fifth indemonstrable: either p or q; the contradictory of q; therefore p"),
    ("monolemmatic", "Antipater's single-premise argument: p; therefore q, when 'if p, q' is held true") ]

def harnessJson (b : Bounds) : Json :=
  Json.mkObj
  [ ("generated_by", "themata/lean: lake exe harness --export"),
    ("bounds", Json.mkObj [("depth", toJson b.depth), ("max_size", toJson b.maxSize),
      ("formulas", "each item's subformulas (premises, conclusion, theory) and their contradictories"),
      ("premises", "at most one more than the item has")]),
    ("parameters", Json.mkObj
      [("cond", Json.arr (allCond.map fun x => Json.str (ctorName x)).toArray),
       ("single", Json.arr (allSingle.map fun x => Json.str (ctorName x)).toArray),
       ("contra", Json.arr (allContra.map fun x => Json.str (ctorName x)).toArray),
       ("view", Json.arr (allView.map fun x => Json.str (ctorName x)).toArray),
       ("redundancy", Json.arr (allRedundancy.map fun x => Json.str (ctorName x)).toArray)]),
    ("settings", Json.arr (fullSettings.zipIdx.map fun (P, k) =>
      Json.mkObj [("id", toJson k), ("params", paramsJson P)]).toArray),
    ("candidates", Json.arr (candidates.zipIdx.map fun (c, k) => candidateJson k c).toArray),
    ("items", Json.arr (suite.map itemJson).toArray),
    ("base_rules", baseRulesJson),
    ("cells", cellsJson),
    ("proof_routes", routesJson) ]

/-- All runs of one candidate. Reductions are stored once per file and
referenced by id, since runs that differ only in `cond` or `redundancy`
find the same derivation. -/
def candidateRuns (k : Nat) (c : Candidate) (b : Bounds) : Except String Json := do
  let mut runs : Array Json := #[]
  let mut reds : Array Json := #[]
  let mut redIds : Std.HashMap String Nat := {}
  let intern := fun (reds : Array Json) (redIds : Std.HashMap String Nat) (j : Json) =>
    let key := j.compress
    match redIds[key]? with
    | some n => (reds, redIds, n)
    | none => (reds.push j, redIds.insert key reds.size, reds.size)
  for (P, sid) in fullSettings.zipIdx do
    for i in formalSuite do
      let required := i.shouldDerive P
      let r ← runOne c P i b required
      let mut fields := [("item", Json.str i.id), ("setting", toJson sid),
        ("ancient_verdict", Json.str i.verdict.label),
        ("ledger_requires_derivation", Json.bool required)] ++ r.fields ++
        [("matches_ledger", Json.str (matchesLedger P i r.cell))]
      if let some red := r.reduction then
        let (reds', ids', n) := intern reds redIds red
        reds := reds'; redIds := ids'
        fields := fields ++ [("reduction", toJson n)]
        let v ← runOne c P i.redundantVariant b false
        let mut vf := v.fields ++ [("derivation_lost", Json.bool (v.cell.status != "derived"))]
        if let some vr := v.reduction then
          let (reds', ids', m) := intern reds redIds vr
          reds := reds'; redIds := ids'
          vf := vf ++ [("reduction", toJson m)]
        fields := fields ++ [("redundant_variant", Json.mkObj vf)]
      runs := runs.push (Json.mkObj fields)
  return Json.mkObj [("candidate", toJson k), ("name", c.name),
    ("reductions", Json.arr reds), ("runs", Json.arr runs)]

def write (dir : System.FilePath) (b : Bounds) : IO Unit := do
  IO.FS.createDirAll (dir / "runs")
  IO.FS.writeFile (dir / "harness.json") ((harnessJson b).pretty ++ "\n")
  let mut n := 0
  for (c, k) in candidates.zipIdx do
    match candidateRuns k c b with
    | .ok j =>
      IO.FS.writeFile (dir / "runs" / fileName k) (j.compress ++ "\n")
      n := n + ((j.getObjValD "runs").getArr?.toOption.map (·.size)).getD 0
    | .error e => throw (IO.userError e)
  IO.println s!"{candidates.length} candidates × {fullSettings.length} settings × {formalSuite.length} items: {n} runs written to {dir}"

end Stoic.Harness.Export
