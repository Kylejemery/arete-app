import Stoic.Soundness

/-!
# A relevance semantics: the Sugihara model of R-mingle

`Soundness.lean` proves underivability by Philonian countermodels. That cannot
reach S016 ("if p, q; p; r; therefore q"), because classical validity is
monotonic: adding a premise never breaks it. The Stoic rules, though, never
weaken, and this file shows they are sound for a semantics that has no
weakening either.

Values are integers, and a value is designated when it is `≥ 0` (the Sugihara
matrix, the characteristic model of the relevance logic RM). The premises of
an argument are combined by *fusion*, not by classical conjunction. Fusion is
commutative, associative and idempotent, so it respects every premise view
and the merging cut, but it is not monotonic. An argument holds when the
fusion of its premises is at most its conclusion, on every valuation that
designates the background theory.

Interpretation:

* `neg` is `-x`, and `cond` is Sugihara implication.
* `conj` is fusion. So "not both p and q" is `p → not q`, which is what makes
  the third indemonstrable valid.
* `disj p q` is `(not p → q) ∧ (q → not p)`, taking the minimum. This makes
  the fourth and fifth indemonstrables valid in both positions.
* `saidFalse` is left free: the rules never look inside it.

Every base case holds, and contraposition and cut (merging or not) preserve
holding. So every candidate derives only arguments that hold here
(`Candidate.soundS`), and a Sugihara countermodel proves an item underivable
under every parameter setting (`underivable_of_sugihara`). S016 has one:
p = q = 0, r = 1.

This is a device for proving underivability, not a claim that the Stoics
held a relevance logic. What it shows is that the themata as encoded never
add a premise from nowhere, and that the merging cut is not enough to make
them.
-/

namespace Stoic

/-! ## The Sugihara operations -/

def simp' (a b : Int) : Int := if a ≤ b then max (-a) b else min (-a) b
def fus (a b : Int) : Int := if a + b ≤ 0 then min a b else max a b

theorem fus_comm (a b : Int) : fus a b = fus b a := by
  unfold fus; split <;> split <;> omega

theorem fus_assoc (a b c : Int) : fus (fus a b) c = fus a (fus b c) := by
  unfold fus; repeat (first | split | omega)

theorem fus_idem (a : Int) : fus a a = a := by unfold fus; split <;> omega

theorem fus_zero (a : Int) : fus a 0 = a := by unfold fus; split <;> omega

theorem fus_mono {a a' : Int} (b : Int) (h : a ≤ a') : fus a b ≤ fus a' b := by
  unfold fus; repeat (first | split | omega)

/-- Residuation: fusion is left adjoint to implication. -/
theorem fus_le_iff (a b c : Int) : fus a b ≤ c ↔ a ≤ simp' b c := by
  unfold fus simp'; repeat (first | split | omega)

theorem simp'_contra (b c : Int) : simp' b c = simp' (-c) (-b) := by
  unfold simp'; repeat (first | split | omega)

theorem simp'_designated (a b : Int) : 0 ≤ simp' a b ↔ a ≤ b := by
  unfold simp'; repeat (first | split | omega)

theorem fus_eq_neg_simp' (a b : Int) : fus a b = -(simp' a (-b)) := by
  unfold fus simp'; repeat (first | split | omega)

/-! ## Values of formulas and arguments -/

/-- `σ` interprets asserted falsity; the rules never inspect it. -/
def sv (σ : Int → Int) (v : Nat → Int) : Formula → Int
  | .atom n => v n
  | .neg p => -(sv σ v p)
  | .saidFalse p => σ (sv σ v p)
  | .conj p q => fus (sv σ v p) (sv σ v q)
  | .disj p q => min (simp' (-(sv σ v p)) (sv σ v q)) (simp' (sv σ v q) (-(sv σ v p)))
  | .cond p q => simp' (sv σ v p) (sv σ v q)

@[simp] theorem sv_contradictory (σ : Int → Int) (v : Nat → Int) (m : Contradictory) (p : Formula) :
    sv σ v (contradictory m p) = -(sv σ v p) := by
  cases p <;> (try cases m) <;> simp [contradictory, sv]

/-- Fusion of a list of values, with `0` (the identity) for the empty list. -/
def fusL (l : List Int) : Int := l.foldr fus 0

theorem fusL_append (l₁ l₂ : List Int) : fusL (l₁ ++ l₂) = fus (fusL l₁) (fusL l₂) := by
  induction l₁ with
  | nil => simp [fusL, fus_comm 0, fus_zero]
  | cons x l ih => simp only [fusL, List.cons_append, List.foldr_cons] at ih ⊢; rw [ih, fus_assoc]

theorem fusL_perm {l₁ l₂ : List Int} (h : l₁.Perm l₂) : fusL l₁ = fusL l₂ := by
  induction h with
  | nil => rfl
  | cons x _ ih => simp only [fusL, List.foldr_cons] at ih ⊢; rw [ih]
  | swap x y l => simp only [fusL, List.foldr_cons]; rw [← fus_assoc, ← fus_assoc, fus_comm y x]
  | trans _ _ ih₁ ih₂ => exact ih₁.trans ih₂

theorem fusL_absorb {x : Int} {l : List Int} (hx : x ∈ l) : fusL (x :: l) = fusL l := by
  have e := fusL_perm (List.perm_cons_erase hx)
  simp only [fusL, List.foldr_cons] at e ⊢
  rw [e, ← fus_assoc, fus_idem]

theorem fusL_append_sub {l₁ l₂ : List Int} (h : ∀ x ∈ l₂, x ∈ l₁) :
    fusL (l₁ ++ l₂) = fusL l₁ := by
  induction l₂ with
  | nil => simp
  | cons y l ih =>
    have hy : y ∈ l₁ ++ l := List.mem_append_left _ (h y (by simp))
    rw [fusL_perm (List.perm_middle), fusL_absorb hy]
    exact ih fun x hx => h x (by simp [hx])

/-- Fusion depends only on which values occur. -/
theorem fusL_set {l₁ l₂ : List Int} (h : ∀ x, x ∈ l₁ ↔ x ∈ l₂) : fusL l₁ = fusL l₂ := by
  rw [← fusL_append_sub (l₁ := l₁) (l₂ := l₂) fun x hx => (h x).mpr hx,
    fusL_perm List.perm_append_comm, fusL_append_sub fun x hx => (h x).mp hx]

/-- An argument holds in the Sugihara model, relative to a theory. -/
def HoldsS (σ : Int → Int) (T : Theory) (a : Argument) : Prop :=
  ∀ v : Nat → Int, (∀ t ∈ T, 0 ≤ sv σ v t) →
    fusL (a.premises.map (sv σ v)) ≤ sv σ v a.conclusion

theorem HoldsS.of_equiv {σ} {T : Theory} {vw : PremiseView} {qs ps : List Formula} {c : Formula}
    (h : HoldsS σ T ⟨qs, c⟩) (he : vw.Equiv qs ps) : HoldsS σ T ⟨ps, c⟩ := by
  intro v hT
  have := h v hT
  simp only at this ⊢
  rwa [fusL_set (l₂ := qs.map (sv σ v)) fun x => by
    simp only [List.mem_map]
    exact ⟨fun ⟨y, hy, e⟩ => ⟨y, he.mem hy, e⟩, fun ⟨y, hy, e⟩ => ⟨y, he.mem' hy, e⟩⟩]

theorem le_simp'_of {x b c : Int} (h : x ≤ simp' (-c) (-b)) : x ≤ simp' b c := by
  rw [simp'_contra]; exact h

theorem fusL_two (a b : Int) : fusL [a, b] = fus a b := by simp [fusL, fus_zero]

theorem Base.soundS {σ} {P : Params} {T : Theory} {a : Argument} (h : Base P T a) :
    HoldsS σ T a := by
  intro v hT
  cases h with
  | monolemmatic p q _ hm =>
    have := (simp'_designated _ _).mp (hT _ hm)
    simp [fusL, fus_zero] at this ⊢; exact this
  | indemonstrable hi =>
    cases hi <;> simp only [List.map, fusL_two, sv, sv_contradictory, fus_le_iff] <;>
      first
      | exact Int.le_refl _
      | exact Int.min_le_left _ _
      | exact Int.min_le_right _ _
      | (rw [fus_eq_neg_simp', Int.neg_neg]; exact Int.le_refl _)
      | (rw [fus_comm, fus_eq_neg_simp', Int.neg_neg]; exact Int.le_refl _)
      | (apply le_simp'_of; simp only [Int.neg_neg]
         first
         | exact Int.le_refl _
         | exact Int.min_le_left _ _
         | exact Int.min_le_right _ _)

/-! ## The rule shapes preserve holding -/

theorem perm_cons_eraseIdx {l : List Formula} {i : Nat} (h : i < l.length) :
    l.Perm (l[i] :: l.eraseIdx i) := by
  rw [List.eraseIdx_eq_take_drop_succ]
  conv => lhs; rw [← List.take_append_drop i l, List.drop_eq_getElem_cons h]
  exact List.perm_middle

def Rule.SoundS (r : Rule) : Prop :=
  ∀ (σ : Int → Int) (P : Params) (T : Theory) (as : List Argument),
    (∀ a ∈ as, HoldsS σ T a) → ∀ b ∈ r.step P as, HoldsS σ T b

theorem contrapose_soundS (w : Which) (ar : Arity) : (contrapose w ar).SoundS := by
  intro σ P T as has b hb
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
          simp only at h0 ⊢
          -- ps is x followed by the others, up to order
          have hperm : (ps.map (sv σ v)).Perm ((sv σ v x) :: (ps.eraseIdx i).map (sv σ v)) := by
            rw [← hxi]
            exact (perm_cons_eraseIdx hi).map _
          rw [fusL_perm hperm] at h0
          simp only [fusL, List.foldr_cons] at h0
          rw [fus_comm, fus_le_iff, simp'_contra, ← fus_le_iff] at h0
          rw [List.map_append, fusL_append]
          simpa [fusL, fus_zero, sv_contradictory] using h0
        · simp at hb
      · simp at hb
    · simp at hb
  · simp at hb

theorem cut_soundS (userAr : Arity) (pos : Position) (merge : Bool) :
    (cut userAr pos merge).SoundS := by
  intro σ P T as has b hb
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
        -- merging only drops premises already among the lemma's: same value set
        have hset : fusL ((( if merge then (qs.take i).filter (· ∉ gs) else qs.take i) ++ gs ++
            (if merge then (qs.drop (i + 1)).filter (· ∉ gs) else qs.drop (i + 1))).map (sv σ v)) =
            fusL ((qs.take i ++ gs ++ qs.drop (i + 1)).map (sv σ v)) := by
          apply fusL_set
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
        simp only [List.map_append, fusL_append] at h2 ⊢
        have hc : fusL [sv σ v c] = sv σ v c := by simp [fusL, fus_zero]
        rw [List.map_singleton, hc] at h2
        refine Int.le_trans (fus_mono _ ?_) h2
        rw [fus_comm _ (fusL (gs.map _)), fus_comm _ (sv σ v c)]
        exact fus_mono _ h1
      · simp at hb
    · simp at hb
  · simp at hb

theorem Candidate.soundS {c : Candidate} (hc : ∀ r ∈ c.rules, r.SoundS) (σ : Int → Int)
    {P : Params} {T : Theory} {a : Argument} (h : c.Derives P T a) : HoldsS σ T a := by
  induction h with
  | base hb he => exact hb.soundS.of_equiv he
  | thema t ht _ happ ih =>
    simp only [Candidate.themata, List.mem_map] at ht
    obtain ⟨r, hr, rfl⟩ := ht
    obtain ⟨b', hb', hconc, heq⟩ := happ
    have := hc r hr σ P _ _ ih b' hb'
    have h' : HoldsS σ _ ⟨b'.premises, b'.conclusion⟩ := this
    rw [hconc] at h'
    exact h'.of_equiv heq

theorem candidates_soundS : ∀ c ∈ Themata.candidates, ∀ r ∈ c.rules, r.SoundS := by
  intro c hc r hr
  simp only [Themata.candidates, List.mem_append, List.mem_cons, List.not_mem_nil,
    or_false] at hc
  rcases hc with (rfl | rfl | rfl) | hc
  · simp [Themata.attested, Themata.thirdSimplicius] at hr; subst hr
    exact cut_soundS _ _ _
  · simp [Themata.mates, Themata.firstMates, Themata.thirdMates] at hr
    rcases hr with rfl | rfl
    · exact contrapose_soundS _ _
    · exact cut_soundS _ _ _
  · simp [Themata.matesDT, Themata.firstMates, Themata.thirdMates,
      Themata.dialecticalTheorem] at hr
    rcases hr with rfl | rfl | rfl
    · exact contrapose_soundS _ _
    · exact cut_soundS _ _ _
    · exact cut_soundS _ _ _
  · simp only [Themata.generated, List.mem_flatMap, List.mem_map] at hc
    obtain ⟨f, _, t, _, rfl⟩ := hc
    simp only [List.mem_append, Option.mem_toList, Option.map_eq_some_iff] at hr
    rcases hr with ⟨⟨w, a⟩, _, rfl⟩ | ⟨⟨a, p, m⟩, _, rfl⟩
    · exact contrapose_soundS _ _
    · exact cut_soundS _ _ _

/-- **Proven underivable.** A Sugihara countermodel that designates the
background theory rules out derivation by every Phase 3 candidate, under every
parameter setting, merging cut and `set` view included. -/
theorem underivable_of_sugihara {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} {T : Theory} {a : Argument} (σ : Int → Int) (v : Nat → Int)
    (hT : ∀ t ∈ T, 0 ≤ sv σ v t)
    (hn : sv σ v a.conclusion < fusL (a.premises.map (sv σ v))) : ¬ c.Derives P T a := by
  intro h
  have := Candidate.soundS (candidates_soundS c hc) σ h v hT
  omega

/-! ## Chrysippus's policy never uses the background theory -/

/-- Under Chrysippus's policy the background theory is idle (only Antipater's
single-premise base cases read it), so it can be dropped. -/
theorem Derives.drop_theory {P : Params} (hs : P.single = .chrysippus) {T : Theory}
    {R : List Thema} {a : Argument} (h : Derives P T R a) : Derives P [] R a := by
  induction h with
  | base hb he =>
    cases hb with
    | indemonstrable hi => exact .base (.indemonstrable hi) he
    | monolemmatic _ _ ha _ => rw [hs] at ha; cases ha
  | thema t ht _ happ ih => exact .thema t ht ih happ

/-- **Proven underivable**, Chrysippus's policy: a Philonian countermodel
with no background theory suffices, whatever the item's theory. -/
theorem underivable_of_countermodel_chrysippus {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} (hs : P.single = .chrysippus) {T : Theory} {a : Argument} (v : Nat → Bool)
    (hp : ∀ p ∈ a.premises, ev v p = true) (hn : ev v a.conclusion = false) :
    ¬ c.Derives P T a := fun h =>
  underivable_of_countermodel hc (T := []) v (by simp) hp hn (Derives.drop_theory hs h)

/-- **Proven underivable**, Chrysippus's policy: likewise for a Sugihara
countermodel. -/
theorem underivable_of_sugihara_chrysippus {c : Candidate} (hc : c ∈ Themata.candidates)
    {P : Params} (hs : P.single = .chrysippus) {T : Theory} {a : Argument}
    (σ : Int → Int) (v : Nat → Int)
    (hn : sv σ v a.conclusion < fusL (a.premises.map (sv σ v))) : ¬ c.Derives P T a := fun h =>
  underivable_of_sugihara hc (T := []) σ v (by simp) hn (Derives.drop_theory hs h)

end Stoic
