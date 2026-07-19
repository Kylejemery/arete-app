# PHIL 706 — The Impossibility of Willing Evil
### Anger, Error, and the Socratic Foundation of Stoic Ethics

**Course thesis:** All anger is unnecessary because no one does wrong willingly. These are not two doctrines but one argument: anger presupposes that the offender knowingly chose evil; Socratic intellectualism denies that this ever happens; therefore anger always rests on a false judgment and can be eliminated, not merely managed.

**Format:** 6 sessions + anger practicum (runs weeks 2–6) + capstone dialogue.

Objective definitions are wired into `src/data/objectives.ts` (`SESSION_OBJECTIVES['phil-706']`, `CAPSTONE_OBJECTIVES['phil-706']`) and are the source of truth for the Evaluator; this document is the authoring reference for the course build (readings, practicum protocol, data model, scenario bank).

---

## Session 1 — Socrates: Virtue Is Knowledge, Vice Is Ignorance

The intellectualist foundation. Every agent pursues what appears good to them; wrongdoing is a cognitive failure — a false appearance of good — never a clear-eyed choice of evil.

**Primary readings:**
- Plato, *Protagoras* 352a–358d (no one is overcome by pleasure against knowledge)
- Plato, *Gorgias* 466d–468e (tyrants do what seems best, not what they will)
- Plato, *Meno* 77b–78b (no one desires bad things)

**Greek focus:** *hamartia* (missing the mark), *akrasia* (the phenomenon intellectualism must explain away)

**Objectives:**

| id | description |
|---|---|
| phil706-s1-obj1 | States the intellectualist thesis in their own words: all wrongdoing stems from mistaken judgment about the good, not willing choice of evil |
| phil706-s1-obj2 | Reconstructs the Gorgias argument that wrongdoers do "what seems best" but not "what they will" |
| phil706-s1-obj3 | Explains hamartia as "missing the mark" and contrasts it with willful transgression |
| phil706-s1-obj4 | Articulates the strongest objection (apparent akrasia — "I knew it was wrong and did it anyway") without yet resolving it |

---

## Session 2 — Epictetus: The Thief and the Mistaken Judgment

The Stoic appropriation. The wrongdoer is deceived about goods and evils; the fitting response is the one owed to any error — teaching or pity, never rage.

**Primary readings:**
- Epictetus, *Discourses* 1.18 (that we should not be angry with those who err)
- Epictetus, *Discourses* 1.28 (that we should not be angry with humanity)
- Epictetus, *Discourses* 2.26 (every error involves a contradiction the agent doesn't see)
- *Enchiridion* 42

**Greek focus:** *prohairesis*, *phantasia* / *sunkatathesis* (impression and assent — where the offender's error actually lives)

**Objectives:**

| id | description |
|---|---|
| phil706-s2-obj1 | Explains why Epictetus treats the wrongdoer like a person with impaired vision rather than an enemy |
| phil706-s2-obj2 | Locates the offender's error in assent to a false impression about goods/evils, using the phantasia–sunkatathesis vocabulary |
| phil706-s2-obj3 | Applies Discourses 1.18 to a scenario of theft or insult: identifies the mistaken judgment driving the offender |
| phil706-s2-obj4 | Explains Epictetus's claim that the wrongdoer is the one actually harmed, and by what |

---

## Session 3 — Seneca I: Anger Anatomized

What anger is on the Stoic account: not the first involuntary flash (*propatheia*) but assent to the judgment "I have been wronged and it is fitting to retaliate." This makes anger voluntary — and therefore eliminable.

**Primary readings:**
- Seneca, *De Ira* 1.1–1.4 (the portrait of anger)
- Seneca, *De Ira* 2.1–2.4 (the two-movements doctrine: first motion vs. assent)
- Aulus Gellius, *Attic Nights* 19.1 (the Stoic in the storm — pallor without passion)

**Greek focus:** *propatheia* vs. *pathos*; *orgē*

**Objectives:**

| id | description |
|---|---|
| phil706-s3-obj1 | Distinguishes the involuntary first movement from anger proper, and identifies assent as the point of responsibility |
| phil706-s3-obj2 | States the composite judgment that constitutes anger ("wronged" + "retaliation fitting") in their own words |
| phil706-s3-obj3 | Given a first-person vignette of a flash of irritation, correctly identifies whether anger has yet occurred and what would make it so |
| phil706-s3-obj4 | Explains why the two-movements doctrine entails anger is voluntary and thus a legitimate target for elimination |

---

## Session 4 — Seneca II: Against Useful Anger

The demolition of every instrumental defense: anger as motivation, as courage, as justice, as deterrent. Seneca's counter: whatever anger does, reason does better; anger adds only distortion.

**Primary readings:**
- Seneca, *De Ira* 1.5–1.21 (refutation of Aristotle; anger not useful in war, punishment, or greatness of soul)
- Seneca, *De Ira* 3.5–3.6 (anger's costs to the angry)

**Modern foil (secondary):** Nussbaum, *Anger and Forgiveness*, ch. 1–2 (contemporary restatement of the anti-anger case)

**Objectives:**

| id | description |
|---|---|
| phil706-s4-obj1 | Reconstructs and rebuts the "righteous anger at injustice" defense using Seneca's argument that justice requires an undistorted judge |
| phil706-s4-obj2 | Rebuts the motivation defense: explains how the sage acts vigorously against wrongdoing without anger |
| phil706-s4-obj3 | Distinguishes anger elimination from passivity or indifference to injustice, with an example of firm non-angry corrective action |
| phil706-s4-obj4 | Articulates the difference between the modern "anger management" frame and the Stoic elimination thesis, and why the latter follows from Sessions 1–2 |

---

## Session 5 — The Synthesis: Why Anger Is Always False

The full argument assembled. Anger's constituting judgment ("they knowingly wronged me") contradicts intellectualism ("no one does wrong willingly"). Anger is therefore not merely costly but *false* — resting on a factual error about human agency. Handling the hard cases: cruelty, malice, the offender who says "I knew exactly what I was doing."

**Primary readings:**
- Marcus Aurelius, *Meditations* 2.1, 7.22, 7.26, 8.14, 11.18 (the daily rehearsal of the doctrine)
- Epictetus, *Discourses* 1.28 revisited (Medea as the limit case)

**Objectives:**

| id | description |
|---|---|
| phil706-s5-obj1 | States the full syllogism connecting intellectualism to anger elimination and identifies which premise anger denies |
| phil706-s5-obj2 | Applies the framework to a case of deliberate, premeditated malice: explains what the offender is still mistaken about despite "knowing what they were doing" |
| phil706-s5-obj3 | Uses the Medea case to explain how even self-aware wrongdoing involves a false judgment about the good |
| phil706-s5-obj4 | Responds to the objection that this doctrine excuses wrongdoers: distinguishes explaining from excusing, and correction from retribution |

---

## Session 6 — The Practice: Living Without Anger

From doctrine to askēsis. Seneca's remedies, Marcus's morning preparation, the evening audit. Reviews practicum data accumulated since week 2.

**Primary readings:**
- Seneca, *De Ira* 2.18–2.36, 3.10–3.13 (delay, self-examination, remedies)
- Seneca, *De Ira* 3.36 (the nightly review — "I sit in judgment on my day")
- Marcus Aurelius, *Meditations* 2.1 (the morning rehearsal)

**Objectives:**

| id | description |
|---|---|
| phil706-s6-obj1 | Describes the delay tactic and explains its rationale via the two-movements doctrine |
| phil706-s6-obj2 | Conducts a model evening review of an anger episode: first movement, the assented judgment, the offender's mistaken good, the corrected response |
| phil706-s6-obj3 | Composes their own morning preparation in the style of Meditations 2.1, incorporating the intellectualist premise |
| phil706-s6-obj4 | Analyzes at least one real episode from their practicum log using the full framework |

---

## Anger Practicum (weeks 2–6, logged in-app)

Runs parallel to sessions; feeds Session 6 and the counselor agents' context.

**Protocol per episode:**
1. **Log the flash** — situation, first bodily/mental movement (no judgment yet)
2. **The judgment** — did I assent to "I was wronged and retaliation is fitting"? What exactly did I tell myself?
3. **The offender's good** — what mistaken good was the other person pursuing? (Required field; "they're just evil" is rejected)
4. **The corrected response** — what does teaching/pity/firm correction look like here?
5. **Evening review** — Seneca 3.36 audit, once daily regardless of episodes

**Data model:** `practicum_logs` table (student_id, course_id, episode jsonb, created_at); surface aggregate trends (episodes/week, assent rate, time-to-reframe) in the progress dashboard; inject recent logs into Cabinet counselor context.

---

## Capstone Dialogue

Proctor-led oral exam. Evaluator runs with capstone strictness (novel-transfer required).

**Capstone objectives:**

| id | description |
|---|---|
| phil706-cap-1 | Given a novel scenario of deliberate malicious harm to the student personally, applies the full framework: identifies the offender's mistaken judgment, explains why anger's constituting belief is false, prescribes the non-angry corrective response |
| phil706-cap-2 | Defends the elimination thesis against a live objection chosen by the Proctor (righteous anger, moral motivation, or the excuse worry) without reverting to "anger management" framing |
| phil706-cap-3 | Connects the doctrine to their own practicum data: identifies their most common anger-constituting judgment and the standing belief it rests on |

**Suggested capstone scenario bank (Proctor samples one):**
- A business partner deliberately conceals financials and defrauds the student
- Someone spreads a knowing lie that damages the student's reputation
- A driver's reckless choice injures a family member
- An online stranger is deliberately cruel about something the student built

---

## Recommended editions / corpus additions for RAG

- Epictetus: Hard, *Discourses, Fragments, Handbook* (Oxford) — chunk 1.18, 1.28, 2.26 with high priority
- Seneca: Kaster & Nussbaum, *Anger, Mercy, Revenge* (Chicago) — *De Ira* complete
- Plato: Cooper (ed.), *Complete Works* (Hackett) — *Protagoras*, *Gorgias*, *Meno* excerpts above
- Marcus: Waterfield or Hays — the five Meditations passages tagged to this course
- Secondary (counselor grounding, not student-required): Sorabji, *Emotion and Peace of Mind*, ch. 2–4 on propatheiai
