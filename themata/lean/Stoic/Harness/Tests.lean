import Stoic.Harness.Matrix

/-!
# Harness tests

The search and the proof routes agree with the Phase 2 and Phase 3 results
they rest on.
-/

namespace Stoic.Harness.Tests

open Stoic.Themata

def item (id : String) : Item :=
  (suite.find? (·.id == id)).getD { id := "?", verdict := .invalid, arg := ⟨[], .atom 0⟩ }

-- S013: derived at depth 1 by the attested third thema (`S013_attested`),
-- not by the control (`S013_not_base`).
#guard search {} [] attested.rules (item "S013").arg {} == .derived 1
#guard match search {} [] [] (item "S013").arg {} with | .notFound .. => true | _ => false
-- S012: derived by the merging cut (`S012_matesDT`); the plain cut repeats p.
#guard search {} [] matesDT.rules (item "S012").arg {} == .derived 1
#guard search { view := .set } [] attested.rules (item "S012").arg {} == .derived 1
-- The proof routes: S006 and S007 have countermodels, S016 does not
-- (it is valid by the criterion) but its idle atom r has one slot.
#guard (countermodel? {} (item "S006")).isSome
#guard (countermodel? {} (item "S007")).isSome
#guard (countermodel? {} (item "S016")).isNone
-- S016 and S008 have Sugihara countermodels; S001 and the Sorites do not.
#guard sugiharaCountermodel {} (item "S016")
#guard sugiharaCountermodel {} (item "S008")
#guard !sugiharaCountermodel {} (item "S001")
#guard !sugiharaCountermodel {} (item "S018")
-- S014 has a countermodel once Chrysippus's policy drops its theory, and
-- none under Antipater's.
#guard (countermodel? {} (item "S014")).isSome
#guard (countermodel? { single := .antipater } (item "S014")).isNone
#guard slots (item "S016").arg 2 == 1
-- S014 with its conditional as background theory: derived under Antipater
-- (a base case), with no countermodel.
#guard search { single := .antipater } (item "S014").theory [] (item "S014").arg {} == .derived 0
-- The cells.
#guard cell attested defaultSetting (item "S016") {} == .provenRelevanceModel
#guard cell matesDT ⟨.chrysippus, .toggle, .set⟩ (item "S016") {} == .provenRelevanceModel
#guard cell attested defaultSetting (item "S014") {} == .provenCountermodel
#guard cell attested defaultSetting (item "S006") {} == .provenCountermodel

-- Proven undergeneration: the Sorites under `negate` (Gödel), S011 for a
-- non-merging candidate (lone atom), S013 for a candidate without cut.
#guard underProof attested { contra := .negate } (item "S018") == some "g3"
#guard underProof attested {} (item "S011") == some "rel"
#guard underProof matesDT {} (item "S011") == none
def contraposeOnly : Candidate :=
  (generated.filter (fun (c : Candidate) => c.name == "contrapose[either,two] + no third")).headD attested
#guard underProof contraposeOnly {} (item "S013") == some "2"

-- S020 (Origen VII.15): a candidate with no first thema provably fails it;
-- Mates + dialectical theorem derives it.
#guard underProof attested {} (item "S020") == some "cl"
#guard underProof mates {} (item "S020") == none
#guard (search {} [] matesDT.rules (item "S020").arg {}) matches .derived _

end Stoic.Harness.Tests
