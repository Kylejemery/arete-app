import Stoic.Themata.Generated

/-!
# Soundness: the route to "proven underivable" (Phase 4)

Guardrail 4: never report "not found within depth N" as "proven
underivable". This file supplies one honest way to prove underivability.

Every base case and every rule shape preserves truth under the Philonian
(truth-functional) reading, relative to the background theory. So if an
argument has a Philonian countermodel that makes the theory true, the premises
true and the conclusion false, no candidate derives it, under any parameter
setting. The harness finds countermodels by evaluation and cites
`underivable_of_countermodel`.

This holds for every rule built from the Phase 3 shapes, including the named
candidates, because soundness is proved for the shapes and then for each
candidate's rule list (`candidates_sound`).

It gives nothing for arguments that are Philonian-valid but rejected, such as
S016 (a redundant premise). Those stay "not found within depth N" unless
another invariant applies.
-/

namespace Stoic

/-- Philonian truth under a valuation. `holdsAt .philonian [v] 0`, written
out so the proofs stay short. -/
def ev (v : Nat → Bool) : Formula → Bool
  | .atom n => v n
  | .neg p => !ev v p
  | .saidFalse p => !ev v p
  | .conj p q => ev v p && ev v q
  | .disj p q => ev v p != ev v q
  | .cond p q => !ev v p || ev v q

/-- Truth-preservation relative to a background theory. -/
def Holds (T : Theory) (a : Argument) : Prop :=
  ∀ v : Nat → Bool, (∀ t ∈ T, ev v t = true) →
    (∀ p ∈ a.premises, ev v p = true) → ev v a.conclusion = true

@[simp] theorem ev_contradictory (v : Nat → Bool) (m : Contradictory) (p : Formula) :
    ev v (contradictory m p) = !ev v p := by
  cases p <;> (try cases m) <;> simp [contradictory, ev]

/-- Every view is symmetric in membership. -/
theorem PremiseView.Equiv.mem' {v : PremiseView} {xs ys : List Formula}
    (h : v.Equiv xs ys) {x : Formula} (hx : x ∈ xs) : x ∈ ys := by
  cases v
  · simp only [PremiseView.Equiv] at h; subst h; exact hx
  · exact (List.Perm.mem_iff h).mp hx
  · exact (h x).mp hx

theorem Holds.of_equiv {T : Theory} {v : PremiseView} {qs ps : List Formula} {c : Formula}
    (h : Holds T ⟨qs, c⟩) (he : v.Equiv qs ps) : Holds T ⟨ps, c⟩ :=
  fun w hT hp => h w hT fun x hx => hp x (he.mem' hx)

theorem Base.sound {P : Params} {T : Theory} {a : Argument} (h : Base P T a) : Holds T a := by
  intro v hT hp
  cases h with
  | monolemmatic p q _ hm =>
    have h1 := hT _ hm
    have h2 := hp p (by simp)
    simp [ev] at h1 h2 ⊢
    simp_all
  | indemonstrable hi =>
    cases hi <;> simp [ev] at hp ⊢ <;>
      (obtain ⟨h1, h2⟩ := hp) <;>
      (revert h1 h2) <;>
      (cases ev v _ <;> cases ev v _ <;> simp)

/-- A rule is sound if it takes truth-preserving arguments to
truth-preserving arguments. -/
def Rule.Sound (r : Rule) : Prop :=
  ∀ (P : Params) (T : Theory) (as : List Argument),
    (∀ a ∈ as, Holds T a) → ∀ b ∈ r.step P as, Holds T b

theorem mem_eraseIdx_or {l : List Formula} {i : Nat} {x y : Formula}
    (hi : l[i]? = some x) (hy : y ∈ l) : y ∈ l.eraseIdx i ∨ y = x := by
  obtain ⟨j, hj, rfl⟩ := List.getElem_of_mem hy
  by_cases hji : j = i
  · subst hji; right; simp [hj] at hi; exact hi
  · left; exact List.mem_eraseIdx_iff_getElem.mpr ⟨j, hj, hji, rfl⟩

theorem contrapose_sound (w : Which) (ar : Arity) : (contrapose w ar).Sound := by
  intro P T as has b hb
  simp only [contrapose] at hb
  unfold contraposeStep at hb
  split at hb
  · rename_i ps c
    have ha := has ⟨ps, c⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, _, hb⟩ := hb
      split at hb
      · rename_i x hx
        split at hb
        · simp only [Option.some.injEq] at hb
          subst hb
          intro v hT hp
          simp only [List.mem_append, List.mem_singleton] at hp
          have hc : ev v (contradictory P.contra c) = true := hp _ (Or.inr rfl)
          simp only [ev_contradictory, Bool.not_eq_true'] at hc ⊢
          cases hxv : ev v x
          · rfl
          · have := ha v hT fun y hy => by
              rcases mem_eraseIdx_or hx hy with h | h
              · exact hp y (Or.inl h)
              · subst h; exact hxv
            simp_all
        · simp at hb
      · simp at hb
    · simp at hb
  · simp at hb

theorem mem_split {l : List Formula} {i : Nat} {c y : Formula} (hi : l[i]? = some c)
    (hy : y ∈ l) : y ∈ l.take i ∨ y = c ∨ y ∈ l.drop (i + 1) := by
  have hlt : i < l.length := by
    rcases Nat.lt_or_ge i l.length with h | h
    · exact h
    · simp [List.getElem?_eq_none h] at hi
  have hc : l[i] = c := by simp [hlt] at hi; exact hi
  rw [← List.take_append_drop i l, List.drop_eq_getElem_cons hlt] at hy
  simp only [List.mem_append, List.mem_cons] at hy
  rcases hy with h | h | h
  · exact .inl h
  · exact .inr (.inl (h.trans hc))
  · exact .inr (.inr h)

theorem cut_sound (userAr : Arity) (pos : Position) (merge : Bool) :
    (cut userAr pos merge).Sound := by
  intro P T as has b hb
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
        intro v hT hp
        have hgs : ∀ y ∈ gs, ev v y = true := fun y hy =>
          hp y (List.mem_append_left _ (List.mem_append_right _ hy))
        have keep_ok : ∀ (xs : List Formula) y, y ∈ xs →
            (y ∈ (if merge then xs.filter (· ∉ gs) else xs) → ev v y = true) → ev v y = true := by
          intro xs y hy hk
          by_cases hyg : y ∈ gs
          · exact hgs y hyg
          · apply hk; split <;> simp [hy, hyg]
        apply hq v hT
        intro y hy
        rcases mem_split hcond.1 hy with h | h | h
        · exact keep_ok _ y h fun h' => hp y (List.mem_append_left _ (List.mem_append_left _ h'))
        · subst h; exact hg v hT hgs
        · exact keep_ok _ y h fun h' => hp y (List.mem_append_right _ h')
      · simp at hb
    · simp at hb
  · simp at hb

/-- A candidate whose rules are all sound derives only truth-preserving
arguments, under every parameter setting. -/
theorem Candidate.sound {c : Candidate} (hc : ∀ r ∈ c.rules, r.Sound)
    {P : Params} {T : Theory} {a : Argument} (h : c.Derives P T a) : Holds T a := by
  induction h with
  | base hb he => exact hb.sound.of_equiv he
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', hconc, heq⟩ := happ
    have := hc r hr P T _ ih b' hb'
    intro v hT hp
    rw [← hconc]
    exact this v hT fun x hx => hp x (heq.mem' hx)

/-! ## Every Phase 3 candidate is sound -/

theorem named_sound (r : Rule) (hs : r.Sound) (n : String) : ({ r with name := n } : Rule).Sound := hs

theorem candidates_sound : ∀ c ∈ Themata.candidates, ∀ r ∈ c.rules, r.Sound := by
  intro c hc r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
    exact cut_sound _ _ _
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_sound _ _
    · exact cut_sound _ _ _
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_sound _ _
    · exact cut_sound _ _ _
    · exact cut_sound _ _ _
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_sound _ _
    · exact cut_sound _ _ _

/-- **Proven underivable.** A Philonian countermodel to an argument, one that
makes the background theory true, rules out its derivation by every Phase 3
candidate under every parameter setting. -/
theorem underivable_of_countermodel {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} {T : Theory} {a : Argument} (v : Nat → Bool)
    (hT : ∀ t ∈ T, ev v t = true) (hp : ∀ p ∈ a.premises, ev v p = true)
    (hn : ev v a.conclusion = false) : ¬ c.Derives P T a := by
  intro h
  have := Candidate.sound (candidates_sound c hc) h v hT hp
  simp_all

/-! ## A second invariant: at least two premises (Chrysippus's policy)

Under Chrysippus's policy no base argument has one premise, contraposition
keeps the premise count, and cut never drops below the lemma's premises. So
under the `list` and `multiset` views every derived argument has at least two
premises, and no candidate derives a single-premise argument (S014, S015).
Under `set` a view can shrink a list, and the invariant is not claimed. -/

/-- A rule keeps every argument at two premises or more. -/
def Rule.KeepsTwo (r : Rule) : Prop :=
  ∀ (P : Params) (as : List Argument),
    (∀ a ∈ as, 2 ≤ a.premises.length) → ∀ b ∈ r.step P as, 2 ≤ b.premises.length

theorem contrapose_keepsTwo (w : Which) (ar : Arity) : (contrapose w ar).KeepsTwo := by
  intro P as has b hb
  simp only [contrapose] at hb
  unfold contraposeStep at hb
  split at hb
  · rename_i ps c
    have h2 := has ⟨ps, c⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, hi, hb⟩ := hb
      split at hb
      · split at hb
        · simp only [Option.some.injEq] at hb
          subst hb
          simp only [List.length_append, List.length_eraseIdx, List.length_singleton] at h2 ⊢
          split <;> omega
        · simp at hb
      · simp at hb
    · simp at hb
  · simp at hb

theorem cut_keepsTwo (userAr : Arity) (pos : Position) (merge : Bool) :
    (cut userAr pos merge).KeepsTwo := by
  intro P as has b hb
  simp only [cut] at hb
  unfold cutStep at hb
  split at hb
  · rename_i gs c qs d
    have h2 := has ⟨gs, c⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, _, hb⟩ := hb
      split at hb
      · simp only [Option.some.injEq] at hb
        subst hb
        simp only [List.length_append] at h2 ⊢
        omega
      · simp at hb
    · simp at hb
  · simp at hb

theorem candidates_keepTwo : ∀ c ∈ Themata.candidates, ∀ r ∈ c.rules, r.KeepsTwo := by
  intro c hc r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
    exact cut_keepsTwo _ _ _
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_keepsTwo _ _
    · exact cut_keepsTwo _ _ _
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_keepsTwo _ _
    · exact cut_keepsTwo _ _ _
    · exact cut_keepsTwo _ _ _
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_keepsTwo _ _
    · exact cut_keepsTwo _ _ _

theorem Candidate.two_premises {c : Candidate} (hc : ∀ r ∈ c.rules, r.KeepsTwo)
    {P : Params} {T : Theory} (hs : P.single = .chrysippus) (hv : P.view ≠ .set)
    {a : Argument} (h : c.Derives P T a) : 2 ≤ a.premises.length := by
  induction h with
  | base hb he =>
    have hl := he.length hv
    cases hb with
    | monolemmatic _ _ ha _ => rw [hs] at ha; cases ha
    | indemonstrable hi => cases hi <;> simp at hl ⊢ <;> omega
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', _, heq⟩ := happ
    have := hc r hr P _ ih b' hb'
    have := heq.length hv
    omega

/-- **Proven underivable.** Under Chrysippus's policy and the `list` or
`multiset` view, no Phase 3 candidate derives an argument with fewer than
two premises. -/
theorem underivable_single_premise {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} {T : Theory} (hs : P.single = .chrysippus) (hv : P.view ≠ .set)
    {a : Argument} (ha : a.premises.length < 2) : ¬ c.Derives P T a := by
  intro h
  have := Candidate.two_premises (candidates_keepTwo c hc) hs hv h
  omega

/-! ## A third invariant: no atom stands in exactly one place

For an atom `n`, `slots a n` counts the premises of `a` in which `n` occurs,
plus one if it occurs in the conclusion. In every base case each atom has 0
or at least 2 slots. Contraposition keeps every count, and plain cut adds the
counts of its two inputs less two for the cut proposition, so neither can
produce a count of exactly 1. The merging cut can (it may drop the second
copy of a premise), so the invariant is claimed only for candidates without
it. Antipater's single-premise base cases can break it too, so it needs
Chrysippus's policy or an empty background theory.

An argument with an atom in exactly one slot, such as S016's idle premise
`r`, is therefore underivable under the `list` and `multiset` views. This is
the Phase 2 redundancy result (`redundant_not_derivable`) carried from the
base cases to every non-merging candidate. -/

def slots (a : Argument) (n : Nat) : Nat :=
  a.premises.countP (fun x => decide (n ∈ x.atoms)) + if n ∈ a.conclusion.atoms then 1 else 0

def Relevant (a : Argument) : Prop := ∀ n, slots a n ≠ 1

theorem atoms_contradictory (m : Contradictory) (p : Formula) :
    (contradictory m p).atoms = p.atoms := by
  cases p <;> (try cases m) <;> rfl

def Rule.KeepsRelevant (r : Rule) : Prop :=
  ∀ (P : Params) (as : List Argument),
    (∀ a ∈ as, Relevant a) → ∀ b ∈ r.step P as, Relevant b

theorem countP_eraseIdx_add {l : List Formula} {i : Nat} (h : i < l.length) (p : Formula → Bool) :
    (l.eraseIdx i).countP p + (if p l[i] then 1 else 0) = l.countP p := by
  conv => rhs; rw [← List.take_append_drop i l, List.drop_eq_getElem_cons h]
  rw [List.eraseIdx_eq_take_drop_succ]
  simp only [List.countP_append, List.countP_cons]
  omega

theorem contrapose_keepsRelevant (w : Which) (ar : Arity) : (contrapose w ar).KeepsRelevant := by
  intro P as has b hb
  simp only [contrapose] at hb
  unfold contraposeStep at hb
  split at hb
  · rename_i ps c
    have hr := has ⟨ps, c⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, hi, hb⟩ := hb
      split at hb
      · rename_i x hx
        split at hb
        · simp only [Option.some.injEq] at hb
          subst hb
          have hxi : ps[i] = x := by simp [hi] at hx; exact hx
          intro n
          have h1 := hr n
          have h2 := countP_eraseIdx_add hi (fun y => decide (n ∈ y.atoms))
          simp only [slots, List.countP_append, List.countP_singleton, atoms_contradictory,
            hxi] at h1 h2 ⊢
          split at h2 <;> split <;> split at h1 <;> simp_all <;> omega
        · simp at hb
      · simp at hb
    · simp at hb
  · simp at hb

theorem cut_keepsRelevant (userAr : Arity) (pos : Position) :
    (cut userAr pos false).KeepsRelevant := by
  intro P as has b hb
  simp only [cut] at hb
  unfold cutStep at hb
  split at hb
  · rename_i gs c qs d
    have hg := has ⟨gs, c⟩ (by simp)
    have hq := has ⟨qs, d⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, hi, hb⟩ := hb
      split at hb
      · rename_i hcond
        simp only [Option.some.injEq] at hb
        subst hb
        have hci : qs[i] = c := by simp [hi] at hcond; exact hcond.1
        intro n
        have h1 := hg n
        have h2 := hq n
        have hsplit : qs.countP (fun y => decide (n ∈ y.atoms)) =
            (qs.take i).countP (fun y => decide (n ∈ y.atoms)) +
            (if n ∈ c.atoms then 1 else 0) +
            (qs.drop (i + 1)).countP (fun y => decide (n ∈ y.atoms)) := by
          conv => lhs; rw [← List.take_append_drop i qs, List.drop_eq_getElem_cons hi]
          simp only [List.countP_append, List.countP_cons, hci]
          split <;> simp_all <;> omega
        simp only [slots, Bool.false_eq_true, ↓reduceIte, List.countP_append] at h1 h2 ⊢
        rw [hsplit] at h2
        have hC : (if n ∈ c.atoms then 1 else 0) ≤ 1 := by split <;> omega
        generalize (if n ∈ c.atoms then 1 else 0) = C at h1 h2 hC
        generalize (if n ∈ d.atoms then 1 else 0) = D at h2 ⊢
        omega
      · simp at hb
    · simp at hb
  · simp at hb

theorem Base.relevant {P : Params} {T : Theory} {a : Argument} (h : Base P T a)
    (hT : P.single = .chrysippus ∨ T = []) : Relevant a := by
  cases h with
  | monolemmatic p q ha hm =>
    rcases hT with hs | hT
    · rw [hs] at ha; cases ha
    · subst hT; simp at hm
  | indemonstrable hi =>
    intro n
    cases hi <;>
    · rename_i p q
      simp only [slots, Formula.atoms, List.countP_cons, List.countP_nil, atoms_contradictory,
        List.mem_append]
      by_cases h1 : n ∈ p.atoms <;> by_cases h2 : n ∈ q.atoms <;> simp [h1, h2]

theorem Relevant.of_equiv {v : PremiseView} (hv : v ≠ .set) {qs ps : List Formula} {c : Formula}
    (h : Relevant ⟨qs, c⟩) (he : v.Equiv qs ps) : Relevant ⟨ps, c⟩ := by
  intro n
  have := h n
  simp only [slots] at this ⊢
  cases v
  · simp only [PremiseView.Equiv] at he; subst he; exact this
  · rw [← List.Perm.countP_eq _ he]; exact this
  · exact absurd rfl hv

theorem Candidate.relevant {c : Candidate} (hc : ∀ r ∈ c.rules, r.KeepsRelevant)
    {P : Params} {T : Theory} (hT : P.single = .chrysippus ∨ T = []) (hv : P.view ≠ .set)
    {a : Argument} (h : c.Derives P T a) : Relevant a := by
  induction h with
  | base hb he => exact (hb.relevant hT).of_equiv hv he
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', hconc, heq⟩ := happ
    have := hc r hr P _ ih b' hb'
    have h' : Relevant ⟨b'.premises, b'.conclusion⟩ := this
    rw [hconc] at h'
    exact h'.of_equiv hv heq

theorem candidates_keepRelevant : ∀ c ∈ Themata.candidates,
    (∀ r ∈ c.rules, r.merging = false) → ∀ r ∈ c.rules, r.KeepsRelevant := by
  intro c hc hm r hr
  have hmr := hm r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
    exact cut_keepsRelevant _ _
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_keepsRelevant _ _
    · exact cut_keepsRelevant _ _
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_keepsRelevant _ _
    · simp [cut] at hmr
    · exact cut_keepsRelevant _ _
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_keepsRelevant _ _
    · simp only [cut] at hmr; subst hmr; exact cut_keepsRelevant _ _

/-- **Proven underivable.** Under the `list` or `multiset` view, with
Chrysippus's policy or no background theory, no Phase 3 candidate without the
merging cut derives an argument in which some atom occurs in exactly one
place. -/
theorem underivable_lone_atom {c : Candidate} (hc : c ∈ Themata.candidates)
    (hm : ∀ r ∈ c.rules, r.merging = false)
    {P : Params} {T : Theory} (hT : P.single = .chrysippus ∨ T = []) (hv : P.view ≠ .set)
    {a : Argument} (n : Nat) (hn : slots a n = 1) : ¬ c.Derives P T a := by
  intro h
  exact Candidate.relevant (candidates_keepRelevant c hc hm) hT hv h n hn

end Stoic
