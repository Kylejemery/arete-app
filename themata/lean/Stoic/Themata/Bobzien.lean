import Stoic.Themata.Rules

/-!
# Candidate: Bobzien

Susanne Bobzien, "Stoic Syllogistic", *Oxford Studies in Ancient Philosophy*
14 (1996), pp. 133-192 (rules R03; full text in `research_sources`
48d67ff4). Guardrail 2: every rule here is her formalisation on p. 153,
read from the stored paper, and SCOPE milestone 5 asks for exactly this
module. The 2026-09-27 ruling (no Bobzien module until the paper is in the
corpus) is satisfied.

Her four themata, p. 153, with the argument to be analysed below the line:

* (T1) `A₁, A₂ ⊢ A₃` gives `Aᵢ, ctrd(A₃) ⊢ ctrd(Aⱼ)`, i ≠ j; (T1⁺) the same
  for n ≥ 2 premises, contraposing any one. Contraposition of either premise,
  for two or more premises.
* (T2) `A₁, A₂ ⊢ A₃` and `Aᵢ, A₃ ⊢ C` give `A₁, A₂ ⊢ C` (a premise of the
  first argument used again); (T2⁺) with `Aᵢ, Aⱼ, A₃ ⊢ C`.
* (T3) `A₁, A₂ ⊢ A₃` and `A₃, E ⊢ C` give `A₁, A₂, E ⊢ C` (an external
  premise); (T3⁺) with `E₁, …, Eₙ`.
* (T4) `A₁, A₂ ⊢ A₃` and `A₃, Aᵢ, E ⊢ C` give `A₁, A₂, E ⊢ C` (both);
  (T4⁺) with `Aᵢ, Aⱼ, E₁, …, Eₙ`.

Encoding, as restrictions of the two shapes in `Rules.lean`:

* `bobzienT1` is `contrapose[either,any]` restricted to arguments with at
  least two premises. Her system has no one-premiss arguments (pp. 171-173),
  so T1 never applies to one.
* `bobzienT2to4` is `cut[any,any,merge]` restricted to a first component
  with exactly two premises (`A₁, A₂ ⊢ A₃`, as in all four) and a second
  component with at least two (`A₃` and at least one more). T2 to T4 differ
  only in whether the second component's other premises are repeated
  premises of the first (T2), external ones (T3) or both (T4); the merging
  cut covers all three at once, stating a repeated premise once, which is
  her reading of "implicitly used twice" (p. 155). The position of `A₃` is
  free because premiss permutation holds in her system (p. 181).

Her section 5 results hold for any reconstruction in which T2-T4 have the
power of the synthetic theorem (n. 95), and she suggests premiss doublets
were removed before analysis (n. 96), which favours the `set` view; the
harness runs every view regardless. Her one-premiss policy is Chrysippus's
(pp. 171-173), so the Antipater settings do not represent her.
-/

namespace Stoic.Themata

def bobzienT1 : Rule :=
  (contrapose .either .any).restrict
    "T1, T1+ (Bobzien 1996, p. 153): contrapose[either,≥2]"
    "contrapose[either,≥2]"
    fun as => match as with
      | [a] => decide (2 ≤ a.premises.length)
      | _ => false

def bobzienT2to4 : Rule :=
  (cut .any .any true).restrict
    "T2-T4, T2+-T4+ (Bobzien 1996, p. 153): cut[first 2, user ≥2, any, merge]"
    "cut[2,≥2,any,merge]"
    fun as => match as with
      | [g, u] => g.premises.length == 2 && decide (2 ≤ u.premises.length)
      | _ => false

def bobzien : Candidate where
  name := "Bobzien"
  provenance := .reconstruction
  source := "rules R03 (Bobzien, Stoic Syllogistic, OSAP 14, 1996, p. 153; research_sources 48d67ff4): T1 and T1+ as contraposition of either premise for two or more premises; T2-T4 and their + forms as a merging cut from a two-premiss first component"
  rules := [bobzienT1, bobzienT2to4]

end Stoic.Themata
