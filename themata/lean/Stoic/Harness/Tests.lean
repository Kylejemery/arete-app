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
#guard (countermodel? (item "S006")).isSome
#guard (countermodel? (item "S007")).isSome
#guard (countermodel? (item "S016")).isNone
#guard slots (item "S016").arg 2 == 1
-- S014 with its conditional as background theory: derived under Antipater
-- (a base case), with no countermodel.
#guard search { single := .antipater } (item "S014").theory [] (item "S014").arg {} == .derived 0
#guard (countermodel? (item "S014")).isNone
-- The cells.
#guard cell attested defaultSetting (item "S016") {} == .provenRelevance
#guard cell matesDT defaultSetting (item "S016") {} != .provenRelevance
#guard cell attested defaultSetting (item "S014") {} == .provenTwo
#guard cell attested defaultSetting (item "S006") {} == .provenCountermodel

end Stoic.Harness.Tests
