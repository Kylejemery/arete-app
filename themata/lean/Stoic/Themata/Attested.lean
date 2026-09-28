import Stoic.Themata.Rules

/-!
# Candidate: the attested themata

What the ancient texts in the corpus state, and nothing more
(`evidence/rules.yaml`):

* T01 (DL 7.78, Greek in Zeller n.241): syllogistic arguments are the
  indemonstrables and those reduced to them "by one or some of the themata".
  This is `Derives` itself.
* T02 (Galen, Alexander, via Zeller n.244): there are a first, second, third
  and fourth thema. Names only.
* T03 (Simplicius, in De Caelo, Schol. 483b26, Greek in Zeller n.244): an
  analysis "which takes the conclusion and adds another premise is completed
  according to what the Stoics call the third thema".

So the only thema with attested content is the third, and its content is
thin. Encoded literally: the argument that uses the conclusion has exactly
two premises, the conclusion first ("takes the conclusion") and one further
premise ("adds another premise"); the premises of the inference that reached
the conclusion take its place. That last clause is Zeller's gloss, "that
third proposition can be drawn also from the premisses of the inference and
the second proposition", which is the only statement of the rule the
Simplicius passage comes with. It adds nothing the Greek's "analysis"
does not already imply, so there is no separate Zeller module.

The first thema has no ancient statement in the corpus (gaps.md), so it is
not here. T04 (Alexander on the synthetic theorem) is pending Kyle's check and
is not used.
-/

namespace Stoic.Themata

/-- The third thema, as Simplicius describes the analysis it completes. -/
def thirdSimplicius : Rule :=
  { cut .two .first false with name := "third (Simplicius/Zeller): cut[two,first]" }

def attested : Candidate where
  name := "Attested"
  provenance := .attested
  source := "rules T03 (Simplicius, Schol. in Arist. 483b26, Greek quoted in Zeller n.244; the rule stated as Zeller glosses it)"
  rules := [thirdSimplicius]

end Stoic.Themata
