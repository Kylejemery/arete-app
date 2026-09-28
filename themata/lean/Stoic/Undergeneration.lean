import Stoic.Sugihara

/-!
# Proofs of undergeneration (Phase 4)

`Soundness.lean` and `Sugihara.lean` prove that candidates do *not* derive
what the ledger rejects. This file proves, for some candidates and settings,
that they fail to derive what the ledger *accepts*. That turns an `UNDER` cell
from "not found within depth N" into a proven failure, and so proves that the
candidate does not fit under that setting.

1. **Gödel semantics under the `negate` contradictory**
   (`underivable_of_goedel`). When the contradictory always prefixes a
   negation, every base case and rule shape is sound in three-valued Gödel
   logic, where negation is not involutive. The Sorites (S018) needs "not not
   p" to give p, and has a Gödel countermodel.
2. **Two premises without cut** (`underivable_no_cut`). Contraposition keeps
   the premise count, so a candidate with no cut derives, under the `list` or
   `multiset` view, only two-premise arguments (with Chrysippus's policy or an
   empty theory). This rules out S013 and S018.
3. The relevance invariant of `Soundness.lean` (`underivable_lone_atom`)
   already rules out S011 for non-merging candidates under `list` and
   `multiset`: its q occurs in one place only.
-/

namespace Stoic

/-! ## Gödel logic G₃: values 0, 1, 2 with 2 designated -/

def gimp (a b : Nat) : Nat := if a ≤ b then 2 else b
def gneg (a : Nat) : Nat := if a = 0 then 2 else 0

def gv (v : Nat → Nat) : Formula → Nat
  | .atom n => min (v n) 2
  | .neg p => gneg (gv v p)
  | .saidFalse p => gneg (gv v p)
  | .conj p q => min (gv v p) (gv v q)
  | .cond p q => gimp (gv v p) (gv v q)
  | .disj p q =>
    min (min (gimp (gneg (gv v p)) (gv v q)) (gimp (gneg (gv v q)) (gv v p)))
        (min (gimp (gv v p) (gneg (gv v q))) (gimp (gv v q) (gneg (gv v p))))

theorem gv_le (v : Nat → Nat) (p : Formula) : gv v p ≤ 2 := by
  induction p <;> simp only [gv, gimp, gneg] <;> (repeat (first | split | omega))

@[simp] theorem gv_contradictory_negate (v : Nat → Nat) (p : Formula) :
    gv v (contradictory .negate p) = gneg (gv v p) := by
  cases p <;> rfl

def meetL (l : List Nat) : Nat := l.foldr min 2

theorem meetL_le_two (l : List Nat) : meetL l ≤ 2 := by
  induction l with
  | nil => simp [meetL]
  | cons x l ih => simp only [meetL, List.foldr_cons] at ih ⊢; omega

theorem meetL_le_of_mem {l : List Nat} {x : Nat} (h : x ∈ l) : meetL l ≤ x := by
  induction l with
  | nil => simp at h
  | cons y l ih =>
    simp only [meetL, List.foldr_cons, List.mem_cons] at h ih ⊢
    rcases h with rfl | h
    · omega
    · have := ih h; omega

theorem le_meetL {l : List Nat} {m : Nat} (h2 : m ≤ 2) (h : ∀ x ∈ l, m ≤ x) : m ≤ meetL l := by
  induction l with
  | nil => simpa [meetL]
  | cons y l ih =>
    simp only [meetL, List.foldr_cons] at ih ⊢
    have := h y (by simp)
    have := ih fun x hx => h x (by simp [hx])
    omega

theorem meetL_set {l₁ l₂ : List Nat} (h : ∀ x, x ∈ l₁ ↔ x ∈ l₂) : meetL l₁ = meetL l₂ := by
  apply Nat.le_antisymm
  · exact le_meetL (meetL_le_two _) fun x hx => meetL_le_of_mem ((h x).mpr hx)
  · exact le_meetL (meetL_le_two _) fun x hx => meetL_le_of_mem ((h x).mp hx)

theorem meetL_append (l₁ l₂ : List Nat) : meetL (l₁ ++ l₂) = min (meetL l₁) (meetL l₂) := by
  apply Nat.le_antisymm
  · have h1 := le_meetL (l := l₁) (m := meetL (l₁ ++ l₂)) (meetL_le_two _)
      fun x hx => meetL_le_of_mem (List.mem_append_left _ hx)
    have h2 := le_meetL (l := l₂) (m := meetL (l₁ ++ l₂)) (meetL_le_two _)
      fun x hx => meetL_le_of_mem (List.mem_append_right _ hx)
    omega
  · apply le_meetL (by have := meetL_le_two l₁; omega)
    intro x hx
    rcases List.mem_append.mp hx with hx | hx
    · have := meetL_le_of_mem hx; omega
    · have := meetL_le_of_mem hx; omega

/-- An argument holds in G₃, relative to a theory. -/
def HoldsG (T : Theory) (a : Argument) : Prop :=
  ∀ v : Nat → Nat, (∀ t ∈ T, gv v t = 2) → meetL (a.premises.map (gv v)) ≤ gv v a.conclusion

theorem HoldsG.of_equiv {T : Theory} {w : PremiseView} {qs ps : List Formula} {c : Formula}
    (h : HoldsG T ⟨qs, c⟩) (he : w.Equiv qs ps) : HoldsG T ⟨ps, c⟩ := by
  intro v hT
  have := h v hT
  simp only at this ⊢
  rwa [meetL_set (l₂ := qs.map (gv v)) fun x => by
    simp only [List.mem_map]
    exact ⟨fun ⟨y, hy, e⟩ => ⟨y, he.mem hy, e⟩, fun ⟨y, hy, e⟩ => ⟨y, he.mem' hy, e⟩⟩]

theorem Base.soundG {P : Params} (hm : P.contra = .negate) {T : Theory} {a : Argument}
    (h : Base P T a) : HoldsG T a := by
  intro v hT
  cases h with
  | monolemmatic p q _ hmem =>
    have h1 := hT _ hmem
    have := gv_le v p; have := gv_le v q
    simp only [gv, gimp, List.map, meetL, List.foldr] at h1 ⊢
    split at h1 <;> omega
  | indemonstrable hi =>
    rw [hm] at hi
    cases hi <;>
    · rename_i p q
      have := gv_le v p; have := gv_le v q
      simp only [gv_contradictory_negate, List.map, meetL, List.foldr, gv, gimp, gneg]
      repeat (first | split | omega)

def Rule.SoundG (r : Rule) : Prop :=
  ∀ (P : Params), P.contra = .negate → ∀ (T : Theory) (as : List Argument),
    (∀ a ∈ as, HoldsG T a) → ∀ b ∈ r.step P as, HoldsG T b

theorem contrapose_soundG (w : Which) (ar : Arity) : (contrapose w ar).SoundG := by
  intro P hm T as has b hb
  simp only [contrapose] at hb
  unfold contraposeStep at hb
  split at hb
  · rename_i ps c
    have ha := has ⟨ps, c⟩ (by simp)
    split at hb
    · simp only [List.mem_filterMap, List.mem_range] at hb
      obtain ⟨i, hi, hb⟩ := hb
      split at hb
      · rename_i x hx
        split at hb
        · simp only [Option.some.injEq] at hb
          subst hb
          have hxi : ps[i] = x := by simp [hi] at hx; exact hx
          intro v hT
          have h0 := ha v hT
          simp only [hm, gv_contradictory_negate] at h0 ⊢
          have hperm := (perm_cons_eraseIdx hi).map (gv v)
          rw [meetL_set (l₂ := (ps[i] :: ps.eraseIdx i).map (gv v))
            fun y => (hperm.mem_iff)] at h0
          simp only [List.map_cons, meetL, List.foldr_cons, hxi] at h0
          simp only [List.map_append, List.map_cons, List.map_nil]
          rw [meetL_append]
          simp only [meetL, List.foldr_cons, List.foldr_nil] at h0 ⊢
          have := gv_le v x; have := gv_le v c
          have := meetL_le_two ((ps.eraseIdx i).map (gv v))
          simp only [meetL] at this
          simp only [gv_contradictory_negate]
          unfold gneg; repeat (first | split | omega)
        · simp at hb
      · simp at hb
    · simp at hb
  · simp at hb

theorem cut_soundG (userAr : Arity) (pos : Position) (merge : Bool) :
    (cut userAr pos merge).SoundG := by
  intro P _ T as has b hb
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
        intro v hT
        have h1 := hg v hT
        have h2 := hq v hT
        simp only at h1 h2 ⊢
        have hset : meetL ((( if merge then (qs.take i).filter (· ∉ gs) else qs.take i) ++ gs ++
            (if merge then (qs.drop (i + 1)).filter (· ∉ gs) else qs.drop (i + 1))).map (gv v)) =
            meetL ((qs.take i ++ gs ++ qs.drop (i + 1)).map (gv v)) := by
          apply meetL_set
          intro y
          simp only [List.mem_map, List.mem_append]
          constructor
          · rintro ⟨z, hz, rfl⟩
            refine ⟨z, ?_, rfl⟩
            rcases hz with (hz | hz) | hz
            · left; left; split at hz <;> simp_all [List.mem_filter]
            · left; right; exact hz
            · right; split at hz <;> simp_all [List.mem_filter]
          · rintro ⟨z, hz, rfl⟩
            refine ⟨z, ?_, rfl⟩
            by_cases hzg : z ∈ gs
            · left; right; exact hzg
            · rcases hz with (hz | hz) | hz
              · left; left; split <;> simp_all [List.mem_filter]
              · exact absurd hz hzg
              · right; split <;> simp_all [List.mem_filter]
        rw [hset]
        have hqs : qs = qs.take i ++ [c] ++ qs.drop (i + 1) := by
          conv => lhs; rw [← List.take_append_drop i qs, List.drop_eq_getElem_cons hi, hci]
          simp
        rw [hqs] at h2
        simp only [List.map_append, meetL_append] at h2 ⊢
        have hc : meetL [gv v c] = gv v c := by
          simp only [meetL, List.foldr]; have := gv_le v c; omega
        rw [List.map_singleton, hc] at h2
        omega
      · simp at hb
    · simp at hb
  · simp at hb

theorem Candidate.soundG {c : Candidate} (hc : ∀ r ∈ c.rules, r.SoundG)
    {P : Params} (hm : P.contra = .negate) {T : Theory} {a : Argument}
    (h : c.Derives P T a) : HoldsG T a := by
  induction h with
  | base hb he => exact (hb.soundG hm).of_equiv he
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', hconc, heq⟩ := happ
    have := hc r hr P hm _ _ ih b' hb'
    have h' : HoldsG _ ⟨b'.premises, b'.conclusion⟩ := this
    rw [hconc] at h'
    exact h'.of_equiv heq

theorem candidates_soundG : ∀ c ∈ Themata.candidates, ∀ r ∈ c.rules, r.SoundG := by
  intro c hc r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
    exact cut_soundG _ _ _
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_soundG _ _
    · exact cut_soundG _ _ _
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_soundG _ _
    · exact cut_soundG _ _ _
    · exact cut_soundG _ _ _
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_soundG _ _
    · exact cut_soundG _ _ _

/-- **Proven underivable**, `negate` contradictory: a G₃ countermodel that
designates the theory rules out derivation by every Phase 3 candidate. -/
theorem underivable_of_goedel {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} (hm : P.contra = .negate) {T : Theory} {a : Argument} (v : Nat → Nat)
    (hT : ∀ t ∈ T, gv v t = 2)
    (hn : gv v a.conclusion < meetL (a.premises.map (gv v))) : ¬ c.Derives P T a := by
  intro h
  have := Candidate.soundG (candidates_soundG c hc) hm h v hT
  omega

theorem underivable_of_goedel_chrysippus {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} (hm : P.contra = .negate) (hs : P.single = .chrysippus) {T : Theory}
    {a : Argument} (v : Nat → Nat)
    (hn : gv v a.conclusion < meetL (a.premises.map (gv v))) : ¬ c.Derives P T a := fun h =>
  underivable_of_goedel hc hm (T := []) v (by simp) hn (Derives.drop_theory hs h)

/-! ## Without cut, every derived argument has two premises -/

def Rule.KeepsLength (r : Rule) : Prop :=
  ∀ (P : Params) (as : List Argument) (n : Nat),
    (∀ a ∈ as, a.premises.length = n) → ∀ b ∈ r.step P as, b.premises.length = n

theorem contrapose_keepsLength (w : Which) (ar : Arity) : (contrapose w ar).KeepsLength := by
  intro P as n has b hb
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

theorem candidates_keepLength : ∀ c ∈ Themata.candidates,
    (∀ r ∈ c.rules, r.isCut = false) → ∀ r ∈ c.rules, r.KeepsLength := by
  intro c hc hn r hr
  have hnr := hn r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr; simp [cut] at hnr
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_keepsLength _ _
    · simp [cut] at hnr
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_keepsLength _ _
    · simp [cut] at hnr
    · simp [cut] at hnr
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_keepsLength _ _
    · simp [cut] at hnr

theorem Candidate.length_two {c : Candidate} (hc : ∀ r ∈ c.rules, r.KeepsLength)
    {P : Params} {T : Theory} (hT : P.single = .chrysippus ∨ T = []) (hv : P.view ≠ .set)
    {a : Argument} (h : c.Derives P T a) : a.premises.length = 2 := by
  induction h with
  | base hb he =>
    have hl := he.length hv
    cases hb with
    | monolemmatic _ _ ha hmem =>
      rcases hT with hs | hT
      · rw [hs] at ha; cases ha
      · subst hT; simp at hmem
    | indemonstrable hi => cases hi <;> simp at hl ⊢ <;> omega
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', _, heq⟩ := happ
    have := hc r hr P _ 2 ih b' hb'
    have := heq.length hv
    omega

/-- **Proven underivable.** Under the `list` or `multiset` view, with
Chrysippus's policy or no theory, a candidate without cut derives only
two-premise arguments. -/
theorem underivable_no_cut {c : Candidate} (hc : c ∈ Themata.candidates)
    (hn : ∀ r ∈ c.rules, r.isCut = false)
    {P : Params} {T : Theory} (hT : P.single = .chrysippus ∨ T = []) (hv : P.view ≠ .set)
    {a : Argument} (ha : a.premises.length ≠ 2) : ¬ c.Derives P T a := fun h =>
  ha (Candidate.length_two (candidates_keepLength c hc hn) hT hv h)

end Stoic
