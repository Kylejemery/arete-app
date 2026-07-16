// PHIL 702 — Living the Practice: Marcus Aurelius
// Full content build — Sessions 1–11.
//
// Mirrors the PHIL 701 architecture: each session carries a pre-seminar
// briefing, three lesson parts, a 10-question quiz, and a practice
// assignment. The session view reuses the language-course renderer
// (LanguageLessonContent); `phil702ToLesson` adapts a Phil702Session into the
// shape that renderer consumes. The quiz lives on the course page's Quiz tab
// (StudentQuiz), where submissions are graded by the Proctor.

import type { LanguageSession } from '@/data/grek101';
import type { QuizQuestion } from '@/components/StudentQuiz';

export interface Phil702Session {
  id: number;                 // 1–11
  title: string;
  isSeminar?: boolean;        // session 11
  briefing: string;           // single pre-seminar briefing paragraph
  parts: Array<{
    title: string;
    content: string[];        // one paragraph per element
  }>;
  // open (question + reference answer, graded by the Proctor), mc (multiple
  // choice), or msq (select all that apply) — see StudentQuiz.
  quiz: QuizQuestion[];
  practiceAssignment: {
    coreIdea: string;
    assignment: string;
    duration: string;
    greekTerms?: string;
  };
}

export const PHIL_702_SESSIONS: Phil702Session[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'The Meditations as Spiritual Exercise — How to Read Marcus',
    briefing:
      "Most people who pick up the Meditations read them as a book of wisdom — a collection of aphorisms to be admired and occasionally quoted. Hadot's argument in the Inner Citadel is that this is precisely the wrong way to read them. The Meditations were never intended for publication. They were written by Marcus to Marcus — a daily exercise in self-formation, not a treatise for posterity. Each entry is a hammer blow against his own resistance, a repetition of principles not yet fully internalized, a man doing the work. This session establishes the only lens through which PHIL 702 makes sense: the Meditations are a practice log. You are not here to study what Marcus believed. You are here to learn how he trained.",
    parts: [
      {
        title: 'What the Meditations Actually Are',
        content: [
          "Marcus Aurelius was Emperor of Rome for nineteen years. He spent those years on campaign, in the senate, in law courts, managing an empire under plague and war. He also spent part of every day writing to himself. Not dispatches. Not philosophy for publication. Notes — urgent, sometimes repetitive, occasionally despairing — addressed to himself in the second person: you, not I. 'You have power over your mind, not outside events.' 'Confine yourself to the present.' 'The impediment to action advances action.'",
          "The second-person address is the first clue to what the Meditations are. Marcus is not recording his conclusions. He is drilling himself. The repetition — the same principles appearing again and again across twelve books — is not carelessness. It is the repetition of an athlete who knows that knowledge without practice disappears. Hadot calls this the 'remember' function of the Meditations: Marcus is reminding himself, in the moment of pressure, of what reason requires. Not what he has already mastered. What he still needs to practice.",
          "The second clue is the absence of system. The Meditations have no argument, no structure, no progression from premise to conclusion. They are not organized by topic. They circle back. They contradict themselves at the surface level. This is what a practice log looks like, not a philosophical treatise. The carpenter does not write a theory of woodworking. He notes what the wood did today, what the chisel required, what he still cannot do well.",
        ],
      },
      {
        title: 'The Spiritual Exercise Tradition',
        content: [
          "To understand what Marcus was doing, you need to understand what ancient philosophy was for. Pierre Hadot's central claim — developed across Philosophy as a Way of Life and The Inner Citadel — is that ancient philosophy was primarily a set of practices for transforming the self, not a set of doctrines to be believed. The philosophical school was a place you went to be trained, not to be informed. The texts were instruments of transformation, not objects of study.",
          "Hadot identifies a specific set of practices he calls spiritual exercises: the morning review, the evening examination, the premeditation of adversity, the view from above, the contemplation of death, the practice of attention (prosochē). These are not metaphors. They are concrete daily exercises, prescribed and practised. Marcus practised them. The Meditations are the record of that practice.",
          "This changes everything about how you read the text. When Marcus writes 'begin the morning by saying to yourself: I shall meet with meddling, ungrateful, violent, treacherous, envious, uncharitable men' — he is not being cynical. He is performing the premeditation of adversity, a specific Stoic exercise for reducing the shock of difficulty by anticipating it. The content of the exercise is almost less important than the act of performing it. Marcus is training his impressions before the day begins.",
        ],
      },
      {
        title: 'How to Use This Course',
        content: [
          "PHIL 702 is not a course about Marcus Aurelius. It is a course that uses Marcus Aurelius as a guide. The distinction matters. If you study Marcus, you accumulate knowledge about a Roman emperor. If you follow Marcus, you learn to do what he did — to take the same exercises he performed and apply them to your own circumstances.",
          "Each session of this course will identify one practice Marcus was performing in the passages under study and ask you to perform the same practice before the next session. This is not optional supplementary material. It is the course. The lesson content gives you the theory; the practice assignment gives you the work. Without the work, you have read about Marcus. With it, you have begun to train alongside him.",
          "Epictetus — whose lectures Marcus almost certainly studied — said that his school was a surgery, not a lecture hall. You should leave having felt something change, not merely having acquired new information. That is the standard for PHIL 702.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. According to Hadot, what is the wrong way to read the Meditations, and why?",
        answer: "Reading them as a book of wisdom — a collection of aphorisms to admire and quote. This is wrong because the Meditations were never meant for publication; they are a private practice log of self-formation, not a treatise for readers.",
      },
      {
        question: "2. What is the significance of Marcus addressing himself in the second person ('you,' not 'I')?",
        answer: "It reveals that Marcus is not recording conclusions but drilling himself — issuing reminders and commands. The second-person address marks the Meditations as an instrument of training rather than a record of settled belief.",
      },
      {
        question: "3. Why does the repetition of principles across the twelve books matter, rather than being mere carelessness?",
        answer: "It is the repetition of an athlete: knowledge without practice disappears. The recurrence shows Marcus reinforcing principles he has not yet fully internalized — practice, not redundancy.",
      },
      {
        question: "4. What does Hadot mean by 'spiritual exercises,' and name three.",
        answer: "Concrete daily practices for transforming the self, not metaphors. Examples include the morning review, the evening examination, the premeditation of adversity, the view from above, the contemplation of death, and the practice of attention (prosochē).",
      },
      {
        question: "5. On Hadot's account, what was ancient philosophy primarily for?",
        answer: "It was primarily a set of practices for transforming the self, not a body of doctrines to be believed. The school was a place to be trained, and the texts were instruments of transformation rather than objects of study.",
      },
      {
        question: "6. When Marcus anticipates meeting 'meddling, ungrateful' people, what exercise is he performing, and what is its function?",
        answer: "The premeditation of adversity — anticipating difficulty in advance to reduce its shock when it arrives. He is training his impressions before the day begins; the act of performing the exercise matters as much as its content.",
      },
      {
        question: "7. Why does Hadot say the Meditations lack system, argument, and topical organization?",
        answer: "Because a practice log is not a treatise. Marcus circles back and contradicts himself at the surface because he is recording ongoing practice, the way a carpenter notes what the wood did today — not constructing a structured philosophical argument.",
      },
      {
        question: "8. What is the difference between studying Marcus and following Marcus?",
        answer: "Studying Marcus accumulates knowledge about a Roman emperor. Following Marcus means doing what he did — performing the same exercises in your own circumstances. PHIL 702 aims at the second.",
      },
      {
        question: "9. Why does the course insist the practice assignment is 'the course,' not supplementary material?",
        answer: "Because the lesson content supplies only the theory; the practice supplies the work that produces change. Without the work you have merely read about Marcus; with it you have begun to train alongside him.",
      },
      {
        question: "10. What does Epictetus's image of the school as a 'surgery' establish as the standard for PHIL 702?",
        answer: "That you should leave having felt something change, not merely having acquired new information. The measure of the course is transformation, not the accumulation of knowledge.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The Meditations are a practice log, not a book of wisdom. Reading them as a spectator misses the point entirely.",
      assignment: "Before Session II, read Meditations Book II.1 — the morning premeditation of difficult people. Then write your own version: a short paragraph addressed to yourself in the second person, anticipating the specific difficulties of your coming day. Use 'you' not 'I.' Do not philosophize — drill. This is your first entry in your own practice log.",
      duration: "20 min",
      greekTerms: "prosochē — watchful attention / askēsis — training",
    },
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: "The Three Disciplines — Marcus's Daily Framework",
    briefing:
      "The Meditations are not random. Beneath the surface variety of topics and moods, Hadot identifies a consistent underlying structure: the three disciplines that Epictetus prescribed and Marcus practised daily. The discipline of desire (what to want and avoid), the discipline of action (how to act toward others), and the discipline of assent (how to judge impressions). Understanding this framework transforms the Meditations from a collection of aphorisms into a systematic daily practice. Each entry in the Meditations can be located within one of the three disciplines — once you see the structure, you cannot unsee it.",
    parts: [
      {
        title: 'Three Disciplines, One Practice',
        content: [
          "Epictetus organized the whole of philosophical training around three disciplines, or topoi. The first is the discipline of desire (orexis) — learning to want only what is genuinely good (virtue) and to be averse only to what is genuinely bad (vice), accepting everything else as indifferent. The second is the discipline of action (hormē) — learning to act appropriately toward others, fulfilling your duties with full effort but without attachment to outcomes. The third is the discipline of assent (synkatathesis) — learning to examine every impression before giving it your agreement, refusing to assent to anything that misrepresents reality.",
          "These three disciplines are not three separate practices. They are three dimensions of a single integrated practice, applied simultaneously to every situation. When a difficult colleague behaves badly, the discipline of desire asks: am I disturbed because I wanted something external? The discipline of action asks: what is the appropriate response here, given my role and this person's nature? The discipline of assent asks: what exactly is this impression claiming, and is it accurate?",
          "Marcus applies all three in real time, in the most demanding conditions a human being can face. He is not a monk in a cell. He is an emperor dealing with betrayal, plague, war, and the endless friction of power. The three disciplines are his equipment for that environment.",
        ],
      },
      {
        title: 'The Disciplines in the Meditations',
        content: [
          "Once you understand the three disciplines, specific passages in the Meditations become legible in a new way. Book IV.3 — 'Men seek retreats for themselves, houses in the country, sea-shores and mountains' — is a discipline of desire passage: Marcus is reminding himself that the retreat he needs is internal, not geographical. The external retreat is an indifferent. Book IX.42 — 'When you wake up in the morning, tell yourself: the people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous and surly' — is a discipline of action passage: Marcus is preparing to act appropriately toward difficult people without being derailed by their behavior. Book VIII.7 — 'Do not disturb yourself by picturing your life as a whole' — is a discipline of assent passage: Marcus is refusing to assent to the catastrophic impression of his entire life as a burden.",
          "Hadot argues that this three-part structure explains the apparent randomness of the Meditations. Marcus is not writing about whatever occurs to him. He is running through the three disciplines as they bear on his current situation, returning to whichever one needs reinforcement. The repetition is not intellectual — it is practice. A musician who has not yet fully internalized a passage plays it again. Marcus, who has not yet fully internalized the discipline of desire, writes about it again.",
        ],
      },
      {
        title: 'Why This Matters for Practice',
        content: [
          "The three disciplines give you a diagnostic tool for your own practice. When something disturbs you, you can ask: which discipline has failed here? If you are anxious about an outcome you cannot control, the discipline of desire has slipped — you are treating an indifferent as a genuine good. If you are neglecting a duty because you are not sure it will be appreciated, the discipline of action has slipped — you are attaching your effort to the outcome rather than to the act itself. If you are accepting an impression at face value without examining it — 'this person hates me,' 'this situation is hopeless' — the discipline of assent has slipped.",
          "This is how philosophy becomes diagnostic rather than decorative. It is not there to make you feel better about difficult situations. It is a framework for identifying exactly where your reasoning has gone wrong and correcting it. Marcus used it as a real-time diagnostic. The Meditations are the record of a man running the diagnostic on himself, daily, under pressure.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. Name the three disciplines and the Greek term Epictetus associated with each.",
        answer: "The discipline of desire (orexis), the discipline of action (hormē), and the discipline of assent (synkatathesis).",
      },
      {
        question: "2. What does the discipline of desire train you to want and to avoid?",
        answer: "To want only what is genuinely good (virtue) and to be averse only to what is genuinely bad (vice), accepting everything else as indifferent.",
      },
      {
        question: "3. Why does Hadot insist the three disciplines are one integrated practice rather than three separate ones?",
        answer: "Because they are three dimensions applied simultaneously to every situation — desire, action, and assent are each questioned at once in any given moment, not practised in isolation.",
      },
      {
        question: "4. Classify Book IV.3 ('Men seek retreats…') by discipline and explain why.",
        answer: "Discipline of desire. Marcus reminds himself the retreat he needs is internal, not geographical; the external retreat is an indifferent he should not desire.",
      },
      {
        question: "5. Classify Book VIII.7 ('Do not disturb yourself by picturing your life as a whole') by discipline and explain why.",
        answer: "Discipline of assent. Marcus refuses to assent to the catastrophic impression of his entire life as a burden — he declines to accept a distorted impression.",
      },
      {
        question: "6. How does Hadot use the three disciplines to explain the apparent randomness of the Meditations?",
        answer: "Marcus is not writing about whatever occurs to him; he is cycling through the three disciplines as they bear on his situation, returning to whichever needs reinforcement. The seeming randomness is structured practice.",
      },
      {
        question: "7. What is the significance of the musician analogy for the repetition in the Meditations?",
        answer: "A musician replays a passage not yet internalized; likewise Marcus writes about a discipline again because he has not yet fully internalized it. The repetition is practice, not intellectual redundancy.",
      },
      {
        question: "8. Why is it significant that Marcus practised the three disciplines as an emperor rather than a monk?",
        answer: "Because the disciplines are equipment for the most demanding human conditions — betrayal, plague, war, the friction of power — not techniques for a sheltered, withdrawn life.",
      },
      {
        question: "9. If you are anxious about an outcome you cannot control, which discipline has slipped, and what is the error?",
        answer: "The discipline of desire. The error is treating an indifferent (the outcome) as a genuine good.",
      },
      {
        question: "10. What does it mean to say philosophy becomes 'diagnostic rather than decorative'?",
        answer: "It is not there to make you feel better but to identify precisely where your reasoning has gone wrong and correct it. The three disciplines are a real-time diagnostic for locating which judgment failed.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The three disciplines — desire, action, assent — are Marcus's daily diagnostic framework, not abstract philosophical categories.",
      assignment: "For one full day, keep a three-column note on your phone or paper. Label the columns: Desire, Action, Assent. Every time something disturbs you, disrupts your focus, or provokes a strong reaction, make a brief note in the relevant column. At day's end, review: which discipline failed most often? That is your current training priority.",
      duration: "All day, then 10 min review",
      greekTerms: "orexis — desire / hormē — impulse / synkatathesis — assent",
    },
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'The Discipline of Desire — Wanting Nothing External',
    briefing:
      "The discipline of desire is the most radical of the three disciplines and the hardest to practise. It requires genuinely wanting only what is up to you — virtue, good judgment, honest effort — and being genuinely indifferent to everything else. Not pretending to be indifferent. Not performing Stoic detachment. Actually reorganizing what you care about at the level of desire itself. Marcus returns to this discipline more than any other in the Meditations, which is itself evidence of how difficult he found it. If he had mastered it, he would not need to keep writing about it.",
    parts: [
      {
        title: 'The Radical Claim',
        content: [
          "The Stoic claim about desire is the most counterintuitive thing in the philosophy. It is not: want things moderately. It is not: be prepared to lose what you have. It is: the only thing worth genuinely wanting is virtue — the full exercise of reason in every situation. Everything else — health, wealth, reputation, the survival of the people you love — is a preferred indifferent. Worth pursuing when possible. Not worth your peace when not.",
          "This sounds inhuman until you understand what the Stoics meant by desire. The Greek word is orexis — the reaching-out movement of the soul toward something it takes to be good. When the soul incorrectly identifies an external as a genuine good, it reaches toward it with the full force of desire. When that external is threatened or lost, the soul suffers in proportion to the desire. The Stoic discipline is not the elimination of desire but its redirection: toward the only thing that is genuinely good and genuinely within your power.",
          "Marcus knew this intellectually from an early age. The Meditations show him knowing it and still struggling with it — still finding himself disturbed by criticism, by ingratitude, by the behavior of people he trusted, by the sheer difficulty of his responsibilities. The discipline of desire is not a conclusion you reach and then possess. It is a practice you perform daily, for life.",
        ],
      },
      {
        title: 'Marcus and Preferred Indifferents',
        content: [
          "The Stoics were careful to distinguish genuine indifference from carelessness. Health is an indifferent — not a genuine good — but you should still pursue it, because it is a preferred indifferent: something that, all things equal, is worth having. The same applies to the welfare of your family, the success of your work, your reputation among people whose judgment matters. You pursue these things. You just do not require them for your equanimity.",
          "Marcus makes this distinction throughout the Meditations. He does not withdraw from his responsibilities as emperor because they concern externals. He pursues them with full effort. What he refuses to do is make his peace contingent on their success. Book VI.2: 'How much more grievous are the consequences of anger than the causes of it.' Book IV.39: 'Do not disturb yourself by thinking of the whole of your life. Let not your thoughts range over the many troublesome things which have happened in the past and may happen in the future, but ask yourself with regard to every present difficulty: what is there in this that is intolerable and beyond endurance?'",
          "The key word is intolerable. Marcus asks himself: is this actually intolerable? The answer, almost always, is no. It is uncomfortable. It is inconvenient. It is not what he would have chosen. But it is not intolerable — which means the discipline of desire can hold.",
        ],
      },
      {
        title: 'The Practice of Wanting Rightly',
        content: [
          "The practical question is: how do you actually retrain desire? Not by suppression — the Stoics were not advocates of emotional anaesthesia. By substitution. When you notice yourself wanting an external — approval, success, comfort, safety — you replace the object of desire with the virtuous action that the situation requires. You do not want the promotion; you want to do excellent work. You do not want the relationship to be easy; you want to act with honesty and care in it. You do not want the illness to resolve itself; you want to face it with the full exercise of reason.",
          "This substitution is not a trick. It is a genuine reorientation of desire toward what is actually in your power. Over time — and Marcus was under no illusions that it was quick — the substitution becomes more natural. The soul stops reaching for the external and starts reaching for the virtuous action. This is what the discipline of desire produces in practice: not a person who does not care about anything, but a person whose caring is directed at what they can actually control.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. State the radical Stoic claim about desire precisely — and say what it is NOT.",
        answer: "The only thing worth genuinely wanting is virtue, the full exercise of reason in every situation. It is not 'want things moderately' and not merely 'be prepared to lose what you have' — everything external is a preferred indifferent.",
      },
      {
        question: "2. Define orexis and explain how misdirected desire produces suffering.",
        answer: "Orexis is the soul's reaching-out movement toward what it takes to be good. When the soul wrongly identifies an external as a genuine good, it reaches with full desire; when that external is threatened or lost, the soul suffers in proportion to the desire.",
      },
      {
        question: "3. Why is the discipline of desire described as a redirection rather than an elimination of desire?",
        answer: "The Stoics did not advocate killing desire but aiming it at the only thing genuinely good and within your power — virtue. Desire is reoriented, not extinguished.",
      },
      {
        question: "4. What is the difference between genuine Stoic indifference and carelessness, using health as the example?",
        answer: "Health is a preferred indifferent: not a genuine good, but worth pursuing all else equal. Genuine indifference still pursues health fully; carelessness neglects it. The Stoic pursues it without requiring it for equanimity.",
      },
      {
        question: "5. Why does Marcus, as emperor, not withdraw from responsibilities that concern externals?",
        answer: "Because preferred indifferents are still worth pursuing with full effort. He refuses only to make his peace contingent on their success — he engages fully while holding the outcome lightly.",
      },
      {
        question: "6. What is the significance of the word 'intolerable' in Book IV.39?",
        answer: "Marcus tests each difficulty by asking whether it is actually intolerable. Almost always it is merely uncomfortable or inconvenient, not intolerable — which means the discipline of desire can hold.",
      },
      {
        question: "7. Why is it evidence of difficulty, not mastery, that Marcus returns to the discipline of desire most often?",
        answer: "Because one writes to reinforce what is not yet internalized. If he had mastered the discipline he would not need to keep drilling it; the frequency reveals ongoing struggle.",
      },
      {
        question: "8. Explain the method of 'substitution' for retraining desire.",
        answer: "When you notice yourself wanting an external, you replace its object with the virtuous action the situation requires — wanting to do excellent work rather than wanting the promotion. Desire is redirected toward what is in your power.",
      },
      {
        question: "9. Why does the course insist substitution is 'not a trick'?",
        answer: "Because it is a genuine reorientation of desire toward what is actually in your power, not a rhetorical evasion. Over time the soul really does begin reaching for the virtuous action rather than the external.",
      },
      {
        question: "10. What does the discipline of desire produce in practice — and what does it NOT produce?",
        answer: "It produces a person whose caring is directed at what they can control — not a person who cares about nothing. It is reorientation of care, not emotional anaesthesia.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Desire for externals is not eliminated — it is redirected toward the virtuous action the situation requires.",
      assignment: "Identify the one thing you most want right now that is not fully within your control. Write it down. Then write the virtuous action it corresponds to — the part that IS up to you. Spend one day acting from the virtuous action, not the external desire. At day's end: did the quality of your action change when it was no longer contingent on the outcome?",
      duration: "15 min writing, 1 day practice",
      greekTerms: "orexis — desire / adiaphora — indifferents / aretē — excellence",
    },
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'The Discipline of Action — Doing Your Duty Without Attachment',
    briefing:
      "The discipline of action is the most socially oriented of the three disciplines. It concerns how you act toward other people — your duties, your roles, your obligations. The Stoic framework here is twofold: oikeiōsis (the natural extension of concern from self to others) and kathēkon (appropriate action — what is fitting given your role and relationships). Marcus was simultaneously a son, a husband, a father, a friend, an emperor, a soldier, and a philosopher. Each role carried specific duties. The discipline of action is the practice of fulfilling those duties fully, without resentment, without attachment to outcome, and without allowing the failures of others to become excuses for neglecting your own obligations.",
    parts: [
      {
        title: "The Archer's Practice",
        content: [
          "Epictetus used the image of the archer to describe the discipline of action. The archer's job is to aim carefully and release well. Whether the arrow hits the target depends on wind, distance, the quality of the bow — factors partly outside the archer's control. The archer who makes hitting the target the condition of his peace has made a mistake. His job is the aim and the release. The rest is indifferent.",
          "Marcus applies this image constantly. He acts — fully, carefully, with complete effort — and then releases the outcome. Book VI.2: 'Confine yourself to the present.' Book IX.29: 'Nowhere can man find a quieter or more untroubled retreat than in his own soul.' The retreat to the inner citadel is available precisely because Marcus has done his job — aimed and released — and is not tormenting himself about where the arrow landed.",
          "The discipline of action with reservation (Epictetus's hupexairesis — the mental reservation attached to every intention) means pursuing every goal with the implicit caveat: if nothing prevents it. 'I will be home for dinner — if nothing prevents it.' Not as an excuse for half-effort, but as a philosophical acknowledgment that outcomes involve factors beyond your control. The effort is unconditional. The outcome is held lightly.",
        ],
      },
      {
        title: 'Duty Without Resentment',
        content: [
          "Marcus governed one of the largest empires in human history while wanting, apparently, to be a philosopher in a quiet room. The Meditations are full of his exhaustion with the demands of power. And yet he stayed. He fulfilled his role. Not because he was forced to — he had enough power to abdicate — but because the discipline of action required it. This was his kathēkon. His appropriate action. The action fitting for a person of his nature, in his role, in his circumstances.",
          "The key insight here is that resentment of a duty does not discharge it. Marcus knew this. He also knew that performing a duty while resenting it produces a degraded form of action — half-hearted, contaminated by self-pity. The discipline of action requires not just doing the thing but doing it fully, as if it were exactly what you would have chosen. Book X.12: 'If it is not right, do not do it; if it is not true, do not say it.' The test is not whether the duty is pleasant. It is whether it is right.",
        ],
      },
      {
        title: 'Acting Toward Difficult People',
        content: [
          "The hardest application of the discipline of action is in relationships with people who behave badly. Marcus returns to this more than almost any other subject in the Meditations. People who are ungrateful. People who lie. People who betray trust. The discipline of action does not require you to pretend this is not happening. It requires you to continue acting appropriately toward them regardless.",
          "Book II.1 — the morning premeditation of difficult people — is a preparation for this. Marcus is not steeling himself to endure bad behavior. He is reminding himself that people who behave badly are doing so out of ignorance of the good. They are not evil; they are mistaken. The Stoic principle nobody does wrong willingly — adapted from Socrates — is operative here. A person who acts badly has a false belief about what is genuinely good. Your anger at them is, philosophically, like being angry at someone for not knowing mathematics. Your job is not to punish them but to act appropriately — which may mean correcting them, or setting limits, or simply doing your duty toward them without requiring their cooperation.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. In the archer image, what is the archer's actual job, and what is the indifferent?",
        answer: "The archer's job is to aim carefully and release well — that is up to him. Whether the arrow hits the target depends on wind, distance, and the bow, which are indifferents outside his control.",
      },
      {
        question: "2. What mistake does the archer make if he stakes his peace on hitting the target?",
        answer: "He attaches his equanimity to an outcome that is not fully up to him. His job is the aim and the release; making the result the condition of his peace is the error the discipline of action corrects.",
      },
      {
        question: "3. Define hupexairesis and give the everyday example from the lesson.",
        answer: "The reserve clause — the mental reservation attached to every intention: pursue the goal 'if nothing prevents it.' Example: 'I will be home for dinner — if nothing prevents it.' The effort is unconditional; the outcome is held lightly.",
      },
      {
        question: "4. What is kathēkon, and why was remaining emperor Marcus's kathēkon?",
        answer: "Kathēkon is appropriate action — what is fitting given one's nature, role, and circumstances. Remaining emperor was the action fitting for a person of his nature in his role, so the discipline of action required it even though he could have abdicated.",
      },
      {
        question: "5. Why does resentment of a duty fail to discharge it, and what does resentment do to the action?",
        answer: "The duty remains whether or not you resent it. Performing it resentfully degrades the action — making it half-hearted and contaminated by self-pity. The discipline requires doing it fully, as if chosen.",
      },
      {
        question: "6. What is the test in Book X.12 ('If it is not right, do not do it…') for whether to perform a duty?",
        answer: "Whether the action is right and true, not whether it is pleasant. The discipline of action judges by rightness, not by comfort or enjoyment.",
      },
      {
        question: "7. According to the Socratic principle Marcus adopts, why do people behave badly?",
        answer: "Nobody does wrong willingly: people who act badly hold a false belief about what is genuinely good. They are mistaken, not evil.",
      },
      {
        question: "8. Why does Marcus compare anger at a wrongdoer to anger at someone for not knowing mathematics?",
        answer: "Because bad behavior stems from ignorance of the good — a cognitive error. Being angry at the error is as misplaced as resenting ignorance of a subject the person was never taught.",
      },
      {
        question: "9. Does the discipline of action require pretending bad behavior is not happening? Explain.",
        answer: "No. It requires continuing to act appropriately toward the person regardless — which may mean correcting them, setting limits, or doing your duty without requiring their cooperation. It is clear-eyed, not in denial.",
      },
      {
        question: "10. How does acting 'without requiring their cooperation' express the discipline of action?",
        answer: "Your appropriate action is up to you; the other person's response is an indifferent. You fulfill your duty fully without making its quality contingent on whether they reciprocate.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The discipline of action means fulfilling your duties fully, without attachment to outcome and without requiring others' cooperation to do your part well.",
      assignment: "Identify one duty you have been fulfilling grudgingly or partially — a role obligation, a relationship responsibility, a work commitment. For three days, perform it as if it were exactly what you would have chosen. Full effort, no resentment, released outcome. On day three, write one sentence about whether the quality of your action changed when the resentment was removed.",
      duration: "3 days, then 5 min writing",
      greekTerms: "kathēkon — appropriate action / hupexairesis — reservation / oikeiōsis — affiliation",
    },
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'The Discipline of Assent — Guarding the Ruling Faculty',
    briefing:
      "The discipline of assent is the most philosophically precise of the three disciplines and the one Hadot argues is the deepest in Marcus's practice. It concerns the ruling faculty — the hēgemonikon — and its relationship to impressions. Every moment of every day, impressions arrive: this person insulted me, this situation is hopeless, this outcome is catastrophic. The discipline of assent is the practice of examining each impression before accepting it — refusing to give the weight of your judgment to anything that has not been scrutinized. Marcus calls this guarding the ruling faculty. It is, in Epictetan terms, the core of what is up to us.",
    parts: [
      {
        title: 'The Ruling Faculty',
        content: [
          "The Stoics located the seat of rational activity in what they called the hēgemonikon — the ruling or commanding faculty. It is not the brain in the modern anatomical sense; the Stoics located it in the heart. But the philosophical function is clear: it is the part of you that receives impressions, examines them, gives or withholds assent, forms intentions, and directs action. Everything that is genuinely up to you happens here.",
          "Marcus returns to the hēgemonikon constantly in the Meditations. Book VIII.48: 'Confine yourself to the present. Understand what is happening to you and to others, and divide and classify it.' Book III.16: 'The universe is transformation; life is opinion.' The word translated 'opinion' is hupolēpsis — judgment, the act of the ruling faculty assenting to an impression. Marcus is saying: what disturbs you is not the event but your judgment of the event. Change the judgment and you change everything.",
          "This is not a platitude. It is a precise philosophical claim. The impression 'this person has wronged me' presents itself as a fact. The discipline of assent requires examining it: what exactly happened? Is the interpretation 'wronged me' the only available interpretation? Is there another account that is more accurate and less disturbing? The pause between impression and assent is where all philosophical practice lives.",
        ],
      },
      {
        title: 'Guarding the Gate',
        content: [
          "Hadot uses the image of a guard at a gate to describe the discipline of assent. Impressions arrive at the gate of the ruling faculty constantly. The undisciplined person lets them all through — whatever arrives, he accepts. The disciplined person examines each one at the gate: is this impression accurate? Is it catastrophizing? Is it treating an indifferent as a genuine good or evil? If so, it does not get through. The ruling faculty remains clear.",
          "Marcus describes this practice in several of the most practically useful passages in the Meditations. Book VI.13: 'Receive without pride, relinquish without struggle.' Book V.26: 'The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.' The 'insane' are people who have given assent to false impressions — people who have let through the gate whatever arrived, without examination. Book IV.7: 'Do not indulge your imagination. Cut it short.' The imagination — phantasia in its undisciplined form — is the source of most unnecessary suffering. Guard the gate.",
        ],
      },
      {
        title: 'The Practice in Real Time',
        content: [
          "The challenge with the discipline of assent is that it must be practised in real time. The impression arrives fast. The emotional response follows almost immediately. The pause that the discipline of assent requires — the space between stimulus and response — has to be cultivated through practice before it appears automatically.",
          "Marcus practised this through his morning review: before the day began, he drilled the principle that what would disturb him today was not events but his judgments about them. He was pre-building the pause. When the difficult situation arrived, the pause was already partly in place because he had rehearsed it that morning. This is why the morning examination is the foundational practice — not because it produces instant results, but because it gradually widens the space between impression and assent where all philosophical practice lives.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What is the hēgemonikon, where did the Stoics locate it, and what does it do?",
        answer: "The ruling or commanding faculty — located in the heart, not the brain. It receives impressions, examines them, gives or withholds assent, forms intentions, and directs action. Everything genuinely up to you happens there.",
      },
      {
        question: "2. What does hupolēpsis mean, and what is Marcus claiming in 'life is opinion' (III.16)?",
        answer: "Hupolēpsis is judgment — the ruling faculty's act of assenting to an impression. Marcus claims that what disturbs you is not the event but your judgment of it; change the judgment and you change everything.",
      },
      {
        question: "3. Why is 'what disturbs you is your judgment, not the event' a precise philosophical claim rather than a platitude?",
        answer: "Because it locates disturbance specifically at the act of assent: an impression like 'this person wronged me' presents as fact but can be examined for accuracy and alternative interpretations. The claim identifies an exact, correctable mechanism.",
      },
      {
        question: "4. Explain Hadot's 'guard at the gate' image and how the disciplined and undisciplined person differ.",
        answer: "Impressions constantly arrive at the gate of the ruling faculty. The undisciplined person lets them all through; the disciplined person examines each — is it accurate? catastrophizing? treating an indifferent as good or evil? — and refuses entry to false ones.",
      },
      {
        question: "5. In Book V.26, who are 'the insane,' and what have they done?",
        answer: "People who have given assent to false impressions — who let whatever arrived through the gate without examination. Marcus aims to escape their ranks by guarding assent.",
      },
      {
        question: "6. What is phantasia in its undisciplined form, and why does Marcus say 'cut it short' (IV.7)?",
        answer: "Undisciplined phantasia is unchecked imagination, the source of most unnecessary suffering. Cutting it short means refusing to let the impression elaborate into catastrophe before it has been examined.",
      },
      {
        question: "7. Where, according to the lesson, does 'all philosophical practice live'?",
        answer: "In the pause between impression and assent — the space where the impression can be examined before it is accepted.",
      },
      {
        question: "8. Why is the discipline of assent uniquely difficult to practise?",
        answer: "Because it must be done in real time: the impression arrives fast and the emotional response follows almost immediately. The required pause must be cultivated through practice before it appears automatically.",
      },
      {
        question: "9. How does the morning review 'pre-build the pause'?",
        answer: "By drilling in advance the principle that events do not disturb us, only our judgments do, Marcus partly establishes the pause before the day begins — so when difficulty arrives, the space between impression and assent is already partially in place.",
      },
      {
        question: "10. Why is the morning examination called the foundational practice despite not producing instant results?",
        answer: "Because it gradually widens the space between impression and assent over time. Its value is cumulative — it builds the capacity in which every other discipline operates.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The discipline of assent is the practice of examining every impression at the gate of the ruling faculty before giving it your agreement.",
      assignment: "For one day, practise the gate. Every time a strong negative impression arrives — frustration, anxiety, offense — stop and write or say the impression explicitly: 'The impression is that X.' Then examine it: is X the only interpretation? Is X treating an indifferent as a genuine evil? What does a more accurate account look like? At day's end, identify one impression you successfully examined and one that got through the gate unchecked.",
      duration: "All day, then 10 min reflection",
      greekTerms: "hēgemonikon — ruling faculty / phantasia — impression / hupolēpsis — judgment",
    },
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'The View from Above — Marcus and Cosmic Perspective',
    briefing:
      "One of the most distinctively Stoic exercises in the Meditations is what Hadot calls the 'view from above' — the practice of mentally zooming out from your immediate situation to see it from an increasingly vast perspective. The individual problem becomes small against the city; the city becomes small against the empire; the empire becomes small against the earth; the earth becomes small against the cosmos; the cosmos becomes small against time. Marcus practises this exercise repeatedly. Its function is not to make your problems seem meaningless — it is to restore proportion, to interrupt the tendency of the mind to treat immediate difficulties as ultimate catastrophes.",
    parts: [
      {
        title: 'The Exercise',
        content: [
          "The view from above appears in multiple forms in the Meditations. Sometimes it is spatial — Marcus imagining the earth from a great height, the petty struggles of human beings visible as the movements of insects. Sometimes it is temporal — Marcus placing his immediate situation against the vast sweep of time, noting how many emperors, how many crises, how many apparently urgent matters have already been swallowed by time without leaving a trace. Sometimes it is both — the 'Alexander and his mule-driver' passage (Book VI.24), where Marcus notes that Alexander the Great and his mule-driver ended in the same place.",
          "The exercise is not nihilism. Marcus is not arguing that nothing matters. He is arguing that most of what feels urgently important is not — that the perspective of ordinary human anxiety is systematically distorted by proximity, and that deliberately zooming out corrects the distortion. Book IX.30: 'Look at the past — empire succeeding empire — and from that, extrapolate the future: it will be no different, incapable of deviating from the rhythm of the present. Which means it makes no difference whether you observe human life for forty years or ten thousand: what more will you see?'",
        ],
      },
      {
        title: 'Cosmic Perspective and the Discipline of Desire',
        content: [
          "The view from above is not a freestanding exercise. It serves the discipline of desire by making the preferred indifferents look exactly like what they are — preferred, but genuinely indifferent in the cosmic frame. The reputation you are anxious about will not be remembered in fifty years. The outcome you are desperate to secure is one of billions of outcomes unfolding simultaneously across the earth. The illness you fear will come for everyone eventually.",
          "This is not comforting in the ordinary sense. It is clarifying. It strips the false urgency from the indifferents and returns your attention to what is actually worth wanting — virtue, reason, the full exercise of the ruling faculty in whatever situation you are actually in. The cosmic perspective does not tell you what to do. It removes the noise that was preventing you from seeing clearly what to do.",
          "Marcus uses this exercise most explicitly when dealing with the fear of death and the anxiety of power. Both look different from a sufficient altitude. Death is the condition of every living thing — to fear it is to be disturbed by the nature of things, which is the most basic form of the discipline of desire failing. Power is temporary, its products mostly ephemeral. The emperor who can see this clearly governs better than the one who cannot.",
        ],
      },
      {
        title: 'Practising the Zoom',
        content: [
          "The view from above is a concrete exercise, not just a philosophical attitude. It has a method: start from your immediate situation and deliberately widen the frame. Your argument with your colleague → your workplace → your city → your country → the earth → the solar system → the cosmos. Your current anxiety → your life → the century → the millennium → the deep time of the universe.",
          "At each stage, ask: does the thing I am disturbed about maintain its full apparent urgency from this perspective? Usually it does not. The point at which it shrinks — the frame at which it becomes proportionate — is useful information. It tells you how contracted your perspective had become.",
          "Marcus also uses temporal zooming — not just spatial. How many people have faced exactly this situation before? How many of them are remembered? How did it look fifty years later? A hundred years later? The temporal zoom is especially useful for anxiety about reputation and legacy — the things that feel most urgently important often look most trivial from a modest temporal distance.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What is the 'view from above,' and what are its two main forms?",
        answer: "The practice of mentally zooming out from your immediate situation to an increasingly vast perspective. Its two forms are spatial (seeing the earth from a height) and temporal (placing the situation against the vast sweep of time).",
      },
      {
        question: "2. What does the 'Alexander and his mule-driver' passage (VI.24) illustrate?",
        answer: "That Alexander the Great and his mule-driver ended in the same place — death levels distinctions of rank and achievement. It is a form of the view from above used to restore proportion.",
      },
      {
        question: "3. Why is the view from above explicitly NOT nihilism?",
        answer: "Marcus does not claim nothing matters. He claims that most of what feels urgently important is not, because ordinary anxiety is distorted by proximity. Zooming out corrects the distortion rather than denying all value.",
      },
      {
        question: "4. How does the view from above serve the discipline of desire?",
        answer: "It makes preferred indifferents look like what they actually are — preferred but genuinely indifferent in the cosmic frame. By stripping false urgency from externals, it returns desire to what is truly worth wanting: virtue.",
      },
      {
        question: "5. The lesson says the exercise is 'clarifying, not comforting.' Explain the distinction.",
        answer: "It does not soothe by minimizing; it removes the noise of false urgency so you can see clearly what is actually worth wanting and doing. Its value is clarity about value, not emotional consolation.",
      },
      {
        question: "6. Why does Marcus say fearing death is 'the most basic form of the discipline of desire failing'?",
        answer: "Because death is the condition of every living thing — the nature of things itself. To fear it is to be averse to reality as it necessarily is, which is precisely a failure to want and accept rightly.",
      },
      {
        question: "7. How does cosmic perspective bear on the exercise of power, according to Marcus?",
        answer: "Power is temporary and its products mostly ephemeral. The emperor who sees this clearly governs better than one who does not — the perspective frees him from distortions that corrupt judgment.",
      },
      {
        question: "8. Describe the concrete method of the spatial zoom.",
        answer: "Start from the immediate situation and deliberately widen the frame in stages — your conflict → workplace → city → country → earth → solar system → cosmos — asking at each stage whether the disturbance keeps its apparent urgency.",
      },
      {
        question: "9. What useful information does 'the point at which the problem shrinks' give you?",
        answer: "It tells you how contracted your perspective had become — the frame at which the difficulty becomes proportionate reveals how distorted by proximity your original view was.",
      },
      {
        question: "10. Why is the temporal zoom especially useful for anxiety about reputation and legacy?",
        answer: "Because the things that feel most urgently important about reputation and legacy look most trivial from even a modest temporal distance — fifty or a hundred years later they leave little trace.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The view from above restores proportion by interrupting the mind's tendency to treat immediate difficulties as ultimate catastrophes.",
      assignment: "Take your current most pressing concern — the thing occupying the most mental real estate right now. Write it down in one sentence. Then perform the spatial and temporal zoom: write a sentence about how it looks from the perspective of your city, your country, the earth, the cosmos. Then from the perspective of fifty years from now, a hundred years, a thousand. At what point does it shrink to its actual size? What remains important even from the furthest perspective?",
      duration: "20 min",
      greekTerms: "logos — rational order / heimarmenē — providence / telos — end",
    },
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Memento Mori — Marcus and the Practice of Death',
    briefing:
      "No practice appears more frequently in the Meditations than the contemplation of death. Marcus returns to it in almost every book — not as morbidity but as one of the most clarifying exercises in the Stoic toolkit. The premeditation of death (the meletē thanatou) serves multiple functions: it strips false urgency from indifferents, it clarifies what actually matters, it interrupts the illusion of permanence that makes human beings behave as though they have unlimited time, and it — paradoxically — increases the quality of present engagement. A person who genuinely holds their own mortality in view lives differently from one who keeps it at the edge of consciousness.",
    parts: [
      {
        title: 'What the Practice Is Not',
        content: [
          "Before describing what the Stoic contemplation of death is, it is worth clearing away what it is not. It is not a form of pessimism. It is not an invitation to despair. It is not the romanticization of mortality found in certain literary traditions. And it is emphatically not an argument that life is not worth living or that effort is pointless.",
          "The Stoic practice is precisely the opposite of these things. The contemplation of death produces clarity about value — it strips the apparent importance from things that will not matter at the end and restores attention to the things that will. Marcus uses it as a clarifying lens: when he is uncertain whether something is worth his energy, he asks how it will look from the perspective of death. When he is tempted to defer the philosophical life to some future when circumstances are more convenient, he uses the contemplation of death to interrupt the deferral.",
          "Book II.14: 'Even if you were to live three thousand years, or thirty thousand, remember that no one loses any other life than the one they are now living.' The contemplation of death is a practice for living fully in the present — not because the present is all you have, but because it is the only place where the ruling faculty can operate.",
        ],
      },
      {
        title: 'Death as the Great Leveler',
        content: [
          "Marcus uses the contemplation of death in a second way: as an equalizer that strips false distinctions of rank, achievement, and reputation. The 'Alexander and his mule-driver' motif is one version of this. Another is the extended meditation in Book IV on all the great men of previous generations — emperors, philosophers, generals — who are now completely gone, leaving barely a trace. Not as a depressing observation but as a liberating one.",
          "If Marcus's achievements as emperor will be forgotten — as they largely would be, were it not for the accident of the Meditations surviving — then the anxiety about his legacy is misplaced. If the great Antonines who preceded him are gone without remainder, then his own death is nothing extraordinary. If Hadrian's villa, built by one of the most powerful men in history, is now ruins, then the anxiety about what you build and leave behind is an anxiety about an indifferent.",
          "This is not resignation. Marcus continues to govern, to build, to care for his empire with extraordinary conscientiousness. The point is that he does these things without requiring them to be permanent. He acts fully and releases the outcome — including the ultimate outcome of his own death and the eventual dissolution of everything he built.",
        ],
      },
      {
        title: 'Living Toward Death',
        content: [
          "The practical effect of the Stoic contemplation of death is a heightened quality of presence. When you hold your mortality genuinely in view, the question 'is this how I want to spend this particular hour?' becomes sharper. Not as a performance of urgency but as a genuine clarifying force. The person who knows they are mortal and keeps that knowledge active lives differently — more deliberately, more presently, less postponingly — than the one who holds mortality at arm's length.",
          "Marcus practises this through the specific exercise of imagining his death and asking what he would regret, what he would want to have done differently, what he would wish he had paid more attention to. The exercise is not pleasant. It is useful. It identifies the gap between the life currently being lived and the life worth living — which is exactly the information the philosophical practitioner needs.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. List three things the Stoic contemplation of death is NOT.",
        answer: "It is not pessimism, not an invitation to despair, not romanticization of mortality, and not an argument that life is not worth living or that effort is pointless.",
      },
      {
        question: "2. What is the meletē thanatou, and name two functions it serves.",
        answer: "The premeditation or contemplation of death. It strips false urgency from indifferents, clarifies what actually matters, interrupts the illusion of permanence, and heightens present engagement.",
      },
      {
        question: "3. How does Marcus use death as a 'clarifying lens' for decisions?",
        answer: "When uncertain whether something is worth his energy, he asks how it will look from the perspective of death; and when tempted to defer the philosophical life, he uses the thought of death to interrupt the deferral.",
      },
      {
        question: "4. What does Book II.14 ('no one loses any other life than the one they are now living') teach about the present?",
        answer: "However long you live, the only life you can lose is the present one — so the contemplation of death is a practice for living fully now, the only place where the ruling faculty can operate.",
      },
      {
        question: "5. Explain death as 'the great leveler' and how Marcus uses it.",
        answer: "Death strips false distinctions of rank, achievement, and reputation — Alexander and his mule-driver end alike. Marcus uses the disappearance of great predecessors not as a depressing fact but as a liberating one that frees him from anxiety about legacy.",
      },
      {
        question: "6. Why does the fact that Marcus's achievements would be forgotten make legacy-anxiety 'misplaced'?",
        answer: "Because legacy and reputation are indifferents that time dissolves — even an emperor's works become ruins. Anxiety about what you leave behind is anxiety about something not genuinely good.",
      },
      {
        question: "7. How does the contemplation of death differ from resignation, given that Marcus keeps governing and building?",
        answer: "He continues to act fully and conscientiously but without requiring his works to be permanent. He acts and releases the outcome — engagement without attachment, not withdrawal or passivity.",
      },
      {
        question: "8. What is the paradoxical practical effect of genuinely holding mortality in view?",
        answer: "A heightened quality of presence: the question 'is this how I want to spend this hour?' becomes sharper, and one lives more deliberately and less postponingly rather than more morbidly.",
      },
      {
        question: "9. Describe Marcus's specific death-imagining exercise.",
        answer: "He imagines his death and asks what he would regret, what he would do differently, and what he wishes he had paid more attention to — using the discomfort to surface useful information.",
      },
      {
        question: "10. What 'information the philosophical practitioner needs' does the exercise provide?",
        answer: "It identifies the gap between the life currently being lived and the life worth living — showing precisely where one's actual conduct diverges from one's values.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The contemplation of death is not morbidity — it is a clarifying exercise that strips false urgency from indifferents and sharpens presence.",
      assignment: "Sit with this for twenty minutes: you will die. Not abstractly — specifically. Write one paragraph on what you would regret if you died in ten years. Not what you would regret not having achieved — what you would regret not having been. Then identify one thing you are currently postponing that this exercise suggests you should stop postponing.",
      duration: "20 min",
      greekTerms: "meletē thanatou — premeditation of death / prokoptōn — one making progress",
    },
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'The Obstacle as the Way — Amor Fati in Practice',
    briefing:
      "Book V.20 of the Meditations contains one of the most practically powerful ideas in Stoic philosophy: 'The impediment to action advances action. What stands in the way becomes the way.' This is not merely an aphorism. It is the culmination of a sustained philosophical argument about the relationship between intention and obstacle, between will and circumstance. The discipline of action with reservation, combined with the Stoic understanding of fate as rational providence, produces a specific attitude toward difficulty: not endurance, not resignation, but active transformation. The obstacle does not merely have to be tolerated — it can be used.",
    parts: [
      {
        title: 'The Argument Behind the Aphorism',
        content: [
          "The claim that the obstacle becomes the way depends on the three-discipline framework. In the discipline of action, every intention is held with reservation: 'I will do X — if nothing prevents it.' When something prevents it, the practitioner does not simply give up. They ask: what is the appropriate action now, given this obstacle? The obstacle has changed the situation. The situation now requires a different appropriate action. That different action is the new way.",
          "This is not a semantic trick. It is a genuine reorientation of attention. The person whose goal is to get a specific outcome will be stopped by the obstacle. The person whose goal is to act virtuously in whatever situation they find themselves will find that the obstacle is simply a new situation requiring virtuous action. The obstacle does not stop the second person because they were never fundamentally trying to get past it — they were trying to act well, and acting well in the face of an obstacle is still acting well.",
          "Marcus developed this practice under conditions that tested it fully. His reign was defined by obstacles — the Antonine Plague, the Marcomannic Wars, the betrayal of Avidius Cassius. He could not prevent any of these. He could only ask, in each case, what the appropriate action was — and then perform it, as well as he could, without requiring the obstacle to disappear first.",
        ],
      },
      {
        title: 'Amor Fati — Loving What Is',
        content: [
          "The Stoic concept of amor fati — love of fate — takes the obstacle-as-way principle to its deepest level. It is not enough to accept what happens. The fully practising Stoic actively loves what happens — not because it is pleasant, but because it is the expression of rational providence, the logos working through events. What happens to you is not happening despite the rational order of things. It is happening because of it.",
          "Marcus states this most directly in Book IV.23: 'Everything harmonizes with me, which is harmonious to thee, O Universe.' And in Book X.21: 'To you, the universe is a teacher: it dispenses what it has to each according to his nature.' The universe is not indifferent to you — it is actively educating you through the circumstances it provides. The obstacle is the lesson. Resistance to the lesson is the source of suffering; engagement with it is the source of growth.",
          "This is the philosophical foundation for a specific practice: when something unwelcome happens, pause before resisting it and ask: what is this asking me to do? Not what am I going to do to fix this — that comes second. First: what is this situation asking of the philosophical practitioner? What does reason recommend here? What does virtue require? Answer that question first, and the response becomes clear.",
        ],
      },
      {
        title: 'The Practice of Turning',
        content: [
          "Hadot calls this the practice of antistrophē — turning. The turning of an obstacle into a path. The turning of adversity into material. The Stoics used the image of fire: fire does not merely endure the wood thrown onto it. It consumes the wood and grows stronger. The Stoic practitioner does not merely endure difficulty. They consume it — use it as material for the exercise of virtue.",
          "This requires practice because the natural response to an obstacle is resistance, frustration, or despair. The turning is a learned skill, not a natural reflex. Marcus practises it explicitly in the Meditations: when he catches himself resisting a situation, he asks what the situation is asking of him. When he finds himself wishing things were different, he applies the discipline of desire and redirects toward what is actually up to him in the present moment.",
          "The turning does not require that you like the obstacle. Marcus clearly did not like many of the things that happened to him. It requires only that you engage with it as material — as the specific situation in which virtue must currently be exercised — rather than as an interruption of the life you were supposed to be living.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. State the principle of Book V.20 in your own words.",
        answer: "The impediment to action advances action — what stands in the way becomes the way. An obstacle does not merely have to be endured; it can be used as the material for virtuous action.",
      },
      {
        question: "2. How does the reserve clause make the obstacle-as-way principle work?",
        answer: "Because every intention is held as 'I will do X if nothing prevents it,' when something prevents it the practitioner asks what the appropriate action is now. The obstacle simply changes the situation, which now calls for a different appropriate action — the new way.",
      },
      {
        question: "3. Why does an obstacle stop the outcome-focused person but not the virtue-focused person?",
        answer: "The outcome-focused person's goal is a specific result, which the obstacle blocks. The virtue-focused person's goal is to act well in whatever situation arises, and acting well in the face of an obstacle is still acting well — so they are not stopped.",
      },
      {
        question: "4. How did Marcus's reign test this practice?",
        answer: "It was defined by obstacles he could not prevent — the Antonine Plague, the Marcomannic Wars, the betrayal of Avidius Cassius. He could only ask what the appropriate action was in each and perform it without requiring the obstacle to vanish first.",
      },
      {
        question: "5. Define amor fati and explain how it goes beyond mere acceptance.",
        answer: "Amor fati is love of fate: the practitioner does not merely accept what happens but actively loves it — not because it is pleasant but because it is the expression of rational providence, the logos working through events. It happens because of the rational order, not despite it.",
      },
      {
        question: "6. What do Books IV.23 and X.21 reveal about the universe's relation to the practitioner?",
        answer: "That the universe is not indifferent but actively educating you through circumstances — 'the universe is a teacher.' The obstacle is the lesson; resistance causes suffering, engagement causes growth.",
      },
      {
        question: "7. What is the first question to ask when something unwelcome happens, and why does it precede 'how do I fix this'?",
        answer: "First ask: what is this situation asking of me — what does reason recommend, what does virtue require? Fixing comes second, because identifying the appropriate response clarifies what the right action actually is.",
      },
      {
        question: "8. Explain antistrophē and the fire image.",
        answer: "Antistrophē is 'turning' — converting an obstacle into a path and adversity into material. Like fire that consumes wood and grows stronger rather than merely enduring it, the practitioner consumes difficulty as fuel for the exercise of virtue.",
      },
      {
        question: "9. Why is the turning described as a 'learned skill, not a natural reflex'?",
        answer: "Because the natural response to an obstacle is resistance, frustration, or despair. Turning the obstacle into material must be cultivated through repeated practice before it becomes available.",
      },
      {
        question: "10. Does the practice of turning require liking the obstacle? Explain using Marcus.",
        answer: "No. Marcus clearly disliked much of what happened to him. It requires only engaging with the obstacle as the material in which virtue must now be exercised, rather than treating it as an interruption of the life one was supposed to be living.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The obstacle does not stop the person whose goal is virtuous action — it simply changes the situation in which virtuous action must be performed.",
      assignment: "Identify your current most significant obstacle — the thing that feels most like it is preventing your life from going the way it should. Write it down. Then ask: if this obstacle is not going away, what does acting virtuously within it look like? Not around it, not after it — within it, now. Write one concrete action that represents virtuous engagement with the obstacle as it currently stands.",
      duration: "20 min",
      greekTerms: "amor fati — love of fate / antistrophē — turning / hupexairesis — reservation",
    },
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Living Among Others — Marcus on Anger and Community',
    briefing:
      "The Meditations contain more sustained reflection on how to live among difficult people than almost any other subject. This is not incidental — Marcus governed millions of people, many of them in conflict with each other and with him, and the philosophical question of how to act toward others without being degraded by their failures was a daily practical problem. The Stoic framework for this is oikeiōsis — the natural extension of concern from self to community — combined with the principle that nobody does wrong willingly. Together these produce a specific attitude toward the failures of others: not indifference, not contempt, but a kind of clear-eyed, patient engagement that neither excuses bad behavior nor is destroyed by it.",
    parts: [
      {
        title: 'Nobody Does Wrong Willingly',
        content: [
          "The principle comes from Socrates: nobody does wrong willingly. Every person who acts badly does so because they believe, at the moment of action, that they are pursuing a genuine good. They are wrong — their belief about what is genuinely good is false — but they are not acting against their own values. They are acting from a mistaken account of what is worth wanting.",
          "Marcus applies this principle extensively. Book II.1: 'Say to yourself in the early morning: I shall meet today inquisitive, ungrateful, violent, treacherous, envious, uncharitable men. All these things have come upon them through ignorance of real good and ill.' The key phrase is 'through ignorance.' Marcus is not excusing bad behavior. He is locating its cause accurately. The cause is an error of judgment, not a malicious will. This changes the appropriate response: not punishment or contempt but, where possible, correction — and where correction is impossible, appropriate action regardless.",
          "This is philosophically precise and practically difficult. The person who has just behaved badly toward you has done so because they are wrong about what is genuinely good — which makes them more like a sick person than an enemy. You do not hate the sick person for being ill. You act appropriately given the illness. You may still need to set limits, correct them, or protect yourself from their behavior. But the emotional coloring of the response changes completely when you understand the cause accurately.",
        ],
      },
      {
        title: 'Anger as a Failed Judgment',
        content: [
          "Marcus's most sustained treatment of anger in the Meditations identifies it as a form of the discipline of desire failing. Anger arises when something you wanted — cooperation, gratitude, reasonable behavior, respect — is not forthcoming. The anger is proportional to the desire. Which means the discipline of desire, applied properly, reduces anger at its root: if you genuinely do not require others' cooperation for your equanimity, there is nothing for the anger to attach to.",
          "This does not mean Marcus never felt the pull of anger. The Meditations are full of evidence that he did. What it means is that he developed a practice for examining the anger before acting from it: where is this coming from? What did I want that I am not getting? Is that thing genuinely up to me? If not, the anger is an error. Examine it at the gate of the ruling faculty. Do not let it through unchecked.",
          "Book XI.18 gives the most detailed account of Marcus's anti-anger practice: a nine-point examination of any situation provoking anger, designed to locate the false judgment underlying the emotion and correct it. It is one of the most practically useful passages in the entire Meditations — a real-time diagnostic for the most common failure of the discipline of assent.",
        ],
      },
      {
        title: 'Community as the Context of Virtue',
        content: [
          "The Stoic tradition, at its best, is not individualistic. The three disciplines are not practices for achieving private peace. They are practices for becoming a better member of the communities you belong to — family, workplace, city, humanity. The oikeiōsis principle holds that reason, properly developed, extends concern outward from the self to encompass all rational beings. The fully developed Stoic practitioner is not someone who has achieved personal equanimity. They are someone who has become genuinely useful to others — more patient, more honest, more reliable, more genuinely caring — because they are no longer distorted by false desires and unchecked impressions.",
          "Marcus governed from this principle. His Meditations are full of concern for the welfare of his subjects — not as an imperial duty but as the expression of a genuinely cosmopolitan Stoic ethics. He is a Roman emperor who believes he is a citizen of the world before he is a citizen of Rome. The practice of the three disciplines is the practice of becoming worthy of that citizenship.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. State the Socratic principle Marcus adopts and explain what it claims about wrongdoers.",
        answer: "Nobody does wrong willingly: every person who acts badly believes at that moment they are pursuing a genuine good. Their belief about the good is false, but they are not acting against their own values — the cause is mistaken judgment, not malice.",
      },
      {
        question: "2. In Book II.1, what is the significance of the phrase 'through ignorance'?",
        answer: "It locates the cause of bad behavior accurately — as an error of judgment rather than a malicious will. This is not an excuse but a precise diagnosis that changes the appropriate response.",
      },
      {
        question: "3. Why does understanding wrongdoers as 'more like a sick person than an enemy' change your response?",
        answer: "Because you do not hate someone for being ill; you act appropriately given the illness. You may still set limits or protect yourself, but the emotional coloring shifts from contempt to clear-eyed engagement.",
      },
      {
        question: "4. Marcus treats anger as a failure of which discipline, and why?",
        answer: "The discipline of desire. Anger arises when something you wanted — cooperation, gratitude, respect — is withheld; it is proportional to the desire for that external. Properly disciplined desire removes what the anger attaches to.",
      },
      {
        question: "5. Why does not requiring others' cooperation 'reduce anger at its root'?",
        answer: "Because anger attaches to a frustrated desire for an external. If you genuinely do not require others' cooperation for your equanimity, there is nothing for the anger to fasten onto in the first place.",
      },
      {
        question: "6. Did Marcus claim to be free of anger? What did he develop instead?",
        answer: "No — the Meditations show he felt its pull. He developed a practice of examining anger before acting: asking where it comes from, what desire is frustrated, and whether that thing is up to him — checking it at the gate of the ruling faculty.",
      },
      {
        question: "7. What is Book XI.18, and why is it called a 'real-time diagnostic'?",
        answer: "A nine-point examination of any anger-provoking situation, designed to locate and correct the false judgment underlying the emotion. It functions as an in-the-moment tool for the most common failure of the discipline of assent.",
      },
      {
        question: "8. Why is Stoicism, 'at its best,' described as not individualistic?",
        answer: "Because the three disciplines aim not at private peace but at making you a better member of your communities — family, workplace, city, humanity. Their endpoint is usefulness to others, not personal tranquility alone.",
      },
      {
        question: "9. What does oikeiōsis claim about the development of reason?",
        answer: "That reason, properly developed, extends concern outward from the self to encompass all rational beings — the circle of care widens as reason matures.",
      },
      {
        question: "10. What does it mean that Marcus considered himself 'a citizen of the world before a citizen of Rome'?",
        answer: "His concern for his subjects expressed a cosmopolitan Stoic ethics grounded in oikeiōsis — obligation to all rational beings — rather than mere imperial duty. The three disciplines are the practice of becoming worthy of that world-citizenship.",
      },
    ],
    practiceAssignment: {
      coreIdea: "People who behave badly do so through ignorance of the good, not malice — which changes the appropriate response from contempt to clear-eyed engagement.",
      assignment: "Identify one person whose behavior currently frustrates or angers you. Apply the principle: they are acting from a mistaken belief about what is genuinely good. Write one paragraph describing what false belief might be driving their behavior — not to excuse it, but to understand it accurately. Then ask: given that understanding, what is the appropriate action on your part? Does it change anything?",
      duration: "20 min",
      greekTerms: "oikeiōsis — affiliation / kathēkon — appropriate action / pathos — passion",
    },
  },

  // ── SESSION 10 ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'The Inner Citadel — What Cannot Be Taken',
    briefing:
      "The inner citadel — Hadot's title for his book and the culminating concept of the three disciplines — is the thing that cannot be taken from you. Not your health. Not your reputation. Not your freedom of movement. Not even your life. The only thing that is completely, inviolably yours is the ruling faculty and its operations: how you judge, how you assent, how you desire, how you act in your own soul. This is the Stoic answer to the problem of vulnerability — not the elimination of vulnerability in the world, but the identification of something that remains untouched regardless of what the world does to you.",
    parts: [
      {
        title: 'What the Citadel Is',
        content: [
          "Hadot takes the title from Marcus's Book VIII.48: 'Confine yourself to the present. Understand what is happening to you and to others, and divide and classify it. Define it.' The citadel is not a metaphor for withdrawal from the world. It is a metaphor for the inviolability of the ruling faculty when properly guarded. The three disciplines — desire, action, assent — are the walls of the citadel. They do not prevent the world from happening. They prevent the world from reaching the ruling faculty and corrupting it.",
          "The Stoic insight is precise: you cannot be harmed in the deepest sense — in your capacity for virtue — by anything external. Pain harms the body, not the ruling faculty. Humiliation harms reputation, not the ruling faculty. Loss harms circumstances, not the ruling faculty. The ruling faculty can only be harmed by its own operations: by assenting to false impressions, by desiring things that are not genuinely good, by failing to act appropriately. These failures are within your control. Which means genuine harm is entirely within your control.",
          "This is not a comfortable claim. It requires that you accept full responsibility for your own corruption — if you are not acting virtuously, it is because of what is happening in your ruling faculty, not because of what the world has done to you. But it is also an enormously liberating claim: if genuine harm is within your control, then you have the capacity to protect the only thing that genuinely matters.",
        ],
      },
      {
        title: 'The Citadel Under Siege',
        content: [
          "Marcus's life was a sustained test of this claim. He was surrounded by betrayal, incompetence, flattery, and the endless degradation of power. He governed during a plague that killed millions. He fought wars he did not want to fight. He watched people he trained and trusted betray him. He knew, by the end, that the dynasty he was trying to preserve would not survive his son.",
          "The Meditations are the record of a man keeping the citadel intact under these conditions. Not always easily — there are passages of genuine despair, exhaustion, and self-doubt. But the practice holds. The ruling faculty, again and again, returns to the three disciplines. The discipline of desire: this external is not a genuine good. The discipline of action: this situation requires this appropriate action. The discipline of assent: this impression requires examination before acceptance.",
          "The siege never ends. Marcus does not achieve a state in which the three disciplines are no longer needed. He achieves a state in which he can apply them reliably — in which the return to the citadel, when he has strayed from it, becomes faster and more natural. That is what progress looks like for the prokoptōn: not the achievement of perfect virtue, but the gradual shortening of the distance between failure and return.",
        ],
      },
      {
        title: 'Building Your Own Citadel',
        content: [
          "The final practical question of PHIL 702 is: what does your own inner citadel look like? Not Marcus's — he was an emperor in second-century Rome, facing conditions specific to his life. Yours. What are the specific ways in which the world most reliably reaches your ruling faculty and disturbs it? What are the impressions that most consistently get through the gate unchecked? What are the desires that most consistently attach to externals?",
          "The three disciplines give you the framework for identifying and strengthening the walls of your own citadel. The daily examination — morning and evening — is the maintenance practice. The practice assignments in this course have been building the specific walls that your specific situation requires. The inner citadel is not a destination you reach. It is a structure you build, maintain, and repair, daily, for the rest of your life.",
          "Marcus knew this. He never stopped writing to himself. He never arrived at a point where the practice was no longer needed. He kept drilling, kept returning, kept examining. That is the model. Not mastery — ongoing practice.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What is the inner citadel, and what are its 'walls'?",
        answer: "The inviolable core — the ruling faculty and its operations (judgment, assent, desire, action) that cannot be taken by anything external. The three disciplines (desire, action, assent) are its walls.",
      },
      {
        question: "2. Is the citadel a metaphor for withdrawal from the world? Explain.",
        answer: "No. It is a metaphor for the inviolability of the ruling faculty when properly guarded. The walls do not stop the world from happening; they stop the world from reaching and corrupting the ruling faculty.",
      },
      {
        question: "3. Explain the precise Stoic claim that you cannot be harmed in the deepest sense by anything external.",
        answer: "Pain harms the body, humiliation harms reputation, loss harms circumstances — none touches the capacity for virtue. The ruling faculty can only be harmed by its own operations: false assent, misdirected desire, failure to act appropriately.",
      },
      {
        question: "4. Why does it follow that 'genuine harm is entirely within your control'?",
        answer: "Because genuine harm is corruption of the ruling faculty, and that occurs only through its own operations — which are up to you. Therefore the only real harm is self-inflicted and so is within your control to prevent.",
      },
      {
        question: "5. Why is this claim described as both uncomfortable and liberating?",
        answer: "Uncomfortable because it requires accepting full responsibility for your own corruption — the world is not to blame for your vice. Liberating because if genuine harm is within your control, you also have the capacity to protect the only thing that truly matters.",
      },
      {
        question: "6. What conditions tested Marcus's claim that the citadel holds?",
        answer: "Betrayal, incompetence, flattery, the degradation of power, a plague that killed millions, unwanted wars, trusted people betraying him, and the knowledge his dynasty would not survive his son.",
      },
      {
        question: "7. The Meditations show 'despair, exhaustion, and self-doubt.' How does the practice still 'hold'?",
        answer: "Because the ruling faculty repeatedly returns to the three disciplines despite the difficulty — reasserting that externals are not genuine goods, that the situation requires appropriate action, and that impressions require examination.",
      },
      {
        question: "8. What does progress look like for the prokoptōn, according to this session?",
        answer: "Not the achievement of perfect virtue and not a state where the disciplines are no longer needed, but the gradual shortening of the distance between failure and return — applying the disciplines more reliably and recovering faster.",
      },
      {
        question: "9. Why does the course insist your inner citadel cannot simply copy Marcus's?",
        answer: "Because Marcus faced conditions specific to a second-century Roman emperor. You must identify the specific ways the world reaches your own ruling faculty — your characteristic unchecked impressions and misattached desires.",
      },
      {
        question: "10. In what sense is the inner citadel 'not a destination but a structure'?",
        answer: "It is something you build, maintain, and repair daily for life — sustained by the morning and evening examination — never finally completed. Marcus never stopped writing to himself; the model is ongoing practice, not mastery.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The inner citadel is not a retreat from the world — it is the inviolable core of the ruling faculty that the three disciplines protect.",
      assignment: "Write a brief account of your own inner citadel as it currently stands. Where are the walls strong — where do the three disciplines hold reliably? Where are the walls weak — where does the world most reliably reach your ruling faculty and disturb it? Be specific. Vague self-assessment is not philosophy. End with one concrete thing you will do differently as a result of PHIL 702.",
      duration: "30 min",
      greekTerms: "hēgemonikon — ruling faculty / prohairesis — moral purpose / prokoptōn — one making progress",
    },
  },

  // ── SESSION 11 — SEMINAR ───────────────────────────────────────────────────
  {
    id: 11,
    title: 'Qualifying Conversation — The Examined Emperor',
    isSeminar: true,
    briefing:
      "Session XI is a seminar, not a lecture. There are no lesson parts — the content of the course is the content. The Qualifying Conversation is the test of whether PHIL 702 has been a course you studied or a course you practised. Come prepared to defend one claim about how your engagement with Marcus Aurelius has changed the way you live — not what you think, what you do.",
    parts: [
      {
        title: 'Preparing for the Conversation',
        content: [
          "The Qualifying Conversation tests whether PHIL 702 has been a course you studied or a course you practised. Come prepared to defend one specific claim about how your engagement with Marcus Aurelius has changed the way you live — not what you think, what you do. The Socratic prompts below are the topics the conversation will draw from. Prepare to speak to all of them, but expect the conversation to follow its own thread.",
        ],
      },
      {
        title: 'Socratic Prompts — Practice and Progress',
        content: [
          "Marcus never stopped drilling the same principles — desire, action, assent — across twelve books and presumably decades of practice. What does this tell you about the nature of philosophical progress? Is progress the accumulation of new knowledge, or the deepening practice of what you already know?",
          "Hadot argues that the Meditations were never intended for publication — they were a private instrument of self-formation. Does that change how you read them? Does the privacy of a philosophical practice change its nature?",
          "The inner citadel cannot be taken — but it can be surrendered. What are the specific conditions under which you are most likely to surrender yours? What has PHIL 702 given you to resist those conditions?",
        ],
      },
      {
        title: 'Socratic Prompts — Engagement and Change',
        content: [
          "Marcus governed one of the largest empires in history while practising Stoic philosophy. Was his philosophy a resource for his governance, or a refuge from it? Is there a tension between the life of philosophical practice and the life of engagement in the world?",
          "Epictetus said enough big words — arge nu logoi. What has changed in how you live as a result of this course? If nothing has changed, what does that tell you?",
        ],
      },
    ],
    quiz: [
      {
        question: "1. Across the whole course, what is Marcus's single underlying framework, and what are its three parts?",
        answer: "The three disciplines, which structure all of his practice: the discipline of desire (orexis), the discipline of action (hormē), and the discipline of assent (synkatathesis).",
      },
      {
        question: "2. What does Marcus's lifelong repetition of the same principles reveal about the nature of philosophical progress?",
        answer: "That progress is not the accumulation of new knowledge but the deepening practice of what one already knows — measured by the shortening distance between failure and return, not by acquiring new doctrine.",
      },
      {
        question: "3. Why does it matter, for how we read them, that the Meditations were never meant for publication?",
        answer: "Because it marks them as a private instrument of self-formation rather than a treatise addressed to readers — a practice log whose purpose is transformation of the writer, not instruction of an audience.",
      },
      {
        question: "4. How do the disciplines of desire and assent together explain Marcus's treatment of anger?",
        answer: "Anger is a failure of desire (wanting an external like cooperation or respect) compounded by a failure of assent (accepting the impression that one has been wronged). Disciplining desire removes what anger attaches to; disciplining assent examines the judgment before acting.",
      },
      {
        question: "5. The inner citadel 'cannot be taken but can be surrendered.' What does this distinction integrate from the course?",
        answer: "That no external can corrupt the ruling faculty (Session 10), so the only way it falls is from within — by false assent, misdirected desire, or failure to act. Surrender is self-inflicted, which is why daily practice of the three disciplines is the defense.",
      },
      {
        question: "6. How do the view from above and the contemplation of death both serve the discipline of desire?",
        answer: "Both strip false urgency from indifferents — the view from above by widening spatial and temporal perspective, the contemplation of death by clarifying what will actually matter at the end — returning desire to virtue, the only genuine good.",
      },
      {
        question: "7. Was Marcus's philosophy a resource for his governance or a refuge from it? Frame the tension.",
        answer: "The discipline of action mandates full engagement (governing as kathēkon), suggesting a resource; yet the Meditations' exhaustion with power suggests refuge. The tension is whether holding outcomes with reservation can sustain the intensity that real engagement demands — a question the course leaves the student to test.",
      },
      {
        question: "8. Explain 'the obstacle becomes the way' using the discipline of action and amor fati together.",
        answer: "Because intentions are held with reservation, an obstacle merely changes the situation requiring appropriate action; and because amor fati treats events as the logos's instruction, the obstacle is the very material in which virtue is now exercised — the lesson rather than the interruption.",
      },
      {
        question: "9. What is the standard the whole course sets — captured by Epictetus's 'surgery' and 'arge nu logoi'?",
        answer: "That philosophy must change how you live, not merely what you know. You should leave having felt something change; 'enough big words' demands practice and behavioral change over theoretical accumulation.",
      },
      {
        question: "10. What distinguishes having studied PHIL 702 from having practised it?",
        answer: "Studying produces knowledge about Marcus and the Meditations; practising means having adopted his exercises so that one's daily conduct has actually changed. The Qualifying Conversation tests the latter — what you now do, not what you think.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The Qualifying Conversation is the test of whether the course has been study or practice.",
      assignment: "Before the seminar, write one page on the following: which of Marcus's practices have you actually adopted? Not admired — adopted. What does your daily practice look like now that it did not look like before PHIL 702? This is your stake in the ground for the conversation.",
      duration: "45 min",
      greekTerms: "arge nu logoi — enough big words / askēsis — training / aretē — excellence",
    },
  },
];

// Adapts a Phil702Session into the LanguageSession-compatible object the
// LanguageLessonContent renderer expects. Sessions carry no subtitle, learning
// objectives, or language exercises, so those are empty. The quiz is returned
// empty here — it is rendered separately as short-answer reveal cards by
// Phil702SessionContent.
export function phil702ToLesson(s: Phil702Session): Omit<LanguageSession, 'vocabulary'> {
  return {
    id: s.id,
    title: s.title,
    subtitle: '',
    isMilestone: !!s.isSeminar,
    objectives: [],
    parts: s.parts.map(p => ({
      heading: p.title,
      body: p.content.join('\n\n'),
    })),
    exercises: [],
    quiz: [],
  };
}
