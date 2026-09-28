import Stoic.Harness.Matrix

/-!
# `lake exe harness`

    lake exe harness                 # writes ../results/matrix.md and matrix.csv
    lake exe harness --depth 5       # a different search depth
    lake exe harness --items         # the encoded suite as JSON, for check_suite.py
-/

open Stoic Stoic.Harness

def itemsJson : String :=
  let one := fun (i : Item) =>
    s!"\{\"id\": \"{i.id}\", \"verdict\": \"{i.verdict.label}\", \"non_formal\": {i.nonFormal}}"
  "[" ++ ", ".intercalate (suite.map one) ++ "]"

def parseDepth : List String → Option Nat
  | "--depth" :: n :: _ => n.toNat?
  | _ :: rest => parseDepth rest
  | [] => none

def main (args : List String) : IO Unit := do
  if args.contains "--items" then
    IO.println itemsJson
    return
  let b : Bounds := { depth := (parseDepth args).getD 8 }
  let rows := runAll b
  IO.FS.writeFile "../results/matrix.md" (matrixMd rows b)
  IO.FS.writeFile "../results/matrix.csv" (csv rows ++ "\n")
  let fits := rows.filter (·.fits)
  IO.println s!"{rows.length} candidate-settings, {fits.length} fit, {(fits.filter (·.provenFit)).length} proven fits"
