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
