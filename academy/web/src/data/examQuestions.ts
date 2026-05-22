// academy/web/src/data/examQuestions.ts
// Daily Examination question sets for PHIL 701
// 11 sessions × morning (3 questions) + evening (3 questions) + 3 memorization passages per session
 
export interface ExamQuestion {
  id: string
  prompt: string
}
 
export interface SessionExamData {
  sessionId: number
  courseId: string
  passages: Array<{ text: string; attribution: string }>
  morning: ExamQuestion[]
  evening: ExamQuestion[]
}
 
export const PHIL701_EXAM_QUESTIONS: Record<number, SessionExamData> = {
  1: {
    sessionId: 1,
    courseId: 'phil-701',
    passages: [
      { text: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.', attribution: 'Epictetus, Enchiridion §8' },
      { text: 'Of things, some are in our power and others are not. In our power are opinion, motivation, desire, aversion — in a word, whatever is of our own doing.', attribution: 'Epictetus, Enchiridion §1' },
      { text: 'Philosophy does not promise to procure anything outside us. To do so would be to admit a subject matter foreign to it. As wood is the material of the carpenter, the human soul is the material of the art of living.', attribution: 'Epictetus, Discourses I.15' },
    ],
    morning: [
      { id: 's1m1', prompt: 'Before the day begins: what is one thing you will encounter today that is not in your power? Name it specifically. How will you hold it?' },
      { id: 's1m2', prompt: 'Epictetus says philosophy is an art of living, not a body of doctrine. What would it look like to practice philosophy today — not study it, but practice it?' },
      { id: 's1m3', prompt: 'What is the difference between the life you want to have and the life you are building? Be honest. Name one thing you are doing that belongs to building, and one thing that belongs to wanting.' },
    ],
    evening: [
      { id: 's1e1', prompt: 'Review the day: where did you treat something outside your power as though it were inside it? What was the cost?' },
      { id: 's1e2', prompt: 'Did you encounter a moment where you acted from genuine understanding rather than habit or impulse? Describe it briefly.' },
      { id: 's1e3', prompt: 'Hadot argues that philosophy must transform the self, not merely inform it. Were you transformed in any small way today — or merely informed?' },
    ],
  },
  2: {
    sessionId: 2,
    courseId: 'phil-701',
    passages: [
      { text: 'Virtue is the only good. What is neither virtue nor vice is indifferent.', attribution: 'Diogenes Laertius, Lives VII.101' },
      { text: 'The man who is not master of himself is not free.', attribution: 'Epictetus, Discourses IV.1' },
      { text: 'Wealth is not among the things that are good. It is preferred. But it is not worth corrupting yourself over.', attribution: 'Seneca, Letters 87.22 (paraphrase)' },
    ],
    morning: [
      { id: 's2m1', prompt: 'Name one thing you will pursue today. Is it genuinely good — something that makes you more virtuous — or is it a preferred indifferent? Does this change how you hold it?' },
      { id: 's2m2', prompt: 'The Stoics say only virtue is good. What is one decision you will face today where the virtuous choice and the comfortable choice are not the same thing?' },
      { id: 's2m3', prompt: 'What preferred indifferent has the most power over you right now? Health, reputation, money, comfort? How much of your day will be organized around it?' },
    ],
    evening: [
      { id: 's2e1', prompt: 'Did you treat any indifferent as though it were genuinely good today — as though losing it would be a real harm to your character? Describe the moment.' },
      { id: 's2e2', prompt: 'The Stoics distinguish between what is up to us and what is not, but also between what is good and what is merely preferred. Did you keep this distinction alive today, or did it collapse under the pressure of circumstances?' },
      { id: 's2e3', prompt: 'Name one thing you did today because it was virtuous rather than because it was comfortable, useful, or expected. If you cannot name one, what does that tell you?' },
    ],
  },
  3: {
    sessionId: 3,
    courseId: 'phil-701',
    passages: [
      { text: 'Men are disturbed not by the things which happen, but by the opinions about the things: for example, death is nothing terrible, for if it were, it would have seemed so to Socrates.', attribution: 'Epictetus, Enchiridion §5' },
      { text: 'Never say about anything that I have lost it, but that I have restored it.', attribution: 'Epictetus, Enchiridion §11' },
      { text: 'The faculty of choice — the hegemonikon — is the faculty that assents or withholds assent. It is the only faculty that is entirely ours.', attribution: 'Epictetus, Discourses I.1' },
    ],
    morning: [
      { id: 's3m1', prompt: 'An impression will arrive this morning that makes a demand on you — a piece of news, a message, a situation. Before you encounter it: practice naming the impression and the opinion layered on top of it as two separate things.' },
      { id: 's3m2', prompt: 'Epictetus says our disturbance comes from opinions about things, not the things themselves. What opinion about today — about what might happen — is already causing disturbance? Is the opinion accurate?' },
      { id: 's3m3', prompt: 'The hegemonikon is the seat of assent. What kind of assent practice did you do yesterday? What kind will you attempt today?' },
    ],
    evening: [
      { id: 's3e1', prompt: 'Identify one moment today where you gave assent to an impression without examining it. What was the impression? What was layered on top of the bare fact?' },
      { id: 's3e2', prompt: 'Did you catch an impression before assenting to it at any point today — even briefly? What happened in that gap?' },
      { id: 's3e3', prompt: 'Seneca writes that we suffer more in imagination than in reality. Was this true for you today? Name a specific case if you can.' },
    ],
  },
  4: {
    sessionId: 4,
    courseId: 'phil-701',
    passages: [
      { text: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are.', attribution: 'Epictetus, Enchiridion §8' },
      { text: 'Ask not that events should happen as you will, but let your will be that events should happen as they do, and you will have peace.', attribution: 'Epictetus, Enchiridion §8 (alt. trans.)' },
      { text: 'Desire nothing beyond what you have, and let fate find you ready.', attribution: 'Seneca, Letters 98.6 (paraphrase)' },
    ],
    morning: [
      { id: 's4m1', prompt: 'The discipline of desire says: desire only what is up to you, and accept what is not. What are you desiring this morning that is not in your power? Can you set it down?' },
      { id: 's4m2', prompt: 'Epictetus distinguishes between desire (which should be directed only at virtue) and appetite (which grasps at externals). What is your primary appetite right now? Is it pulling your attention?' },
      { id: 's4m3', prompt: 'Amor fati — love of what is. Name one thing in your current circumstances that you have been resisting rather than accepting. Is resistance costing you more than the thing itself?' },
    ],
    evening: [
      { id: 's4e1', prompt: 'Where did desire for something outside your control shape your actions or mood today? Name it plainly.' },
      { id: 's4e2', prompt: 'The Stoics say aversion should be reserved for things in our power — vicious choices — not for external setbacks. Did you experience aversion today toward something external? What was it?' },
      { id: 's4e3', prompt: 'Marcus writes: "Accept the things to which fate binds you." What did fate bind you to today that you did not choose? How did you meet it?' },
    ],
  },
  5: {
    sessionId: 5,
    courseId: 'phil-701',
    passages: [
      { text: 'Never in thy own person think it cruelty or pain, but in the common nature. Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, arrogant, deceitful, envious, unsocial.', attribution: 'Marcus Aurelius, Meditations II.1' },
      { text: 'Perform every action as though it were your last, and as though you might at any moment be taken from life.', attribution: 'Marcus Aurelius, Meditations II.5' },
      { text: 'What injures the hive injures the bee.', attribution: 'Marcus Aurelius, Meditations VI.54' },
    ],
    morning: [
      { id: 's5m1', prompt: 'Marcus prepares each morning for difficult people. Who is the difficult person in your life right now? What does Stoic action — kathêkon — look like toward them today?' },
      { id: 's5m2', prompt: 'The discipline of action says: act appropriately, toward the right people, in the right way, with a reserve clause. What is one action today where you will try to hold the reserve clause consciously?' },
      { id: 's5m3', prompt: 'Oikeiôsis — the expanding circle of concern. Who is in your circle today that you might tend to treat as outside it? Name them.' },
    ],
    evening: [
      { id: 's5e1', prompt: 'Did you act from duty today — from kathêkon — or from preference? Name one moment of each if you can.' },
      { id: 's5e2', prompt: 'The reserve clause: "I will do this, fate permitting." Where did fate not permit today? How did you meet the interruption?' },
      { id: 's5e3', prompt: 'Seneca says we are members of a great body. Did you act as a member today — in service of something beyond your own interests? Or did oikeiôsis collapse inward?' },
    ],
  },
  6: {
    sessionId: 6,
    courseId: 'phil-701',
    passages: [
      { text: 'Attend to thyself: that is, watch yourself, and whenever you are about to say anything, call thyself to account beforehand.', attribution: 'Epictetus, Discourses III.16' },
      { text: 'First say to yourself what you would be, and then do what you have to do.', attribution: 'Epictetus, Discourses III.23' },
      { text: 'The philosopher is a physician of the soul. Philosophy is therapy.', attribution: 'Hadot, Philosophy as a Way of Life, Ch. 11 (paraphrase)' },
    ],
    morning: [
      { id: 's6m1', prompt: 'The discipline of assent is the practice of attention — prosochê. In what situation today will your attention most likely slip? Plan for it now.' },
      { id: 's6m2', prompt: 'Hadot says philosophy is a way of life, not a theory. What is one philosophical practice — not an idea, but an action — you will perform today?' },
      { id: 's6m3', prompt: 'The Stoics practiced the view from above — imagining your life from a distance to see its proportions correctly. Look at your day from above. What looks large that is actually small? What looks small that is actually large?' },
    ],
    evening: [
      { id: 's6e1', prompt: 'Where did your attention fail today — where did you act without examining the impression first? What was the consequence?' },
      { id: 's6e2', prompt: 'The examined life requires that you be honest with yourself after the fact. Name one thing you told yourself today that was not quite true.' },
      { id: 's6e3', prompt: 'Philosophy as therapy: what is the disturbance in you right now that philosophy is trying to cure? Has today\'s practice moved you toward the cure or away from it?' },
    ],
  },
  7: {
    sessionId: 7,
    courseId: 'phil-701',
    passages: [
      { text: 'The Stoics say the passions are not feelings that overwhelm the will — they are false judgments the will has already made.', attribution: 'Epictetus, Discourses I.28 (paraphrase)' },
      { text: 'The good emotions — eupatheiai — are not the absence of feeling. They are joy rather than pleasure, caution rather than fear, wishing rather than desire.', attribution: 'Diogenes Laertius, Lives VII.116' },
      { text: 'Anger is a short madness. Whether it is a weak man\'s imitation of strength, or an expression of grief, it does not serve you.', attribution: 'Seneca, On Anger I.1 (paraphrase)' },
    ],
    morning: [
      { id: 's7m1', prompt: 'The Stoics say a passion is a false judgment — not a feeling but an error of assent. What passion is most active in you right now? Name its underlying judgment.' },
      { id: 's7m2', prompt: 'The eupatheiai — the good emotions — are joy, caution, and wishing. Which of these is available to you today, if you practice correctly? What would it look like?' },
      { id: 's7m3', prompt: 'Seneca says anger is often grief in disguise. Are you angry about anything right now? If so — what is the grief underneath it?' },
    ],
    evening: [
      { id: 's7e1', prompt: 'Did a passion arise today — fear, anger, desire, pleasure? Name it. What was the underlying false judgment?' },
      { id: 's7e2', prompt: 'The Stoics do not ask you to feel nothing. They ask you to feel the right things. Did you experience any of the eupatheiai today — genuine joy, proper caution, measured wishing?' },
      { id: 's7e3', prompt: 'Where did a passion drive action today — where did feeling precede examination? What would the examined version of that moment have looked like?' },
    ],
  },
  8: {
    sessionId: 8,
    courseId: 'phil-701',
    passages: [
      { text: 'Amor fati — love of fate. Not merely endurance. Love.', attribution: 'Marcus Aurelius, Meditations VII.57 (paraphrase)' },
      { text: 'The Logos pervades all things. Everything that happens, happens according to reason. Nothing is outside the rational order — including what happens to you.', attribution: 'Marcus Aurelius, Meditations IV.3 (paraphrase)' },
      { text: 'Confine yourself to the present.', attribution: 'Marcus Aurelius, Meditations VIII.7' },
    ],
    morning: [
      { id: 's8m1', prompt: 'The Stoics hold that everything is fated — and that this is not a reason for passivity but for a specific kind of active engagement. What will you actively pursue today within the order of what is fated?' },
      { id: 's8m2', prompt: 'Amor fati is not endurance — it is love. What in your current circumstances is genuinely hard to love? Can you find, honestly, a reason to love it rather than merely tolerate it?' },
      { id: 's8m3', prompt: 'Marcus says the Logos runs through all things. What happened recently that felt meaningless or random? What would it look like to find the reason in it — not as an excuse, but as an orientation?' },
    ],
    evening: [
      { id: 's8e1', prompt: 'Where today did you resist what was fated — what was already happening — rather than act within it? What did the resistance cost you?' },
      { id: 's8e2', prompt: 'Providence or atoms — the Stoics say it does not matter which is true; the appropriate response is the same. Did you live today as though the cosmos was rational? What would have been different if you had?' },
      { id: 's8e3', prompt: 'The present moment is all there is. Where did you live outside it today — in anticipation or regret — and at what cost?' },
    ],
  },
  9: {
    sessionId: 9,
    courseId: 'phil-701',
    passages: [
      { text: 'The Sage is a theoretical ideal, not a claim anyone makes about themselves. The prokopton — the one making progress — is the honest self-description of any serious student of Stoicism.', attribution: 'Epictetus, Discourses I.2 (paraphrase)' },
      { text: 'Begin at once to live, and count each separate day as a separate life.', attribution: 'Seneca, Letters 77.12' },
      { text: 'Make the best use of what is in your power, and take the rest as it happens.', attribution: 'Epictetus, Enchiridion §15' },
    ],
    morning: [
      { id: 's9m1', prompt: 'You are a prokopton — one making progress. Progress toward what, specifically? Name the character trait you are most actively working on right now.' },
      { id: 's9m2', prompt: 'The Sage never makes errors. The prokopton makes them, notices them, and corrects course. What error from yesterday are you correcting today?' },
      { id: 's9m3', prompt: 'Seneca says count each day as a separate life. If today were a complete life — if this were all you had — what would you do with it?' },
    ],
    evening: [
      { id: 's9e1', prompt: 'Did you make progress today — however small? Name one specific thing: one moment where you acted more wisely, more justly, more temperately, or more courageously than you might have previously.' },
      { id: 's9e2', prompt: 'Where did you fall short of your own standard today? Name it without self-punishment — as data, not as judgment.' },
      { id: 's9e3', prompt: 'The prokopton does not compare themselves to the Sage — they compare today\'s self to yesterday\'s self. Are you better than yesterday? In what specific way?' },
    ],
  },
  10: {
    sessionId: 10,
    courseId: 'phil-701',
    passages: [
      { text: 'Live according to nature. For the Stoics, nature is rational. To live naturally is to live rationally — to use your hegemonikon as it was designed to be used.', attribution: 'Marcus Aurelius, Meditations VII.9 (paraphrase)' },
      { text: 'Ask yourself at every moment: is this necessary? Is this noble? Is this the best use of my rational nature right now?', attribution: 'Marcus Aurelius, Meditations IV.24 (paraphrase)' },
      { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', attribution: 'Marcus Aurelius, Meditations (attributed)' },
    ],
    morning: [
      { id: 's10m1', prompt: 'Living according to nature means using your rational faculty well — it is not about simplicity or outdoors. Where today will your rational nature be most tested? Where are you most likely to act against it?' },
      { id: 's10m2', prompt: 'Nature for the Stoics is also social — we are made to live with and for others. What does your rational, social nature require of you today that you might be inclined to avoid?' },
      { id: 's10m3', prompt: 'Marcus asks: is this necessary? Apply it now, to something you are planning today. Is it necessary? If not — what is driving it?' },
    ],
    evening: [
      { id: 's10e1', prompt: 'Where today did you act according to your rational nature? Where did you act against it?' },
      { id: 's10e2', prompt: 'The Stoics say living naturally produces eudaimonia — flourishing. Did any moment today feel like genuine flourishing rather than mere comfort or pleasure? What was different about it?' },
      { id: 's10e3', prompt: 'Fine is not flourishing. Name one thing in your life right now that is fine — functioning, comfortable, acceptable — but not flourishing. What would flourishing look like in that area?' },
    ],
  },
  11: {
    sessionId: 11,
    courseId: 'phil-701',
    passages: [
      { text: 'The unexamined life is not worth living.', attribution: 'Socrates, in Plato\'s Apology 38a' },
      { text: 'It is not death that a man should fear, but he should fear never beginning to live.', attribution: 'Marcus Aurelius, Meditations (attributed)' },
      { text: 'We suffer more in imagination than in reality.', attribution: 'Seneca, Letters 13.4' },
    ],
    morning: [
      { id: 's11m1', prompt: 'You have completed PHIL 701. What is the single most important thing you have learned — not intellectually, but practically? Has it changed how you live, even slightly?' },
      { id: 's11m2', prompt: 'The examined life is not a destination — it is a practice. What is your practice now? Name it specifically: what will you do today, tomorrow, and next week that belongs to the examined life?' },
      { id: 's11m3', prompt: 'Socrates says the unexamined life is not worth living. Are you living an examined life? Be honest. What is one area where the examination has not yet reached?' },
    ],
    evening: [
      { id: 's11e1', prompt: 'PHIL 701 is complete. What was the hardest idea to accept? What was the easiest to accept but hardest to practice?' },
      { id: 's11e2', prompt: 'Stoicism promises not happiness but the capacity to live well under any conditions. Do you believe this? Has anything in this course given you evidence for it?' },
      { id: 's11e3', prompt: 'Fine is not flourishing. Where are you fine right now? Where are you flourishing? Name one of each. What is the difference between them?' },
    ],
  },
}
