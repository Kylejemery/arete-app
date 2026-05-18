// PHIL 705 — Stoic Logic & Epistemology
// 20-session seminar course. Content for Sessions 2–8 is entered faithfully
// from the Cabinet source documents (PHIL_705_Sessions_2_6 / 7_8).
// Sessions 1 and 9–20 are locked stubs awaiting source documents — no
// content is fabricated for them.
//
// The seminar session view reuses the language-course renderer
// (LanguageLessonContent). `phil705ToLesson` adapts a Phil705Session into
// the shape that renderer consumes.

import type { LanguageSession } from '@/data/grek101';

export interface Phil705Session {
  id: number;                        // 1–20
  title: string;
  block: string;                     // e.g. "Block A"
  primarySources: string;
  keyConcepts: string;
  preSeminarBriefing: {
    problem: string;
    whyItMatters: string;
    whatToWatchFor: string;
    yourTask: string;
  };
  parts: Array<{
    title: string;
    content: string[];               // one paragraph per element
  }>;
  exercises: Array<{
    title: string;
    body: string;
    answer: string;
  }>;
  quiz: Array<{
    question: string;
    options: string[];               // each starts with "A) ", "B) " …
    correct: string;                 // "A" | "B" | "C" | "D"
  }>;
  isSeminar?: boolean;               // sessions 10, 15, 19
  seminarPrompts?: string[];
  isFinalExam?: boolean;             // session 20
  examFormat?: { title: string; body: string[] }[];
  stub?: boolean;                    // true = awaiting source document
}

// Block headings for the sidebar. Titles for Blocks A–C come from the
// source documents; D–H are intentionally label-only until sourced.
export const PHIL_705_BLOCKS: Record<string, string> = {
  Introduction: 'Introduction',
  'Block A': 'Block A — The Lekton',
  'Block B': 'Block B — Impressions & Assent',
  'Block C': 'Block C — Impulse, Action & Propositions',
  'Block D': 'Block D',
  'Block E': 'Block E',
  'Block F': 'Block F',
  'Block G': 'Block G',
  'Block H': 'Block H',
};

const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

// Adapts a Phil705Session into the LanguageSession-compatible object the
// LanguageLessonContent renderer expects. Key Concepts populate the
// objectives box; each part maps to a heading + paragraph body.
export function phil705ToLesson(s: Phil705Session): Omit<LanguageSession, 'vocabulary'> {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.primarySources ? `Primary sources — ${s.primarySources}` : '',
    isMilestone: s.isSeminar || s.isFinalExam,
    objectives: s.keyConcepts
      ? s.keyConcepts.split(';').map(c => c.trim()).filter(Boolean)
      : [],
    parts: s.parts.map(p => ({
      heading: p.title,
      body: p.content.join('\n\n'),
    })),
    exercises: s.exercises.map(e => ({
      number: e.title,
      prompt: e.body,
      answer: e.answer,
    })),
    quiz: s.quiz.map(q => ({
      question: q.question,
      options: q.options,
      correct: LETTER_TO_INDEX[q.correct] ?? 0,
    })),
  };
}

// Locked placeholder for sessions whose source document is not yet available.
function stubSession(id: number, block: string, opts: Partial<Phil705Session> = {}): Phil705Session {
  return {
    id,
    title: opts.title ?? `Session ${id} — Content forthcoming`,
    block,
    primarySources: '',
    keyConcepts: '',
    preSeminarBriefing: {
      problem: 'The source document for this session has not yet been provided.',
      whyItMatters: '',
      whatToWatchFor: '',
      yourTask: '',
    },
    parts: [],
    exercises: [],
    quiz: [],
    stub: true,
    ...opts,
  };
}

export const PHIL_705_SESSIONS: Phil705Session[] = [
  // ── SESSION 1 — stub (no source document) ───────────────────────────────────
  stubSession(1, 'Introduction', { title: 'Session 1 — Introduction: Why Stoic Logic?' }),

  // ── SESSION 2 ───────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'The Lekton: What Language Is About',
    block: 'Block A',
    primarySources: 'L&S 33A–C; Sextus Empiricus AM 8.11–12',
    keyConcepts: 'Lekton (sayable); incorporeal; signifier / signified / thing',
    preSeminarBriefing: {
      problem:
        'Language is everywhere in philosophy — and usually taken for granted. Philosophers argue about what words mean, but rarely ask what kind of thing a meaning is. Is a meaning a physical sound? A mental image? A Platonic form? The Stoics gave a startling answer: meanings are incorporeal. They exist — but not in space or time the way bodies do.',
      whyItMatters:
        "If you want to know what a proposition is, what it means for an argument to be valid, or what it means for a statement to be true, you need to know what the Stoics meant by lekton — the 'sayable.' It is the foundation of their entire theory of logic and language.",
      whatToWatchFor:
        "The Stoics distinguished three things: (1) the physical sound or utterance; (2) the lekton — the meaning, or 'what is said'; (3) the external object referred to. Only the lekton can be true or false. Notice that this is not how most people think about language.",
      yourTask:
        "Come prepared to answer — if meanings are incorporeal, are they real? What does 'real' mean here?",
    },
    parts: [
      {
        title: 'Part 1 — The Problem of Meaning',
        content: [
          "When you say the word 'Socrates,' three things are involved. There is the sound you make — the physical vibration in the air, the movement of your lips. There is Socrates himself — the man who walked around Athens, was tried and executed in 399 BCE. And there is something else: what the word means, what it refers to, the content of the expression. What is that third thing?",
          'Most people, if pressed, would say the meaning is mental — it is an idea in your head. The Stoics rejected this. They also rejected the Platonic view that meanings are abstract Forms existing in some transcendent realm. Their answer was more subtle: meanings are incorporeal entities — subsistent but not physical, real but not bodies.',
          "The technical term for this entity is lekton (plural: lekta), from the Greek legein, 'to say.' A lekton is literally 'what can be said' — the content of a linguistic expression, as distinct from the physical utterance that expresses it and the external thing the utterance refers to.",
        ],
      },
      {
        title: 'Part 2 — The Three-Way Distinction',
        content: [
          'Sextus Empiricus, a hostile but careful critic of Stoic philosophy, records their account of meaning as follows. The Stoics said that three things are connected: the signifier, the signified, and the external object.',
          "'The Stoics say that three things are connected: the signified, the signifier, and the external object. The signifier is the utterance (e.g., the sound \"Dion\"). The signified is the actual state of affairs revealed by the utterance, which we apprehend subsisting in accordance with our thought. The external object is what exists outside, e.g., Dion himself.' — Sextus Empiricus, Against the Logicians 8.11–12",
          'The three elements:',
          '(1) The signifier (semainon) — the physical sound, the ink on the page, the spoken word. A body. Entirely physical.',
          '(2) The signified, or lekton — what the expression means, what is said. This is incorporeal. It subsists, but is not a body.',
          '(3) The external object (tynchanon) — the real-world thing referred to. Dion the man. Also a body.',
          'This three-way distinction is not just theoretical tidiness. It has consequences. The Stoics held that only lekta can be true or false. Not sounds — sounds just happen. Not objects — objects just exist. It is the lekton, the content of what is said, that bears the logical properties of truth, falsity, implication, and contradiction.',
        ],
      },
      {
        title: 'Part 3 — The Incorporeal and Why It Matters',
        content: [
          'The Stoics recognized four incorporeals: lekta (sayables), void, place, and time. None of these are bodies. None occupy space in the way a rock or a soul does. But they are not nothing — they subsist, they can be referred to, they play causal and logical roles.',
          "Why does this matter for logic? Because the subject matter of logic is not physical sounds — it is lekta. When a logician says 'this argument is valid,' they are making a claim about the relationship between lekta (the contents of the premises and conclusion), not about the physical marks on a page.",
        ],
      },
      {
        title: 'Key Concept — Lekton',
        content: [
          "Lekton (plural: lekta): the 'sayable' — the incorporeal content of a linguistic expression. It is what is meant, what is said, what is communicated. It is distinct from both the physical utterance and the real-world object referred to. Lekta can be complete (a full proposition, capable of being true or false) or incomplete (a predicate, which requires a subject to be complete). Truth and falsity are properties of lekta, not of bodies or minds.",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 2.1 — Reconstruction',
        body:
          "Consider the sentence: 'Virtue is the only good.' Using the Stoic three-way distinction, identify: (a) the signifier; (b) the lekton; (c) whether there is an 'external object' here — and if so, what it is. Note: this exercise has a subtlety. Think carefully about what virtue is — is it a body, for the Stoics?",
        answer:
          "a) The signifier: the physical sounds or written marks — 'Virtue is the only good.' b) The lekton: the content — the proposition that virtue is the only good — an incorporeal sayable. c) External object: this is subtle. For the Stoics, virtue (arete) is a state of the soul — which is corporeal (pneuma). But the reference here is to the general category 'virtue,' not a specific body. Strong answer: the relationship between signifier and lekton is clearer here than the external-object component, since the sentence states a general truth. Students should notice the complexity, not expect a tidy answer.",
      },
      {
        title: 'Exercise 2.2 — Analysis',
        body:
          'The Stoics said that truth and falsity are properties of lekta, not of utterances or external objects. a) Can a physical sound be true or false? Give a reason. b) Can Dion himself — the external object — be true or false? Give a reason. c) If neither sounds nor objects can be true or false, what follows about where truth lives?',
        answer:
          "a) No — a sound simply occurs. The same word 'snow' can express a true statement ('snow is white') or a false one ('snow is black'). b) No — Dion either exists or doesn't. His existence is not a truth value. c) Truth must reside in the content — the lekton — which is the thing that can either correctly or incorrectly represent a state of affairs.",
      },
      {
        title: 'Exercise 2.3 — Socratic Proctor Warm-Up',
        body:
          'The Stoics held that lekta are incorporeal — real, but not physical bodies. A Platonist might say: this sounds exactly like Platonic Forms. A materialist might say: this is just mysticism about mental states. Write 150–200 words defending the Stoic position against one of these two objections. The Proctor will probe your argument.',
        answer:
          "[Open response. Against Platonism: lekta are not transcendent — they are not eternal, mind-independent objects. They arise in connection with rational animals using language. Against materialism: lekta cannot be reduced to mental images because two speakers share the same lekton — 'Socrates is wise' means the same thing when you say it and when I say it, but your mental image and mine may differ. The lekton is inter-subjective in a way mental images are not.]",
      },
      {
        title: 'Exercise 2.4 — Formal Logic',
        body:
          "For each pair, identify whether the difference is between (A) signifier vs. lekton, (B) lekton vs. external object, or (C) same lekton expressed by different signifiers:\na) The word 'Katze' [German] and the word 'cat' [English], both meaning the same animal.\nb) The physical sound 'it is raining' and the proposition that it is raining.\nc) The proposition 'Socrates is mortal' and Socrates himself.",
        answer:
          'a) C — same lekton, different signifiers (two ways of expressing the same content in different languages). b) A — the sound is the signifier; the proposition is the lekton. c) B — the proposition is a lekton; Socrates is the external object.',
      },
    ],
    quiz: [
      {
        question: "The Stoic term 'lekton' is best translated as:",
        options: [
          'A) The physical utterance of a word',
          'B) The external object a word refers to',
          'C) The incorporeal sayable — what is meant or communicated',
          "D) A mental image in the speaker's mind",
        ],
        correct: 'C',
      },
      {
        question: 'According to the Stoics, which of the three connected things is incorporeal?',
        options: ['A) The signifier', 'B) The signified (lekton)', 'C) The external object', 'D) All three are incorporeal'],
        correct: 'B',
      },
      {
        question: 'Truth and falsity are properties of:',
        options: ['A) Physical sounds', 'B) External objects', 'C) Mental images', 'D) Lekta (sayables)'],
        correct: 'D',
      },
      {
        question: 'The Stoics identified four incorporeals. Which of these is NOT one of them?',
        options: ['A) Lekta (sayables)', 'B) Void', 'C) Soul (psyche)', 'D) Time'],
        correct: 'C',
      },
      {
        question: "What is the 'external object' (tynchanon) in Sextus's example of 'Dion'?",
        options: [
          "A) The mental image of Dion in the speaker's mind",
          "B) The word 'Dion' as a spoken sound",
          'C) The proposition that Dion exists',
          'D) Dion himself — the actual man',
        ],
        correct: 'D',
      },
      {
        question: "Why did the Stoics say lekta 'subsist' rather than 'exist'?",
        options: [
          'A) Because lekta are mental constructs with no reality',
          'B) Because they distinguished subsistence (for incorporeals) from corporeal existence',
          'C) Because lekta only appear when spoken aloud',
          'D) Because Chrysippus rejected existence claims about abstractions',
        ],
        correct: 'B',
      },
      {
        question: "A 'complete lekton' differs from an 'incomplete lekton' in that:",
        options: [
          'A) Complete lekta are true; incomplete lekta are false',
          'B) Complete lekta express a full proposition capable of truth or falsity; incomplete lekta require a subject to be complete',
          'C) Complete lekta refer to bodies; incomplete lekta are purely abstract',
          'D) Complete lekta are written; incomplete lekta are only spoken',
        ],
        correct: 'B',
      },
      {
        question: "Which of the following best states why the Stoics' three-way distinction matters for logic?",
        options: [
          'A) It proves that logic is a physical science',
          'B) It establishes that logic studies lekta — incorporeal contents — not physical sounds or objects',
          'C) It shows that external objects have logical properties like truth and falsity',
          'D) It separates grammar from logic entirely',
        ],
        correct: 'B',
      },
      {
        question: "If the German word 'Tugend' and the English word 'virtue' both mean the same thing, what is their relationship according to Stoic theory?",
        options: [
          'A) They have different lekta and the same signifier',
          'B) They have the same lekton and the same signifier',
          'C) They have the same lekton and different signifiers',
          'D) They have different lekta because they are physically different sounds',
        ],
        correct: 'C',
      },
      {
        question: 'The Stoic account of lekta is most importantly different from Platonic Forms in that:',
        options: [
          'A) Lekta are eternal and mind-independent; Forms are not',
          'B) Lekta are not transcendent eternal objects but arise in connection with rational language use',
          'C) Lekta are physical; Forms are not',
          'D) There is no important difference — both accounts posit incorporeal abstract entities',
        ],
        correct: 'B',
      },
    ],
  },

  // ── SESSION 3 ───────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Simple and Complete Lekta',
    block: 'Block A',
    primarySources: 'L&S 33F–H; Diogenes Laertius VII.63–68',
    keyConcepts: 'Axioma (proposition); truth-bearers; negation; simple vs. complex lekta',
    preSeminarBriefing: {
      problem:
        "In Session 2 we established that lekta are the objects of logic — the incorporeal contents of linguistic expressions. But lekta come in different kinds. Not everything you say can be true or false. 'Run!' cannot be true or false. 'What time is it?' cannot be true or false. Only certain kinds of utterances — propositions — bear truth values. The Stoics had a precise theory of which lekta those are and why.",
      whyItMatters:
        'The proposition (axioma) is the basic unit of Stoic logic, just as it is the basic unit of modern propositional logic. Understanding what makes something a proposition — and how propositions relate to each other — is the foundation of everything that follows in this course.',
      whatToWatchFor:
        'The Stoics distinguished simple propositions (axiomata) from complex ones (built by connectives). They also carefully defined negation. Notice how their account of negation anticipates modern formal logic by two millennia.',
      yourTask:
        "Come prepared to explain: what does it mean for a proposition to be 'self-complete'? Can you give three examples of lekta that are NOT propositions, and explain why?",
    },
    parts: [
      {
        title: 'Part 1 — Complete vs. Incomplete Lekta',
        content: [
          'In Session 2 we introduced the distinction between complete and incomplete lekta. This session unpacks that distinction and focuses on the most important kind of complete lekton: the proposition (axioma).',
          "An incomplete lekton is a predicate — a verb phrase that requires a subject to be complete. 'Walks' is an incomplete lekton. 'Is wise' is an incomplete lekton. They are sayings in progress, waiting for a subject to complete them. Add 'Socrates' and you have a complete lekton: 'Socrates walks,' 'Socrates is wise.'",
          'A complete lekton is self-sufficient — it expresses something that can stand alone and, in the case of propositions, can be evaluated for truth or falsity. Diogenes Laertius records several types of complete lekta: propositions (axiomata), questions (erōtēmata), commands (prostaktika), oaths, wishes, and hypotheses. All of these are complete lekta, but only propositions are axiomata — the things that are either true or false.',
          "'An axioma is that which is either true or false, or a complete lekton assertible by itself.' — Diogenes Laertius VII.65",
        ],
      },
      {
        title: 'Part 2 — What Makes a Proposition a Proposition?',
        content: [
          "The Greek word axioma comes from the verb axioun, 'to claim' or 'to deem worthy.' An axioma is an assertion — an act of claiming that something is so. This act of claiming is what distinguishes a proposition from a question or a command.",
          "When I ask 'Is it raining?' I express a question — a request for information. When I command 'Run!' I express a directive — a demand for action. Neither of these is true or false. But when I assert 'It is raining,' I am making a claim about the world — a claim that can be evaluated.",
          'The Stoics held that the same content (the lekton about rain) can occur in different modes — as question, command, or assertion. What makes it an axioma is the assertoric mode: the speaker presents it as true.',
        ],
      },
      {
        title: 'Key Concept — Axioma',
        content: [
          'Axioma (plural: axiomata): a complete lekton that is either true or false. It is the Stoic term for what we call a proposition. Only axiomata can be premises in arguments, conclusions of inferences, or objects of assent. The Stoic logicians were the first to make propositions (rather than terms) the fundamental unit of logical analysis — a move that anticipates modern propositional logic.',
        ],
      },
      {
        title: 'Part 3 — Negation and Complex Propositions',
        content: [
          'The Stoics had a sophisticated account of how simple propositions can be combined or modified to form complex ones. The most basic operation is negation.',
          "A negation is formed by prefixing 'It is not the case that' to a proposition. This is not the same as attaching 'not' to the predicate. Compare: 'Socrates is not walking' (predicate negation) with 'It is not the case that Socrates is walking' (propositional negation). For the Stoics, a negation in the logical sense is a new proposition — one that is true if and only if the original proposition is false.",
          'Beyond negation, the Stoics identified several ways to form complex propositions from simple ones. These include the conditional (if ... then ...), the conjunction (both ... and ...), and the disjunction (either ... or ...). These connectives will be treated in detail in Sessions 8–9. For now, the key point is that simple propositions are the atoms, and complex propositions are molecular — built by connecting atoms with logical connectives.',
          "The Stoics also distinguished definite propositions ('Socrates walks'), indefinite propositions ('Someone walks'), and middle propositions ('A man walks'). These distinctions anticipate modern predicate logic's treatment of quantification, though the Stoic system did not fully develop quantification theory.",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 3.1 — Reconstruction',
        body:
          "Classify each of the following as: (A) incomplete lekton, (B) complete lekton but not an axioma, or (C) axioma. Explain your classification in one sentence each.\na) '...is courageous'\nb) 'Is Cato courageous?'\nc) 'Cato is courageous'\nd) 'Be courageous!'\ne) 'If Cato is courageous, he will not retreat'",
        answer:
          'a) A — incomplete lekton (predicate without subject). b) B — complete lekton (question), not an axioma because questions are not true or false. c) C — axioma (assertion, true or false). d) B — complete lekton (command), not an axioma. e) C — axioma (conditional proposition, can be evaluated as true or false).',
      },
      {
        title: 'Exercise 3.2 — Analysis',
        body:
          "The Stoics said that negation in logic is propositional: 'It is not the case that P' — not just attaching 'not' to a predicate. Consider these two sentences:\n(i) 'Marcus is not sleeping'\n(ii) 'It is not the case that Marcus is sleeping'\na) Are these logically equivalent? In classical logic, are they?\nb) Can you think of a context where they might come apart — where one is true and the other false?\nc) Why might the Stoics have preferred the propositional form?",
        answer:
          "a) In classical logic they are equivalent. b) In contexts with presupposition: 'The King of France is not bald' (predicate negation) presupposes there is a King of France; 'It is not the case that the King of France is bald' might be taken to deny the whole proposition, including its presupposition. This is a later debate (Russell vs. Strawson) but the Stoic distinction foreshadows it. c) Propositional negation is cleaner for building inference rules — it operates on whole propositions, making argument structure explicit.",
      },
      {
        title: 'Exercise 3.3 — Socratic Proctor Warm-Up',
        body:
          "Diogenes Laertius says an axioma is 'assertible by itself.' A question is also a complete lekton — it can stand alone. So why is a question not an axioma? Write 150–200 words defending the view that only assertions are true-or-false bearers. Anticipate the objection that rhetorical questions ('Isn't Socrates wise?') seem to assert something.",
        answer:
          '[Open response. Strong answer: the distinction is in the mode of presentation — an assertion commits the speaker to the truth of the content; a question does not. Even a rhetorical question technically requests confirmation rather than asserting. The speaker\'s pragmatic intention may be assertoric, but the logical form remains interrogative. The Stoic point is not about speaker intent but about the logical character of the lekton itself.]',
      },
      {
        title: 'Exercise 3.4 — Formal Logic',
        body:
          "Form the correct Stoic negation of each proposition by prefixing 'It is not the case that':\na) Virtue is sufficient for happiness.\nb) The Sage makes errors.\nc) Socrates assented to a false impression.\nThen: for each negation you produced, state whether it is true or false according to Stoic doctrine — and explain why.",
        answer:
          "a) 'It is not the case that virtue is sufficient for happiness.' — False according to Stoic doctrine (virtue IS sufficient). b) 'It is not the case that the Sage makes errors.' — True according to Stoic doctrine (the Sage, by definition, never makes errors of judgment). c) 'It is not the case that Socrates assented to a false impression.' — Complex: Stoics admired Socrates but the historical Socrates was not a Sage in the technical sense. Best Stoic answer: Socrates made progress but may have assented to some false impressions.",
      },
    ],
    quiz: [
      {
        question: "An 'axioma' in Stoic logic is:",
        options: [
          'A) Any kind of complete lekton',
          'B) A proposition — a complete lekton that is either true or false',
          'C) A valid argument form',
          'D) A predicate awaiting a subject',
        ],
        correct: 'B',
      },
      {
        question: 'Which of the following is a complete lekton but NOT an axioma?',
        options: [
          "A) 'Epictetus walks'",
          "B) 'Is Epictetus walking?'",
          "C) 'Epictetus walked'",
          "D) 'It is not the case that Epictetus walks'",
        ],
        correct: 'B',
      },
      {
        question: "An 'incomplete lekton' is:",
        options: [
          'A) A false proposition',
          'B) A predicate that requires a subject to form a complete proposition',
          'C) A question without an answer',
          'D) A proposition whose truth value is unknown',
        ],
        correct: 'B',
      },
      {
        question: "The word 'axioma' comes from a Greek verb meaning:",
        options: ['A) To know', 'B) To speak or say', 'C) To claim or deem worthy', 'D) To reason or calculate'],
        correct: 'C',
      },
      {
        question: "The Stoic negation of 'Cato is wise' is correctly formed as:",
        options: [
          "A) 'Cato is unwise'",
          "B) 'Cato is not wise'",
          "C) 'It is not the case that Cato is wise'",
          "D) 'Cato may not be wise'",
        ],
        correct: 'C',
      },
      {
        question: "Which of the following is an example of a 'definite' proposition as the Stoics used the term?",
        options: ["A) 'Someone walks'", "B) 'A man walks'", "C) 'Socrates walks' (pointing to Socrates)", "D) 'All wise men walk'"],
        correct: 'C',
      },
      {
        question: 'The Stoics are notable in the history of logic for:',
        options: [
          'A) Making the term, not the proposition, the basic unit of analysis',
          'B) Making the proposition the basic unit — anticipating modern propositional logic',
          'C) Rejecting the idea of logical connectives',
          'D) Confining logic to syllogistic forms only',
        ],
        correct: 'B',
      },
      {
        question: "A conjunction ('Both P and Q') is true if and only if:",
        options: ['A) Either P or Q is true', 'B) P is true', 'C) Both P and Q are true', 'D) Neither P nor Q is false'],
        correct: 'C',
      },
      {
        question: 'Why do questions not bear truth values, according to the Stoic account?',
        options: [
          'A) Because questions use different words than propositions',
          'B) Because questions are not lekta at all',
          'C) Because questions do not assert — they request; the assertoric mode is missing',
          'D) Because Chrysippus arbitrarily excluded them',
        ],
        correct: 'C',
      },
      {
        question: "The distinction between 'Socrates is not walking' and 'It is not the case that Socrates is walking' matters because:",
        options: [
          'A) The first is about Socrates; the second is about a general truth',
          'B) Propositional negation operates on the whole proposition and makes inference structure explicit',
          'C) Only the second form can appear as a premise in an argument',
          'D) There is no logical difference — they are synonymous in all contexts',
        ],
        correct: 'B',
      },
    ],
  },

  // ── SESSION 4 ───────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Impressions I: Phantasia',
    block: 'Block B',
    primarySources: 'L&S 39A–C; Diogenes Laertius VII.45–46',
    keyConcepts: 'Phantasia (impression); hēgemonikon (ruling faculty); alteration; rational vs. non-rational impressions',
    preSeminarBriefing: {
      problem:
        'We have now established what logic studies: lekta — the contents of propositions. But how do propositions arise in the mind in the first place? Before you can assert something, something must have presented itself to you. The Stoic answer is: an impression (phantasia). This session begins the Stoic theory of impressions — one of the most detailed and consequential theories in ancient philosophy.',
      whyItMatters:
        'The Stoic account of impressions is not just epistemology — it is the psychological foundation of their entire ethics. If you misunderstand impressions, you will misunderstand assent. If you misunderstand assent, the dichotomy of control will remain a slogan rather than a philosophical insight.',
      whatToWatchFor:
        'The Stoics defined a phantasia as an alteration (heteroiosis) in the soul. This is not metaphor — they meant it literally. The soul, for the Stoics, is a physical entity (pneuma), and impressions are literal changes in it. Also notice the distinction between rational and non-rational impressions — only rational beings have the kind of impressions that can generate assent.',
      yourTask:
        'Come prepared to answer — if an impression is a physical alteration in the soul, what makes it an impression OF something? How does the soul\'s physical state represent the world?',
    },
    parts: [
      {
        title: 'Part 1 — What Is an Impression?',
        content: [
          "The Greek word phantasia is usually translated 'impression' or 'appearance.' It comes from phainesthai, 'to appear.' An impression is the way things appear to a sentient being — the world presenting itself to a mind.",
          'The Stoics gave a technical definition of phantasia that went through several formulations. The original Zenonian definition, reported by Diogenes Laertius, compared an impression to a seal in wax: the external object stamps an imprint on the soul, just as a signet ring stamps its pattern into wax. This is literal: the soul, for the Stoics, is a physical thing (pneuma — a kind of breath or fire), and an impression is a real physical change in it.',
          'Later Stoics, particularly Chrysippus, modified this to say that an impression is an \'alteration\' (heteroiosis) in the soul rather than a literal indentation — recognizing that if every impression left a physical dent, the soul would quickly become pockmarked beyond use. The key point remained: impressions are physical events, not Platonic encounters with Forms.',
          "'An impression is an alteration in the soul, the name being appropriately borrowed from the imprints made by a seal upon wax.' — Diogenes Laertius VII.45",
        ],
      },
      {
        title: 'Part 2 — The Ruling Faculty (Hēgemonikon)',
        content: [
          'The Stoics divided the soul into eight parts: the five senses, the voice-producing faculty, the generative faculty, and the ruling faculty (hēgemonikon). The hēgemonikon is the most important part — it is the seat of reason, the part that assents, impulse, and impression.',
          'Impressions arrive in the hēgemonikon from the senses or from the mind itself. Sense impressions originate from external objects acting on the sense organs. Non-sensory impressions arise from memory, imagination, or rational thought. Both types are alterations in the hēgemonikon.',
          'The hēgemonikon is located in the heart, according to the Stoics — not the brain (against Plato and later Galen). This seems anatomically naive, but the point is philosophical: the hēgemonikon is the unified center of rational activity, and its physical location is secondary to its functional role.',
        ],
      },
      {
        title: 'Key Concept — Hēgemonikon',
        content: [
          "Hēgemonikon: the 'ruling' or 'governing' part of the soul — the seat of reason and the center of all rational psychological activity. It is in the hēgemonikon that impressions are received, assent is given or withheld, impulses arise, and rational deliberation occurs. The Stoics conceived it as physically located but functionally unified — the 'I' that does the thinking, judging, and acting.",
        ],
      },
      {
        title: 'Part 3 — Rational and Non-Rational Impressions',
        content: [
          'Not all impressions are equal. The Stoics distinguished impressions that occur in rational beings (humans and gods) from those that occur in non-rational animals. Both dogs and humans have phantasiai — a dog sees the bone, a human sees the bone. But only the human\'s impression is a rational impression — one in which the content is structured as a lekton.',
          "This distinction is fundamental. A rational impression is one whose content can be articulated in a proposition. When you see the bone, your impression is not just a sensory response — it is the impression that 'there is a bone there.' It has propositional structure. The dog's impression does not — or at least, the Stoics argued, it need not have.",
          "Why does this matter? Because only propositionally structured impressions can be the objects of assent. You can assent to or withhold assent from a content — 'yes, there is a bone there' or 'wait, that might be a stone.' Non-rational animals lack this option: they respond to impressions automatically. Rational animals can pause, evaluate, and decide whether to assent. This capacity for assent is the seat of moral responsibility.",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 4.1 — Reconstruction',
        body:
          "The Stoics held two different metaphors for impressions: Zeno's seal-in-wax model and Chrysippus's alteration model. a) What is the philosophical problem with the seal-in-wax model that led Chrysippus to revise it? b) Does the alteration model avoid that problem? What new questions does it raise? c) Can you think of a modern analogy (from neuroscience, computing, or everyday life) that better captures what the Stoics were trying to describe?",
        answer:
          'a) The seal model implies spatial impressions — a different location for each impression, which would be physically impossible. b) The alteration model avoids this by treating impressions as state-changes rather than spatial marks — but raises the question of how a state-change can carry specific representational content. c) Open-ended; strong modern analogies include neural firing patterns (state changes that carry representational content), software states, or holographic encoding.',
      },
      {
        title: 'Exercise 4.2 — Analysis',
        body:
          'The Stoics located the hēgemonikon in the heart rather than the brain. Aristotle also placed the seat of reason in the heart. Plato placed it in the head. a) What philosophical considerations might lead a Stoic to favor the heart? b) Does the physical location actually matter for the philosophical claims the Stoics are making? c) If the location doesn\'t matter, what does the identification of the hēgemonikon actually mean?',
        answer:
          "a) The heart was considered the center of life and warmth — connected to the pneuma that is the Stoic soul. It also reflects the phenomenology of strong emotion and decision (we feel decisions 'in the chest'). b) Not obviously — the philosophical claims are about the function of the ruling faculty, not its anatomy. c) It means: whatever part of the organism serves as the unified center of rational agency — the part that receives impressions and acts on them — that is the hēgemonikon. The claim is functional, not neurological.",
      },
      {
        title: 'Exercise 4.3 — Socratic Proctor Warm-Up',
        body:
          "The Stoics said rational impressions have propositional content — the impression of the bone is the impression THAT 'there is a bone here.' A critic might say: this overly intellectualizes perception. When I see a red apple, I don't first form a proposition — I just see red. Write 150–200 words responding to this objection on behalf of the Stoics.",
        answer:
          "[Open response. Strong Stoic response: the objection confuses the phenomenology of perception with its logical structure. The Stoics are not saying you consciously articulate a proposition when you see red — they are saying the impression has propositional structure available for rational evaluation. The test is whether you can give or withhold assent: 'Is that really red, or is it the lighting?' If you can ask this question, your impression has propositional structure. Non-rational animals cannot ask this question.]",
      },
      {
        title: 'Exercise 4.4 — Formal Logic',
        body:
          'The Stoics held that rational impressions have propositional content. For each perception below, write the proposition that represents its content as a Stoic rational impression:\na) You see a man walking across the courtyard.\nb) You feel a sharp pain in your hand.\nc) You remember that Seneca advised patience in adversity.\nThen identify: is each impression sensory, memory-based, or rational-conceptual?',
        answer:
          "a) 'A man is walking across the courtyard' — sensory impression. b) 'My hand is being damaged' or 'something is causing pain in my hand' — sensory impression (with a degree of interpretation). c) 'Seneca advised patience in adversity' — memory impression (non-sensory). Note: even pain has propositional content for the Stoics — the impression that something is bad or harmful. This connects directly to their ethics (impressions of value are subject to assent).",
      },
    ],
    quiz: [
      {
        question: "The Greek word 'phantasia' is derived from a verb meaning:",
        options: ['A) To reason or calculate', 'B) To appear or seem', 'C) To act or produce', 'D) To know or understand'],
        correct: 'B',
      },
      {
        question: "Zeno's original definition compared an impression to:",
        options: ['A) An echo in a chamber', 'B) A light through a lens', 'C) A seal stamped in wax', 'D) A river wearing down rock'],
        correct: 'C',
      },
      {
        question: "Why did Chrysippus revise Zeno's seal-in-wax model?",
        options: [
          'A) Because impressions are not physical at all',
          'B) Because the metaphor implied spatial displacement that is physically impossible',
          'C) Because wax is too unstable to represent long-lasting beliefs',
          "D) Because Zeno's model was borrowed from Plato and therefore suspect",
        ],
        correct: 'B',
      },
      {
        question: "The 'hēgemonikon' is:",
        options: [
          'A) The five senses combined',
          'B) The rational ruling faculty — the part of the soul that receives impressions and gives assent',
          'C) The Stoic word for God',
          'D) The physical location of the soul in the chest',
        ],
        correct: 'B',
      },
      {
        question: 'The Stoics located the hēgemonikon in the:',
        options: ['A) Brain', 'B) Liver', 'C) Heart', 'D) Spine'],
        correct: 'C',
      },
      {
        question: "A 'rational impression' differs from a non-rational impression in that:",
        options: [
          'A) Rational impressions are stronger and clearer',
          'B) Rational impressions have propositional content — they can be articulated as a lekton',
          'C) Rational impressions come only from the senses',
          'D) Rational impressions are always true',
        ],
        correct: 'B',
      },
      {
        question: 'Which of the following CANNOT give or withhold assent to an impression?',
        options: [
          'A) A Stoic Sage',
          'B) A human being in a state of passion',
          'C) A dog responding to a stimulus',
          'D) A human child learning to walk',
        ],
        correct: 'C',
      },
      {
        question: 'The soul (psyche) for the Stoics is:',
        options: [
          'A) Incorporeal — a Form or substance outside the body',
          'B) Physical — a kind of pneuma (fiery breath)',
          'C) Mental — a collection of ideas and representations',
          'D) Divine — identical with the Logos of the cosmos',
        ],
        correct: 'B',
      },
      {
        question: 'Impressions can arise from which of the following sources? (Select the most complete answer)',
        options: [
          'A) Sense experience only',
          'B) Sense experience and memory only',
          'C) Sense experience, memory, and rational thought',
          'D) Rational thought only — sense impressions are unreliable',
        ],
        correct: 'C',
      },
      {
        question: 'The Stoic account of rational impressions is philosophically important because:',
        options: [
          'A) It proves that all impressions are true',
          'B) It establishes the bridge between physics (how impressions occur) and logic (what propositions are)',
          'C) It demonstrates that animals have no psychological life',
          'D) It reduces ethics to physiology',
        ],
        correct: 'B',
      },
    ],
  },

  // ── SESSION 5 ───────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Impressions II: The Cognitive Impression',
    block: 'Block B',
    primarySources: 'L&S 40C–E; Cicero, Academica II.77–78; Sextus AM 7.248–252',
    keyConcepts: 'Katalēptikē phantasia (cognitive impression); criterion of truth; Academic skepticism',
    preSeminarBriefing: {
      problem:
        'If all we have to go on are impressions — alterations in our soul — how do we know which ones to trust? We can be deceived. We dream. We hallucinate. We misperceive. The Stoics needed a criterion of truth: some way to distinguish impressions that reliably track reality from those that do not. Their answer is the cognitive impression (katalēptikē phantasia). But their answer was immediately attacked by the Academic skeptics — and the debate is one of the most important in ancient philosophy.',
      whyItMatters:
        'The criterion of truth is not just an epistemological puzzle. For the Stoics, it connects directly to action: a person who cannot distinguish reliable impressions from unreliable ones cannot act wisely. The cognitive impression is what the Sage grasps — and why the Sage is reliably right.',
      whatToWatchFor:
        'The Stoics defined the cognitive impression with extreme precision: an impression from a real object, stamped according to that object, of such a kind as could not arise from a non-existent object. The last clause is crucial — and was the precise target of Academic attack.',
      yourTask:
        'Arcesilaus, the Academic, argued that for every cognitive impression the Stoics could produce, he could produce a non-cognitive impression indistinguishable from it. Come prepared to evaluate whether this objection refutes the Stoic position.',
    },
    parts: [
      {
        title: 'Part 1 — The Need for a Criterion',
        content: [
          'The Stoics were not skeptics. They believed knowledge was possible — that human beings, through the proper use of reason, could grasp truths about the world. But they were not naive dogmatists either. They knew that impressions can mislead: we see things that are not there, mistake one person for another, and form beliefs on the basis of perceptual errors.',
          'The question of the criterion of truth — the standard by which true cognition is distinguished from false — was the central epistemological debate of the Hellenistic age. The Epicureans said sensation itself is the criterion. The Academics (Skeptics) denied there was any reliable criterion at all. The Stoics took a middle position: there is a criterion, but it is not just any impression — it is the cognitive impression.',
        ],
      },
      {
        title: 'Part 2 — The Katalēptikē Phantasia',
        content: [
          "The cognitive impression (katalēptikē phantasia — literally the 'graspable' impression, from katalambanein, 'to grasp or seize') is defined by Sextus Empiricus, drawing on Stoic sources, as an impression that arises from what is real, is stamped and impressed according to the real thing, and is of such a kind as could not arise from what is not real.",
          "'The cognitive impression is one which arises from an existing thing, corresponds to that existing thing, and is such as could not arise from a non-existing thing.' — Sextus Empiricus, Against the Logicians 7.248",
          'Three conditions:',
          '(1) From a real object — the impression must have a real external cause. Hallucinations fail this condition.',
          '(2) Corresponding to that object — the impression must accurately represent the object, not distort it. Optical illusions fail this condition.',
          '(3) Such as could not arise from a non-existent object — the impression must have a distinctive character that marks it as coming from reality. This is the controversial clause.',
          'Clause (3) is the Stoic claim that the cognitive impression is self-certifying — that it carries, within itself, a mark of its own reliability. The Stoics held that when you have a cognitive impression, you can tell — the impression has a vividness, clarity, and distinctiveness that non-cognitive impressions lack.',
        ],
      },
      {
        title: 'Key Concept — Katalēptikē Phantasia',
        content: [
          'Katalēptikē phantasia (cognitive impression): the Stoic criterion of truth — an impression that (1) arises from a real object, (2) accurately represents that object, and (3) has a distinctive character that could not arise from a non-existent object. The cognitive impression is the bridge between the external world and reliable knowledge. Only the Sage consistently acts on cognitive impressions; ordinary humans often assent to non-cognitive ones.',
        ],
      },
      {
        title: 'Part 3 — The Academic Challenge',
        content: [
          "The Stoic account of the cognitive impression was immediately challenged by Arcesilaus, who led the Academy (Plato's school) in the mid-third century BCE. Arcesilaus argued that for any cognitive impression the Stoics could produce — however vivid, clear, and distinctive — he could describe a situation in which an equally vivid and clear non-cognitive impression was indistinguishable from it.",
          'The classic case: two identical twins. If the impressions of two men who look exactly alike are equally vivid and clear, how does the cognitive impression of Castor help me identify Castor, if Pollux\'s impression would feel the same? The vividness and clarity that the Stoics cite as the mark of the cognitive impression does not seem sufficient to distinguish it from a qualitatively identical non-cognitive impression.',
          'This debate ran for generations. The Stoic response, pressed particularly by Chrysippus, was that no two real objects are in fact identical — nature ensures individual differentiation. The problem is not with the criterion but with hypothetical cases designed to defeat it. Real cognitive impressions of real distinct objects cannot be defeated by thought experiments about impossible twins.',
          "The debate between Stoics and Academics is one of the great encounters in ancient philosophy — anticipating Descartes's problem of the evil demon, Kant's reply to skepticism, and contemporary debates about perceptual warrant.",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 5.1 — Reconstruction',
        body:
          'The Stoics defined the cognitive impression with three conditions. Test each condition against the following case: you are dreaming vividly that you are talking to your friend Cato. The dream impression feels completely real.\na) Does the dream impression satisfy condition (1)? Explain.\nb) Does it satisfy condition (2)? What would the Stoics say?\nc) What is the crucial point at condition (3)? How do Stoics argue that dream impressions fail it?',
        answer:
          "a) No — the impression does not arise from the real Cato but from the dreaming mind. Condition (1) fails. b) It may feel like it corresponds, but it does not — the 'Cato' in the dream is not Cato. c) Condition (3): the dream impression lacks the distinctive character that only a real object can produce. The Stoics would say that on reflection, dream impressions betray themselves — their clarity and distinctiveness are subtly inferior to waking cognitive impressions. This is the contested claim.",
      },
      {
        title: 'Exercise 5.2 — Analysis',
        body:
          "Arcesilaus's twin argument: if Castor and Pollux are physically identical, my impression of Castor and my impression of Pollux are indistinguishable. Therefore no impression can satisfy condition (3).\na) State the Stoic reply about individual differentiation in nature.\nb) Is the Stoic reply convincing? What assumption does it require?\nc) Does Arcesilaus's argument work even if no actual twins are perfectly identical?",
        answer:
          'a) Chrysippus argued that no two natural objects are in fact qualitatively identical — nature individuates. Therefore a real impression of Castor would differ from a real impression of Pollux, even if the difference is subtle. b) This requires the assumption that nature always produces discernible differences — a strong metaphysical claim not obviously true. c) The argument works as a thought experiment — if we can conceive of indistinguishable impressions, the criterion\'s self-certifying character seems undermined even if the case never actually occurs.',
      },
      {
        title: 'Exercise 5.3 — Socratic Proctor Warm-Up',
        body:
          'The Stoics needed a criterion of truth to avoid skepticism. The cognitive impression is their candidate. But the Academic objections suggest it cannot be made perfectly rigorous. Write 150–200 words on the following: Is a fallible criterion of truth better than no criterion at all? What would the Stoics say? What would you say?',
        answer:
          '[Open response. Strong answer: the Stoics would say yes — practical life requires a standard for action even if it is not infallible. The Sage acts on the best available cognitive impressions; the non-Sage often assents to non-cognitive ones. The question is not whether the criterion is theoretically perfect but whether it enables reliable action. Compare: a thermometer that is accurate 99% of the time is practically indispensable even though theoretically fallible.]',
      },
      {
        title: 'Exercise 5.4 — Formal Logic',
        body:
          "The debate about the cognitive impression anticipates Descartes's evil demon argument (Meditations I). For each description below, identify whether it is closer to the Stoic position or the Academic (skeptical) position, and explain in one sentence:\na) 'I will doubt everything that can be doubted until I find something I cannot doubt.'\nb) 'The clarity and distinctness of an idea is the criterion of its truth.'\nc) 'No standard of truth can be found, so the wise person suspends judgment on everything.'\nd) 'The criterion is fallible but sufficient for practical life.'",
        answer:
          "a) Academic (skeptical) — systematic doubt is the Academic method. b) Stoic — Descartes's criterion of clear and distinct ideas mirrors the Stoic cognitive impression. c) Academic — suspension of judgment (epochē) is the Academic response to the absence of a reliable criterion. d) Stoic — the Stoics were not global skeptics; they believed the cognitive impression was sufficient for practical wisdom even if not theoretically unassailable.",
      },
    ],
    quiz: [
      {
        question: "The 'katalēptikē phantasia' is best translated as:",
        options: [
          'A) The false impression',
          'B) The cognitive (graspable) impression — the Stoic criterion of truth',
          'C) The sensory impression of external objects',
          'D) The impression that survives Academic scrutiny',
        ],
        correct: 'B',
      },
      {
        question: 'The three conditions of the cognitive impression are: from a real object; corresponding to that object; and:',
        options: [
          'A) Accompanied by a feeling of certainty',
          'B) Approved by a Sage',
          'C) Of such a kind as could not arise from a non-existing thing',
          'D) Replicated by at least one other observer',
        ],
        correct: 'C',
      },
      {
        question: 'The Academic philosopher who most forcefully challenged the cognitive impression was:',
        options: ['A) Plato', 'B) Arcesilaus', 'C) Pyrrho', 'D) Sextus Empiricus'],
        correct: 'B',
      },
      {
        question: "The 'twin argument' against the Stoic criterion states that:",
        options: [
          'A) The same object always produces two impressions',
          "B) Indistinguishable impressions could arise from different objects, undermining the criterion's self-certifying character",
          'C) Cognitive impressions are reliable only in twins',
          'D) The Stoic criterion requires two observers to verify any impression',
        ],
        correct: 'B',
      },
      {
        question: 'The Stoic reply to the twin argument was:',
        options: [
          'A) Twins are actually distinguishable if you look closely enough at their souls',
          'B) Nature always individuates — no two real objects are qualitatively identical',
          'C) The twin argument is a logical contradiction and can be dismissed',
          'D) The cognitive impression does not require distinguishing twins',
        ],
        correct: 'B',
      },
      {
        question: "The 'criterion of truth' is:",
        options: [
          'A) A list of acceptable sources for beliefs',
          'B) The standard by which true cognition is distinguished from false',
          'C) A logical proof that knowledge exists',
          'D) The Stoic equivalent of the Socratic method',
        ],
        correct: 'B',
      },
      {
        question: 'Katalepsis — the cognitive act associated with the kataleptike phantasia — means:',
        options: [
          'A) Doubting an impression until it proves itself',
          'B) Assenting to a non-cognitive impression',
          'C) The firm grasp of a true object through a reliable impression',
          'D) Withholding assent from all impressions',
        ],
        correct: 'C',
      },
      {
        question: 'According to the Stoics, who consistently acts ONLY on cognitive impressions?',
        options: ['A) Any rational adult', 'B) A trained philosopher', 'C) The ideal Sage', 'D) Anyone who has studied Stoic logic'],
        correct: 'C',
      },
      {
        question: "The Stoic account of the cognitive impression most closely anticipates which of Descartes's ideas?",
        options: [
          'A) The evil demon hypothesis',
          'B) Cogito ergo sum',
          'C) Clear and distinct ideas as the criterion of truth',
          'D) The wax example in Meditation II',
        ],
        correct: 'C',
      },
      {
        question: 'What is the philosophical significance of the debate between Stoics and Academics about the criterion?',
        options: [
          'A) It shows that all knowledge is impossible',
          'B) It demonstrates that Stoic logic is self-contradictory',
          'C) It is one of the earliest and most rigorous debates about perceptual warrant and the foundations of knowledge',
          "D) It proves that Plato's Forms are necessary for knowledge",
        ],
        correct: 'C',
      },
    ],
  },

  // ── SESSION 6 ───────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'Assent: Synkatathesis',
    block: 'Block B',
    primarySources: 'L&S 53A–B; Epictetus, Discourses 1.1.1–12; L&S 40N',
    keyConcepts: 'Synkatathesis (assent); withholding assent (epochē); the bridge to ethics; responsibility',
    preSeminarBriefing: {
      problem:
        'We now have impressions and the criterion for evaluating them. The next question is: what happens between receiving an impression and acting on it? The Stoics identified a crucial step that most philosophy ignores: assent (synkatathesis). Before you act on an impression, you assent to it. And assent is up to you.',
      whyItMatters:
        'This is where Stoic logic meets Stoic ethics. The dichotomy of control is not a self-help heuristic — it is a consequence of the theory of assent. Because assent is up to us, and because our actions flow from our assents, we are responsible for our actions in a way that does not require anything outside us to be within our control.',
      whatToWatchFor:
        "Epictetus opens the Discourses with the claim that the one thing that is truly 'up to us' is the use of impressions — which means the act of assent. This is not a rhetorical opening. It is a precise philosophical claim grounded in the theory of knowledge. After this session, that claim should be fully transparent.",
      yourTask:
        'Come prepared to argue: does the Stoic theory of assent make us fully responsible for our beliefs? Can you assent or withhold assent from any impression you choose? Or are some assents compelled?',
    },
    parts: [
      {
        title: 'Part 1 — The Act of Assent',
        content: [
          "The Stoics placed a pivotal act between the reception of an impression and the response to it: assent (synkatathesis). When an impression presents itself to the hēgemonikon, the rational being has a choice: to affirm it — to 'say yes' to the content — or to withhold assent. This choice is the moment of rational agency.",
          "The Greek word synkatathesis combines syn (together, in agreement), kata (down), and thesis (placing, setting). It is literally 'placing oneself down in agreement with' something. When you assent to an impression, you endorse its content as true. When you withhold assent, you suspend judgment — neither affirming nor denying.",
          'Crucially, assent is not automatic. Non-rational animals respond to impressions automatically — they have no choice but to pursue what appears good and flee what appears bad. Rational animals can pause. The pause is the space of rationality. In that pause, the human being is master of their own response.',
          "'Men are disturbed not by the things which happen, but by the opinions about the things: for example, death is nothing terrible, for if it were, it would have seemed so to Socrates; for the opinion about death, that it is terrible, is the terrible thing.' — Epictetus, Enchiridion 5",
        ],
      },
      {
        title: 'Part 2 — Assent and the Lekton',
        content: [
          'Recall the structure from Sessions 2–3: impressions have propositional content. The rational impression is the impression THAT something is the case. Assent is the act of affirming that propositional content.',
          "This means assent is not a brute response to raw sensation — it is an act of endorsing a proposition. When you feel pain and judge 'this is terrible,' you are assenting to the proposition 'this pain is terrible.' The Stoics held that this judgment — this assent — is up to you. The sensation is not up to you. The impression arrives without your permission. But the judgment — the additional step of labeling it 'terrible' — is your act.",
          "This is the precise mechanism behind Epictetus's instruction to 'use impressions well.' He is not asking you to feel nothing. He is asking you to notice the proposition embedded in the impression and evaluate whether it is worth your assent before giving it.",
        ],
      },
      {
        title: 'Key Concept — Synkatathesis',
        content: [
          'Synkatathesis (assent): the act by which a rational being endorses the content of an impression as true. Assent bridges impression and action: a rational being acts on an impression only after assenting to it. Because assent is up to us — within our control — we are responsible for the judgments and actions that follow from our assents. This is the logical mechanism underlying the Stoic dichotomy of control.',
        ],
      },
      {
        title: 'Part 3 — Withholding Assent and the Sage',
        content: [
          'The capacity to withhold assent (epochē) is one of the defining features of the rational soul. The Academic skeptics urged universal withholding of assent — suspend judgment on everything because no criterion of truth is reliable. The Stoics rejected this as both epistemologically and practically impossible.',
          "For the Stoics, the goal is not to withhold assent universally but to assent only to cognitive impressions. The Sage — the ideal wise person — never assents to a non-cognitive impression. This does not mean the Sage feels nothing or that no impressions arrive. Impressions of pain, loss, and danger arrive in the Sage as in everyone else. What differs is the Sage's response: they do not assent to the evaluative proposition embedded in the impression. They do not endorse 'this is terrible.'",
          'Ordinary humans, by contrast, assent recklessly — they endorse impressions without scrutiny, let vivid appearances carry them away, and mistake strong feelings for valid judgments. The path of philosophical training is the gradual development of the capacity to pause, scrutinize, and assent selectively.',
          "Epictetus opens the Discourses by saying that the one thing truly 'up to us' (eph' hēmin) is the use of impressions — by which he means the act of assent. We cannot control what impressions arrive. We can control whether we affirm their propositional content. This is not a motivational claim. It is a technical philosophical position grounded in five sessions of logical groundwork.",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 6.1 — Reconstruction',
        body:
          'Trace the full chain from Sessions 4–6 for the following scenario: you are told that a close friend has died. Map the Stoic psychological sequence:\na) What impression arrives, and what is its propositional content?\nb) What is the Stoic account of the pain you feel?\nc) What assent would the non-Sage give that the Sage would not?\nd) What would the Sage assent to instead?',
        answer:
          "a) The impression: 'My friend has died' — propositional content available for assent. b) The pain (the sensation of loss) arrives as a natural response — the Stoics do not deny this. They called these propatheiai — pre-emotional responses that are not in themselves passions. c) Non-Sage assents to: 'This is terrible, this is a great evil, my happiness is destroyed.' d) Sage might assent to: 'My friend has died' (the fact) but withholds assent from 'this is terrible' — recognizing death as an indifferent, not an evil.",
      },
      {
        title: 'Exercise 6.2 — Analysis',
        body:
          "Epictetus says: 'Men are disturbed not by the things which happen, but by the opinions about the things.' This is a direct application of the theory of assent. a) What is the 'thing that happens' in his account? b) What is the 'opinion'? c) Is Epictetus denying that bad things happen? Or is he making a more precise claim? d) What objection might a critic make — and how would a Stoic respond?",
        answer:
          'a) The external event — the death, the insult, the loss of property. b) The judgment (assent) that the event is terrible, evil, or harmful to the self. c) He is not denying that events occur. He is claiming that the disturbance — the pathos — is caused by the added judgment, not the bare event. d) Objection: some disturbances are involuntary — you cannot choose not to feel grief. Stoic response: the propatheiai (first movements) are involuntary. But the full passion requires assent, which is voluntary. You cannot prevent the first twinge; you can prevent the spiral into full grief.',
      },
      {
        title: 'Exercise 6.3 — Socratic Proctor Warm-Up',
        body:
          "The Stoics claimed assent is always up to us — we can always withhold it. But consider compelled beliefs: if you are shown overwhelming evidence that 2+2=4, can you withhold assent? If someone points a gun at your head, can you withhold assent from the impression 'this is dangerous'? Write 150–200 words on whether there are compelled assents, and whether this undermines the Stoic theory.",
        answer:
          "[Open response. Strong Stoic answer: the Stoics acknowledged that cognitive impressions compel assent in the Sage — but this is because the impression is objectively reliable, not because the Sage has lost control. The Sage assents to 2+2=4 because it is a cognitive impression, not because they are forced. The question is about the evaluative assents — the 'this is terrible' — which are never compelled. Even facing a gun, the Sage can assent to 'there is a gun' (factual) without assenting to 'this is terrible for me' (evaluative).]",
      },
      {
        title: 'Exercise 6.4 — Formal Logic',
        body:
          "Map the logical structure of the Stoic causal chain from impression to action. For each step, identify what is 'up to us' and what is not:\n(1) An external event occurs (e.g., insult from a colleague)\n(2) An impression arrives in the hēgemonikon\n(3) The rational being evaluates the impression\n(4) Assent is given or withheld\n(5) If assent is given, impulse (hormē) arises\n(6) Action follows from impulse",
        answer:
          "Step 1: Not up to us — external events are not in our control. Step 2: Not up to us — impressions arrive automatically; we cannot prevent them. Step 3: Up to us — this is the critical moment of rational evaluation. Step 4: Up to us — assent is the paradigm case of what is eph' hēmin. Step 5: Conditionally: impulse arises from assent; since assent is up to us, impulse is indirectly up to us. Step 6: Similarly conditional — action follows from impulse; since assent is up to us, action is ultimately under our rational governance. The chain shows that the Stoic dichotomy of control is not arbitrary — it is grounded in the causal architecture of rational agency.",
      },
    ],
    quiz: [
      {
        question: "The Greek word 'synkatathesis' literally means:",
        options: [
          'A) To reason about impressions',
          'B) To place oneself in agreement with something — to assent',
          'C) To withhold judgment indefinitely',
          'D) To receive an impression from an external object',
        ],
        correct: 'B',
      },
      {
        question: 'What distinguishes rational animals from non-rational animals in the Stoic account of assent?',
        options: [
          'A) Rational animals have stronger impressions',
          'B) Rational animals can pause and choose whether to assent to an impression',
          'C) Rational animals always assent correctly',
          'D) Non-rational animals do not have impressions at all',
        ],
        correct: 'B',
      },
      {
        question: "When Epictetus says 'men are disturbed by opinions, not things,' the 'opinion' refers to:",
        options: [
          'A) A false belief held for many years',
          'B) The assent given to the evaluative content of an impression',
          'C) A logical error in argument form',
          'D) Any impression not grounded in a real object',
        ],
        correct: 'B',
      },
      {
        question: "For the Stoics, what is 'up to us' (eph' hēmin)?",
        options: [
          'A) External events and their outcomes',
          'B) The impressions that arrive in the hēgemonikon',
          "C) The act of assent — whether we affirm or withhold endorsement of an impression's content",
          'D) The strength and vividness of our impressions',
        ],
        correct: 'C',
      },
      {
        question: "The term 'propatheiai' refers to:",
        options: [
          "A) The Sage's fully rational responses to events",
          'B) Pre-emotional involuntary responses that precede full passions',
          'C) Impressions that arrive without any corresponding external object',
          'D) Propositions that cannot be assented to',
        ],
        correct: 'B',
      },
      {
        question: 'The Academic skeptics used epochē (withholding of assent) to:',
        options: [
          'A) Train themselves to give only cognitive impressions their assent',
          'B) Universally suspend judgment because no criterion of truth is reliable',
          'C) Evaluate impressions before acting on them, as the Stoics recommended',
          'D) Identify which impressions correspond to external objects',
        ],
        correct: 'B',
      },
      {
        question: 'According to the Stoics, an ordinary human being who feels strong grief at a friend\'s death has:',
        options: [
          'A) Received an impression that was not real',
          'B) Assented to the evaluative proposition that the death is a great evil',
          'C) Used impressions wisely and responded proportionally',
          'D) Acted without any impression at all',
        ],
        correct: 'B',
      },
      {
        question: 'The Sage, unlike the ordinary person, differs in the Stoic account in that:',
        options: [
          'A) The Sage feels no impressions of loss or pain',
          'B) The Sage assents only to cognitive impressions and withholds assent from evaluative additions',
          'C) The Sage has a different physical soul-substance',
          'D) The Sage never receives impressions of bad events',
        ],
        correct: 'B',
      },
      {
        question: 'How does the theory of assent connect logic to ethics?',
        options: [
          'A) It shows that ethics can be reduced to formal argument',
          'B) It establishes that our judgments — which are acts of assent — are the source of our emotional states and actions, making us responsible for them',
          'C) It demonstrates that all ethical claims are propositions subject to truth-value assessment',
          'D) It proves that the Sage has no emotions',
        ],
        correct: 'B',
      },
      {
        question: "Epictetus's statement that the 'use of impressions' is the one thing up to us is best understood as:",
        options: [
          'A) A rhetorical exaggeration to motivate students',
          'B) A technical claim that assent — the act by which we endorse or refuse impression content — is the paradigm of what is in our rational control',
          'C) An argument that all external events are actually up to us if we try hard enough',
          'D) A denial that anything external can affect us',
        ],
        correct: 'B',
      },
    ],
  },

  // ── SESSION 7 ───────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Impulse and Action: Hormē',
    block: 'Block C',
    primarySources: 'L&S 53Q–R; DL VII.49–51; L&S 33C (on lekta and impulse)',
    keyConcepts: 'Hormē (impulse); aphormē (aversion); the causal chain to action; rational vs. non-rational impulse; oikeiōsis',
    preSeminarBriefing: {
      problem:
        'In Session 6 we established that assent is the critical act of rational agency. But what comes after assent? How does endorsing a proposition translate into movement — into actual behavior in the world? The Stoics had a precise answer: impulse (hormē). Assent to a practical impression produces impulse, and impulse produces action. This session completes the causal chain from world to action.',
      whyItMatters:
        'Understanding hormē closes the loop between Stoic logic and Stoic ethics. Once you see that action flows from impulse, which flows from assent, which is up to us, the entire Stoic account of moral responsibility becomes clear. It also explains why the Stoics took passions (pathē) so seriously: passions are excessive impulses — impulses that have overshot reason.',
      whatToWatchFor:
        'The Stoics distinguished rational from non-rational impulse. In rational beings, impulse is assent to a practical proposition — the proposition that something is to-be-done. In non-rational animals, impulse is direct response to impression without the assent step. Also notice the concept of oikeiōsis — natural affiliation — which grounds the first impulses of all sentient creatures toward self-preservation.',
      yourTask:
        'Come prepared to answer — if impulse follows automatically from assent, in what sense is action up to us? Is there a further step, or does assent fully determine action?',
    },
    parts: [
      {
        title: 'Part 1 — The Causal Chain Completed',
        content: [
          'The Stoic psychology of action is a four-step chain: impression → assent → impulse → action. Sessions 4–6 covered the first two steps. This session addresses the third: impulse (hormē).',
          'The Greek word hormē means drive, thrust, or impulse — a directed movement toward something. Its opposite is aphormē: aversion, the impulse away from something. Every voluntary action is driven by either hormē (approach) or aphormē (avoidance). These are the motors of behavior.',
          'The Stoic innovation is the precise location of impulse in the causal chain. Impulse does not arise directly from impression, as it does in non-rational animals. In rational beings, impression must first be followed by assent — the rational endorsement of the impression\'s content. Only then does impulse arise. This means rational beings are, in principle, never simply pushed by stimuli. They are moved by their own judgments.',
          "'Impulse in general is a movement of the soul toward something. Rational impulse — the kind that occurs in humans — is assent to an impression of something as appropriate to pursue.' — Diogenes Laertius VII.49 (paraphrase)",
        ],
      },
      {
        title: 'Part 2 — Rational Impulse and the Practical Proposition',
        content: [
          "What distinguishes rational impulse from the simple drives of non-rational animals is its logical structure. A rational impulse is not a bare push toward something — it is assent to a practical proposition: a proposition of the form 'X is to be done' or 'X is appropriate for me to pursue.'",
          'When you reach for a piece of bread, the Stoic account is: the impression \'bread is here, suitable for eating\' presents itself. You assent to the content — yes, eating is appropriate now. That assent is simultaneously an impulse toward the bread. The practical proposition \'I should eat\' and the impulse to eat are, in a Stoic framework, the same psychological event seen from two angles — one logical, one motivational.',
          "This is what Chrysippus meant when he said that assent and impulse are 'the same thing' in the case of action. It sounds paradoxical until you see the point: for rational beings, deciding-that and being-moved-to are not two separate events connected by some mysterious mechanism. They are one event — the endorsement of a practical content — with both a logical and a motivational aspect.",
        ],
      },
      {
        title: 'Key Concept — Hormē',
        content: [
          "Hormē (impulse): the motivational state that moves a rational being toward action. In humans, hormē arises from assent to a practical impression — the endorsement of a proposition of the form 'this is to be done' or 'this is appropriate.' It is the motivational face of assent. Its opposite, aphormē (aversion), is assent to 'this is to be avoided.' Together they drive all voluntary behavior. Excessive or misdirected hormē is the Stoic definition of passion (pathos).",
        ],
      },
      {
        title: 'Part 3 — Oikeiōsis and the First Impulses',
        content: [
          "What generates the first impulses of any sentient creature? The Stoics answered with the concept of oikeiōsis — usually translated 'appropriation' or 'affiliation.' From birth, every sentient creature is affiliated with itself — it perceives its own constitution as its own and is immediately impelled to preserve it.",
          'This is not a calculated decision. The newborn animal does not reason its way to self-preservation. Oikeiōsis is the original orientation of every living thing toward its own nature: what is appropriate to that nature produces hormē; what is alien produces aphormē. Self-preservation is the first expression of oikeiōsis, but it extends outward — to offspring, to kin, eventually, in rational creatures, to all of humanity.',
          'For the Stoics, oikeiōsis grounds the social dimension of ethics: we are naturally affiliated not only with ourselves but with other rational beings. The fully developed rational oikeiōsis is cosmopolitanism — the recognition that all rational beings share in the logos and are therefore members of a single community. This is not a sentiment imposed on nature but an extension of the same drive that first moved us to protect ourselves.',
          'The connection to hormē is direct: what oikeiōsis identifies as appropriate (oikeion) generates hormē; what it identifies as alien (allotrion) generates aphormē. The first movements of every animal — and the developed ethical life of the Sage — are both expressions of the same underlying structure.',
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 7.1 — Reconstruction',
        body:
          'Trace the full four-step Stoic causal chain for the following scenario: you are in a philosophical discussion and someone insults your argument in front of others. You feel a flash of anger and respond sharply.\na) Identify the impression and its propositional content.\nb) Identify the assent (what proposition did you endorse?).\nc) Identify the impulse (hormē or aphormē? toward what?).\nd) At which step, according to the Stoics, did things go wrong — and what should the trained Stoic have done instead?',
        answer:
          "a) Impression: 'I have been publicly insulted and made to look foolish' — propositional content available for assent. b) Assent: endorsement of 'this is bad, this is an injury to me, I should respond.' c) Hormē: impulse toward retaliation — toward the sharp response. d) The failure is at step (b): assent to 'this is an injury' — the evaluative judgment that the insult constitutes a genuine harm. The trained Stoic would pause at step (b), recognize the insult as an indifferent (not a real evil), and either withhold assent to the injury-proposition or assent only to the factual content ('someone expressed a negative opinion of my argument') without the evaluative addition.",
      },
      {
        title: 'Exercise 7.2 — Analysis',
        body:
          "Chrysippus said that in rational beings, assent and impulse are 'the same thing.' This sounds strange — deciding something and being motivated to act seem different.\na) What does Chrysippus mean? What is the insight here?\nb) Is there evidence from your own experience that deciding and being-moved-to are sometimes the same event?\nc) Can you think of cases where they come apart — where you decide to do something but feel no impulse, or feel an impulse but have not decided?",
        answer:
          "a) Chrysippus's point: for rational action, the endorsement of a practical proposition IS the motivational state. There is no gap between 'I judge that I should do X' and 'I am moved to do X' — they are the same act seen from logical and motivational perspectives. b) Open-ended — consider cases of immediate, full-conviction decisions (diving into water to save someone) where the decision and the movement are simultaneous. c) The cases where they come apart (akrasia — weakness of will) are philosophically important. The Stoics largely denied genuine akrasia: apparent weakness of will is a case of fluctuating assent, not a gap between judgment and motivation.",
      },
      {
        title: 'Exercise 7.3 — Socratic Proctor Warm-Up',
        body:
          'Oikeiōsis begins with self-preservation and extends outward to all rational beings — cosmopolitanism. A critic might say: this is a just-so story. There is no reason why self-love should extend to strangers. Write 150–200 words defending the Stoic account of oikeiōsis as a genuine philosophical argument rather than wishful thinking.',
        answer:
          '[Open response. Strong answer: the Stoic argument is not that we should feel the same emotional warmth toward strangers as toward ourselves — it is that the rational basis of self-concern (we care about ourselves because we are rational beings with a specific nature) is the same rational basis for caring about other rational beings. The logic is: I am affiliated with my own rational nature. Rationality is what grounds the affiliation. Other humans share rational nature. Therefore the same ground that affiliates me with myself affiliates me with other rational beings. The extension is not sentimental — it is logical. Compare: if I value justice because it is rational, and other rational beings also benefit from justice, then justice-for-me and justice-for-others have the same rational ground.]',
      },
      {
        title: 'Exercise 7.4 — Formal Logic',
        body:
          "The Stoics held that passions (pathē) are excessive or misdirected impulses — specifically, they are assents to false practical propositions. Map each passion below to the false practical proposition being assented to:\na) Fear (phobos) — defined by the Stoics as 'aversion from an expected apparent evil'\nb) Desire (epithumia) — defined as 'appetite for an expected apparent good'\nc) Pleasure (hēdonē) — defined as 'a fresh opinion that something good is present'\nd) Distress (lupē) — defined as 'a fresh opinion that something bad is present'\nThen identify: in each case, what has gone wrong logically?",
        answer:
          "a) Fear: assent to 'this upcoming event is a genuine evil to be avoided' — false because externals are not genuine evils. The correct assessment: 'this is a dispreferred indifferent, not an evil.' b) Desire: assent to 'this external thing is a genuine good I must have' — false because externals are not genuine goods. c) Pleasure (in the Stoic pathological sense): assent to 'this external thing is a genuine good that is now present' — same error, present tense. d) Distress: assent to 'this bad thing is now present and is genuinely harmful to me' — false for the same reason. The logical error in all four cases: treating external things (health, pleasure, death, pain) as genuine goods or evils when they are merely preferred or dispreferred indifferents.",
      },
    ],
    quiz: [
      {
        question: "The Greek word 'hormē' most directly means:",
        options: [
          'A) Pleasure or enjoyment',
          'B) Impulse — a directed motivational movement toward something',
          'C) The rational evaluation of an impression',
          'D) The outcome of a successful action',
        ],
        correct: 'B',
      },
      {
        question: 'The opposite of hormē (approach-impulse) is:',
        options: [
          'A) Epochē — withholding of assent',
          'B) Aphormē — aversion or avoidance-impulse',
          'C) Phantasia — a passive impression',
          'D) Pathos — a misdirected emotion',
        ],
        correct: 'B',
      },
      {
        question: 'In the four-step Stoic causal chain, the correct order is:',
        options: [
          'A) Assent → Impression → Impulse → Action',
          'B) Impression → Impulse → Assent → Action',
          'C) Impression → Assent → Impulse → Action',
          'D) Impulse → Assent → Impression → Action',
        ],
        correct: 'C',
      },
      {
        question: 'What distinguishes rational impulse from the impulses of non-rational animals?',
        options: [
          'A) Rational impulse is stronger and more persistent',
          'B) Rational impulse arises from assent to a practical proposition, not direct response to impression',
          'C) Non-rational animals have no impulses at all',
          'D) Rational impulse always leads to correct action',
        ],
        correct: 'B',
      },
      {
        question: "Chrysippus claimed that assent and impulse are 'the same thing' in rational beings. This means:",
        options: [
          'A) There is no psychological difference between thinking and acting',
          'B) The endorsement of a practical proposition is simultaneously the motivational state to act on it',
          'C) Impulse precedes assent in the causal chain',
          'D) Rational beings never experience involuntary impulses',
        ],
        correct: 'B',
      },
      {
        question: "The concept of 'oikeiōsis' refers to:",
        options: [
          'A) The Stoic account of valid argument forms',
          'B) Natural affiliation — the original orientation of a creature toward its own constitution',
          'C) The process of acquiring virtue through practice',
          'D) The relationship between lekta and external objects',
        ],
        correct: 'B',
      },
      {
        question: 'According to the Stoic account of oikeiōsis, self-preservation is:',
        options: [
          'A) A calculated rational decision made in early childhood',
          'B) The original expression of natural affiliation, prior to rational deliberation',
          'C) Only relevant to non-rational animals',
          'D) A form of selfishness that the Sage must overcome',
        ],
        correct: 'B',
      },
      {
        question: "A Stoic 'passion' (pathos) is best described as:",
        options: [
          'A) Any strong feeling or emotion',
          'B) An impression that has not been evaluated',
          'C) An excessive or misdirected impulse arising from assent to a false practical proposition',
          'D) A physical sensation that bypasses the hēgemonikon',
        ],
        correct: 'C',
      },
      {
        question: 'The four Stoic passions are:',
        options: [
          'A) Anger, fear, grief, envy',
          'B) Fear, desire, pleasure (pathological), distress',
          'C) Pride, envy, lust, greed',
          'D) Anxiety, depression, rage, desire',
        ],
        correct: 'B',
      },
      {
        question: 'The Stoic cosmopolitan conclusion — that we are affiliated with all rational beings — follows from oikeiōsis because:',
        options: [
          'A) We are commanded to love others by the Logos',
          'B) The rational ground for self-affiliation (shared rational nature) applies equally to all rational beings',
          'C) Emotional warmth naturally extends from family to all humans',
          'D) The Sage has no self-affiliation and is affiliated with everyone equally',
        ],
        correct: 'B',
      },
    ],
  },

  // ── SESSION 8 ───────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Propositions: Axiōmata',
    block: 'Block C',
    primarySources: 'L&S 34A–E; DL VII.65–76; L&S 35A–C',
    keyConcepts: 'Simple vs. complex axiōmata; negation; conjunction; disjunction; the conditional (sunēmmenon)',
    preSeminarBriefing: {
      problem:
        'We have established that the axioma — the proposition — is the basic unit of Stoic logic. Now we need to know the full taxonomy: what kinds of propositions are there, and how do they combine? This session is the propositional logic session — the point where the Stoic system most clearly anticipates modern formal logic. Chrysippus built a complete propositional calculus 300 years before Frege, and what you learn in this session is that calculus.',
      whyItMatters:
        'The argument forms of Sessions 10–11 (the five indemonstrables) are built entirely from the proposition types introduced here. You cannot understand Stoic valid argument without understanding conjunctions, disjunctions, and conditionals. This session gives you the vocabulary.',
      whatToWatchFor:
        "The Stoic distinction between the conditional (sunēmmenon) and the conjunction (sumpeplegmenon) is precise and important. Also notice their account of the 'complete conditional' — a conditional whose connection holds by necessity, not just as a matter of fact. This distinction anticipates the modern debate between material and strict implication.",
      yourTask:
        'Come prepared to explain: what makes a conditional true for the Stoics? Is it enough that whenever the antecedent is true, the consequent happens to be true? Or does something stronger hold?',
    },
    parts: [
      {
        title: 'Part 1 — Simple Propositions',
        content: [
          "A simple proposition (haploun axioma) is one that is not formed by combining other propositions with logical connectives. 'Socrates walks' is simple. 'It is day' is simple. 'Virtue is the only good' is simple.",
          "Diogenes Laertius records several types of simple proposition. The definite proposition (katēgorikon) is one whose subject is indicated directly — 'this one walks' — where the subject is pointed out. The indefinite proposition (aoriston) has an unspecified subject — 'someone walks,' 'someone is just.' The middle proposition uses a common noun — 'a man walks' — neither fully specified nor fully unspecified.",
          "Simple propositions can also be classified by their quality: affirmative ('Cato is virtuous') or negative ('It is not the case that Cato is virtuous'). Recall from Session 3 that Stoic negation operates on the whole proposition, not just the predicate.",
        ],
      },
      {
        title: 'Key Concept — Negation Revisited',
        content: [
          "A negation is formed by prefixing the negation operator to a whole proposition: 'Not: Socrates walks' or 'It is not the case that Socrates walks.' This is propositional negation — it produces a new proposition that is true if and only if the original is false. Predicate negation ('Socrates does not walk') is different: it may carry existential presuppositions that propositional negation does not. The Stoics used propositional negation as the logical standard.",
        ],
      },
      {
        title: 'Part 2 — Complex Propositions',
        content: [
          'Complex propositions (ouch hapla) are formed by combining simple propositions with connectives. The Stoics identified several types. The three most important are the conjunction, the disjunction, and the conditional.',
          "The conjunction (sumpeplegmenon) is formed with 'and' (kai). 'It is day and it is light.' A conjunction is true if and only if both conjuncts are true. If either conjunct is false, the conjunction is false. This matches exactly the modern truth table for conjunction.",
          "The disjunction (diezeugmenon) is formed with 'either...or' (ētoi...ē). 'Either it is day or it is night.' The Stoics used exclusive disjunction: exactly one disjunct is true. If both are true, or neither is true, the disjunction is false. This is important: the Stoics chose the stronger form of 'or,' not the weaker inclusive 'or' of modern logic by default.",
          "The conditional (sunēmmenon) is formed with 'if...then' (ei...de). 'If it is day, it is light.' This is the most philosophically complex of the connectives, and the Stoics devoted significant attention to its proper analysis.",
        ],
      },
      {
        title: 'Key Concept — The Conditional',
        content: [
          "Sunēmmenon (conditional): a proposition of the form 'If P, then Q.' The Stoics debated vigorously what makes a conditional true. The dominant Stoic position (Chrysippus) was the 'conflict' criterion: a conditional is true if the negation of the consequent conflicts with (is incompatible with) the antecedent. That is, 'If P, then Q' is true if 'P and not-Q' is impossible — not merely if P happens to be followed by Q in fact. This is a strict, necessity-based conditional — closer to entailment than to the material conditional of modern logic.",
        ],
      },
      {
        title: 'Part 3 — Material vs. Strict Implication',
        content: [
          'The debate about the correct analysis of the conditional was one of the major controversies of Hellenistic logic. Several positions were held by different philosophers.',
          "Philo of Megara (a predecessor of the Stoics) held what we would now call the material conditional: 'If P, then Q' is false only if P is true and Q is false. On this account, 'If it is night, Dion is walking' is true whenever it is not night — regardless of whether there is any connection between night and Dion's walking. Philo's conditional is weak: it is satisfied merely by the absence of a true antecedent with a false consequent.",
          "Chrysippus and the mainstream Stoics rejected this. They required that the antecedent and consequent be genuinely connected — that the negation of Q be impossible given P. This is strict implication: 'If it is day, it is light' is a good conditional not merely because day and light happen to co-occur, but because light follows necessarily from day.",
          'The debate maps directly onto a live issue in modern logic. Bertrand Russell and Alfred North Whitehead adopted the material conditional in Principia Mathematica. C.I. Lewis, dissatisfied with the paradoxes of material implication, developed strict implication in the early twentieth century — essentially rediscovering the Chrysippan position. Chrysippus anticipated this debate by over two millennia.',
          "'A conditional holds when its consequent follows from its antecedent. It does not hold when the antecedent is true and the consequent false.' — Diogenes Laertius VII.73 (condensed)",
        ],
      },
    ],
    exercises: [
      {
        title: 'Exercise 8.1 — Reconstruction',
        body:
          "Classify each of the following as: simple definite, simple indefinite, conjunction, exclusive disjunction, or conditional. Then state the truth conditions — under what circumstances is it true?\na) 'If virtue is sufficient for happiness, the Sage is always happy.'\nb) 'It is day and Socrates is walking.'\nc) 'Either Cato is a Sage or Cato is a fool.' (Stoic context: there is no middle ground)\nd) 'Someone is making progress toward virtue.'\ne) 'Epictetus is enslaved.'",
        answer:
          "a) Conditional (sunēmmenon) — true if 'virtue sufficient for happiness and Sage not always happy' is impossible; i.e., true if virtue-happiness entails Sage-happiness. b) Conjunction — true if both 'it is day' AND 'Socrates is walking' are true. c) Exclusive disjunction — true if exactly one of the two disjuncts is true (and the Stoics would say this exclusive structure is correct: there is no intermediate state). d) Simple indefinite — true if at least one person is making progress. e) Simple definite — true if the historical fact holds.",
      },
      {
        title: 'Exercise 8.2 — Analysis',
        body:
          "Philo's conditional vs. Chrysippus's conditional. Consider the proposition: 'If this stone is in front of me, then it is night.'\na) Is this conditional true on Philo's (material) account, assuming it is currently day?\nb) Is it true on Chrysippus's (strict/conflict) account?\nc) Which account seems more intuitively correct? What does each account get right and wrong?",
        answer:
          "a) On Philo's material account: the conditional 'If P then Q' is false only when P is true and Q is false. If the stone IS in front of you and it IS day (so Q = 'it is night' is false), then the conditional is false. But if the stone is absent, or if it happens to be night, it counts as true. This produces counterintuitive results. b) On Chrysippus's account: the conditional requires that Q be entailed by P — that 'stone in front of me AND not-night' be impossible. This is clearly not the case. So on Chrysippus's account, the conditional is false regardless of current circumstances. c) Chrysippus's account better captures our intuition that conditionals express genuine connections, not mere coincidences. But it makes conditionals harder to evaluate and requires modal notions (necessity, possibility) that add complexity.",
      },
      {
        title: 'Exercise 8.3 — Socratic Proctor Warm-Up',
        body:
          "The Stoics used exclusive disjunction ('either P or Q, but not both'). Modern logic typically uses inclusive disjunction by default ('P or Q, or both'). Write 150–200 words arguing for the Stoic preference for exclusive disjunction. What does exclusive 'or' capture that inclusive 'or' misses? Are there contexts where inclusive 'or' is better?",
        answer:
          "[Open response. Strong answer for exclusive: exclusive 'or' captures genuine alternatives — situations where the two options genuinely exclude each other. 'Either you are a Sage or you are a fool' (Stoic doctrine: no intermediate) is a genuine exclusive disjunction. Exclusive 'or' is more informative: it tells you not just that at least one option holds but that exactly one does. For inclusive: 'Either it will rain or I will bring an umbrella' — you might do both, and that's fine. Legal and everyday language often uses inclusive 'or.' The Stoics may have preferred exclusive because their logical system emphasized strict, necessary connections rather than weak sufficient conditions.]",
      },
      {
        title: 'Exercise 8.4 — Formal Logic',
        body:
          "Determine whether each of the following conditionals satisfies Chrysippus's strict (conflict) criterion — i.e., whether the negation of the consequent is incompatible with the antecedent:\na) 'If it is day, the sun is above the horizon.'\nb) 'If Seneca is in Rome, it is winter.'\nc) 'If a figure has three sides, it has three angles.'\nd) 'If someone has knowledge (epistēmē), they cannot be mistaken about it.'\nThen restate each as a true or false conditional on Chrysippus's account, and explain.",
        answer:
          "a) True on Chrysippus's account: 'it is day AND the sun is not above the horizon' is at minimum highly problematic (by Stoic cosmology, day is defined by the sun's position). b) False: 'Seneca is in Rome AND it is not winter' is perfectly possible — Seneca could be in Rome in summer. The antecedent and consequent have no necessary connection. c) True: geometrically necessary — a three-sided figure cannot lack three angles. 'Three sides AND not three angles' is impossible. d) True on Stoic grounds: epistēmē for the Stoics is certain, infallible knowledge — by definition the person with knowledge cannot be mistaken. 'Has epistēmē AND is mistaken' is a contradiction in Stoic usage.",
      },
    ],
    quiz: [
      {
        question: "A 'simple proposition' (haploun axioma) in Stoic logic is:",
        options: [
          'A) A proposition with only one-syllable words',
          'B) A proposition not formed by combining others with logical connectives',
          'C) A proposition whose truth is immediately obvious',
          'D) A proposition about a single individual',
        ],
        correct: 'B',
      },
      {
        question: "The Stoic conjunction 'It is day and it is light' is true if and only if:",
        options: [
          "A) Either 'it is day' or 'it is light' is true",
          "B) 'It is day' is true regardless of 'it is light'",
          "C) Both 'it is day' and 'it is light' are true",
          'D) The conjunction has been assented to by a Sage',
        ],
        correct: 'C',
      },
      {
        question: 'The Stoic disjunction is:',
        options: [
          'A) Inclusive — true if at least one disjunct is true',
          'B) Exclusive — true if exactly one disjunct is true',
          'C) Modal — true if one disjunct is necessarily true',
          'D) Hypothetical — true only under specified conditions',
        ],
        correct: 'B',
      },
      {
        question: "The Stoic technical term for a conditional proposition ('if...then') is:",
        options: ['A) Sumpeplegmenon', 'B) Diezeugmenon', 'C) Sunēmmenon', 'D) Axiōma haploun'],
        correct: 'C',
      },
      {
        question: "Philo of Megara's account of the conditional holds that 'If P, then Q' is false only when:",
        options: [
          'A) P and Q are both true',
          'B) P is false',
          'C) P is true and Q is false',
          'D) P and Q have no causal connection',
        ],
        correct: 'C',
      },
      {
        question: "Chrysippus's 'conflict criterion' for the conditional requires that:",
        options: [
          'A) The antecedent and consequent both be true',
          'B) The negation of the consequent be incompatible with the antecedent — a necessary connection holds',
          'C) The conditional be assented to by a rational being',
          'D) The antecedent be a simple proposition',
        ],
        correct: 'B',
      },
      {
        question: 'The philosopher who rediscovered the Chrysippan strict conditional in the early twentieth century was:',
        options: ['A) Bertrand Russell', 'B) Gottlob Frege', 'C) C.I. Lewis', 'D) Ludwig Wittgenstein'],
        correct: 'C',
      },
      {
        question: "A 'definite proposition' in Stoic terminology is:",
        options: [
          'A) A proposition known to be true',
          'B) A proposition whose subject is directly indicated or pointed out',
          'C) A proposition with no modal qualifications',
          'D) A proposition assented to by a Sage',
        ],
        correct: 'B',
      },
      {
        question: "Which of the following is an 'indefinite proposition' in the Stoic classification?",
        options: ["A) 'Socrates walks'", "B) 'A man walks'", "C) 'Someone walks'", "D) 'Walking is good exercise'"],
        correct: 'C',
      },
      {
        question: 'The distinction between material implication and strict implication matters for Stoic logic because:',
        options: [
          'A) Material implication is always false; strict implication is always true',
          'B) The Stoics used material implication; Chrysippus used strict implication for the conditional',
          'C) The Stoic argument forms (the indemonstrables) require genuine necessary connections, not just factual co-occurrence',
          'D) Only strict implication can appear in a conjunction',
        ],
        correct: 'C',
      },
    ],
  },

  // ── SESSIONS 9–20 — stubs (no source documents) ─────────────────────────────
  stubSession(9, 'Block D'),
  stubSession(10, 'Block D', {
    title: 'Session 10 — Seminar (Content forthcoming)',
    isSeminar: true,
    seminarPrompts: [],
  }),
  stubSession(11, 'Block E'),
  stubSession(12, 'Block E'),
  stubSession(13, 'Block E'),
  stubSession(14, 'Block F'),
  stubSession(15, 'Block F', {
    title: 'Session 15 — Seminar (Content forthcoming)',
    isSeminar: true,
    seminarPrompts: [],
  }),
  stubSession(16, 'Block G'),
  stubSession(17, 'Block G'),
  stubSession(18, 'Block G'),
  stubSession(19, 'Block H', {
    title: 'Session 19 — Seminar (Content forthcoming)',
    isSeminar: true,
    seminarPrompts: [],
  }),
  stubSession(20, 'Block H', {
    title: 'Session 20 — Final Examination (Content forthcoming)',
    isFinalExam: true,
    examFormat: [],
  }),
];

export const PHIL_705_COURSE = {
  id: 'phil-705',
  title: 'Stoic Logic & Epistemology',
  code: 'PHIL 705',
  track: 'Logic',
  year: 2,
  description:
    'The propositional logic system Chrysippus built 300 years before Frege. Twenty sessions from the lekton through the five indemonstrables to the Liar Paradox — and back to the examined life.',
  sessions: PHIL_705_SESSIONS,
  agent: 'socratic-proctor',
  prerequisite: 'phil-701',
  totalSessions: 20,
};
