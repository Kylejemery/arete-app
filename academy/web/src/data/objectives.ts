// Learning objectives for the Socratic Proctor's Evaluator.
//
// Definitions live here, versioned with the course content; per-student
// status lives in Supabase (objective_status), full evaluator outputs in
// (evaluations). Each objective is an assessable behavior: "demonstrated"
// requires the student to articulate it in their own words AND apply it —
// recitation earns at most "partial" (see /api/academy/evaluate).
//
// Final (seminar) sessions use the course's CAPSTONE objectives instead:
// sampled doctrine plus novel-transfer objectives, judged under the
// stricter capstone rule.

export interface Objective {
  id: string;          // 'phil701-s3-obj2'
  description: string;
}

export const SESSION_OBJECTIVES: Record<string, Record<number, Objective[]>> = {
  'phil-701': {
    1: [
      { id: 'phil701-s1-obj1', description: "Explain Hadot's distinction between philosophy as discourse and philosophy as a way of life, in their own words." },
      { id: 'phil701-s1-obj2', description: 'Articulate what changes when a Stoic text is read as a spiritual exercise rather than as doctrine.' },
      { id: 'phil701-s1-obj3', description: "State their own answer to 'what is philosophy for' and defend it against at least one challenge." },
    ],
    2: [
      { id: 'phil701-s2-obj1', description: 'Define the three Stoic categories of value (goods, bads, indifferents) and correctly classify given examples.' },
      { id: 'phil701-s2-obj2', description: 'Explain preferred indifferents and why wealth or health fails the benefit condition.' },
      { id: 'phil701-s2-obj3', description: 'Apply the sufficiency-of-virtue claim to a case where a preferred indifferent conflicts with virtue.' },
    ],
    3: [
      { id: 'phil701-s3-obj1', description: 'Trace the chain impression → assent → impulse → action and locate ethical responsibility at assent.' },
      { id: 'phil701-s3-obj2', description: 'Explain why having an impression is not up to us but assenting to it is.' },
      { id: 'phil701-s3-obj3', description: "Analyze a disturbance of their own using 'men are disturbed not by things but by opinions about things.'" },
      // Year 1 → PHIL 706 bridge: plant the flag, don't argue it yet.
      { id: 'phil701-s3-obj4', description: 'States the Socratic principle that no one does wrong willingly and identifies it as a foundation to be developed in Year 2.' },
    ],
    4: [
      { id: 'phil701-s4-obj1', description: "State the discipline of desire's instruction: redirect desire toward what is eph' hēmin and aversion toward vice alone." },
      { id: 'phil701-s4-obj2', description: 'Explain the reserve clause (hupexhairesis) and apply it to one of their current goals.' },
      { id: 'phil701-s4-obj3', description: 'Distinguish redirected desire from resignation — show why the Stoic still pursues goals fully.' },
    ],
    5: [
      { id: 'phil701-s5-obj1', description: 'Define kathēkon and distinguish it from katorthōma.' },
      { id: 'phil701-s5-obj2', description: 'Explain oikeiōsis and the concentric structure of obligation it generates.' },
      { id: 'phil701-s5-obj3', description: 'Derive concrete appropriate actions from their own actual roles.' },
    ],
    6: [
      { id: 'phil701-s6-obj1', description: 'Define prosochē and state the three-step test of an impression.' },
      { id: 'phil701-s6-obj2', description: 'Distinguish the Sage from the prokoptōn with respect to assent.' },
      { id: 'phil701-s6-obj3', description: 'Apply the impression test to a live impression of their own, step by step.' },
    ],
    7: [
      { id: 'phil701-s7-obj1', description: 'Define a passion (pathos) as arising from a false value-judgment and name the four Stoic passions.' },
      { id: 'phil701-s7-obj2', description: 'Explain the difference between a propatheia and a full passion — where assent draws the line.' },
      { id: 'phil701-s7-obj3', description: 'Map a recent emotion of their own: the judgment inside it and its eupatheia counterpart, if any.' },
    ],
    8: [
      { id: 'phil701-s8-obj1', description: "Explain the identity of logos, fate, and nature, and the cylinder argument's compatibilism." },
      { id: 'phil701-s8-obj2', description: 'Distinguish amor fati from mere acceptance.' },
      { id: 'phil701-s8-obj3', description: 'Apply providential/character-formation reasoning to an adversity, their own or given.' },
    ],
    9: [
      { id: 'phil701-s9-obj1', description: "Explain how virtue's all-or-nothing threshold is compatible with real progress." },
      { id: 'phil701-s9-obj2', description: 'Describe premeditatio malorum, the evening review, and the view from above, with the function of each.' },
      { id: 'phil701-s9-obj3', description: 'Select and commit to one spiritual exercise matched to a specific weakness of their own.' },
    ],
    10: [
      { id: 'phil701-s10-obj1', description: 'State the telos formula (living according to nature) and its three senses of nature.' },
      { id: 'phil701-s10-obj2', description: 'Contrast Stoic and Aristotelian eudaimonia on the sufficiency of virtue.' },
      { id: 'phil701-s10-obj3', description: 'Explain engagement without attachment using an example from their own life.' },
    ],
  },
  'phil-702': {
    1: [
      { id: 'phil702-s1-obj1', description: 'Explain why the Meditations are a practice log, not a treatise — second-person address, repetition, absence of system.' },
      { id: 'phil702-s1-obj2', description: 'Define a spiritual exercise and identify the one Marcus performs in Book II.1.' },
      { id: 'phil702-s1-obj3', description: 'Compose their own morning premeditation for a real upcoming day.' },
    ],
    2: [
      { id: 'phil702-s2-obj1', description: 'Name the three disciplines with their Greek terms and the object each governs.' },
      { id: 'phil702-s2-obj2', description: 'Classify given Meditations passages by discipline and justify the classification.' },
      { id: 'phil702-s2-obj3', description: 'Diagnose one of their own disturbances by which discipline slipped.' },
    ],
    3: [
      { id: 'phil702-s3-obj1', description: "State the radical claim of the discipline of desire and what it is NOT ('want moderately')." },
      { id: 'phil702-s3-obj2', description: 'Explain the substitution method for retraining desire.' },
      { id: 'phil702-s3-obj3', description: 'Apply substitution to one of their own current external desires.' },
    ],
    4: [
      { id: 'phil702-s4-obj1', description: "Explain the archer image: what is the archer's job, what is the indifferent, and where the reserve clause fits." },
      { id: 'phil702-s4-obj2', description: "Explain 'nobody does wrong willingly' and how it changes the response to wrongdoers without excusing them." },
      { id: 'phil702-s4-obj3', description: "Apply duty-without-requiring-cooperation to a real obligation of their own." },
    ],
    5: [
      { id: 'phil702-s5-obj1', description: "Define the hēgemonikon and hupolēpsis, and unpack 'life is opinion' (III.16) precisely." },
      { id: 'phil702-s5-obj2', description: 'Explain the guard at the gate and the pause between impression and assent.' },
      { id: 'phil702-s5-obj3', description: 'Report catching and examining one of their own impressions at the gate.' },
    ],
    6: [
      { id: 'phil702-s6-obj1', description: 'Describe the spatial and temporal forms of the view from above.' },
      { id: 'phil702-s6-obj2', description: 'Explain why the exercise is clarifying rather than nihilistic.' },
      { id: 'phil702-s6-obj3', description: 'Run the zoom on a current anxiety and report at which frame it shrank, and what that reveals.' },
    ],
    7: [
      { id: 'phil702-s7-obj1', description: 'State what the contemplation of death is NOT, and the functions it serves.' },
      { id: 'phil702-s7-obj2', description: "Explain II.14: only the present life can be lost, and what follows for how to live." },
      { id: 'phil702-s7-obj3', description: 'Use death as a clarifying lens on a real decision of their own.' },
    ],
    8: [
      { id: 'phil702-s8-obj1', description: 'State the principle of V.20 and show how the reserve clause makes the obstacle become the way.' },
      { id: 'phil702-s8-obj2', description: 'Distinguish amor fati from mere acceptance, with the universe-as-teacher reading.' },
      { id: 'phil702-s8-obj3', description: 'Reframe a current obstacle of their own as material for named virtues.' },
    ],
    9: [
      { id: 'phil702-s9-obj1', description: 'Explain anger as a failure of the discipline of desire, with the Socratic diagnosis of wrongdoing.' },
      { id: 'phil702-s9-obj2', description: 'Describe Book XI.18 as a real-time diagnostic and what it corrects.' },
      { id: 'phil702-s9-obj3', description: 'Run the diagnostic on a recent anger of their own and name the frustrated desire.' },
      // Year 1 → PHIL 706 bridge.
      { id: 'phil702-s9-obj4', description: "Identifies Marcus's arguments against anger in XI.18 and notes which depend on the claim that wrongdoers err unwillingly." },
    ],
    10: [
      { id: 'phil702-s10-obj1', description: 'Explain the inner citadel: what alone can harm the ruling faculty, and why that is both uncomfortable and liberating.' },
      { id: 'phil702-s10-obj2', description: 'Explain progress as the shortening distance between failure and return.' },
      { id: 'phil702-s10-obj3', description: "Identify their own citadel's weakest gate and a concrete guard practice for it." },
    ],
  },
  'phil-703': {
    1: [
      { id: 'phil703-s1-obj1', description: "State the opening distinction of Discourses I.1 and the one thing given as fully our own." },
      { id: 'phil703-s1-obj2', description: 'Explain why prohairesis is by nature unenslavable — why even Zeus cannot compel assent.' },
      { id: 'phil703-s1-obj3', description: 'Perform the two-column audit on their own current worries and place items correctly.' },
    ],
    2: [
      { id: 'phil703-s2-obj1', description: 'Explain prokopē as the movement of desire, not mastery of texts.' },
      { id: 'phil703-s2-obj2', description: 'Reconstruct the elenchus of the father who fled (I.11) and what it proves about judgment.' },
      { id: 'phil703-s2-obj3', description: "Classify their own blame instances on Enchiridion 5's scale and draw the conclusion." },
    ],
    3: [
      { id: 'phil703-s3-obj1', description: 'Explain why logic is necessary: reason as the only faculty that audits itself.' },
      { id: 'phil703-s3-obj2', description: 'Explain pity-not-anger toward the wrongdoer and why it does not entail passivity.' },
      { id: 'phil703-s3-obj3', description: "Run the assayer's test on one strong impression of their own, in writing or dialogue." },
      // Year 1 → PHIL 706 bridge: I.18 and I.28 are the intellectualism core.
      { id: 'phil703-s3-obj4', description: 'States the intellectualist claim of Discourses I.18 and I.28 — the wrongdoer errs about the good rather than choosing evil — and identifies it as a foundation to be developed in Year 2.' },
    ],
    4: [
      { id: 'phil703-s4-obj1', description: 'Assign confidence and caution to their correct domains and explain the ordinary inversion.' },
      { id: 'phil703-s4-obj2', description: "Explain the ball-player image and the distinction 'they can kill me but not harm me.'" },
      { id: 'phil703-s4-obj3', description: 'Split a real high-stakes situation of their own into the ball and the play.' },
    ],
    5: [
      { id: 'phil703-s5-obj1', description: 'Explain the divine fragment of II.8 and its egalitarian consequence.' },
      { id: 'phil703-s5-obj2', description: 'Explain how duties are read off one’s names/roles (II.10), with the ranking rule.' },
      { id: 'phil703-s5-obj3', description: 'Produce their own role inventory with at least one derived, currently unmet duty.' },
    ],
    6: [
      { id: 'phil703-s6-obj1', description: 'State the law of habit (II.18) and the classroom-vs-life gap (II.16).' },
      { id: 'phil703-s6-obj2', description: 'Explain why conflicts arise over the application of preconceptions, never the preconceptions themselves (II.17).' },
      { id: 'phil703-s6-obj3', description: 'Report a real counter-habituation practice: the habit starved, the count of days.' },
    ],
    7: [
      { id: 'phil703-s7-obj1', description: 'Name the three fields of training in order (III.2) and justify the order.' },
      { id: 'phil703-s7-obj2', description: "Explain the hymn vocation of I.16: what the rational fragment can do that nothing else in nature can." },
      { id: 'phil703-s7-obj3', description: 'Perform the morning dedication on an actual day and report keeping (or losing) the post.' },
    ],
    8: [
      { id: 'phil703-s8-obj1', description: 'Explain the Cynic as limit case: what III.22 proves about the good and externals.' },
      { id: 'phil703-s8-obj2', description: 'Explain the surgery-not-show standard and apply the exit-condition test to a teaching they consume.' },
      { id: 'phil703-s8-obj3', description: "Apply 'given back, not lost' (III.24) to something they love and report its effect on presence." },
    ],
    9: [
      { id: 'phil703-s9-obj1', description: "Reconstruct IV.1's census and the law of mastery: every desire for an external issues a key." },
      { id: 'phil703-s9-obj2', description: "Explain the open door's architectural role: why its existence, not its use, abolishes coercion." },
      { id: 'phil703-s9-obj3', description: 'Produce their own census of masters and name one key actually revoked or being revoked.' },
    ],
    10: [
      { id: 'phil703-s10-obj1', description: "Explain the Enchiridion's compression principle (keep the imperative, cut the argument) and its cost." },
      { id: 'phil703-s10-obj2', description: 'Unfold at least one Enchiridion chapter back into the discourse and argument behind it.' },
      { id: 'phil703-s10-obj3', description: 'Identify their own undigested chapters and what that reveals about their formation.' },
    ],
  },
  'phil-704': {
    1: [
      { id: 'phil704-s1-obj1', description: 'Explain vindica te tibi and the three leaks of time, with the ranking of the third.' },
      { id: 'phil704-s1-obj2', description: 'Explain the epistolary method: settled reading, unum aliquid, and the daily gift.' },
      { id: 'phil704-s1-obj3', description: 'Report the results of their own three-column time audit.' },
    ],
    2: [
      { id: 'phil704-s2-obj1', description: "Explain 'the way is long through precepts, short through examples' and why the correspondence embodies it." },
      { id: 'phil704-s2-obj2', description: 'Explain crowd contagion (Ep. 7) and the two-sided company rule.' },
      { id: 'phil704-s2-obj3', description: 'Perform the guardian exercise (Ep. 11) and report where the witness changed an action.' },
    ],
    3: [
      { id: 'phil704-s3-obj1', description: "Explain the god within (Ep. 41) and 'praise only what is his.'" },
      { id: 'phil704-s3-obj2', description: "Reconstruct Ep. 47's argument about slaves and name honestly the boundary it does not cross." },
      { id: 'phil704-s3-obj3', description: 'Perform the recognition practice and articulate what it tested in them.' },
    ],
    4: [
      { id: 'phil704-s4-obj1', description: 'Explain quality-over-quantity of life and the function of the open door (Ep. 70).' },
      { id: 'phil704-s4-obj2', description: "Explain 'vita non est imperfecta si honesta est' — completeness as form, not length." },
      { id: 'phil704-s4-obj3', description: "Perform the completion practice ('I have lived') and assess whether it makes the day heavier or lighter." },
    ],
    5: [
      { id: 'phil704-s5-obj1', description: 'Distinguish sagacity from wisdom (Ep. 90): what each makes.' },
      { id: 'phil704-s5-obj2', description: "Explain the happy life as perfected reason and the demotion 'goods of the body, not of the man' (Ep. 92)." },
      { id: 'phil704-s5-obj3', description: 'Apply the comfort-vs-character diagnostic to their own activities.' },
    ],
    6: [
      { id: 'phil704-s6-obj1', description: "State De Brevitate's thesis and diagnose the occupati." },
      { id: 'phil704-s6-obj2', description: 'Explain the three tenses and why a life is as long as the past it can bear to visit.' },
      { id: 'phil704-s6-obj3', description: 'Report their chapter-10 audit and at least one deliberately banked hour.' },
    ],
    7: [
      { id: 'phil704-s7-obj1', description: "Describe Serenus's seasick soul and define euthymia precisely — what it excludes and does not." },
      { id: 'phil704-s7-obj2', description: 'Explain calibrated engagement and the middle measure of property.' },
      { id: 'phil704-s7-obj3', description: 'Draft their own three-article constitution and report the renegotiation tally.' },
    ],
    8: [
      { id: 'phil704-s8-obj1', description: "State the theodicy's double inversion: no evil befalls the good, and hardship is regard, not neglect." },
      { id: 'phil704-s8-obj2', description: 'Explain the training doctrine with its guard-rails (what it does NOT license).' },
      { id: 'phil704-s8-obj3', description: "Apply the soldier's reading to a current hardship of their own, honestly." },
    ],
    9: [
      { id: 'phil704-s9-obj1', description: 'Reconstruct De Vita Beata’s doctrine: virtue-founded happiness with pleasure as byproduct.' },
      { id: 'phil704-s9-obj2', description: "State the strongest form of Seneca's defense AND the strongest evidence it never answers." },
      { id: 'phil704-s9-obj3', description: 'Deliver their own verdict, separating the doctrine, the sincerity, and the life.' },
    ],
    10: [
      { id: 'phil704-s10-obj1', description: 'Define clementia against its counterfeits: pity, pardon, and cruelty.' },
      { id: 'phil704-s10-obj2', description: 'Assess the Seneca–Nero experiment by defending one of the three verdicts against the others.' },
      { id: 'phil704-s10-obj3', description: 'Apply the mercy protocol at their own station of power and report the hardest case.' },
    ],
  },
  // PHIL 706 — The Impossibility of Willing Evil (Year 2, 6 sessions +
  // anger practicum weeks 2–6 + capstone dialogue). Course thesis: anger
  // presupposes the offender knowingly chose evil; Socratic intellectualism
  // denies this ever happens; therefore anger rests on a false judgment and
  // can be eliminated, not merely managed. Provisioned ahead of the course
  // page (inert until built). Full outline: data/reference/PHIL_706_Course_Outline.md.
  'phil-706': {
    1: [
      { id: 'phil706-s1-obj1', description: 'States the intellectualist thesis in their own words: all wrongdoing stems from mistaken judgment about the good, not willing choice of evil.' },
      { id: 'phil706-s1-obj2', description: 'Reconstructs the Gorgias argument that wrongdoers do "what seems best" but not "what they will."' },
      { id: 'phil706-s1-obj3', description: 'Explains hamartia as "missing the mark" and contrasts it with willful transgression.' },
      { id: 'phil706-s1-obj4', description: 'Articulates the strongest objection (apparent akrasia — "I knew it was wrong and did it anyway") without yet resolving it.' },
    ],
    2: [
      { id: 'phil706-s2-obj1', description: 'Explains why Epictetus treats the wrongdoer like a person with impaired vision rather than an enemy.' },
      { id: 'phil706-s2-obj2', description: 'Locates the offender\'s error in assent to a false impression about goods/evils, using the phantasia–sunkatathesis vocabulary.' },
      { id: 'phil706-s2-obj3', description: 'Applies Discourses 1.18 to a scenario of theft or insult: identifies the mistaken judgment driving the offender.' },
      { id: 'phil706-s2-obj4', description: 'Explains Epictetus\'s claim that the wrongdoer is the one actually harmed, and by what.' },
    ],
    3: [
      { id: 'phil706-s3-obj1', description: 'Distinguishes the involuntary first movement from anger proper, and identifies assent as the point of responsibility.' },
      { id: 'phil706-s3-obj2', description: 'States the composite judgment that constitutes anger ("wronged" + "retaliation fitting") in their own words.' },
      { id: 'phil706-s3-obj3', description: 'Given a first-person vignette of a flash of irritation, correctly identifies whether anger has yet occurred and what would make it so.' },
      { id: 'phil706-s3-obj4', description: 'Explains why the two-movements doctrine entails anger is voluntary and thus a legitimate target for elimination.' },
    ],
    4: [
      { id: 'phil706-s4-obj1', description: 'Reconstructs and rebuts the "righteous anger at injustice" defense using Seneca\'s argument that justice requires an undistorted judge.' },
      { id: 'phil706-s4-obj2', description: 'Rebuts the motivation defense: explains how the sage acts vigorously against wrongdoing without anger.' },
      { id: 'phil706-s4-obj3', description: 'Distinguishes anger elimination from passivity or indifference to injustice, with an example of firm non-angry corrective action.' },
      { id: 'phil706-s4-obj4', description: 'Articulates the difference between the modern "anger management" frame and the Stoic elimination thesis, and why the latter follows from Sessions 1–2.' },
    ],
    5: [
      { id: 'phil706-s5-obj1', description: 'States the full syllogism connecting intellectualism to anger elimination and identifies which premise anger denies.' },
      { id: 'phil706-s5-obj2', description: 'Applies the framework to a case of deliberate, premeditated malice: explains what the offender is still mistaken about despite "knowing what they were doing."' },
      { id: 'phil706-s5-obj3', description: 'Uses the Medea case to explain how even self-aware wrongdoing involves a false judgment about the good.' },
      { id: 'phil706-s5-obj4', description: 'Responds to the objection that this doctrine excuses wrongdoers: distinguishes explaining from excusing, and correction from retribution.' },
    ],
    6: [
      { id: 'phil706-s6-obj1', description: 'Describes the delay tactic and explains its rationale via the two-movements doctrine.' },
      { id: 'phil706-s6-obj2', description: 'Conducts a model evening review of an anger episode: first movement, the assented judgment, the offender\'s mistaken good, the corrected response.' },
      { id: 'phil706-s6-obj3', description: 'Composes their own morning preparation in the style of Meditations 2.1, incorporating the intellectualist premise.' },
      { id: 'phil706-s6-obj4', description: 'Analyzes at least one real episode from their practicum log using the full framework.' },
    ],
  },
  // PHIL 707 — The Prokopton in the Digital Age (Year 2, 8 sessions).
  // Provisioned ahead of the course page: the courses/[courseId] renderer only
  // serves phil-701..704 today, so these are inert until 707 is built.
  // Prerequisites: PHIL 705 (impressions/assent machinery); PHIL 706
  // recommended for Sessions 3 and 6.
  'phil-707': {
    1: [
      { id: 'phil707-s1-obj1', description: 'Explains the attention economy as an industrialized phantasia system, using the impression–assent vocabulary from PHIL 705.' },
      { id: 'phil707-s1-obj2', description: 'Analyzes one interface element (infinite scroll, autoplay, notification badge) as an engineered impression: what good does it falsely present?' },
      { id: 'phil707-s1-obj3', description: 'States why the Stoic response is trained assent rather than mere abstinence, and where abstinence (askēsis) still fits.' },
    ],
    2: [
      { id: 'phil707-s2-obj1', description: 'Explains why prosoche is impossible under ambient interruption, citing Discourses 4.12.' },
      { id: 'phil707-s2-obj2', description: 'Diagnoses short-form video by its impression cadence: why examination cannot keep pace with delivery.' },
      { id: 'phil707-s2-obj3', description: 'Designs their own attention protocol (notification elimination, phone placement rules, single-tasking blocks) with Stoic rationale for each element.' },
      { id: 'phil707-s2-obj4', description: 'Distinguishes tool-use from impression-consumption in their own phone habits with logged examples.' },
    ],
    3: [
      { id: 'phil707-s3-obj1', description: 'Analyzes the like/metric as an externalization of self-worth and classifies it correctly as not up to us.' },
      { id: 'phil707-s3-obj2', description: 'Applies the intellectualist framework to an online outrage pile-on: identifies the mistaken good pursued by participants.' },
      { id: 'phil707-s3-obj3', description: 'Explains comparison culture via the distinction between curated impression and reality, with a personal example.' },
      { id: 'phil707-s3-obj4', description: 'Formulates their own social media rule of life (posting intention, consumption limits, response-to-provocation policy).' },
    ],
    4: [
      { id: 'phil707-s4-obj1', description: 'Explains habituation (Discourses 2.18) as the mechanism these industries exploit: each assent strengthens the next impression.' },
      { id: 'phil707-s4-obj2', description: 'Analyzes pornography on Stoic terms: the false impression presented, the training effect on desire, the harm located in the user\'s own prohairesis.' },
      { id: 'phil707-s4-obj3', description: 'Distinguishes the Stoic case for temperance from moralism: the argument runs through freedom and self-command, not shame.' },
      { id: 'phil707-s4-obj4', description: 'Selects one personal appetite pattern and designs a graduated askēsis (delay, substitution, fasting period) with a relapse-analysis protocol.' },
    ],
    5: [
      { id: 'phil707-s5-obj1', description: 'Applies the preferred-indifferent doctrine strictly to wealth and career: pursued appropriately, never constitutive of the good.' },
      { id: 'phil707-s5-obj2', description: 'Diagnoses hustle culture as a confusion of preferred indifferents with the good, and identifies its characteristic fear.' },
      { id: 'phil707-s5-obj3', description: 'Analyzes speculation/day-trading through Seneca on Fortuna: what the speculator has handed to fortune.' },
      { id: 'phil707-s5-obj4', description: 'Conducts a possessions-and-purchases audit distinguishing use, signal, and consolation.' },
    ],
    6: [
      { id: 'phil707-s6-obj1', description: 'Applies Letters 13 to doomscrolling: distinguishes information adequate for action from fear rehearsal.' },
      { id: 'phil707-s6-obj2', description: 'Designs a news protocol: what to know, when, from where, and the assent discipline applied to headlines.' },
      { id: 'phil707-s6-obj3', description: 'Applies the intellectualist framework to a political opponent: states the mistaken good their position pursues, without strawmanning and without anger.' },
      { id: 'phil707-s6-obj4', description: 'Analyzes health anxiety via the dichotomy: the body as not fully up to us, care as appropriate action, prognosis-rumination as false assent.' },
    ],
    7: [
      { id: 'phil707-s7-obj1', description: 'Applies Discourses 2.22 to dating-app dynamics: what person-shopping optimizes for versus what friendship requires.' },
      { id: 'phil707-s7-obj2', description: 'Analyzes parasocial attachment as assent to an impression of reciprocity that does not exist.' },
      // Taught with full candor on this platform — the counselors themselves
      // affirm the boundary.
      { id: 'phil707-s7-obj3', description: 'Evaluates AI companionship on Stoic terms: what it can appropriately provide (practice, counsel) and what it cannot (mutual prohairesis), and states the honest boundary.' },
      { id: 'phil707-s7-obj4', description: 'Explains the Stoic account of loneliness: the difference between solitude (eremia) as deprivation and as self-sufficiency, citing Letters 9.' },
    ],
    8: [
      { id: 'phil707-s8-obj1', description: 'Presents a complete personal rule of life covering attention, appetite, opinion, externals, fear, and connection, with a doctrinal justification for each provision.' },
      { id: 'phil707-s8-obj2', description: 'Designs and schedules one fasting-style protocol (digital sabbath, dopamine austerity week, media fast) per Letters 18, with review criteria.' },
      { id: 'phil707-s8-obj3', description: 'Explains why the goal is trained assent in the world rather than permanent withdrawal from it, citing Discourses 3.12 on misdirected askēsis.' },
    ],
  },
};

// Capstone rubrics — used for each course's final (seminar) session.
// Judged under the stricter capstone rule: application to memorized examples
// earns at most "partial"; "demonstrated" requires novel transfer.
export const CAPSTONE_OBJECTIVES: Record<string, Objective[]> = {
  'phil-701': [
    { id: 'phil701-capstone-1', description: 'Given an unfamiliar scenario, correctly divides what is and is not up to them and prescribes the Stoic response.' },
    { id: 'phil701-capstone-2', description: 'Diagnoses which discipline fails in a described disturbance and states the correction.' },
    { id: 'phil701-capstone-3', description: "Defends the sufficiency of virtue against its strongest objection without recitation." },
  ],
  'phil-702': [
    { id: 'phil702-capstone-1', description: "Given a novel high-pressure scenario, prescribes the three-discipline response as Marcus would." },
    { id: 'phil702-capstone-2', description: 'Given an unfamiliar Meditations-style passage, identifies the exercise being performed and classifies it by discipline.' },
    { id: 'phil702-capstone-3', description: 'Shows, concretely, what has changed in their own conduct from a practiced exercise of this course.' },
  ],
  'phil-703': [
    { id: 'phil703-capstone-1', description: 'Given a novel scenario, identifies the masters and keys at work and the trained response.' },
    { id: 'phil703-capstone-2', description: 'Withstands Socratic cross-examination of a principle they assert: states it, extends it to unchosen cases, and resolves or concedes the tension.' },
    { id: 'phil703-capstone-3', description: "Defends or contests 'freedom has no prerequisites' with an original argument engaging Epictetus's own case." },
  ],
  'phil-704': [
    { id: 'phil704-capstone-1', description: 'Given a novel loss or adversity scenario, prescribes the Senecan response and grounds it in the right letters or essays.' },
    { id: 'phil704-capstone-2', description: 'States their own pattern-of-life bequest clause and defends it as a Stoic artifact.' },
    { id: 'phil704-capstone-3', description: 'Argues the hypocrisy question on fresh facts — a case not from the course — without recitation.' },
  ],
  // PHIL 705 is quiz-based (language renderer), so this is inert until its
  // seminar sessions are wired to the Proctor — provisioned per the Year 2
  // integration map: 705 is the hinge the 706/707 machinery runs on.
  'phil-705': [
    { id: 'phil705-capstone-1', description: 'Applies the impression–assent model to one modern engineered stimulus and one interpersonal provocation.' },
  ],
  // Capstone scenario bank (Proctor samples one): partner conceals financials
  // and defrauds the student; a knowing lie damages their reputation; a
  // reckless driver injures a family member; an online stranger is
  // deliberately cruel about something the student built.
  'phil-706': [
    { id: 'phil706-cap-1', description: 'Given a novel scenario of deliberate malicious harm to the student personally, applies the full framework: identifies the offender\'s mistaken judgment, explains why anger\'s constituting belief is false, prescribes the non-angry corrective response.' },
    { id: 'phil706-cap-2', description: 'Defends the elimination thesis against a live objection chosen by the Proctor (righteous anger, moral motivation, or the excuse worry) without reverting to "anger management" framing.' },
    // Connects to practicum_logs data (weeks 2–6) — see the outline's
    // practicum protocol and data model.
    { id: 'phil706-cap-3', description: 'Connects the doctrine to their own practicum data: identifies their most common anger-constituting judgment and the standing belief it rests on.' },
  ],
  'phil-707': [
    { id: 'phil707-cap-1', description: 'Given a novel engineered-temptation scenario (a technology or product not covered in the course), performs the full analysis: impression presented, judgment error invited, doctrine engaged, askēsis prescribed.' },
    { id: 'phil707-cap-2', description: 'Defends their rule of life against the Proctor\'s pressure-testing (a scenario where the rule is costly or socially awkward) without abandoning it or turning rigid.' },
    // Requires the s8-obj2 protocol to have actually run: gate the capstone
    // until the scheduled fast completes and is logged — the first course
    // where completion requires lived time, not just dialogue.
    { id: 'phil707-cap-3', description: 'Reports on their completed fasting protocol from s8-obj2: what impressions arose, what was assented to, what the experiment demonstrated.' },
  ],
};

// Objectives for a seminar chat: final (seminar) sessions use the capstone
// rubric; ordinary sessions use their session rubric.
export function getSeminarObjectives(
  courseId: string,
  sessionId: number,
  isSeminarSession: boolean
): { objectives: Objective[]; capstone: boolean } {
  if (isSeminarSession && CAPSTONE_OBJECTIVES[courseId]) {
    return { objectives: CAPSTONE_OBJECTIVES[courseId], capstone: true };
  }
  return { objectives: SESSION_OBJECTIVES[courseId]?.[sessionId] ?? [], capstone: false };
}
