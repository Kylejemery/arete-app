import Stoic.Params
import Stoic.Argument
import Stoic.Indemonstrables

/-!
# The formal suite, encoded

Every entry of `evidence/suite.yaml`, with its ledger verdict and flags, as
the harness runs it. Atoms: p = `p₀`, q = `p₁`, r = `p₂`. `harness --items`
prints this list as JSON, and `themata/harness/check_suite.py` checks it
against the YAML (ids, verdicts, flags), so the two cannot drift silently.

Encoding decisions:

* **S014, S015** have the same form, "p; therefore q" with "if p, q" held
  true. The conditional is the background theory. They stay two items
  because the ledger keeps them apart.
* **S018** (the Sorites) is a chain of ten in the ledger. The harness runs a
  three-link instance, which has the same shape. A ten-link chain needs eight
  chained cuts, which is past any search depth the harness can afford, so
  running it would only ever report "not found within depth N".
* **S017, S019** are flagged `non_formal` and are not run (ruling of
  2026-09-27). They are listed so the check script sees every id.
-/

namespace Stoic.Harness

open Formula

inductive Verdict where
  | valid
  | invalid
  | disputed
  | validNonsyllogistic
  deriving DecidableEq, Repr

def Verdict.label : Verdict → String
  | .valid => "valid"
  | .invalid => "invalid"
  | .disputed => "disputed"
  | .validNonsyllogistic => "valid_nonsyllogistic"

structure Item where
  id : String
  verdict : Verdict
  nonFormal : Bool := false
  arg : Argument
  theory : Theory := []

def suite : List Item :=
  [ { id := "S001", verdict := .valid, arg := ⟨[cond p₀ p₁, p₀], p₁⟩ },
    { id := "S002", verdict := .valid, arg := ⟨[cond p₀ p₁, neg p₁], neg p₀⟩ },
    { id := "S003", verdict := .valid, arg := ⟨[neg (conj p₀ p₁), p₀], neg p₁⟩ },
    { id := "S004", verdict := .valid, arg := ⟨[disj p₀ p₁, p₀], neg p₁⟩ },
    { id := "S005", verdict := .valid, arg := ⟨[disj p₀ p₁, neg p₀], p₁⟩ },
    { id := "S006", verdict := .invalid, arg := ⟨[cond p₀ p₁, p₀], p₂⟩ },
    { id := "S007", verdict := .invalid, arg := ⟨[cond p₀ p₁, neg p₀], neg p₁⟩ },
    { id := "S008", verdict := .validNonsyllogistic, arg := ⟨[saidFalse (conj p₀ p₁), p₀], neg p₁⟩ },
    { id := "S009", verdict := .valid, arg := ⟨[cond p₀ p₀, p₀], p₀⟩ },
    { id := "S010", verdict := .valid, arg := ⟨[cond (conj p₀ p₁) p₂, conj p₀ p₁], p₂⟩ },
    { id := "S011", verdict := .valid, arg := ⟨[disj p₀ p₁, p₀], p₀⟩ },
    { id := "S012", verdict := .valid, arg := ⟨[cond p₀ (cond p₀ p₁), p₀], p₁⟩ },
    { id := "S013", verdict := .valid, arg := ⟨[cond (conj p₀ p₁) p₂, neg p₂, p₀], neg p₁⟩ },
    { id := "S014", verdict := .disputed, arg := ⟨[p₀], p₁⟩, theory := [cond p₀ p₁] },
    { id := "S015", verdict := .disputed, arg := ⟨[p₀], p₁⟩, theory := [cond p₀ p₁] },
    { id := "S016", verdict := .invalid, arg := ⟨[cond p₀ p₁, p₀, p₂], p₁⟩ },
    { id := "S017", verdict := .invalid, nonFormal := true, arg := ⟨[disj p₀ p₁, neg p₀], p₁⟩ },
    { id := "S018", verdict := .valid,
      arg := ⟨[neg (conj p₀ (neg p₁)), neg (conj p₁ (neg p₂)), p₀], p₂⟩ },
    { id := "S019", verdict := .invalid, nonFormal := true, arg := ⟨[cond p₀ (neg p₁), p₀], neg p₂⟩ } ]

def formalSuite : List Item := suite.filter (!·.nonFormal)

/-- What a candidate must do with an item under a setting. `S014`/`S015`
are disputed: Antipater's policy accepts them, Chrysippus's rejects them.
A `valid_nonsyllogistic` item must not be derived; its validity by the
criterion is checked separately (the semantic table). -/
def Item.shouldDerive (i : Item) (P : Params) : Bool :=
  match i.verdict with
  | .valid => true
  | .invalid | .validNonsyllogistic => false
  | .disputed => P.single == .antipater

end Stoic.Harness
