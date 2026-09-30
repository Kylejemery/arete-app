import Stoic.Syntax

/-!
# Parameters

The places where the ancient evidence underdetermines the logic. None of them
is decided here. The harness (Phase 4) runs every candidate under every
combination and reports fit per setting. Each parameter cites the ledger
entries it comes from.
-/

namespace Stoic

/-- Truth conditions of "if p, q" (rules C01–C03). Cicero, *Academica* II
ch. XLVII: "Diodorus has one opinion, Philo another, Chrysippus a third". -/
inductive CondReading where
  /-- Philo: false only when the antecedent is true and the consequent false. -/
  | philonian
  /-- Diodorus: never, from now on, true antecedent with false consequent. -/
  | diodorean
  /-- Chrysippus: the contradictory of the consequent conflicts with the
  antecedent (DL 7.73). Modelled as strict implication over the model's
  worlds, following Mates's reading (rules C02), which is a modern gloss. -/
  | chrysippean
  /-- The containment criterion (Sextus, *PH* II 111, as reported in Zeller
  n.221). Its content is not recoverable from the corpus. Placeholder:
  Chrysippean, and the antecedent must differ from the consequent, following
  Mates's remark that it "would rule out the 'duplicated propositions'". -/
  | containment
  deriving DecidableEq, Repr

/-- Single-premise arguments (suite S014). -/
inductive SinglePremise where
  /-- No argument has fewer than two premises. -/
  | chrysippus
  /-- "It is day; therefore it is light" is an argument, when the matching
  conditional is accepted. -/
  | antipater
  deriving DecidableEq, Repr

/-- What "the contradictory" of a proposition is (rules C06). The
indemonstrables are defined with contradictories, not with "not". -/
inductive Contradictory where
  /-- Add or strip one prefixed negation: the contradictory of `not p` is `p`. -/
  | toggle
  /-- Always prefix a negation: the contradictory of `not p` is `not not p`,
  which DL 7.69 says "presupposes" p but is a distinct proposition. -/
  | negate
  deriving DecidableEq, Repr

/-- How a derivation's premises are compared with an indemonstrable's
(brief, Phase 2: "Premise order and multiplicity may matter"). -/
inductive PremiseView where
  /-- Order and multiplicity both matter. -/
  | list
  /-- Order does not matter; multiplicity does. -/
  | multiset
  /-- Neither matters. -/
  | set
  deriving DecidableEq, Repr

/-- What makes an argument redundant (παρέλκων). Finding F1 in NOTES.md: the
ledger's evidence is inconsistent, so both readings are kept. -/
inductive Redundancy where
  /-- Redundant iff some premise is idle, meaning the argument without it is
  still valid. -/
  | strict
  /-- As `strict`, except that indifferently concluding arguments, whose
  conclusion is one of their premises (suite S009, S011), are never
  redundant. -/
  | narrow
  deriving DecidableEq, Repr

structure Params where
  cond : CondReading := .chrysippean
  single : SinglePremise := .chrysippus
  contra : Contradictory := .toggle
  view : PremiseView := .multiset
  redundancy : Redundancy := .strict
  deriving DecidableEq, Repr

/-- The contradictory of a proposition, under a reading. -/
def contradictory (m : Contradictory) (p : Formula) : Formula :=
  match p with
  | .neg q => match m with
    | .toggle => q
    | .negate => .neg (.neg q)
  | p => .neg p

@[simp] theorem contradictory_atom (m : Contradictory) (n : Nat) :
    contradictory m (.atom n) = .neg (.atom n) := rfl

@[simp] theorem contradictory_toggle_neg (q : Formula) :
    contradictory .toggle (.neg q) = q := rfl

end Stoic
