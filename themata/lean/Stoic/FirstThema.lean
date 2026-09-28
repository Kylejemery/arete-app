import Stoic.Undergeneration

/-!
# Without the first thema, the "two conditionals" argument is underivable

S020 (Origen, *Against Celsus* VII.15, reporting the Stoics): "if p, q; if p,
not q; therefore not p". The Phase 4 probes found that no candidate without a
first thema derives it. This file proves that for every candidate whose rules
are all cuts, under every parameter setting (with Chrysippus's policy or an
empty theory, as S020 has).

The semantics is deliberately weak. A *closed valuation* gives every formula
a truth value, with no truth tables at all, subject only to this: whenever
the premises of a base case are true, so is its conclusion. Truth is
preserved by cut (merging or not) and by every premise view, so it holds for
everything a cut-only candidate derives. Contraposition is not preserved,
which is exactly why the first thema can make the difference.

The countermodel makes the two conditionals of S020 true and every other
formula false. No base case has all its premises true under it, so it is
closed, and it makes the premises of S020 true and "not p" false.
-/

namespace Stoic

def ClosedVal (P : Params) (T : Theory) (w : Formula → Bool) : Prop :=
  ∀ a, Base P T a → (∀ x ∈ a.premises, w x = true) → w a.conclusion = true

def HoldsW (P : Params) (T : Theory) (a : Argument) : Prop :=
  ∀ w, ClosedVal P T w → (∀ x ∈ a.premises, w x = true) → w a.conclusion = true

theorem HoldsW.of_equiv {P : Params} {T : Theory} {qs ps : List Formula} {c : Formula}
    (h : HoldsW P T ⟨qs, c⟩) (he : P.view.Equiv qs ps) : HoldsW P T ⟨ps, c⟩ :=
  fun w hw hp => h w hw fun x hx => hp x (he.mem' hx)

theorem cut_holdsW (userAr : Arity) (pos : Position) (merge : Bool) (P : Params) (T : Theory)
    (as : List Argument) (has : ∀ a ∈ as, HoldsW P T a) :
    ∀ b ∈ (cut userAr pos merge).step P as, HoldsW P T b := by
  intro b hb
  simp only [cut] at hb
  unfold cutStep at hb
  split at hb
  · rename_i gs c qs d
    have hg := has ⟨gs, c⟩ (by simp)
    have hq := has ⟨qs, d⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, _, hb⟩ := hb
      split at hb
      · rename_i hcond
        simp only [Option.some.injEq] at hb
        subst hb
        intro w hw hp
        have hgs : ∀ y ∈ gs, w y = true := fun y hy =>
          hp y (List.mem_append_left _ (List.mem_append_right _ hy))
        have keep_ok : ∀ (xs : List Formula) y, y ∈ xs →
            (y ∈ (if merge then xs.filter (· ∉ gs) else xs) → w y = true) → w y = true := by
          intro xs y hy hk
          by_cases hyg : y ∈ gs
          · exact hgs y hyg
          · apply hk; split <;> simp [hy, hyg]
        apply hq w hw
        intro y hy
        rcases mem_split hcond.1 hy with h | h | h
        · exact keep_ok _ y h fun h' => hp y (List.mem_append_left _ (List.mem_append_left _ h'))
        · subst h; exact hg w hw hgs
        · exact keep_ok _ y h fun h' => hp y (List.mem_append_right _ h')
      · simp at hb
    · simp at hb
  · simp at hb

/-- A candidate with no first thema (every rule a cut) derives only
arguments that hold in every closed valuation. -/
theorem Candidate.holdsW {c : Candidate} (hc : c ∈ Themata.candidates)
    (hn : ∀ r ∈ c.rules, r.isCut = true)
    {P : Params} {T : Theory} {a : Argument} (h : c.Derives P T a) : HoldsW P T a := by
  induction h with
  | base hb he =>
    exact HoldsW.of_equiv (fun w hw hp => hw _ hb hp) he
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', hconc, heq⟩ := happ
    -- every rule of such a candidate is a cut shape
    have hcut : ∃ ua ps m, r.step = (cut ua ps m).step := by
      have hnr := hn r hr
      simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
        or_false] at hc
      rcases hc with (rfl | rfl | rfl) | hc
      · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
        exact ⟨_, _, _, rfl⟩
      · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
        rcases hr with rfl | rfl
        · simp [contrapose] at hnr
        · exact ⟨_, _, _, rfl⟩
      · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
          Themata.dialecticalTheorem] at hr
        rcases hr with rfl | rfl | rfl
        · simp [contrapose] at hnr
        · exact ⟨_, _, _, rfl⟩
        · exact ⟨_, _, _, rfl⟩
      · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
        obtain ⟨f, _, t, _, rfl⟩ := hc
        simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
        rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
        · simp [contrapose] at hnr
        · exact ⟨_, _, _, rfl⟩
    obtain ⟨ua, ps, m, hs⟩ := hcut
    rw [hs] at hb'
    have := cut_holdsW ua ps m P _ _ ih b' hb'
    have h' : HoldsW P _ ⟨b'.premises, b'.conclusion⟩ := this
    rw [hconc] at h'
    exact h'.of_equiv heq

open Formula in
/-- The countermodel: only the two conditionals of S020 are true. -/
def w020 (x : Formula) : Bool := x == cond p₀ p₁ || x == cond p₀ (neg p₁)

open Formula in
theorem w020_closed (P : Params) {T : Theory} (hT : P.single = .chrysippus ∨ T = []) :
    ClosedVal P T w020 := by
  intro a hb hp
  cases hb with
  | monolemmatic p q ha hm =>
    rcases hT with hs | hT
    · rw [hs] at ha; cases ha
    · subst hT; simp at hm
  | indemonstrable hi =>
    exfalso
    cases hi <;>
    · rename_i p q
      simp only [List.mem_cons, List.not_mem_nil, or_false, forall_eq_or_imp, forall_eq] at hp
      obtain ⟨h1, h2⟩ := hp
      simp only [w020, Bool.or_eq_true, beq_iff_eq] at h1 h2
      cases hm : P.contra <;> (cases q <;> simp_all [contradictory])

open Formula in
/-- **Proven underivable.** No Phase 3 candidate without a first thema derives
S020, "if p, q; if p, not q; therefore not p", under any setting (with
Chrysippus's policy or an empty theory). -/
theorem S020_needs_first_thema {c : Candidate} (hc : c ∈ Themata.candidates)
    (hn : ∀ r ∈ c.rules, r.isCut = true) {P : Params} {T : Theory}
    (hT : P.single = .chrysippus ∨ T = []) :
    ¬ c.Derives P T ⟨[cond p₀ p₁, cond p₀ (neg p₁)], neg p₀⟩ := by
  intro h
  have := Candidate.holdsW hc hn h w020 (w020_closed P hT) (by decide)
  exact absurd this (by decide)

end Stoic
