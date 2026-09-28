import Stoic.Themata.Rules

/-!
# Candidate: Mates

Benson Mates, *Stoic Logic* (1953), as the corpus holds it: a Mode 2
summary (rules R01, T05, T06). Guardrail 2: every rule here is taken from a
retrieved passage, cited by ledger id.

* First thema (T06, chunk f02a4416): "if two premises jointly yield a
  conclusion, then either premise combined with the negation of the
  conclusion yields the negation of the other". Encoded as
  `contrapose[either,two]`, with "negation" read as the contradictory.
* Third thema (T06, same chunk): "if two premises yield a conclusion, and
  some further propositions yield one of those premises, then those further
  propositions together with the other premise yield the original
  conclusion". Encoded as `cut[two,any]`: the argument that uses the lemma has
  two premises, the lemma may stand in either place, and "some further
  propositions" may be any number.
* Second and fourth: "The content of the second and fourth themata is not
  known, and Mates acknowledges this gap plainly." So `mates` has two rules.

`matesDT` adds Mates's conjecture (T05, chunk 401a8e59) that the "dialectical
theorem" reported by Sextus, "permitting analysts to treat any conclusion
derived during analysis as if it were an additional premise", is possibly the
second thema. The summary does not state it as a rule. Our reading is
`cut[any,any,merge]`: a derived conclusion may be used in any argument that
has it among its premises, and premises the two arguments share are stated
once. Mates himself "concedes the identification is uncertain and notes that
it might simply be a restatement of the third", which `mates` (without it)
covers.
-/

namespace Stoic.Themata

def firstMates : Rule :=
  { contrapose .either .two with name := "first (Mates): contrapose[either,two]" }

def thirdMates : Rule :=
  { cut .two .any false with name := "third (Mates): cut[two,any]" }

def dialecticalTheorem : Rule :=
  { cut .any .any true with name := "second? (Mates's conjecture, dialectical theorem): cut[any,any,merge]" }

def mates : Candidate where
  name := "Mates"
  provenance := .reconstruction
  source := "rules R01, T06 (Mates, Stoic Logic, Mode 2 summary, chunk f02a4416): first and third themata as summarised; second and fourth unknown"
  rules := [firstMates, thirdMates]

def matesDT : Candidate where
  name := "Mates + dialectical theorem"
  provenance := .reconstruction
  source := "rules R01, T05, T06: as Mates, plus the dialectical theorem as the second thema (Mates's conjecture, chunk 401a8e59; our reading as a merging cut)"
  rules := [firstMates, dialecticalTheorem, thirdMates]

end Stoic.Themata
