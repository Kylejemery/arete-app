// PHIL 701 — Foundations of Stoic Ethics
// Sessions 2–11, transcribed verbatim from PHIL_701_Sessions_2_11.docx.
// Session 1 is the landing-card content in page.tsx (COURSE_CONTENT['phil-701']).
//
// The session view reuses the language-course renderer (LanguageLessonContent);
// `phil701ToLesson` adapts a Phil701Session into the shape that renderer consumes.
// The 10-question short-answer quiz is rendered separately (Phil701SessionContent).

import type { LanguageSession } from '@/data/grek101';

export interface Phil701Session {
  id: number;                        // 2–11
  title: string;
  subtitle: string;
  isSeminar?: boolean;               // session 11
  preSeminarBriefing: {
    problem: string;
    whyItMatters: string;
    whatToWatchFor: string;
    yourTask: string;
    requiredReading?: Array<{ source: string; passage: string; note: string }>;
  };
  parts: Array<{
    title: string;
    content: string[];               // one paragraph per element
    tables?: string[][][];           // [table][row][cell] — first row = headers
  }>;
  exercises: Array<{
    title: string;
    body: string;                    // paragraphs joined by "\n"
    answer: string;                  // paragraphs joined by "\n"
  }>;
  quiz: Array<{
    question: string;
    answer: string;
  }>;
  practiceAssignment?: {
    coreIdea: string;
    assignment: string;
    duration: string;
    greekTerms?: string;
  };
}

export const PHIL_701_SESSIONS: Phil701Session[] = [
  {
    "id": 2,
    "title": "The Good, the Bad, and the Indifferent",
    "subtitle": "Stoic axiology — why only virtue is good, and what to do with everything else",
    "preSeminarBriefing": {
      "problem": "Session 1 ended with a question: if philosophy is a way of life, not just a set of beliefs, what makes a life go well? The Stoics gave a radical answer. Most things people pursue — wealth, health, reputation, pleasure — are not goods at all. Only one thing is good: virtue. This session examines why.",
      "whyItMatters": "The entire Stoic practical program follows from the theory of value. If only virtue is good, then illness is not a bad thing — it is indifferent. If indifferents are genuinely indifferent, then the Sage is happy in prison. These are not rhetorical provocations; they are conclusions that follow from a carefully worked-out axiology. You cannot understand Epictetus's instructions without understanding what he thinks good and bad are.",
      "whatToWatchFor": "The Stoics do not say that health, wealth, and pleasure are worthless. They call them preferred indifferents (proēgmena adiaphora) — things that have a kind of selective value but not genuine goodness. The distinction between value (axia) and goodness (agathon) is the hinge on which everything turns.",
      "yourTask": "Before the session, consider this challenge: if health is not genuinely good, why do doctors exist? Come prepared to either defend the Stoic position against this challenge or identify where you think it fails.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§1–2 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Diogenes Laertius",
          "passage": "Lives VII.101–104 (on goods and indifferents)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        },
        {
          "source": "Sellars, The Art of Living (2003)",
          "passage": "Ch. 2 — \"The Art of Living as Technē Tou Biou\"",
          "note": "Virtue as a craft — the technē model of Stoic ethics. PHIL 701 Session 2."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — The Stoic Theory of Value: Three Categories",
        "content": [
          "The Stoics divided everything in the world into three categories: goods (agatha), bads (kaka), and indifferents (adiaphora). This trichotomy is the foundation of their ethics and it is far more radical than it first appears.",
          "Goods are things whose possession makes you better off without qualification — in every circumstance, for every person, at every time. The Stoics argued that only the {{arete|virtues}} (wisdom, justice, courage, temperance) and virtuous actions satisfy this condition. Why? Because virtues are the only things whose possession cannot be misused. Wealth can be used well or badly; courage cannot be turned into an instrument of harm without ceasing to be courage.",
          "Bads are the corresponding vices: foolishness, injustice, cowardice, intemperance. Everything else — health, wealth, reputation, pleasure, poverty, illness, death — falls into the category of indifferents."
        ],
        "tables": [
          [
            [
              "Category",
              "Contents",
              "Stoic Term"
            ],
            [
              "Goods",
              "Virtues: wisdom, justice, courage, temperance; virtuous actions and the virtuous soul",
              "Agatha"
            ],
            [
              "Bads",
              "Vices: foolishness, injustice, cowardice, intemperance; vicious actions",
              "Kaka"
            ],
            [
              "Indifferents",
              "Everything else: health, wealth, reputation, pleasure, poverty, illness, death, beauty, strength",
              "Adiaphora"
            ]
          ]
        ]
      },
      {
        "title": "Part 2 — Preferred and Dispreferred Indifferents",
        "content": [
          "The Stoic position does not commit them to treating all indifferents as equivalent in practice. Within the category of indifferents, they distinguished preferred indifferents (proēgmena adiaphora) and dispreferred indifferents (apoproēgmena adiaphora).",
          "Preferred indifferents are things that have value (axia) — they are worth selecting when available. Health is preferable to illness. Wealth is preferable to poverty. Life is preferable to death. A Stoic will choose health over illness when the choice is available, and will take reasonable steps to maintain health. But she will not be distressed when illness comes, will not compromise her virtue to acquire wealth, and will not fear death.",
          "The critical distinction: indifferents have selective value but not moral worth. They are worth choosing but not worth sacrificing virtue for. As Epictetus puts it, the things 'up to us' — our judgments, impulses, desires, aversions — are the only genuine goods. Everything else is material for the exercise of virtue, not good in itself."
        ],
        "tables": [
          [
            [
              "Seneca: 'Omnia aliena sunt, virtus propria.' Everything else belongs to others; virtue is our own. (Epistulae 77.15)"
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — The Argument for Why Only Virtue is Good",
        "content": [
          "The Stoic argument for limiting the good to virtue has three stages, reconstructed from Cicero's De Finibus and Diogenes Laertius's report:",
          "Stage 1 — The Benefit Condition: A genuine good must benefit its possessor unconditionally — under all circumstances, not merely typically. Wealth benefits its possessor only when used well; a fool who gains wealth is not thereby better off (and may be worse off). Therefore wealth fails the benefit condition.",
          "Stage 2 — The Virtue Condition: Virtue, by contrast, benefits its possessor in every circumstance. The courageous person is better off than the coward in every situation that involves facing danger — including situations where courage leads to death. The courageous death is better than the cowardly survival. Therefore virtue satisfies the benefit condition.",
          "Stage 3 — The Completeness Claim: Virtue is sufficient for happiness ({{eudaimonia|eudaimonia}}). This is the most contested Stoic claim. The Sage who has virtue has everything needed for a complete and flourishing life, even in poverty, illness, or chains. Virtue is not merely necessary for happiness; it is sufficient."
        ],
        "tables": [
          [
            [
              "Common view",
              "Stoic view"
            ],
            [
              "Health, wealth, and reputation contribute to happiness",
              "Health, wealth, and reputation are preferred but contribute nothing to genuine happiness"
            ],
            [
              "A virtuous poor person is worse off than a virtuous rich person",
              "A virtuous poor person is equally happy as a virtuous rich person"
            ],
            [
              "Happiness admits of degrees depending on externals",
              "Happiness (eudaimonia) is all-or-nothing — you have it or you don't"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 2.1 — Categorize",
        "body": "Categorize each of the following as good, bad, or indifferent (with preferred/dispreferred where applicable): 1. wisdom  2. poverty  3. a courageous action  4. physical health  5. cowardice  6. death  7. reputation  8. justice",
        "answer": "1. Good (virtue)  2. Dispreferred indifferent  3. Good (virtuous action)  4. Preferred indifferent  5. Bad (vice)  6. Indifferent (neither preferred nor dispreferred by default — context matters)  7. Dispreferred when lost, but indifferent in itself  8. Good (virtue)"
      },
      {
        "title": "Exercise 2.2 — The Benefit Condition",
        "body": "Explain why wealth fails the Stoic 'benefit condition' using a concrete example.",
        "answer": "Wealth fails the benefit condition because it benefits its possessor only when used wisely. Consider a person of poor judgment who inherits a fortune — they may use it to fund bad habits, buy social status that feeds their vanity, or simply waste it on things that damage their character. The wealth did not benefit them; it harmed them. Since a genuine good must benefit unconditionally, and wealth's benefit depends on the character of its possessor, wealth is not a genuine good. It is a preferred indifferent — worth having when you have the wisdom to use it well, but carrying no guarantee of benefit."
      },
      {
        "title": "Exercise 2.3 — Preferred Indifferents in Practice",
        "body": "A Stoic philosopher is offered a choice between two jobs: one that pays well but involves minor ethical compromises, and one that pays poorly but involves no compromises. How does the theory of preferred indifferents guide the decision?",
        "answer": "The theory provides a clear answer. Wealth is a preferred indifferent — worth selecting when available at no cost to virtue. But virtue is the only genuine good. When the acquisition of a preferred indifferent (higher pay) requires a compromise of virtue (minor ethical compromises), the Stoic must choose virtue. The preferred indifferents are worth selecting when the selection is consistent with virtue; they lose their selective value when acquiring them requires vice. The Stoic takes the lower-paying job without distress, because the higher pay was never a genuine good to begin with — it was material for the exercise of virtue, and no virtuous exercise is available through ethical compromise."
      },
      {
        "title": "Exercise 2.4 — Written Argument",
        "body": "Defend or attack the following claim in 150–200 words: 'The Stoic who says health is indifferent is engaged in self-deception — everyone, including the Stoic Sage, would rather be healthy than ill.'",
        "answer": "Strong defense: The Stoic does not deny that health is preferable to illness — that is precisely what 'preferred indifferent' means. The Stoic would rather be healthy. The claim is that this preference does not constitute a judgment that health is good in the moral sense, or that illness constitutes a genuine harm to one's flourishing as a rational agent. The Sage prefers health the way she prefers the right tool for a job — it makes the work easier, but the work's quality depends on the craftsperson's skill, not the tool's quality. Strong attack: The preference for health is so deep and universal that calling it 'indifferent' seems to evacuate the word of meaning. If the Sage prefers health, seeks health, mourns the loss of health — in what meaningful sense is it indifferent? The Stoic may be drawing a distinction (between genuine goodness and mere preferability) that does real philosophical work, but ordinary language resists it strongly."
      }
    ],
    "quiz": [
      {
        "question": "1. What are the three Stoic categories of value?",
        "answer": "Goods (agatha), bads (kaka), and indifferents (adiaphora)"
      },
      {
        "question": "2. What are the four Stoic virtues?",
        "answer": "Wisdom, justice, courage, temperance"
      },
      {
        "question": "3. What is a preferred indifferent? Give an example.",
        "answer": "An indifferent that has selective value — worth choosing when available. Examples: health, wealth, life, reputation."
      },
      {
        "question": "4. What is the Stoic 'benefit condition'?",
        "answer": "A genuine good must benefit its possessor unconditionally — in every circumstance, not merely typically."
      },
      {
        "question": "5. Why does wealth fail the benefit condition?",
        "answer": "Wealth benefits its possessor only when used wisely — a foolish person who gains wealth may be harmed by it. Since it doesn't benefit unconditionally, it is not a genuine good."
      },
      {
        "question": "6. What is the Stoic completeness claim?",
        "answer": "Virtue is sufficient for happiness (eudaimonia) — the Sage needs nothing beyond virtue to live a complete and flourishing life."
      },
      {
        "question": "7. Translate: 'Omnia aliena sunt, virtus propria.'",
        "answer": "'Everything else belongs to others; virtue is our own.' (Seneca, Ep. 77.15)"
      },
      {
        "question": "8. What is the Greek term for 'preferred indifferents'?",
        "answer": "Proēgmena adiaphora"
      },
      {
        "question": "9. How does a Stoic decide between two preferred indifferents in conflict?",
        "answer": "The one consistent with virtue is always chosen. Preferred indifferents lose their selective value when acquiring them requires moral compromise."
      },
      {
        "question": "10. Is happiness all-or-nothing for the Stoics, or does it admit of degrees?",
        "answer": "All-or-nothing. You have eudaimonia (virtue sufficient) or you do not. External conditions do not add to or subtract from the happiness of the virtuous person."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Only virtue is genuinely good. Everything else — health, money, reputation — is a preferred indifferent: worth pursuing, but not worth your peace.",
      "assignment": "Pick one thing you are currently anxious about losing or failing to get. Write it down. Then answer honestly: if you lost it entirely, would you be a worse person — or just a less comfortable one? Hold that distinction for one full day and notice what it does to the anxiety.",
      "duration": "10 min writing, 1 day noticing",
      "greekTerms": "adiaphora — indifferents"
    }
  },
  {
    "id": 3,
    "title": "Impressions, Assent, and the Ruling Faculty",
    "subtitle": "How the Stoic mind works — and why it matters for how you live",
    "preSeminarBriefing": {
      "problem": "Session 2 established what the good is. This session asks: how does the mind relate to the world? Before we can understand why the Stoics think we are responsible for our emotions and character, we need to understand their account of how impressions arise, how we respond to them, and where the power of choice sits.",
      "whyItMatters": "The dichotomy of control — the opening move of the Encheiridion — is not a self-help slogan. It is a claim about the structure of the human mind. The 'things up to us' are precisely the operations of the ruling faculty (hēgemonikon): impression, assent, impulse. Everything else is 'not up to us' because it bypasses the ruling faculty. Understanding this architecture is the precondition for understanding every practical Stoic instruction.",
      "whatToWatchFor": "Impressions (phantasiai) come from the world and are not themselves up to us — the impression that someone has insulted you arises automatically. Assent (synkatathesis) is up to us — giving or withholding your judgment that the impression is accurate is a voluntary act of the ruling faculty. The moment where philosophy happens is always the gap between impression and assent.",
      "yourTask": "Think of a recent situation where you reacted strongly — anger, anxiety, or longing. Identify the impression that preceded the reaction. Was there a moment of assent? Come prepared to describe it.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§1, 5, 16, 20",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Discourses I.1 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — The Hēgemonikon: The Ruling Faculty",
        "content": [
          "The Stoics held that the soul has a ruling part — the {{hegemonikon|hēgemonikon}} — which is the seat of rational activity, located (they believed) in the heart. All the distinctively human operations of mind — perception, thought, impulse, judgment — are functions of the hēgemonikon. It is not a metaphor; for the Stoics it is a specific physical locus of pneumatic activity in the chest.",
          "The hēgemonikon performs seven functions, of which the most philosophically important are: receiving impressions ({{phantasia|phantasiai}}), giving or withholding assent ({{synkatathesis|synkatathesis}}), generating impulse toward or away from action (hormē and ekklinsis), and exercising reason (logos). These functions are not separable faculties — they are aspects of a single unified activity.",
          "Why does this matter ethically? Because if the hēgemonikon is the seat of assent, and assent is voluntary, then every judgment you form is up to you. You cannot be forced to believe something. You cannot be compelled to desire something. This is the philosophical basis for Stoic freedom."
        ]
      },
      {
        "title": "Part 2 — Impressions (Phantasiai)",
        "content": [
          "An impression (phantasia) is an alteration of the hēgemonikon caused by contact with an object in the world, or arising from memory or imagination. The impression presents the world as being a certain way: 'That person is threatening,' 'This food smells good,' 'I have been wronged.'",
          "The crucial Stoic point: impressions arise in us without our choosing. The sight of a frightening object produces an impression of danger before we deliberate. The memory of an insult produces an impression of injury. We cannot prevent impressions from arising — they come from the world and from our history. This is why impressions are not 'up to us' in the relevant sense.",
          "But impressions carry a propositional content — they present the world as being some way. And it is possible to reflect on that content, evaluate it, and decide whether it is accurate. That evaluation — giving or withholding assent — is where freedom lives."
        ],
        "tables": [
          [
            [
              "Epictetus: 'Men are disturbed not by the things which happen, but by the opinions about the things.' (Enchiridion 5) The opinion is the assent, not the impression."
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — Assent, Impulse, and the Chain of Action",
        "content": [
          "Assent (synkatathesis) is the voluntary act of affirming that an impression is accurate. When you see something and form the judgment 'that is dangerous,' you have given assent to the impression 'that is dangerous.' When you withhold assent — pause, examine the impression, and decline to affirm it — you have interrupted the automatic chain.",
          "Assent, once given, generates impulse (hormē). Impulse is the soul's movement toward or away from something — it is what we would call motivation or desire. If you assent to 'that food is delicious and I should eat it,' impulse toward the food follows. If you assent to 'that person has wronged me,' impulse toward anger or revenge follows.",
          "The chain: impression → assent → impulse → action. The Stoics locate the site of ethical responsibility at assent. We cannot control impressions (the world sends them). We cannot directly control actions once impulse has formed (it has momentum). But we can govern assent — and governing assent is the whole practical program."
        ],
        "tables": [
          [
            [
              "Stage",
              "Description",
              "Up to us?"
            ],
            [
              "Impression (phantasia)",
              "The world presents itself as being some way",
              "No — arises automatically"
            ],
            [
              "Assent (synkatathesis)",
              "Voluntary affirmation or denial of the impression's content",
              "Yes — the core of prohairesis"
            ],
            [
              "Impulse (hormē)",
              "The soul's movement toward or away from action, following assent",
              "Partly — governed by prior assent"
            ],
            [
              "Action (praxis)",
              "The bodily act that impulse produces",
              "Partly — depends on circumstances"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 3.1 — Identify the Stage",
        "body": "For each of the following, identify whether it is an impression, an act of assent, an impulse, or an action:\n1. Seeing a spider and feeling a jolt of alarm before thinking anything.\n2. Deciding that the spider is dangerous.\n3. The urge to move away from the spider.\n4. Standing up and walking to the other side of the room.",
        "answer": "1. Impression — arises automatically before deliberation.\n2. Assent — voluntary judgment affirming the impression's content ('this is dangerous').\n3. Impulse — the soul's movement generated by the assent.\n4. Action — the bodily result of the impulse."
      },
      {
        "title": "Exercise 3.2 — The Gap",
        "body": "Epictetus says we should 'pause' between impression and assent. Describe in your own words what this pause involves and why it is philosophically significant.",
        "answer": "The pause involves a momentary suspension of automatic response — a refusal to let the impression immediately generate assent. In that gap, the rational faculty can examine the impression's content: Is it accurate? Is the thing it presents genuinely threatening, genuinely good, genuinely worthy of desire or aversion? The pause is philosophically significant because it is the moment where freedom is exercised. Without it, we are determined by our impressions — the world pushes us around through the mechanism of impression → assent → impulse. With it, we become self-governing: impressions arrive, but we decide which ones to affirm. This is the practical entry point for all Stoic spiritual exercises."
      },
      {
        "title": "Exercise 3.3 — Analyzing an Emotion",
        "body": "Using the impression-assent-impulse chain, analyze the emotion of anger. What impression typically precedes it? What assent generates it? What impulse follows?",
        "answer": "Impression: typically an impression of injustice or disrespect — 'that person wronged me,' 'I have been treated unfairly,' 'my honor has been attacked.' Assent: affirmation that the impression is accurate and that the injury constitutes a genuine harm — 'yes, I have been wronged, and this is a bad thing.' Impulse: the movement toward aggressive action, retaliation, or defense — the motivation to strike back, to punish, to restore injured honor. The Stoic analysis reveals that anger is not a direct reaction to the world but to a judgment about the world. The person who withholds assent to 'I have been genuinely harmed' — perhaps substituting 'that person acted from ignorance' — does not experience the impulse toward anger. The practical implication: you cannot prevent the impression of injury, but you can examine whether it deserves assent."
      },
      {
        "title": "Exercise 3.4 — A Hard Case",
        "body": "Consider physical pain — the impression that accompanies injury or illness. Can the Stoic account of assent extend to physical pain? Can you 'withhold assent' from pain?",
        "answer": "This is a genuine hard case the Stoics acknowledged. Physical pain involves an impression — the hēgemonikon registers a bodily disturbance as painful. The Stoic does not claim you can suppress the impression of pain or make it not arise. What you can govern is the second-order judgment: 'this is an evil' or 'this is intolerable' or 'this will destroy my happiness.' The Stoics distinguish between the pre-passion (propatheia) — the involuntary initial impression of pain — and the full passion (pathos) — the assent that it is genuinely bad and the resulting distress. You cannot prevent the first; you can govern the second. Epictetus: 'I see the cup — even I see it; but I am not compelled to believe that it is not good to be broken.' Pain is a pre-passion; suffering is an assented-to judgment that the pain constitutes a harm to your good. Whether this is psychologically achievable is a different question from whether it is philosophically correct."
      }
    ],
    "quiz": [
      {
        "question": "1. What is the hēgemonikon?",
        "answer": "The ruling faculty — the seat of rational activity, perception, judgment, and impulse in Stoic psychology"
      },
      {
        "question": "2. What is a phantasia (impression)?",
        "answer": "An alteration of the hēgemonikon presenting the world as being a certain way — arising from perception, memory, or imagination"
      },
      {
        "question": "3. Is having an impression up to us?",
        "answer": "No — impressions arise automatically from the world. Only assent is up to us."
      },
      {
        "question": "4. What is synkatathesis?",
        "answer": "Assent — the voluntary act of affirming that an impression's content is accurate"
      },
      {
        "question": "5. What is hormē?",
        "answer": "Impulse — the soul's movement toward or away from action, generated by assent"
      },
      {
        "question": "6. What is the Stoic chain from world to action?",
        "answer": "Impression → assent → impulse → action"
      },
      {
        "question": "7. Where in the chain is the site of ethical responsibility?",
        "answer": "At assent — the only fully voluntary stage in the chain"
      },
      {
        "question": "8. What does Epictetus mean: 'Men are disturbed not by things but by opinions about things'?",
        "answer": "The 'opinion' is the assent — the judgment affirming an impression. The disturbance comes from the assent, not the impression itself, so it is within our control."
      },
      {
        "question": "9. What is a propatheia?",
        "answer": "A pre-passion — the involuntary initial impression that precedes a full emotional response. Not itself a passion; the passion arises only with assent."
      },
      {
        "question": "10. Why is the 'pause' between impression and assent philosophically important?",
        "answer": "It is the moment where freedom is exercised. The pause allows the rational faculty to examine an impression before affirming it, interrupting the automatic chain and making self-governance possible."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Between stimulus and response there is a space. That space is the practice. You do not have to assent to the first impression that arrives.",
      "assignment": "For one day, practice the pause. Every time something irritates, worries, or delights you — stop for three seconds before responding. You are not suppressing the impression. You are examining it. At the end of the day, record one moment where the pause changed what you did.",
      "duration": "All day, then 5 min reflection",
      "greekTerms": "phantasia — impression / synkatathesis — assent"
    }
  },
  {
    "id": 4,
    "title": "The Discipline of Desire",
    "subtitle": "Wanting the right things — Epictetus's first discipline and how to practice it",
    "preSeminarBriefing": {
      "problem": "We now have the architecture — impressions, assent, impulse, the ruling faculty. Session 4 asks the practical question: what do we do with it? Epictetus organized Stoic practice into three disciplines. The first — and the one he considered most urgent — is the discipline of desire and aversion (orexis and ekklisis). This session unpacks it.",
      "whyItMatters": "Most human misery, on the Stoic account, comes from desiring things we cannot guarantee and fearing things we cannot prevent. You want your reputation to be good — you cannot guarantee it. You fear illness — you cannot prevent it. As long as desire reaches toward what is not up to us, and aversion is directed at what is not up to us, you will be perpetually disappointed and perpetually anxious. The discipline of desire is the cure.",
      "whatToWatchFor": "Epictetus does not say: stop wanting things. He says: redirect desire toward what is genuinely up to you (virtue, your own judgments and choices) and redirect aversion away from externals toward vice alone. This is not passive resignation — it is a radical reorientation of what you care about.",
      "yourTask": "List three things you currently want. For each, determine whether it is eph' hēmin (up to you) or not. Come prepared to discuss what the Stoic instruction for each desire would be.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§2, 4, 8, 14",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Discourses III.2.1–5",
          "note": "Primary text — required reading."
        },
        {
          "source": "Hadot, PhWoL Ch. 10",
          "passage": "as assigned",
          "note": "Present-moment focus as practice. Best with discipline of desire."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — The Three Disciplines",
        "content": [
          "Epictetus, as reconstructed by scholars including A.A. Long and Pierre Hadot, organized Stoic ethical practice into three disciplines that correspond to the three operations of the ruling faculty. These disciplines are not independent practices — they are the same capacity exercised in different domains.",
          "The discipline of desire is first not because it is most important philosophically (assent is the most fundamental), but because it is the most urgent practically. Most people suffer most visibly from disordered desire — wanting the wrong things, fearing the wrong things — and the discipline of desire is the most direct remedy."
        ],
        "tables": [
          [
            [
              "Discipline",
              "Faculty",
              "Domain"
            ],
            [
              "Desire & Aversion (orexis/ekklisis)",
              "Desire",
              "What we want and avoid — the objects of our longing and fear"
            ],
            [
              "Impulse & Action (hormē/aphormē)",
              "Impulse",
              "How we act in the world — our engagement with others and circumstances"
            ],
            [
              "Assent & Judgment (synkatathesis)",
              "Reason",
              "How we evaluate impressions — what we take to be true"
            ]
          ]
        ]
      },
      {
        "title": "Part 2 — Epictetus's Instruction: Redirect, Don't Suppress",
        "content": [
          "The core instruction is in Encheiridion 2: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.' This is often misread as passive resignation. It is not.",
          "Epictetus distinguishes three moves: (1) Suspend desire for externals temporarily — at the start of practice, it is safer to desire nothing external than to form desires that cannot be satisfied. (2) Redirect desire toward what is genuinely eph' hēmin: your own virtue, judgments, and choices. (3) Redirect {{ekklisis|aversion}} away from externals (illness, poverty, death) toward what is genuinely bad: vice, your own failures of character.",
          "The point of the redirection: if your desire is directed entirely at what is up to you, it can always be satisfied. If your aversion is directed entirely at what is up to you (your own vices), you can always avoid what you avoid. The Stoic is not someone without desire — she is someone whose desires track the one domain where desire can always be fulfilled."
        ],
        "tables": [
          [
            [
              "Epictetus Encheiridion §2: 'Remember that desire (orexis) promises the attainment of that at which you aim, and aversion (ekklisis) promises the avoiding of that to which you are averse; and he who fails to obtain the object of his desire is disappointed, and he who incurs the object of his aversion is wretched.'"
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — Reserve Clauses and Preferred Indifferents",
        "content": [
          "A natural objection: is the Stoic really supposed to be indifferent to whether her project succeeds? If I want to help my friend recover from illness, am I supposed to not care whether she gets better?",
          "The Stoics' answer involves the reserve clause (hupexhairesis), reported by Marcus Aurelius and discussed by Seneca. When pursuing any external goal, the Stoic adds a mental reservation: 'I will do this — fate permitting' or 'I aim for this outcome — unless something prevents it.' The goal is pursued wholeheartedly; the attachment to the outcome is held lightly.",
          "This is the practical expression of preferred indifferents. You prefer your friend's health — you pursue it vigorously. But you hold the outcome with a reserve clause: if despite your best efforts she does not recover, your happiness does not depend on her recovery, because your happiness depends on your virtue, not on outcomes. You did what virtue required; the rest was not up to you."
        ],
        "tables": [
          [
            [
              "Disordered desire",
              "Disciplined desire with reserve clause"
            ],
            [
              "'I must have my friend recover or I will be devastated.'",
              "'I will do everything in my power to help her — fate permitting.'"
            ],
            [
              "'I need this project to succeed.'",
              "'I will pursue this project with full commitment — unless something prevents it.'"
            ],
            [
              "'I cannot bear to lose my reputation.'",
              "'I will act with integrity and accept whatever reputation results.'"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 4.1 — Apply the Discipline",
        "body": "Apply the discipline of desire to the following situations. In each case, identify the disordered desire/aversion and formulate a Stoic alternative using the reserve clause:\n1. A student anxious about a job interview.\n2. A person grieving the end of a relationship.\n3. Someone afraid of being diagnosed with a serious illness.",
        "answer": "1. Disordered: 'I must get this job or I will be a failure.' Stoic: 'I will prepare thoroughly and present myself as well as I can — fate permitting. The job itself is a preferred indifferent; my integrity in the interview is eph' hēmin.'\n2. Disordered: 'I cannot be happy without this person; their leaving has destroyed my life.' Stoic: 'I valued this relationship and grieve its ending — that is natural. But my capacity for happiness depends on my character, not on any external relationship. I will redirect desire toward what I can actually build within myself.'\n3. Disordered: 'I am terrified of illness; if I am sick, my life is ruined.' Stoic: 'I will care for my health prudently — that is a preferred indifferent worth pursuing. But illness, if it comes, is a dispreferred indifferent — it is not a genuine evil, and it does not touch my virtue or my rational faculty.'"
      },
      {
        "title": "Exercise 4.2 — The Reserve Clause",
        "body": "Marcus Aurelius writes: 'Confine yourself to the present.' (Med. 8.7) How does the reserve clause make this possible? What is the connection between the reserve clause and present-moment focus?",
        "answer": "The reserve clause separates commitment to action (present) from attachment to outcome (future). Without it, present action is infected with anxiety about future results — 'am I doing enough? will it work? what if it fails?' This anxiety is a form of desire reaching into the future toward outcomes not yet determined. With the reserve clause, present action is fully present: I am doing what virtue requires now, and the outcome belongs to fate. The connection to present focus is direct: the reserve clause cuts off the future-oriented desire that pulls attention away from the present act. You can be fully here, fully committed, precisely because you are not grasping at the future outcome."
      },
      {
        "title": "Exercise 4.3 — Objection: Is This Resignation?",
        "body": "A critic says: 'The Stoic discipline of desire is just resignation dressed up as philosophy. If you stop wanting outcomes, you stop trying.' Respond in 150 words.",
        "answer": "The objection conflates desire for outcomes with commitment to action. The Stoic discipline does not say: stop acting or stop caring about what you do. It says: redirect attachment from outcomes (not up to you) to the quality of your action (up to you). A surgeon who practices Stoic desire discipline operates with the same skill and attention as any other surgeon — more, perhaps, because she is not distracted by anxiety about outcomes. She cares deeply about how she operates; she holds the patient's survival with a reserve clause. Resignation is passivity — abandoning effort because the outcome is uncertain. The Stoic discipline is the opposite: full effort, clear judgment, because the effort is what is genuinely yours. The critic confuses detachment from outcome with indifference to virtue."
      },
      {
        "title": "Exercise 4.4 — Personal Inventory",
        "body": "Revisit the three desires you listed before the session. For each: (a) Is it directed at something eph' hēmin or not? (b) What would a Stoic reformulation of this desire look like? (c) Does the reserve clause feel adequate, or does it feel like a loss?",
        "answer": "Personal response — no single answer. The exercise is the point. Key markers of a strong response: (a) accurate identification of eph' hēmin vs. not (external outcomes generally are not; internal commitments generally are); (b) the Stoic reformulation redirects desire toward the quality of engagement rather than the outcome; (c) honest engagement with whether the reserve clause feels like liberation or loss — most students will feel both, and that tension is philosophically productive."
      }
    ],
    "quiz": [
      {
        "question": "1. What are Epictetus's three disciplines?",
        "answer": "Desire & aversion; impulse & action; assent & judgment"
      },
      {
        "question": "2. Why is the discipline of desire considered the most urgent?",
        "answer": "Because most visible human suffering comes from disordered desire — wanting the wrong things, fearing the wrong things — and it is the most direct practical remedy."
      },
      {
        "question": "3. What is the Stoic instruction for desire in the discipline?",
        "answer": "Redirect desire toward what is eph' hēmin (virtue, your own judgments) and away from externals. Redirect aversion from externals toward vice alone."
      },
      {
        "question": "4. What is the reserve clause (hupexhairesis)?",
        "answer": "A mental reservation added to any pursuit of external goals: 'I will do this — fate permitting.' It separates commitment to action from attachment to outcome."
      },
      {
        "question": "5. Translate Encheiridion §2's core instruction.",
        "answer": "'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are.'"
      },
      {
        "question": "6. Is the Stoic supposed to stop pursuing goals?",
        "answer": "No — the discipline of desire involves full commitment to action with a reserve clause, not passive resignation."
      },
      {
        "question": "7. How does the reserve clause relate to preferred indifferents?",
        "answer": "Preferred indifferents are worth pursuing; the reserve clause ensures that pursuit doesn't become disordered attachment. You pursue health vigorously — fate permitting."
      },
      {
        "question": "8. What is the practical promise of the discipline of desire?",
        "answer": "If desire is directed entirely at what is eph' hēmin, it can always be satisfied. The domain of virtue is the one domain where desire can never be frustrated."
      },
      {
        "question": "9. What does Epictetus say happens to someone whose desire fails?",
        "answer": "'He who fails to obtain the object of his desire is disappointed' (Ench. 2). The solution is not better luck but better directed desire."
      },
      {
        "question": "10. What is the connection between the discipline of desire and present-moment focus?",
        "answer": "The reserve clause cuts off future-oriented anxiety about outcomes, allowing full presence in current action — the only thing genuinely up to us."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Desire for externals produces frustrated longing. Aversion to externals produces fear. Both are errors of assent. The discipline is to redirect desire toward what is genuinely up to you.",
      "assignment": "Write down your top three current desires — things you want that you do not have. For each one, ask: is this up to me entirely, partially, or not at all? For the ones that are partially or not at all up to you, rewrite the desire so it targets only the part that is up to you. 'I want to get promoted' becomes 'I want to do excellent work today.'",
      "duration": "15 min",
      "greekTerms": "hormē — impulse toward / ekklisis — aversion"
    }
  },
  {
    "id": 5,
    "title": "The Discipline of Action — Living Among Others",
    "subtitle": "How to act in the world: roles, relationships, and the exercise of virtue in circumstances you did not choose",
    "preSeminarBriefing": {
      "problem": "Sessions 3 and 4 addressed the interior life — impressions, assent, desire. But we live among other people, in institutions, with obligations we did not choose. The second Stoic discipline — the discipline of impulse and action — governs how we engage with the world. It is the ethics of the middle ground: neither the hermit's withdrawal nor the slave's passive compliance, but the philosopher's engaged action.",
      "whyItMatters": "The Stoics were not quietists. Marcus Aurelius was an emperor. Seneca was a statesman. Epictetus ran a school. They acted in the world, took on responsibilities, served communities. The discipline of action explains how to do this without losing your integrity — how to pursue preferred indifferents vigorously, meet your obligations to others, and remain a rational, social animal while holding all external outcomes lightly.",
      "whatToWatchFor": "The concept of kathēkon — appropriate action, or role — is central here. The Stoics believed every person has multiple roles: human being, citizen, family member, professional. Each role generates appropriate actions. The discipline of action is the practice of identifying and fulfilling those actions, while holding outcomes with the reserve clause.",
      "yourTask": "Identify two roles you currently occupy (parent, friend, professional, citizen, etc.). For each role, identify one action that is clearly kathēkon — appropriate given that role. Come prepared to defend why those actions are appropriate.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Discourses II.10 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§17, 24, 30",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — Kathēkon: Appropriate Action",
        "content": [
          "The concept of {{kathêkon|kathēkon}} (often translated 'appropriate action' or 'duty') was introduced by Zeno and developed by Chrysippus and later Cicero (who rendered it officium in Latin). A kathēkon is any action that, when performed, has a reasonable justification — an action fitting to the agent's nature and circumstances.",
          "The Stoics distinguished two levels. Katorthōma is the perfect action — an action performed with full virtue, from the right disposition, for the right reason. Only the Sage performs katorthōmata. Kathēkon is the imperfect but appropriate action available to those in progress (prokoptontes). The prokopton performs kathēkonta — actions appropriate to her roles and circumstances — without the perfection of the Sage but without wrongdoing.",
          "Most of Stoic practical ethics concerns kathēkonta, not katorthōmata. The question is not 'what would the perfect Sage do?' but 'what is appropriate given who I am, what roles I occupy, and what circumstances I face?'"
        ]
      },
      {
        "title": "Part 2 — Roles and Obligations",
        "content": [
          "Epictetus presents the role framework in Discourses 2.10: 'Remember that you are an actor in a play, the character of which is determined by the author.' Each person plays multiple roles simultaneously — human being, citizen of a specific city, member of a family, practitioner of a profession. Each role generates a set of appropriate actions.",
          "The human role is most fundamental: as rational, social animals, we are obligated to act for the common good, to reason well, to live in accordance with nature. The other roles particularize this general obligation. As a parent, you have obligations of care and formation toward your children. As a citizen, obligations of civic participation and respect for law. As a friend, obligations of honesty and support.",
          "The discipline of action involves correctly identifying the kathēkon in each situation and fulfilling it — not as an external imposition but as the expression of who you are. Epictetus: 'Your role determines the action. But you yourself determine what role you play.'"
        ],
        "tables": [
          [
            [
              "Role",
              "Kathēkon examples",
              "What can go wrong"
            ],
            [
              "Parent",
              "Provide for children's needs; educate character; be present",
              "Overprotection (trying to guarantee outcomes not eph' hēmin); neglect"
            ],
            [
              "Friend",
              "Honesty, support, presence in difficulty",
              "False reassurance (telling people what they want to hear); neglect of other roles for one friendship"
            ],
            [
              "Citizen",
              "Civic participation, respect for law, contribution to common good",
              "Corruption, injustice, or passive withdrawal from civic life"
            ],
            [
              "Professional",
              "Excellence in craft, honest dealing, service to those served",
              "Using professional skill in the service of vice; competence without integrity"
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — Social Ethics and Oikeiōsis",
        "content": [
          "The Stoics grounded their social ethics in the concept of {{oikeiosis|oikeiōsis}} — often translated 'appropriation' or 'affiliation.' All animals have a natural affiliation with themselves — they care for their own continued existence and functioning. In rational animals, this self-affiliation extends outward through reason to encompass all rational beings.",
          "The argument: as a rational animal, you recognize rationality in others. Recognizing it, you recognize a kinship. Recognizing kinship, you are drawn toward their wellbeing. The Stoic who fully understands her own nature understands herself as a citizen of the world (kosmopolitēs), with obligations extending in principle to all rational beings.",
          "This does not mean equal treatment of all people — the roles create priority structures. You have stronger obligations to family than to strangers, to citizens than to foreigners. But the outer circle of obligation is not empty. Stoic cosmopolitanism is not the erasure of particular relationships but the recognition that particular relationships are nested within a universal community of rational beings."
        ],
        "tables": [
          [
            [
              "Marcus Aurelius: 'It is natural that I should do good to men, even as the sun gives light, or the fire warmth.' (Med. 3.7) — Benefit to others flows from one's nature, not from calculation."
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 5.1 — Identifying Kathēkonta",
        "body": "For each scenario, identify the kathēkon — the appropriate Stoic action — and explain the role from which it follows:\n1. A close friend asks you to lie to cover a mistake that will harm no one.\n2. Your employer asks you to do something legal but that you consider dishonest.\n3. A stranger is injured in front of you and needs help.",
        "answer": "1. The kathēkon of the friend role requires honesty — genuine friendship demands truth-telling, not comfortable lies. The Stoic refuses the lie, but with care for the friendship: the appropriate action is to tell the truth and to help the friend face the situation. Lying would fail both the friend (by depriving them of honest counsel) and yourself (by compromising integrity).\n2. The kathēkon of the professional role includes excellence and integrity, not merely compliance with instructions. The Stoic must weigh the obligation to the employer (who has legitimate authority) against the obligation to integrity (which is never negotiable). Stoic action: raise the concern directly, refuse to perform the dishonest action, accept the consequences. The role of rational human being supersedes the role of employee when they conflict.\n3. The kathēkon of the human role — and of any person in proximity to someone in need — is to help. The Stoic does not need to calculate benefit or balance obligations. The appropriate action is immediate assistance. Oikeiōsis extends to all rational beings in need."
      },
      {
        "title": "Exercise 5.2 — Role Conflict",
        "body": "You are a doctor. Your patient asks you to tell him he is not seriously ill, because he cannot bear bad news. Your honest assessment is that he is seriously ill. How do you navigate the conflict between the role obligations of doctor, friend (if you have that relationship), and honest rational agent?",
        "answer": "The role of doctor requires truth-telling — diagnosis and treatment are impossible without honest communication of the medical facts. The role of friend (if applicable) requires honesty, not comfortable falsehood. The role of rational human being requires that you treat the patient as a rational agent capable of bearing truth and making decisions about his own life. All three roles converge on the same action: tell the truth, with appropriate care and compassion in how it is delivered. There is no genuine conflict here, though it feels like one. The feeling of conflict arises because we confuse 'kindness' with 'telling people what they want to hear.' Genuine kindness is what the patient needs for his own rational self-governance — which is the honest diagnosis."
      },
      {
        "title": "Exercise 5.3 — Oikeiōsis",
        "body": "The Stoic doctrine of oikeiōsis implies obligations to strangers and to all rational beings. Does this mean a Stoic is obligated to help everyone equally? How does the role structure accommodate varying levels of obligation?",
        "answer": "No — Stoic cosmopolitanism is not the demand for equal treatment of all persons regardless of relationship. The roles create justified priority structures: closer relationships generate stronger obligations. A parent's primary obligation is to her children, not to strangers' children. A citizen's civic obligations are primarily to her community. This is not favoritism — it is the natural expression of role-based appropriate action. The concentric structure of oikeiōsis (self → family → community → nation → humanity) means that obligations extend outward but attenuate with distance. What the doctrine rules out is the indifference that would allow you to harm strangers for small personal gain, or to remain passive when help is easy and needed. The outer circles are not empty; they simply carry less urgent obligations than the inner ones."
      },
      {
        "title": "Exercise 5.4 — Marcus Aurelius as Case Study",
        "body": "Marcus Aurelius was emperor — a role involving enormous power over others' lives. Using the discipline of action and the concept of kathēkon, analyze how the Stoic framework would guide an emperor's actions.",
        "answer": "The emperor's role generates enormous kathēkonta: justice in legislation, prudence in military affairs, care for the welfare of subjects, personal example of virtue. Marcus applies the Stoic framework throughout the Meditations: he treats imperial power not as a personal possession but as a role with obligations. The kathēkon of the emperor is the common good — not the emperor's personal advantage, popularity, or legacy. Applied practically: (1) Every imperial decision should be checked against: 'Is this what virtue requires of someone in this role?' (2) The reserve clause governs all outcomes: Marcus plans campaigns, pursues policies, and cares for subjects with full commitment — fate permitting. (3) The discipline of desire rules out attachment to legacy, popularity, or even the outcome of battles. His job is to act with justice and prudence; the results belong to fate. The Meditations are a daily practice of this reorientation — reminding himself of what the role demands and releasing attachment to how history will judge it."
      }
    ],
    "quiz": [
      {
        "question": "1. What is kathēkon?",
        "answer": "Appropriate action — any action fitting to the agent's nature, role, and circumstances, with a reasonable justification"
      },
      {
        "question": "2. What is the difference between kathēkon and katorthōma?",
        "answer": "Katorthōma is perfect virtuous action (only the Sage performs these). Kathēkon is appropriate but imperfect action available to those making progress."
      },
      {
        "question": "3. What is oikeiōsis?",
        "answer": "Natural affiliation — the tendency of all animals to care for themselves, extended in rational animals to encompass all rational beings"
      },
      {
        "question": "4. What does Epictetus mean: 'You are an actor in a play'?",
        "answer": "Each person occupies roles (parent, citizen, friend, professional) that generate appropriate actions. The roles are given; how you play them is up to you."
      },
      {
        "question": "5. Name three roles and a kathēkon for each.",
        "answer": "Parent → care for children's wellbeing; Friend → honesty and support; Citizen → civic participation and justice (other answers valid)"
      },
      {
        "question": "6. What is Stoic cosmopolitanism?",
        "answer": "The view that all rational beings are citizens of a universal community, generating obligations extending in principle to all humans, nested within particular role obligations"
      },
      {
        "question": "7. Does oikeiōsis require equal treatment of all persons?",
        "answer": "No — it generates a concentric structure of obligation, stronger for closer relationships, but ruling out indifference or harm to those in the outer circles"
      },
      {
        "question": "8. Marcus Aurelius: 'It is natural that I should do good to men, even as the sun gives light.' What Stoic principle does this express?",
        "answer": "Benefit to others flows naturally from one's rational nature (oikeiōsis extended to all rational beings) — not from calculation or duty-following"
      },
      {
        "question": "9. What does the discipline of action add to the discipline of desire?",
        "answer": "It extends Stoic practice from the interior (governing desire) to the exterior (acting appropriately in the world, fulfilling role obligations)"
      },
      {
        "question": "10. How does the reserve clause apply to action?",
        "answer": "Every action aimed at external outcomes is performed with full commitment plus a mental reservation: 'fate permitting.' The action is fully mine; the outcome is not."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Act with reservation. Pursue your duties toward others — but hold the outcome loosely. The archer's job is to aim and release well. Where the arrow lands is not fully theirs.",
      "assignment": "Identify one relationship where you are currently withholding — effort, honesty, care — because you are not sure it will be reciprocated. Do the thing anyway, once, with full attention and no expectation of return. Notice what it costs you and what it gives you.",
      "duration": "One action, then brief reflection",
      "greekTerms": "kathêkon — appropriate action / oikeiôsis — natural affiliation"
    }
  },
  {
    "id": 6,
    "title": "The Discipline of Assent — Philosophy as Attention",
    "subtitle": "The third and most fundamental discipline: governing how you take the world to be",
    "preSeminarBriefing": {
      "problem": "Sessions 4 and 5 covered desire and action — the first two disciplines. Session 6 completes the trio with the discipline of assent (synkatathesis). This is the deepest discipline, the one that governs the other two, and the one most closely connected to Hadot's concept of philosophy as a spiritual exercise.",
      "whyItMatters": "The discipline of assent is the practice of prosochē — attention, watchfulness, the constant vigilance over the impressions that arise in the ruling faculty. Without it, the other disciplines collapse: you cannot redirect desire if you cannot identify the impressions driving it; you cannot act appropriately if you cannot distinguish accurate impressions from distorted ones. The discipline of assent is the foundation.",
      "whatToWatchFor": "Hadot identifies the discipline of assent with what ancient philosophers called prosochē — attention to oneself. This is not introspection in the modern psychological sense (examining your feelings, processing your past). It is logical vigilance: checking each impression for accuracy before giving assent.",
      "yourTask": "For the next 24 hours before this session, try to practice what Epictetus calls the 'pause' — when a strong impression arises, notice it and hold it briefly before responding. Report one instance in the seminar.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§20, 34, 45",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Discourses II.18 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Hadot, PhWoL Ch. 11 — 'Spiritual Exercises'",
          "passage": "as assigned",
          "note": "The foundational text for the entire Academy. Read before Session 1."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — Prosochē: The Practice of Attention",
        "content": [
          "Pierre Hadot, in Philosophy as a Way of Life, identifies {{prosoche|prosochē}} — continuous attention to oneself and one's present state — as the fundamental Stoic spiritual exercise from which all others derive. 'It is a continuous vigilance and presence of mind, self-consciousness which never sleeps, and a constant tension of the spirit.'",
          "What is one attending to? Not feelings, not memories, not future plans — but impressions as they arise in the {{hegemonikon|ruling faculty}}. The practice is: when an {{phantasia|impression}} arises, see it for what it is — a presentation of the world as being a certain way — before deciding whether to {{synkatathesis|assent}} to it. The Stoic does not sleepwalk through the day, automatically assenting to every impression the world sends. She watches.",
          "This is why the Stoics devoted such attention to the morning preparation and evening review. Epictetus begins the Discourses with: 'Of all existing things some are in our power and some are not.' This is not a philosophical proposition to be evaluated once — it is a frame to be rehearsed daily, so that when impressions arise they are automatically placed in their correct category."
        ]
      },
      {
        "title": "Part 2 — Testing Impressions",
        "content": [
          "The discipline of assent in practice involves testing each impression before giving assent. Epictetus gives a specific procedure in Encheiridion §1 and elaborated in the Discourses: 'Never say about anything, I have lost it; but, I have returned it.'",
          "The test: when an impression arises with evaluative content ('this is a catastrophe,' 'that person is my enemy,' 'I have been harmed'), ask: (1) Is this within my power or outside it? (2) Is this a genuine good or bad, or an indifferent? (3) Is the content of this impression accurate, or is it a distorted presentation?",
          "The Stoic does not demand certainty before acting — that would be paralyzing. The demand is for a moment of rational evaluation before assent, not an extended philosophical inquiry in every situation. With practice, the evaluation becomes rapid and automatic — what Epictetus calls the 'character' (ēthos) of the philosopher, the stable disposition to see things rightly."
        ],
        "tables": [
          [
            [
              "Raw impression",
              "Evaluative test",
              "Corrected assent"
            ],
            [
              "'My reputation is ruined — this is catastrophic.'",
              "Is reputation eph' hēmin? Is it a genuine good?",
              "'My reputation has been damaged. This is a dispreferred indifferent. What is genuinely mine — my integrity — is intact.'"
            ],
            [
              "'That person insulted me — I have been harmed.'",
              "Does insult constitute genuine harm?",
              "'That person spoke dismissively. My ruling faculty and character are unharmed. Their opinion of me is not up to me.'"
            ],
            [
              "'I might lose my job — I will be ruined.'",
              "Is employment a genuine good? Is loss of it a genuine bad?",
              "'I may face changed circumstances. My capacity for virtue is unaffected. I can act well in whatever situation follows.'"
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — The Discipline of Assent and the Sage",
        "content": [
          "The Stoic Sage is defined partly by the perfection of the discipline of assent. The Sage never gives false assent — she never affirms an impression whose content is inaccurate, never judges an indifferent to be a genuine good or bad, never allows the evaluative overlay of passion to distort her perception of reality.",
          "The Stoics acknowledged that the Sage is rare — 'like the Ethiopian phoenix,' Epictetus says, appearing perhaps once every several generations. But the Sage is not an idle ideal. The concept defines the direction of progress. The prokopton's practice is the progressive refinement of assent — becoming more accurate, faster, more reliable in the evaluation of impressions.",
          "Hadot's reading adds depth here: the practice of prosochē is not merely the application of a logical test. It is a transformation of perception itself. The philosopher who has practiced long enough does not merely test impressions and correct them — she begins to see the world differently. Things that previously appeared catastrophic appear as indifferents. Things that previously appeared enormously desirable appear as preferred but not necessary. The discipline of assent, fully developed, is a new way of seeing."
        ],
        "tables": [
          [
            [
              "Hadot: 'The Stoic lives in a state of constant vigilance... Attention (prosochē) is, in a sense, the most fundamental spiritual exercise, because all others presuppose it.'"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 6.1 — Testing an Impression",
        "body": "Apply the three-step test (eph' hēmin? genuine good/bad? accurate content?) to the following impressions:\n1. 'The traffic jam is going to make me late and ruin the meeting.'\n2. 'My friend forgot my birthday — she doesn't care about me.'\n3. 'I failed the test — I am not capable of this work.'",
        "answer": "1. (a) The traffic jam: not eph' hēmin. (b) Being late: dispreferred indifferent, not a genuine bad. Meeting outcome: not fully eph' hēmin. (c) Content test: does the traffic jam make the meeting impossible, or merely harder? Corrected assent: 'I will arrive late. This is a dispreferred indifferent. I will communicate the situation and do my best with the time I have.'\n2. (a) Friend's memory: not eph' hēmin. (b) Being cared for: important preferred indifferent, not a genuine good whose absence constitutes harm to character. (c) Content test: does forgetting = not caring? That's an inference, not a fact. Corrected assent: 'She forgot. I don't know why. I can raise it with her. My assessment of our friendship should wait for evidence.'\n3. (a) Test results: not fully eph' hēmin. (b) Test performance: preferred indifferent. (c) Content test: does one failure prove incapacity? That inference is not warranted. Corrected assent: 'I did not perform well on this test. This gives me information about my preparation. It says nothing definitive about my capacity.'"
      },
      {
        "title": "Exercise 6.2 — Morning Preparation",
        "body": "Epictetus recommends beginning each day by preparing for the impressions the day will bring. Write a 100-word morning preparation in the Stoic style — not a motivational affirmation but a philosophical preparation for the kinds of impressions you will face.",
        "answer": "Model answer: 'Today I will encounter people who act badly, circumstances that resist my plans, and situations I did not choose. None of these constitutes a genuine harm to me unless I give assent to that impression. My ruling faculty is my own — it cannot be seized, insulted, or diminished except by my own false assent. I will meet each impression with the question: is this eph' hēmin? Is this a genuine good or bad, or an indifferent dressed in the appearance of importance? I will hold outcomes with a reserve clause and commit fully to the actions that virtue requires. The rest belongs to fate.'"
      },
      {
        "title": "Exercise 6.3 — Prosochē vs. Introspection",
        "body": "Explain the difference between Stoic prosochē (attention to impressions) and modern psychological introspection (examining feelings and past experiences). Why does this distinction matter for practice?",
        "answer": "Modern introspection is typically retrospective and affective — it looks backward at past experiences to understand the origins of present feelings, and it is concerned primarily with emotional content (why do I feel this way? what does this feeling mean?). Stoic prosochē is prospective and logical — it watches impressions as they arise in the present moment and evaluates their content for accuracy before assent. The difference matters practically because: (1) Introspection often reinforces the importance of emotional content by dwelling on it; prosochē interrupts the automatic amplification of impressions by catching them before assent. (2) Introspection's therapeutic goal is typically insight and acceptance of past experience; prosochē's goal is governing present judgment. (3) Introspection can become self-absorbed — the examined past becomes an obsessive focus; prosochē keeps attention at the present moment where the ruling faculty actually operates."
      },
      {
        "title": "Exercise 6.4 — The Three Disciplines Together",
        "body": "Having now studied all three disciplines, explain how they form an integrated practice. How do the disciplines of desire, action, and assent depend on each other?",
        "answer": "The three disciplines are not independent practices but three aspects of a single capacity — the rational governance of the ruling faculty in different domains. Assent is foundational: without the discipline of assent (prosochē), you cannot identify which impressions are driving your desires or how to evaluate them. Without accurate assent, the discipline of desire has nothing to work with. The discipline of desire (redirecting desire and aversion toward eph' hēmin) depends on the discipline of assent, because redirection requires first seeing clearly what you are desiring and why. The discipline of action (kathēkon, roles, reserve clause) depends on both prior disciplines: you need accurate assent to identify what the situation requires, and disciplined desire to act without attachment to outcomes. The integration: a Stoic morning begins with assent (preparing to watch impressions), proceeds through action (performing kathēkonta with reserve clause), and continuously returns to assent (evaluating each impression as it arises). Desire is governed throughout: nothing external is craved; virtue is wanted wholeheartedly; outcomes are held lightly."
      }
    ],
    "quiz": [
      {
        "question": "1. What is prosochē?",
        "answer": "Continuous attention and vigilance over impressions as they arise in the ruling faculty — the foundational Stoic spiritual exercise"
      },
      {
        "question": "2. Who coined the term 'discipline of assent' in modern scholarship?",
        "answer": "Pierre Hadot, in Philosophy as a Way of Life — reconstructing Epictetus's three-discipline framework"
      },
      {
        "question": "3. What are the three steps in testing an impression?",
        "answer": "Is this eph' hēmin or not? Is this a genuine good/bad or an indifferent? Is the content of the impression accurate?"
      },
      {
        "question": "4. What is the Stoic Sage's relationship to assent?",
        "answer": "The Sage never gives false assent — she never affirms an inaccurate impression. This perfection of assent is what defines the Sage's wisdom."
      },
      {
        "question": "5. Why is the Sage described as 'like the Ethiopian phoenix'?",
        "answer": "The Sage appears extremely rarely — perhaps once every several generations. The concept defines the direction of progress, not an easily achievable standard."
      },
      {
        "question": "6. What is the difference between a prokopton and a Sage?",
        "answer": "The prokopton (one making progress) practices the disciplines imperfectly — improving but not yet perfect. The Sage performs all three disciplines with complete reliability and no error."
      },
      {
        "question": "7. How does Hadot describe the mature result of the discipline of assent?",
        "answer": "A transformation of perception — not just correcting impressions but coming to see the world differently, so that indifferents appear as indifferents and virtue appears as the only genuine good"
      },
      {
        "question": "8. What is the morning preparation for?",
        "answer": "To rehearse the Stoic framework before impressions arrive — so that when they do arise during the day, they are automatically placed in the correct category"
      },
      {
        "question": "9. Translate: 'Never say about anything, I have lost it; but, I have returned it.'",
        "answer": "From Ench. §11 — reframing loss as return: what was never truly mine has been given back to its owner (fate, nature). Corrects the impression that loss is genuine harm."
      },
      {
        "question": "10. Which discipline is most fundamental and why?",
        "answer": "The discipline of assent (prosochē) — because it governs the other two. You cannot redirect desire without accurate assent to what you are desiring; you cannot identify appropriate action without accurate assent to the situation."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Prosochê — watchful attention — is the core practice. Not dramatic self-examination. Quiet, continuous noticing of what your mind is doing.",
      "assignment": "For one morning, practice prosochê: every hour on the hour, pause for sixty seconds and ask: what has my attention been on? Was I present in what I was doing, or was my mind elsewhere? Not judgment — just observation. Write three words at the end of each hour. Review at day's end.",
      "duration": "One morning, 60-sec checks",
      "greekTerms": "prosochê — watchful attention"
    }
  },
  {
    "id": 7,
    "title": "Passions, Emotions, and the Eupatheiai",
    "subtitle": "What the Stoics really said about emotions — and the positive states that replace the passions",
    "preSeminarBriefing": {
      "problem": "The Stoics are widely misunderstood as recommending the suppression of emotion — cold, robotic indifference to everything that happens. This session corrects that misreading. The Stoic critique is not of emotion as such but of a specific class of emotions called pathē (passions) — emotions that rest on false judgments. And in place of the passions, the Stoics described a set of positive rational emotions — the eupatheiai — which are the emotional life of the Sage.",
      "whyItMatters": "The misreading of Stoicism as emotional suppression is the most common reason people reject it without fairly engaging with it. If you think Stoicism means not caring about anything, you have not understood it. Understanding what the Stoics actually said about emotion is necessary for the course and for your own philosophical formation.",
      "whatToWatchFor": "The four passions are desire (epithumia), fear (phobos), pleasure (hēdonē), and distress (lupē). Each is defined as a false judgment — not merely an intense feeling. The corresponding eupatheiai are wish (boulēsis), caution (eulabeia), joy (chara), and there is no eupatheia corresponding to distress — because the Sage has no occasion for distress.",
      "yourTask": "Identify one passion you experience regularly — not its feeling-quality but its underlying judgment. What does it assume to be good or bad? Come prepared to examine whether that judgment is accurate.",
      "requiredReading": [
        {
          "source": "Diogenes Laertius",
          "passage": "Lives VII.110–116 (on the passions)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Discourses I.28 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — Passions as False Judgments",
        "content": [
          "The Stoic definition of passion ({{pathos|pathos}}) is precise: a passion is an irrational and unnatural movement of the soul arising from a false judgment about value. It is not the feeling accompanying an event, but the judgment embedded in that feeling — the implicit claim that this external thing is a genuine good or genuine bad.",
          "Fear (phobos) is not merely the physiological arousal that accompanies a threat. It is a judgment: 'this approaching thing is a genuine evil that I must avoid.' If the thing is genuinely evil (e.g., a vicious action), the avoidance is appropriate — it is the {{eupatheia|eupatheia}} caution (eulabeia), not fear. If the thing is an indifferent (death, illness, poverty), the avoidance is based on a false judgment — and that is the passion fear.",
          "The same structure applies to all four passions:"
        ],
        "tables": [
          [
            [
              "Passion",
              "False judgment embedded",
              "Corresponding eupatheia"
            ],
            [
              "Desire (epithumia)",
              "'This external thing is a genuine good I must obtain'",
              "Wish (boulēsis) — rational desire for genuine goods"
            ],
            [
              "Fear (phobos)",
              "'This external thing is a genuine evil I must avoid'",
              "Caution (eulabeia) — rational aversion to genuine evils (vices)"
            ],
            [
              "Pleasure (hēdonē)",
              "'I have obtained a genuine good'",
              "Joy (chara) — rational gladness at genuine goods"
            ],
            [
              "Distress (lupē)",
              "'A genuine evil has befallen me'",
              "None — the Sage has no occasion for distress"
            ]
          ]
        ]
      },
      {
        "title": "Part 2 — The Eupatheiai: Rational Positive Emotions",
        "content": [
          "The Stoic Sage is not emotionless. The Sage has a rich emotional life — but one governed by accurate judgment rather than false belief. The eupatheiai (good passions) are the Sage's emotional repertoire.",
          "Wish (boulēsis) is the Sage's positive desire — directed at genuine goods (virtue, virtuous actions), never at indifferents. The Sage wishes for wisdom, for just outcomes, for the well-being of rational beings. This wish can always be satisfied, because its object is always available.",
          "Caution (eulabeia) is the Sage's aversion — directed only at genuine evils (vice, vicious actions). The Sage avoids acting dishonestly, unjustly, or foolishly. This aversion is always appropriate, because vices are genuinely bad.",
          "Joy (chara) is the Sage's positive emotion in response to the present — not the grasping excitement of pleasure (hēdonē, which claims something external is genuinely good) but a calm, stable, well-founded gladness arising from the recognition that virtue is present and exercised. The Stoic texts describe joy as a kind of serenity — not excitement, not elation, but what Seneca calls the 'tranquility of the soul.'"
        ]
      },
      {
        "title": "Part 3 — Grief, Love, and the Hard Cases",
        "content": [
          "The most emotionally challenging applications of the Stoic theory concern grief and love. Does the Stoic not grieve a child's death? Does the Stoic not love her friends and family?",
          "On grief: the Stoics distinguished between the involuntary first response (the propatheia — the initial shock and pain) and the sustained passionate distress (lupē) that follows from the judgment 'a genuine evil has occurred.' The Stoic teacher Epictetus wept at a student's illness; Marcus Aurelius grieved deeply at the deaths of his children. The involuntary response is natural and not condemned. The sustained passion is what the Stoic works to moderate — not by suppressing feeling but by not assenting to the judgment that the loss constitutes a genuine evil to one's own flourishing.",
          "On love: the Stoics encouraged deep attachment and affection — philostorgia (natural affection) is one of the most praised Stoic virtues. The Stoic loves her children, friends, and community. The difference from ordinary love: Stoic love holds its object with the reserve clause. 'I love this child as a mortal — she may be taken from me.' This is not coldness; it is the love that can bear loss without devastation because it never confused the beloved with a condition of one's own happiness."
        ],
        "tables": [
          [
            [
              "Epictetus: 'Never say about anything, I have lost it; but, I have returned it. Is your child dead? It has been returned. Is your wife dead? She has been returned.' (Ench. §11) — This is not indifference; it is love held with the reserve clause."
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 7.1 — Classify the Emotion",
        "body": "Identify whether each emotional state is a Stoic passion (pathos), eupatheia, or propatheia:\n1. A novelist's deep satisfaction upon finishing a book she is proud of.\n2. Anxiety about a presentation because you think failure would be terrible.\n3. The initial stomach-drop feeling when you receive bad news.\n4. The ongoing despair that lasts weeks after a setback.\n5. A parent's fierce protectiveness toward a child in danger.",
        "answer": "1. Potentially a eupatheia (joy — chara) if grounded in genuine pride in virtuous effort, rather than pleasure in external success. If the satisfaction is in the quality of the work and the integrity of the effort, it is joy. If it is in anticipation of external success, it shades toward pleasure (hēdonē).\n2. Passion — fear (phobos). The judgment: 'failure would be terrible' presupposes that external failure is a genuine evil. The appropriate eupatheia would be caution: aversion to performing poorly due to insufficient preparation.\n3. Propatheia — the involuntary first response. Not itself a passion; the passion arises only if assent follows: 'yes, this is a genuine evil that has befallen me.'\n4. Passion — distress (lupē). The ongoing despair has assented to the judgment: 'a genuine evil has occurred and my well-being is genuinely damaged.' The Stoic does not suppress the initial grief but works against prolonging it by withholding assent to the underlying false judgment.\n5. Potentially a eupatheia (caution — eulabeia) if directed at preventing genuine harm, or a passion (fear) if disproportionate to the threat or based on false judgment about the child's safety."
      },
      {
        "title": "Exercise 7.2 — The Anatomy of an Emotion",
        "body": "Choose one emotion you experience regularly. Identify: (a) the feeling-quality; (b) the judgment embedded in it; (c) whether the judgment is accurate; (d) the appropriate Stoic alternative.",
        "answer": "Personal response — no single answer. Strong answers will clearly separate the phenomenology (what the emotion feels like) from the propositional content (what judgment it embeds), and then evaluate the judgment against Stoic criteria. The most important move is (b) → (c): can the student identify the specific false judgment? That is the practical skill the exercise builds."
      },
      {
        "title": "Exercise 7.3 — Grief",
        "body": "Epictetus says: 'Never say about anything, I have lost it; but, I have returned it.' A critic responds: 'This is monstrous — to tell someone who has lost a child that they haven't lost anything, just returned her.' Respond to this criticism.",
        "answer": "The critic misreads the instruction. Epictetus is not saying the child's death is not a terrible event, or that grief is inappropriate, or that the parent should feel nothing. He is offering a reframing of the judgment embedded in grief: the child was not the parent's possession — she was a mortal entrusted to the parent's care. The loss is real. The pain is real. What the instruction targets is the specific judgment 'a genuine evil has befallen me' — the judgment that the parent's own good has been damaged. The parent's good consists in her virtue, love, and rational nature — none of which is destroyed by the child's death. The grief is the appropriate propatheia; the ongoing despair that says 'my life is ruined' is the passion that embeds a false judgment. Epictetus is not telling the parent not to weep. He is offering a way to weep without the additional suffering of the false judgment."
      },
      {
        "title": "Exercise 7.4 — Is Joy Enough?",
        "body": "The Stoics say the Sage experiences joy (chara) rather than pleasure (hēdonē), and that joy is sufficient for a good emotional life. A critic says: 'The Stoic has traded a rich emotional life for a thin tranquility.' Is this a fair criticism?",
        "answer": "The criticism has force if joy is understood as mere absence of passion — flat serenity without depth. But the Stoic account of joy is richer than this. Seneca describes it as the 'solid and stable good of the soul' that accompanies virtuous life — not the temporary elation of pleasure but the calm abundance of a life lived rightly. Marcus Aurelius's Meditations, written in his private journal, suggest an emotional life of considerable depth: he grieves, he admires, he feels the weight of his obligations, he finds beauty in the world. If this is 'thin tranquility,' the criticism fails. The real question is whether Stoic joy is emotionally adequate to the full range of human experience. The most honest answer: it is adequate for a person who has genuinely redirected her attachments. For those still attached to external outcomes, the Stoic emotional life would feel thin — because it lacks the highs that depend on external success. But the Stoic point is that those highs are inseparable from corresponding lows — and the tranquility of well-founded joy, once achieved, is not thin. It is deep."
      }
    ],
    "quiz": [
      {
        "question": "1. How do the Stoics define a passion (pathos)?",
        "answer": "An irrational and unnatural movement of the soul arising from a false judgment about value"
      },
      {
        "question": "2. Name the four Stoic passions.",
        "answer": "Desire (epithumia), fear (phobos), pleasure (hēdonē), distress (lupē)"
      },
      {
        "question": "3. Name the three eupatheiai.",
        "answer": "Wish (boulēsis), caution (eulabeia), joy (chara)"
      },
      {
        "question": "4. Why is there no eupatheia corresponding to distress?",
        "answer": "The Sage has no occasion for distress — the Sage never assents to the false judgment that a genuine evil has befallen her"
      },
      {
        "question": "5. What is the false judgment embedded in fear?",
        "answer": "'This approaching thing is a genuine evil I must avoid' — a judgment that treats an indifferent (death, illness, poverty) as a genuine bad"
      },
      {
        "question": "6. What is a propatheia?",
        "answer": "A pre-passion — the involuntary first response to an event, before assent is given. Not itself a passion; not within our direct control."
      },
      {
        "question": "7. Is the Stoic Sage emotionless?",
        "answer": "No — the Sage has a rich emotional life through the eupatheiai: wish, caution, and joy. These are rational emotions grounded in accurate judgment."
      },
      {
        "question": "8. How does Stoic love differ from ordinary love?",
        "answer": "Stoic love holds its object with the reserve clause — the beloved is loved as a mortal, not confused with a condition of one's own happiness"
      },
      {
        "question": "9. What is the Stoic eupatheia corresponding to ordinary desire?",
        "answer": "Wish (boulēsis) — rational desire directed at genuine goods (virtue), never at indifferents"
      },
      {
        "question": "10. Seneca describes joy as what?",
        "answer": "'The solid and stable good of the soul' — not temporary elation but the calm abundance accompanying a life lived in accordance with virtue"
      }
    ],
    "practiceAssignment": {
      "coreIdea": "Passions are false judgments — they treat indifferents as genuine goods or evils. The eupatheiai are the correct emotional responses of someone who sees clearly: joy, caution, wishing well.",
      "assignment": "Pick one recurring negative emotion — frustration, anxiety, resentment — that visited you this week. Trace it back to its judgment: what did you believe, in that moment, that a loss or failure was catastrophic? Write the belief explicitly. Then write the Stoic correction: what is the more accurate assessment? You are not suppressing the feeling — you are diagnosing it.",
      "duration": "15 min",
      "greekTerms": "pathos — passion / eupatheia — good emotion"
    }
  },
  {
    "id": 8,
    "title": "Fate, Providence, and Amor Fati",
    "subtitle": "What the Stoics believed about the structure of the universe — and why it matters for how you live",
    "preSeminarBriefing": {
      "problem": "The Stoics were determinists. They believed every event in the universe is necessitated by the causal chain they called fate (heimarmenē). They also believed human beings are free and responsible for their choices. This is the tension at the heart of Stoic metaphysics. This session examines it — and the remarkable Stoic conclusion: once you understand the universe correctly, your proper response to it is not resignation but love.",
      "whyItMatters": "Amor fati — love of fate — is one of the most distinctive and demanding Stoic commitments. It is not mere acceptance of what happens. It is the affirmative embrace of reality as it is, grounded in the conviction that the universe is governed by a rational, providential logos. Understanding why the Stoics held this conviction, and what it demands practically, is essential for understanding the full scope of Stoic ethics.",
      "whatToWatchFor": "The Stoic universe is a living, rational organism — the logos permeating all things. Fate is not an alien force imposing events on a passive world; it is the self-expression of the logos working through everything that happens. To resist fate is to resist the logos — which is to resist your own deepest nature as a rational being. To embrace fate is to align with it.",
      "yourTask": "Think of one significant circumstance in your life you did not choose — a loss, a limitation, a constraint. Come prepared to examine whether amor fati, as the Stoics understand it, is psychologically and philosophically achievable for you in this case.",
      "requiredReading": [
        {
          "source": "Marcus Aurelius",
          "passage": "Meditations IV.3 (complete); V.8; VI.2; IX.28",
          "note": "Primary text — required reading."
        },
        {
          "source": "Epictetus",
          "passage": "Encheiridion §§8, 17, 53",
          "note": "Primary text — required reading."
        },
        {
          "source": "Cleanthes",
          "passage": "Hymn to Zeus (complete — 14 lines)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — Stoic Cosmology: The Living Universe",
        "content": [
          "The Stoics held that the universe is a single living organism, pervaded and governed by the divine rational principle they called the {{logos|logos}}. This logos is identical with God, with fate ({{heimarmene|heimarmenē}}), with {{physis|nature}}, and with universal reason. These are not different entities — they are different descriptions of the same omnipresent rational principle.",
          "The logos pervades everything through pneuma — the divine breath or spirit that constitutes all things at varying degrees of tension (tonos). At the lowest tension, pneuma constitutes inanimate matter; at higher tension, plants; higher still, animals; at the highest, human rational souls. The human rational soul is a fragment of the divine logos — which is why living according to reason is simultaneously living according to God, according to nature, and according to fate.",
          "The cosmological implication: every event in the universe is an expression of the logos working through the causal chain. Nothing happens contrary to the logos. The fire that destroys a city is not a deviation from divine order; it is divine order working through that particular causal sequence. The Stoic cosmos is fundamentally benign — not because nothing bad happens, but because what appears bad from a limited perspective is, from the perspective of the whole, an expression of rational order."
        ]
      },
      {
        "title": "Part 2 — The Cylinder Argument and Compatibilism",
        "content": [
          "How can human beings be free and responsible if every event is determined by the logos? Chrysippus's answer is the compatibilist position, illustrated by the cylinder argument.",
          "When a cylinder is pushed along a surface, its motion has two causes: the initial push (external, not the cylinder's) and its own cylindrical nature (internal, its own). The cylinder rolls because of how it is — its nature produces rolling in response to the push. Similarly, human action has two causes: the external impression that initiates the process, and the internal character (hexis) of the rational soul that responds to that impression. The assent, which generates impulse and action, comes from the agent's own rational nature.",
          "The Stoic position: we are not free from the causal order — nothing is. But we are the proximate cause of our own assent. The logos works through our rational nature to produce our actions. Since our rational nature is genuinely our own (it is our fragment of the logos), the actions that flow from it are genuinely ours — even though they are also determined by fate. Freedom and determinism are compatible because freedom means acting from one's own rational nature, not acting without causes."
        ],
        "tables": [
          [
            [
              "Chrysippus: 'It is the nature of the cylinder to roll, and being pushed gives it the occasion, not the power, of rolling.' The character of the soul, not external events, is the proximate cause of action."
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — Amor Fati: Love of Fate",
        "content": [
          "Amor fati — the love of fate — is the emotional corollary of the Stoic metaphysics. If the universe is governed by a rational, providential logos, and if every event is an expression of that logos, then the appropriate response to every event is not mere acceptance but affirmative embrace.",
          "Marcus Aurelius: 'Love the discipline you have been given, and love it with your whole heart.' (Med. 6.2) This is not cheerful submission — it is the recognition that what has been given is precisely the material needed for the exercise of virtue. The illness, the loss, the limitation — these are not obstacles to virtue; they are the occasions for virtue's exercise. Courage requires difficulty; patience requires frustration; generosity requires that someone be in need.",
          "The Stoic distinction between acceptance and love: acceptance says 'I cannot change this, so I will endure it.' Amor fati says 'I would not change this even if I could, because it is exactly what the logos — through which I live and act — has brought forth.' This is the most demanding and the most transformative Stoic commitment. It requires not just the discipline of desire but a complete reorientation of one's relationship to reality."
        ],
        "tables": [
          [
            [
              "Acceptance (Stoic baseline)",
              "Amor fati (Stoic ideal)"
            ],
            [
              "'I cannot change this circumstance, so I endure it.'",
              "'This circumstance is exactly what the logos has brought forth. I embrace it as the material for virtue.'"
            ],
            [
              "'I will work with what I have been given.'",
              "'What I have been given is precisely what I need.'"
            ],
            [
              "'My limitation does not prevent virtue.'",
              "'My limitation is the occasion for virtue — without it, certain virtues could not be exercised.'"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 8.1 — The Cylinder Argument",
        "body": "In your own words, explain why the cylinder argument shows that Stoic determinism is compatible with moral responsibility. What is the 'proximate cause' that matters for responsibility?",
        "answer": "The cylinder argument shows that having causes does not mean lacking responsibility. When a cylinder rolls, both the push and the cylinder's own nature cause the rolling. The push is external and not the cylinder's; the rolling is internal and is the cylinder's own nature expressing itself. In human action: the impression that initiates the process is external (not eph' hēmin). The assent that responds to the impression comes from the agent's own rational character — and that character, though itself part of the causal order, is genuinely the agent's own. The proximate cause of action is always the agent's own rational nature (hexis), which is why the agent is responsible. The Stoic is not asking 'could I have done otherwise in some libertarian sense?' — she is asking 'did the action flow from my own rational character?' If yes, the action is mine and I am responsible. If no (e.g., coerced by force), the action is not mine in the relevant sense."
      },
      {
        "title": "Exercise 8.2 — Amor Fati in Practice",
        "body": "Consider a circumstance you did not choose and cannot change. Apply the amor fati framework: (a) What virtue does this circumstance create an occasion for? (b) Can you move from acceptance to amor fati? What would that require?",
        "answer": "Personal response — no single answer. Strong answers will identify a specific virtue that the circumstance occasions (patience, courage, creativity, perseverance) and honestly engage with whether amor fati feels achievable or aspirational. Most students will find acceptance easier than amor fati — and that honest gap is philosophically productive."
      },
      {
        "title": "Exercise 8.3 — The Problem of Evil",
        "body": "If the Stoic logos is rational and providential, why does it produce events that appear evil — disease, natural disasters, violence? How do the Stoics defend the goodness of their universe?",
        "answer": "The Stoics gave several responses. (1) The perspective argument: what appears evil from a partial perspective is not evil from the perspective of the whole. A city's destruction may be necessary for a larger historical development; an individual's death is the return of borrowed elements to the whole. The logos, seeing the whole, orders what we see only in part. (2) The moral development argument: apparent evils are necessary conditions for virtue. Courage requires danger; patience requires hardship; generosity requires poverty in others. A universe without apparent evils would be a universe without the occasions for the virtues. (3) The character formation argument: adversity is the logos's way of testing and developing rational souls. Seneca: 'God treats the good the way a good teacher treats a student — he makes them work.' These arguments are not fully convincing by modern standards — the scale of natural suffering is hard to accommodate. But they are the Stoic position and should be engaged on their terms."
      },
      {
        "title": "Exercise 8.4 — Is Amor Fati Too Demanding?",
        "body": "Nietzsche famously embraced amor fati as his personal ideal. Is the Stoic version the same as Nietzsche's? And is either version psychologically achievable, or is it an impossible ideal?",
        "answer": "The Stoic and Nietzschean versions share the demand to affirm rather than merely accept reality. They differ in foundation: the Stoic grounds amor fati in the conviction that the universe is governed by a rational, providential logos — fate is embraced because it is the expression of divine reason. Nietzsche's amor fati is atheistic — it affirms fate not because fate is rational or good, but as an act of will, a creative yes-saying to existence in its totality including its suffering and meaninglessness. The Stoic version is more philosophically demanding (it requires belief in the providential logos) but psychologically more tractable (love what is rational and good is easier than love what is meaningless). As for achievability: most Stoic teachers, including Epictetus and Marcus Aurelius, present it as an ideal toward which one progresses rather than a state one fully achieves. The Sage has amor fati; the prokopton practices it imperfectly. The practical question is not 'can I achieve perfect amor fati?' but 'can I move from bare endurance toward genuine embrace?' — and to that question, the Stoic tradition says: yes, through practice."
      }
    ],
    "quiz": [
      {
        "question": "1. What is heimarmenē?",
        "answer": "Fate — the causal chain governing all events in the universe, identified by the Stoics with the logos, God, and nature"
      },
      {
        "question": "2. What is the logos?",
        "answer": "The divine rational principle pervading and governing the universe — identical with God, fate, and nature in Stoic cosmology"
      },
      {
        "question": "3. What is the cylinder argument?",
        "answer": "Chrysippus's compatibilist argument: action has two causes (external impression + agent's own rational nature). The proximate cause is the agent's character; therefore the agent is responsible even in a determined universe."
      },
      {
        "question": "4. What is the Stoic compatibilist position?",
        "answer": "Freedom and determinism are compatible: freedom means acting from one's own rational nature, not acting without causes. The logos works through our rational nature; our actions are both determined and genuinely our own."
      },
      {
        "question": "5. What is amor fati?",
        "answer": "Love of fate — the affirmative embrace of reality as it is, grounded in the conviction that the universe is governed by a rational, providential logos"
      },
      {
        "question": "6. How does amor fati differ from mere acceptance?",
        "answer": "Acceptance says 'I cannot change this, so I endure it.' Amor fati says 'I would not change this even if I could — it is exactly what the logos has brought forth and is the material for virtue.'"
      },
      {
        "question": "7. Marcus Aurelius: 'Love the discipline you have been given.' What does this mean?",
        "answer": "The circumstances of your life — including difficulties — are exactly the material needed for the exercise of virtue. They are not obstacles to the good life; they are the occasions for living it."
      },
      {
        "question": "8. What is pneuma?",
        "answer": "The divine breath/spirit that constitutes all things at varying degrees of tension — the physical medium through which the logos pervades the universe"
      },
      {
        "question": "9. How do the Stoics respond to the problem of evil (why the logos produces apparent evils)?",
        "answer": "Three arguments: perspective (evils appear bad from partial view but not the whole); necessity (virtues require apparent evils as occasions); character formation (adversity tests and develops rational souls)"
      },
      {
        "question": "10. What is the relationship between the human rational soul and the divine logos?",
        "answer": "The human rational soul is a fragment of the divine logos — the same rational principle present in the universe is present in the human rational faculty. Living according to reason is therefore simultaneously living according to God, nature, and fate."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "What happens to you is not random and not personal. It is the unfolding of a rational order. The practice is not resignation — it is active love of what is.",
      "assignment": "Think of one thing that happened to you in the last month that you resisted, resented, or tried to undo. Write one paragraph about it as if it were exactly what was supposed to happen — not because you are certain it was, but as a practice of the perspective. What would you do differently if you genuinely accepted it?",
      "duration": "20 min writing",
      "greekTerms": "amor fati — love of fate / heimarmenê — providence"
    }
  },
  {
    "id": 9,
    "title": "The Stoic Sage and the Prokopton",
    "subtitle": "Who is the ideal philosopher — and how do you become one?",
    "preSeminarBriefing": {
      "problem": "The Stoic Sage (sophos) is the ideal — a person of perfect virtue, perfect assent, perfect emotional life. The Stoics also said the Sage is almost impossibly rare. This creates a practical problem: if the standard is unachievable, what is the point? Session 9 addresses this by focusing on the prokopton — the person making progress — and the Stoic account of moral development.",
      "whyItMatters": "Most people who engage seriously with Stoicism are not Sages and will not become Sages. The practical ethics of Stoicism is almost entirely the ethics of the prokopton — the person between the mass of humanity (in the grip of passions and false judgments) and the Sage (in perfect accordance with logos). Understanding what progress looks like and how to pursue it is the practical core of the course.",
      "whatToWatchFor": "The Stoics made a controversial logical claim: moral virtue is all-or-nothing — you either have it or you don't, and any degree of vice makes you as bad as maximum vice (just as a drowning person is equally drowned whether one foot or ten feet underwater). But they also recognized that moral development is real and gradual. These two claims are in tension, and how the Stoics resolve it is philosophically interesting.",
      "yourTask": "Identify one area of your own character where you are clearly making progress — where you act better than you did a year ago. Come prepared to describe what changed and how.",
      "requiredReading": [
        {
          "source": "Epictetus",
          "passage": "Discourses I.4 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Seneca",
          "passage": "Epistulae Morales Ep. 1 (complete)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Hadot, PhWoL Ch. 2",
          "passage": "as assigned",
          "note": "How Stoic exercises were transmitted and transformed. Formation history."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — The Stoic Sage: The Ideal",
        "content": [
          "The Stoic Sage ({{sophos|sophos}}, or spoudaios — the serious person) is a person of complete and unshakeable virtue. The Sage possesses all four virtues perfectly and simultaneously — wisdom (phronēsis), justice (dikaiosynē), courage (andreia), and temperance (sōphrosynē). The Stoics held that the virtues are unified — you cannot have any one virtue without having all of them, because each implies the others. A person of genuine courage must also have wisdom (to know what is worth being courageous about), justice (to exercise courage in the right relationships), and temperance (to hold courage in proportion).",
          "The Sage's practical characteristics: the Sage never gives false assent; has only eupatheiai (no passions); performs only katorthōmata (perfect actions); is always happy; is always free; is king, priest, prophet, and poet even in chains. The Sage is described using these paradoxical extremes deliberately — the Stoics were making a philosophical point about the sufficiency of virtue, not reporting an empirical observation.",
          "The Sage is almost impossibly rare — 'like the Ethiopian phoenix' in Epictetus's description, possibly never having existed in pure form. Chrysippus himself may have been a prokopton. Marcus Aurelius certainly presents himself as one. The Sage is a regulative ideal — a direction of travel, not a destination most will reach."
        ]
      },
      {
        "title": "Part 2 — The Prokopton: Progress Toward the Ideal",
        "content": [
          "The {{prokôpton|prokopton}} (one making progress) occupies the practical middle of Stoic ethics. Not a Sage, not entirely in the grip of passion and false judgment — but genuinely improving, with an orientation toward virtue and an increasingly reliable practice of the three disciplines.",
          "The Stoics' controversial logical claim: there are no degrees of virtue. A person either has virtue (the Sage) or lacks it (everyone else). Someone 99% of the way to the surface is still drowning. This seems to eliminate moral progress — if you're not a Sage, your moral status is the same as the worst person.",
          "Their resolution: the logical claim concerns the possession of virtue (an all-or-nothing threshold); the practical claim concerns the direction and rate of movement toward that threshold. The prokopton is not virtuous, but she is oriented toward virtue, moving toward it, acting with increasing reliability in accordance with it. This is not moral irrelevance — it is the description of almost every serious moral life."
        ],
        "tables": [
          [
            [
              "Category",
              "Moral status",
              "Practical condition"
            ],
            [
              "The mass of humanity (phaulos)",
              "Vice — false judgments, passions, disordered desire",
              "Moving in no particular direction, or away from virtue"
            ],
            [
              "The prokopton (one making progress)",
              "Not yet virtuous — but oriented toward and moving toward virtue",
              "Practicing the disciplines, improving in reliability, reducing passion"
            ],
            [
              "The Sage (sophos)",
              "Perfect virtue — all four virtues fully and simultaneously",
              "Always assents correctly, has only eupatheiai, performs only katorthōmata"
            ]
          ]
        ]
      },
      {
        "title": "Part 3 — Spiritual Exercises and the Path of Progress",
        "content": [
          "How does the prokopton make progress? Hadot's central contribution to Stoic scholarship is his identification of specific {{askesis|spiritual exercises}} as the mechanism of moral development. These are not intellectual activities — they are practices that transform perception, desire, and character through repetition.",
          "The core exercises: (1) Morning preparation — rehearsing the Stoic framework before the day's impressions arrive. (2) Evening review — examining the day's assents, desires, and actions against the Stoic standard. (3) Negative visualization (premeditatio malorum) — vividly imagining the loss of what you value, to prevent attachment and cultivate gratitude. (4) The view from above — imaginatively expanding perspective to see one's circumstances in the context of cosmic scale and time. (5) Memorization and internalization of Stoic maxims — having them available as ready tools when impressions arise.",
          "These exercises are not intellectual in the sense of producing understanding alone. They produce character change through practice. The Stoic who has done the morning preparation for ten years is not the same person as the one who has done it for ten days — the exercises have restructured their perception, automatic responses, and emotional repertoire. This is why Epictetus insists on practice (meletē) as well as argument (logos): argument shows you where to go; practice gets you there."
        ],
        "tables": [
          [
            [
              "Marcus Aurelius, Meditations 6.7: 'Do not allow the future to get in front of you; greet it when it arrives. For present things — meet them with the consideration: is this consistent with the character of a rational, just, and provident person?'"
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 9.1 — The Paradox of Moral Progress",
        "body": "The Stoics say virtue is all-or-nothing (no degrees) but moral progress is real. Explain how these two claims are consistent. Use the drowning analogy in your answer.",
        "answer": "The two claims operate at different levels. The logical claim (virtue is all-or-nothing) concerns the threshold at which the soul's disposition constitutes genuine virtue — a stable, unshakeable, reliably exercised condition. Like the surface of water in the drowning analogy: you are either above it (alive) or below it (drowning), regardless of how close you are. There are no degrees of being drowned or not drowned. The practical claim (progress is real) concerns movement toward that threshold. The person 99% of the way to the surface is not less drowned — but she is much closer to survival. The prokopton's progress is measured not by degrees of virtue possessed but by proximity to the threshold, rate of movement, and reliability of virtue-consistent behavior. Progress is real and matters enormously even though it doesn't change the binary moral status. The drowning analogy is ultimately imperfect because the Stoics are primarily interested in the practical question (how do you make progress?) not the logical one (who counts as virtuous?)."
      },
      {
        "title": "Exercise 9.2 — Spiritual Exercise Design",
        "body": "Design a daily practice schedule for a prokopton, incorporating at least three Stoic spiritual exercises. Specify the exercise, its timing, its duration, and what it targets.",
        "answer": "Model schedule: (1) Morning — 5 minutes premeditatio malorum: vividly imagine three things that could go wrong today and mentally rehearse the Stoic response. Target: detachment from outcomes, discipline of desire. (2) Throughout the day — prosochē: pause before responding to strong impressions; run the three-step test. Target: discipline of assent. (3) Evening — 10 minutes review (following Seneca's evening examination in De Ira): What did I do well today? Where did I fail? What would I do differently? Not for self-flagellation but for learning. Target: integration of disciplines, identification of patterns. Additional: memorize one maxim per week and recall it in relevant situations. Target: readiness of Stoic tools under pressure."
      },
      {
        "title": "Exercise 9.3 — What Progress Looks Like",
        "body": "Seneca writes: 'I know that what I have learned today will be better tomorrow, and better still the day after.' What markers of Stoic progress would you expect to see in a genuine prokopton over time?",
        "answer": "Markers of genuine progress: (1) Response latency to impressions increases — there is more of a pause between impression and assent, even when the impression is strong. (2) The range of things that count as 'catastrophic' narrows — fewer indifferents are treated as genuine evils. (3) Recovery time after setbacks decreases — the prokopton still experiences the propatheia but returns to equanimity faster. (4) Role obligations are met more reliably and with less resentment. (5) Emotional range shifts from the four passions toward the eupatheiai — more joy, more caution, more directed wish; less disordered desire, less fear, less distress. (6) Consistency between stated values and actual behavior increases. (7) The evening review produces fewer self-reproaches — not because standards have lowered but because the practice is integrating."
      },
      {
        "title": "Exercise 9.4 — Negative Visualization",
        "body": "Practice the premeditatio malorum (negative visualization) for one thing you value. Describe: (a) What you visualized; (b) What the Stoic purpose of the exercise is; (c) What you noticed during or after it.",
        "answer": "Personal response. Strong answers engage honestly with both the discomfort of the exercise (which is real) and its purpose: not masochism but detachment from outcomes and cultivation of gratitude for what is present. The Stoic purpose: by vividly imagining loss, you interrupt the automatic assumption that what you have will remain. This prevents the complacency that takes things for granted and the catastrophizing that treats potential loss as unbearable. Post-exercise, most people find gratitude for the present moment easier to access."
      }
    ],
    "quiz": [
      {
        "question": "1. What is the Stoic Sage?",
        "answer": "A person of perfect, complete, and unshakeable virtue — possessing all four virtues fully and simultaneously"
      },
      {
        "question": "2. How often does a Sage appear?",
        "answer": "Extremely rarely — 'like the Ethiopian phoenix' (Epictetus). Possibly never in pure form."
      },
      {
        "question": "3. What is a prokopton?",
        "answer": "One making progress — a person oriented toward virtue and moving toward it, practicing the disciplines but not yet in full possession of virtue"
      },
      {
        "question": "4. What is the Stoic logical claim about virtue?",
        "answer": "Virtue is all-or-nothing — you either have it (the Sage) or you lack it (everyone else). No degrees of virtue, like no degrees of being drowned."
      },
      {
        "question": "5. How do the Stoics reconcile 'virtue is all-or-nothing' with 'progress is real'?",
        "answer": "The logical claim concerns possession of virtue (threshold); the practical claim concerns movement toward the threshold. Progress is real movement, even though it doesn't cross the binary threshold until full virtue is achieved."
      },
      {
        "question": "6. What is premeditatio malorum?",
        "answer": "Negative visualization — vividly imagining the loss of what you value, to prevent attachment, cultivate gratitude, and prepare emotionally for possible adversity"
      },
      {
        "question": "7. What is the evening review?",
        "answer": "A daily practice of examining the day's assents, desires, and actions against the Stoic standard — not for self-punishment but for learning and course correction"
      },
      {
        "question": "8. What is the 'view from above'?",
        "answer": "A spiritual exercise of expanding perspective imaginatively — seeing one's circumstances in the context of cosmic scale and time, to reduce their apparent importance"
      },
      {
        "question": "9. Why does Epictetus insist on practice (meletē) as well as argument (logos)?",
        "answer": "Argument shows the direction of progress; practice produces character change through repetition. The Stoic who has practiced for years is not the same person — the exercises restructure perception and automatic response."
      },
      {
        "question": "10. What is the virtues unity thesis?",
        "answer": "You cannot have any one virtue without having all of them — each implies the others. Genuine courage requires wisdom, justice, and temperance to be genuine courage rather than mere recklessness."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "You are not the sage. You will never be the sage. That is fine. You are the prokoptôn — the one making progress. Progress, not perfection, is the standard.",
      "assignment": "Write an honest self-assessment: where are you actually making progress? Not where you want to be — where you genuinely are moving in the right direction, however slowly. Then: where are you not making progress, and what is the one thing that, if you changed it, would matter most? Be specific. Vague self-criticism is not philosophy.",
      "duration": "20 min",
      "greekTerms": "prokoptôn — the one making progress"
    }
  },
  {
    "id": 10,
    "title": "Living According to Nature",
    "subtitle": "The Stoic telos — what it means and why it is not what it sounds like",
    "preSeminarBriefing": {
      "problem": "The Stoics defined the goal (telos) of human life as 'living according to nature' (kata phusin zēn). This sounds like it might mean: follow your instincts, act naturally, live simply. It means none of these things. 'Nature' for the Stoics is a technical term with a specific philosophical meaning — and understanding what they mean by it unlocks the entire practical program.",
      "whyItMatters": "The Stoic telos is the synthesis of everything covered so far: the theory of value (Session 2), the psychology of impression and assent (Session 3), the disciplines (Sessions 4–6), the emotions (Session 7), the cosmology (Session 8), and the ideal of the Sage (Session 9). 'Living according to nature' is the name for the life that integrates all of these — the fully examined, fully rational, fully virtuous life.",
      "whatToWatchFor": "'Nature' in the Stoic formula has at least three senses that must be distinguished: (1) nature as the physical universe — the logos pervading all things; (2) human nature specifically — the rational, social animal; (3) individual nature — your particular constitution, roles, and circumstances. Living according to nature means aligning with all three simultaneously.",
      "yourTask": "In one sentence, state what you currently take to be the goal of your life. Come prepared to examine whether this telos is consistent with the Stoic formula — and to defend it or revise it.",
      "requiredReading": [
        {
          "source": "Diogenes Laertius",
          "passage": "Lives VII.84–89 (on the Stoic telos)",
          "note": "Primary text — required reading."
        },
        {
          "source": "Marcus Aurelius",
          "passage": "Meditations V.1 (complete); VIII.7",
          "note": "Primary text — required reading."
        },
        {
          "source": "Hadot, PhWoL Ch. 3",
          "passage": "as assigned",
          "note": "The philosopher's total commitment. Best pairing with Session 10 (telos)."
        }
      ]
    },
    "parts": [
      {
        "title": "Part 1 — The Stoic Telos: Three Senses of 'Nature'",
        "content": [
          "The Stoic formula '{{kata-phusin|live according to nature}}' was introduced by Zeno and refined through the school's history. Diogenes Laertius reports Zeno's version as 'living consistently' (homologoumenōs zēn), later refined by Cleanthes as 'living consistently with nature' and by Chrysippus as 'living in accordance with the experience of events that happen by nature.'",
          "The three senses of 'nature' that must be combined: First, cosmic nature — the {{logos|logos}} governing the universe. Living according to cosmic nature means accepting what the logos brings, embracing fate with amor fati, and not resisting what cannot be changed. Second, human nature — the rational, social animal. Living according to human nature means exercising reason fully, living in community with other rational beings, and meeting one's obligations as a social animal. Third, individual nature — your particular constitution, talents, roles, and circumstances. Living according to individual nature means playing the roles you have been given as well as they can be played, using your particular capacities in service of virtue."
        ],
        "tables": [
          [
            [
              "Sense of 'nature'",
              "What living according to it requires",
              "Corresponding discipline"
            ],
            [
              "Cosmic nature (logos, fate)",
              "Acceptance of and alignment with what happens; amor fati",
              "Discipline of desire: want what the logos brings"
            ],
            [
              "Human nature (rational, social animal)",
              "Full exercise of reason; fulfillment of social obligations",
              "Discipline of action: act as rationality and roles require"
            ],
            [
              "Individual nature (constitution, roles, circumstances)",
              "Excellence in your particular situation",
              "All three disciplines applied to your specific life"
            ]
          ]
        ]
      },
      {
        "title": "Part 2 — Eudaimonia: The Fully Flourishing Life",
        "content": [
          "The goal of living according to nature is {{eudaimonia|eudaimonia}} — a Greek term often translated 'happiness' but better understood as 'flourishing' or 'the good life.' Eudaimonia for the Stoics is not a feeling state (not what we mean by 'feeling happy') but a condition of the soul: the stable, excellent functioning of the rational faculty in accordance with {{arete|virtue}}.",
          "The Stoic account of eudaimonia has three distinctive features that separate it from rival theories. First, it is internal — eudaimonia is a condition of your soul, not a state of your circumstances. The Sage is eudaimōn in prison. Second, it is complete — virtue is sufficient for eudaimonia; nothing external is needed. Third, it is active — eudaimonia is not a passive state of satisfaction but the active exercise of rational virtue in the circumstances of one's life.",
          "Aristotle's competing view is instructive by contrast. For Aristotle, eudaimonia requires external goods — health, friendship, a degree of wealth, civic participation. The absolutely destitute person cannot flourish. The Stoic response: Aristotle has confused the occasions for virtue with the conditions of flourishing. You need health to exercise certain virtues (courage in athletic contexts, generosity when you have something to give) — but the health is not itself constitutive of flourishing. The virtuous exercise is."
        ]
      },
      {
        "title": "Part 3 — The Stoic Life: Integration",
        "content": [
          "What does the life 'according to nature' actually look like from the outside? Not, as the caricature has it, a life of cold detachment and indifference to everything that happens. The Stoic {{telos|telos}} produces a specific kind of engagement with the world.",
          "Engagement without attachment: the Stoic acts fully and cares deeply about what she does, while holding all outcomes with the reserve clause. She is present, responsive, vigorous in pursuit of what virtue requires — but not devastated when outcomes differ from hopes.",
          "Rationality as the form of every activity: the Stoic does not do a separate 'philosophy' activity and then live the rest of life differently. The Stoic's rational examination of impressions, discipline of desire, and fulfilment of role obligations are not practices added to life — they are the form that life takes. Philosophy, as Hadot insists, is not a theory about life — it is a way of living.",
          "The integration of the three disciplines: living according to nature is the simultaneous operation of all three disciplines — governing desire (wanting what the logos brings), acting appropriately (fulfilling kathēkonta in all roles), and maintaining constant vigilance over assent (prosochē as the background condition of rational living). These are not three separate things; they are three aspects of one way of being."
        ],
        "tables": [
          [
            [
              "Epictetus Discourses 1.20: 'The philosophers say that the first and greatest task of philosophy is the testing of appearances (phantasiai), and not admitting any untested appearance.' The testing is the life."
            ]
          ]
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 10.1 — The Three Senses of Nature",
        "body": "For each of the following situations, identify which sense of 'nature' is most relevant and what 'living according to nature' requires:\n1. You have been diagnosed with a chronic illness.\n2. You are deciding whether to report a colleague's misconduct.\n3. You are considering whether to spend more time developing a particular talent.",
        "answer": "1. Primarily cosmic nature (fate): living according to nature means accepting this event as part of the logos's ordering — amor fati, not resistance. Individual nature is also relevant: your particular circumstances now include this illness; living according to your individual nature means playing your roles as well as possible within this constraint. The illness is a dispreferred indifferent — the response to it is a preferred action.\n2. Primarily human nature (rational, social animal): your role as a rational, social animal generates obligations of justice. The kathēkon of your human role requires that you act for the common good, which includes reporting genuine misconduct. Individual nature may specify how: your particular position, relationships, and circumstances determine the appropriate form of action.\n3. Primarily individual nature: your particular talents are part of your given constitution. Developing them in service of your roles and in accordance with virtue is living according to your individual nature. The relevant question: does this development serve virtue and your roles, or does it serve vanity and the desire for external recognition?"
      },
      {
        "title": "Exercise 10.2 — Eudaimonia vs. Happiness",
        "body": "Explain the difference between eudaimonia as the Stoics understand it and 'happiness' in the ordinary English sense. Why does the distinction matter practically?",
        "answer": "Ordinary happiness is primarily a feeling state — a positive subjective experience, something you have when things are going well, when your desires are satisfied, when you feel good. It comes and goes with circumstances, rises and falls with outcomes. Stoic eudaimonia is a condition of the soul — the stable, excellent functioning of the rational faculty in accordance with virtue. It does not come and go with circumstances because it does not depend on them. The practically important difference: if you pursue ordinary happiness, you must pursue favorable circumstances, and you are at the mercy of what the world brings. If you pursue Stoic eudaimonia, you pursue the quality of your own rational character — and that pursuit can succeed regardless of circumstances. The Stoic path is more demanding (you must change yourself, not just your circumstances) but more reliable (what you pursue is actually within your power)."
      },
      {
        "title": "Exercise 10.3 — Hadot's Contribution",
        "body": "Pierre Hadot argues that ancient philosophy was not primarily a set of theoretical doctrines but a way of life. How does PHIL 701 as a course embody this claim? What would be different if it were merely theoretical?",
        "answer": "If PHIL 701 were merely theoretical, its goal would be: understand what the Stoics said, evaluate the arguments, reach correct beliefs about Stoic ethics. The assignments would test comprehension and argument analysis. If it embodies Hadot's claim, its goal is: through engagement with Stoic arguments and exercises, begin to practice the disciplines — to test impressions, redirect desire, fulfill obligations better, practice prosochē. The assignments are then not just analytical but formative: they ask you to apply, to reflect on your own experience, to practice. The difference shows in what counts as success: for the theoretical course, correct belief; for the practical course, a changed way of engaging with impressions, desires, and actions. Hadot's claim: the ancient philosophical school was not a university — it was a gymnasium for the soul. The doctrines were the equipment; the practice was the workout."
      },
      {
        "title": "Exercise 10.4 — Your Telos",
        "body": "Return to the sentence you prepared before the session: your current statement of what you take to be the goal of your life. Examine it against the Stoic formula. Is it eph' hēmin? Does it depend on externals? Could it be revised to be more consistent with the Stoic telos without losing what you care about most?",
        "answer": "Personal response — no single answer. The exercise aims to make the Stoic telos personally relevant. Strong responses will identify what in their stated goal is genuinely eph' hēmin (the quality of effort, the virtuous engagement) and what is not (external outcomes, others' recognition, specific results). The revision should preserve the orientation (what they care about) while releasing the attachment to outcomes. Most students will find that what they most care about — genuine connection, excellent work, contribution to others — can be reformulated in ways consistent with the Stoic telos. What gets released in the revision is usually the anxiety about whether the external results materialize."
      }
    ],
    "quiz": [
      {
        "question": "1. What is the Stoic telos?",
        "answer": "Living according to nature (kata phusin zēn) — the three-fold alignment with cosmic nature, human nature, and individual nature"
      },
      {
        "question": "2. Who introduced the formula 'live consistently' and who developed it?",
        "answer": "Zeno introduced it; Cleanthes refined it as 'consistently with nature'; Chrysippus as 'in accordance with experience of events that happen by nature'"
      },
      {
        "question": "3. What are the three senses of 'nature' in the Stoic formula?",
        "answer": "Cosmic nature (the logos/fate); human nature (rational, social animal); individual nature (your particular constitution, roles, and circumstances)"
      },
      {
        "question": "4. What is eudaimonia?",
        "answer": "Flourishing — the stable, excellent functioning of the rational faculty in accordance with virtue. A condition of soul, not a feeling state."
      },
      {
        "question": "5. What makes the Stoic account of eudaimonia distinctive?",
        "answer": "It is internal (a condition of soul, not circumstance), complete (virtue is sufficient), and active (the exercise of rational virtue in life's circumstances)"
      },
      {
        "question": "6. How does the Stoic telos differ from Aristotle's?",
        "answer": "Aristotle requires external goods (health, friendship, wealth) for eudaimonia. The Stoics hold virtue is sufficient — external goods are occasions for virtue, not constitutive of flourishing."
      },
      {
        "question": "7. What is Hadot's central claim about ancient philosophy?",
        "answer": "Ancient philosophy was primarily a way of life, not a set of theoretical doctrines. The philosophical school was a gymnasium for the soul; doctrines were equipment, practice was the workout."
      },
      {
        "question": "8. Translate and explain: kata phusin zēn.",
        "answer": "'Living according to nature' — the Stoic telos. Requires alignment with cosmic nature (fate), human nature (reason and sociality), and individual nature (your particular roles and constitution)."
      },
      {
        "question": "9. What does engagement without attachment look like in practice?",
        "answer": "Acting fully and caring deeply about what you do, pursuing virtue's requirements with full commitment, while holding all external outcomes with the reserve clause — not devastated by adverse results"
      },
      {
        "question": "10. Epictetus: 'The testing of appearances is the first and greatest task of philosophy.' Why?",
        "answer": "The testing of appearances (impressions) is prosochē — the discipline of assent. It is the foundational practice because all other disciplines presuppose it. You cannot redirect desire or act appropriately if you cannot first accurately evaluate what the world is presenting to you."
      }
    ],
    "practiceAssignment": {
      "coreIdea": "To live according to nature is to live according to reason — to use the faculty that distinguishes you as a human being in every situation you encounter.",
      "assignment": "For one full day, before any significant decision or response, ask: what does reason recommend here? Not what do I feel like doing, not what is easiest — what does the reasoning part of me, at its best, actually think I should do? At day's end, identify one moment where you followed it and one where you didn't.",
      "duration": "All day, then 10 min reflection",
      "greekTerms": "kata phusin — according to nature / logos — reason"
    }
  },
  {
    "id": 11,
    "title": "Seminar — The Examined Life",
    "subtitle": "Capstone seminar: bringing the course together in open Socratic dialogue",
    "preSeminarBriefing": {
      "problem": "This final session is a seminar — no lecture, no new content. The Socratic Proctor will open with a question and follow your reasoning wherever it leads. The seminar ends when you are satisfied that you have worked through the central question. You are not being tested on whether you agree with Stoicism. You are being asked to think — carefully, honestly, with full engagement.",
      "whyItMatters": "Socrates said 'the unexamined life is not worth living.' The Stoics took this literally — the examined life, the life governed by the three disciplines, the life of prosochē and virtue and amor fati, is the only life fully worth calling human. This course has given you the tools for that examination. The seminar is the first sustained exercise of them.",
      "whatToWatchFor": "The Proctor's questions will probe the consistency, depth, and honesty of your engagement with Stoicism. The questions are not traps; they are invitations to go deeper. When a question feels difficult, that is the moment of philosophical work.\n\nTHE CENTRAL QUESTIONS FOR THIS SEMINAR: Come prepared to engage with at least one of the following:\n\n(1) THE SUFFICIENCY QUESTION: Is virtue really sufficient for happiness? Could you be happy — genuinely, fully happy — in extreme poverty, serious illness, or social isolation? Does the Stoic answer feel true to you, or like a philosophical demand that exceeds human psychology?\n\n(2) THE ENGAGEMENT QUESTION: Does Stoicism's emphasis on the interior — on governing desire and assent — lead to withdrawal from the world, or does the discipline of action (kathēkon, roles, oikeiōsis) provide adequate grounds for full engagement? Can you be a committed parent, a driven professional, a loyal friend, and a Stoic simultaneously?\n\n(3) THE TRANSFORMATION QUESTION: Has anything in this course changed how you see a situation in your own life — even slightly? What would it take for Stoic philosophy to become not just something you know but something you practice?",
      "yourTask": "Choose one of these questions and prepare a 200-word opening statement. The Proctor will respond.",
      "requiredReading": [
        {
          "source": "Review: Encheiridion §§1–2, 5, 8, 14, 17, 20, 53",
          "passage": "see text",
          "note": "Primary text — required reading."
        },
        {
          "source": "Sellars, Stoicism (2006)",
          "passage": "as assigned",
          "note": "Best single-volume overview of the complete Stoic system — physics, logic, ethics. Clear, rigorous, current. PHIL 701 spine."
        }
      ]
    },
    "parts": [
      {
        "title": "Seminar Background I — The Sufficiency of Virtue",
        "content": [
          "The Stoic claim that virtue is sufficient for happiness is the most radical and most contested element of the system. The ancient critics — Aristotelians, Epicureans, Skeptics — all pressed the intuition that a life of extreme suffering cannot be a genuinely good life even if the sufferer maintains perfect {{arete|virtue}}.",
          "The Stoic defense has two levels. First, the philosophical argument: genuine happiness ({{eudaimonia|eudaimonia}}) is the flourishing of the rational soul, not the satisfaction of desires or the absence of suffering. Since the rational soul's flourishing depends on its own activity (virtue), not on external conditions, extreme external conditions cannot undermine it. Second, the phenomenological claim: the Sage who has fully practiced the disciplines actually experiences equanimity under extreme conditions — not because she suppresses feeling but because she has genuinely transformed her relationship to indifferents. The freedom is real, not performed.",
          "The most honest Stoic response to the sufficiency question acknowledges: this is true of the Sage, and the Sage is almost impossibly rare. For the prokopton, external conditions do affect wellbeing — not because they constitute genuine goods and bads, but because the prokopton's discipline is incomplete. The aspiration toward sufficiency of virtue is achievable in degree, not in the absolute form the logical claim requires."
        ]
      },
      {
        "title": "Seminar Background II — Engagement vs. Withdrawal",
        "content": [
          "The charge of Stoic quietism — that the emphasis on internal governance leads to withdrawal from external engagement — is historically persistent and not entirely unfair. Some Stoic texts do read as recommending withdrawal: Epictetus's famous instruction to 'make the best of what is in your power' can be read as counseling minimization of engagement with what is not in your power.",
          "But the full picture is more complex. The discipline of action (kathēkon, roles, oikeiōsis) is a positive mandate for engagement. The Stoic does not retreat from relationships, institutions, or politics — she engages with them from a different orientation: not grasping for outcomes, not driven by fear of failure, but acting from what virtue requires in each role. Marcus Aurelius governed an empire. Cato opposed tyranny to the point of death. These are not the acts of a quietist.",
          "The tension is real, however. When you hold all outcomes with the reserve clause and refuse to let any external outcome affect your happiness, what is the motive for sustained engagement? The Stoic answer: the motive is not the outcome but the action itself. You act well because acting well is what virtue requires — not because it will succeed. This may be philosophically correct and yet psychologically difficult to sustain at the intensity that meaningful projects require."
        ]
      },
      {
        "title": "Seminar Background III — The Transformation Question",
        "content": [
          "Philosophy as transformation is Hadot's central theme — and it is the question that matters most for the practical purposes of this course. Knowing Stoicism is not practicing Stoicism. The gap between knowledge and practice is exactly what the {{askesis|spiritual exercises}} are designed to close.",
          "What might genuine transformation look like after PHIL 701? Not perfection. Not the permanent elimination of passion. Not the constant serenity of the Sage. Rather: an increased pause between impression and assent — a moment of examination where there was previously automaticity. A slightly longer response time to apparent insults, losses, and frustrations. A growing ability to identify the false judgments embedded in disordered emotions before those emotions fully form. A more reliable turning toward what is genuinely eph' hēmin.",
          "The philosophical question for the seminar: is this transformation achievable through a course of study and practice? Or does it require something the Academy cannot provide — a different form of life, a community of practice, a teacher in the Socratic sense? Epictetus ran a school; Marcus Aurelius had his Meditations as a private gymnasium. What form does philosophy as a way of life take in the twenty-first century?"
        ]
      }
    ],
    "exercises": [
      {
        "title": "Exercise 11.1 — Opening Statement",
        "body": "Write your 200-word opening statement for the seminar on one of the three central questions. Be specific, be honest, be prepared to defend it.",
        "answer": "Personal response — the Proctor will engage with whatever position the student takes. The quality of the response is measured by philosophical specificity (not vague agreement or vague rejection of Stoicism), intellectual honesty (engaging with the strongest version of the opposing view), and genuine engagement with the student's own experience."
      },
      {
        "title": "Exercise 11.2 — The Hardest Challenge",
        "body": "Identify the single strongest philosophical challenge to Stoicism that you encountered in this course. State it precisely and describe how the Stoics would respond.",
        "answer": "Likely candidates: (1) The sufficiency of virtue under extreme suffering — the Stoic response is the philosophical argument plus the phenomenological claim about genuine equanimity, acknowledging the Sage standard is rarely met. (2) The compatibility of determinism and responsibility — the cylinder argument; freedom as acting from one's own nature. (3) The all-or-nothing virtue claim — resolved by distinguishing logical threshold from practical progress. (4) Whether amor fati is psychologically achievable for non-Sages — the Stoic response: it is an ideal toward which one progresses; the aspiration is achievable in degree. Strong responses will choose one challenge, state it precisely (not as a straw man), and engage with the best Stoic response without pretending the response is fully satisfying if it isn't."
      },
      {
        "title": "Exercise 11.3 — Course Integration",
        "body": "Trace the following Stoic conclusion through its foundations: 'The Sage in chains is free.' Show how this follows from the theory of value (Session 2), the psychology of assent (Session 3), the telos (Session 10), and the cosmology (Session 8).",
        "answer": "From Session 2 (value): freedom is not freedom of movement (an external condition) but freedom of the ruling faculty — the capacity to assent or withhold assent as one chooses. Chains constrain the body; only false assent constrains the soul. The chains are a dispreferred indifferent — not a genuine bad. From Session 3 (assent): no one can compel the Sage's assent. The ruling faculty cannot be seized or imprisoned; it remains the Sage's own regardless of external constraint. From Session 8 (cosmology): the Sage has amor fati — she would not change her circumstances even if she could, because the logos has brought them and they are the occasion for the exercise of virtue. From Session 10 (telos): the Sage's eudaimonia is the stable, excellent functioning of the rational soul in virtue — a condition of soul, not of circumstance. In chains, the Sage functions rationally and virtuously; therefore the Sage flourishes. The paradox 'in chains but free' is the lived synthesis of the entire philosophical system."
      },
      {
        "title": "Exercise 11.4 — What You Take Away",
        "body": "In 150 words: what is the one Stoic insight from this course that you most want to practice — not just believe — going forward? Be specific about what the practice involves.",
        "answer": "Personal response — the measure is specificity and honesty. 'I want to practice prosochē — pausing between impression and assent' is good if it specifies what that looks like (e.g., 'when I receive criticism, I will take three seconds before responding, and in that time ask: is this eph' hēmin? Is this a genuine bad?'). Generic answers like 'I want to be more Stoic' are insufficient — the exercise is asking for the specific practice, not the general aspiration."
      }
    ],
    "quiz": [
      {
        "question": "1. What is the sufficiency question in Stoic ethics?",
        "answer": "Whether virtue is genuinely sufficient for happiness — whether the Sage could be eudaimōn under conditions of extreme poverty, illness, or suffering"
      },
      {
        "question": "2. How do the Stoics defend the sufficiency of virtue against the intuition that extreme suffering prevents flourishing?",
        "answer": "Two levels: the philosophical argument (eudaimonia is flourishing of the rational soul, not satisfaction of desires, so it doesn't depend on external conditions) and the phenomenological claim (the fully practiced Sage genuinely experiences equanimity — freedom is real, not performed)"
      },
      {
        "question": "3. Is Stoicism quietist?",
        "answer": "Not in principle — the discipline of action requires full engagement with roles and society. But there is a real tension between holding outcomes with the reserve clause and sustaining the intensity that meaningful projects require."
      },
      {
        "question": "4. What distinguishes knowing Stoicism from practicing it?",
        "answer": "Knowledge produces correct beliefs; practice produces character change. The gap is closed by spiritual exercises — repeated practices that restructure perception, desire, and automatic response."
      },
      {
        "question": "5. What transformation might genuine Stoic practice produce over time?",
        "answer": "Increased pause between impression and assent; reduced range of 'catastrophic' indifferents; faster recovery from setbacks; more reliable alignment between stated values and actual behavior"
      },
      {
        "question": "6. What is the 'Sage in chains is free' paradox and what does it demonstrate?",
        "answer": "It demonstrates that Stoic freedom is internal — the freedom of the ruling faculty to assent or withhold assent — not freedom of movement. External constraint cannot constrain the soul's rational self-governance."
      },
      {
        "question": "7. What question does the transformation question ultimately raise about the Academy?",
        "answer": "Whether philosophical transformation requires not just intellectual engagement but a form of life — community, practice, a living teacher — that a course alone cannot provide"
      },
      {
        "question": "8. Socrates: 'The unexamined life is not worth living.' How does PHIL 701 engage with this claim?",
        "answer": "PHIL 701 provides the tools for examination — the disciplines, the theory, the exercises. The seminar asks the student to begin using them on their own life. The claim is taken as a directive, not just a proposition."
      },
      {
        "question": "9. What does the Proctor role in the capstone seminar model from the Stoic tradition?",
        "answer": "The Socratic elenchus — the questioning that forces the student to examine the consistency and depth of their stated positions. Epictetus's school used exactly this method: not lecturing but questioning, making the student discover her own false judgments."
      },
      {
        "question": "10. Complete the following sentence from the Stoic perspective: 'Philosophy is not…'",
        "answer": "'...a theory about life — it is a way of living.' (Hadot) Or: 'a subject to be studied — it is a practice to be performed.' (Epictetus, paraphrase)"
      }
    ],
    "isSeminar": true,
    "practiceAssignment": {
      "coreIdea": "Socrates said the unexamined life is not worth living. You have spent ten sessions learning what examination means. The seminar is a test of whether you can do it with others.",
      "assignment": "Before the seminar: write the one idea from PHIL 701 that has actually changed something about how you live — not your thinking, your living. Bring it to the seminar as your stake in the ground. Philosophy that has not changed your behavior has not yet become yours.",
      "duration": "30 min reflection",
      "greekTerms": "arge nu logoi — enough big words"
    }
  }
];

// Adapts a Phil701Session into the LanguageSession-compatible object the
// LanguageLessonContent renderer expects. Sessions have no explicit learning
// objectives, so `objectives` is empty (the renderer hides the box when empty).
// Data tables become paradigm tables; single-cell tables become callouts.
// The quiz is returned empty here — it is rendered separately as short-answer
// cards by Phil701SessionContent.
export function phil701ToLesson(s: Phil701Session): Omit<LanguageSession, 'vocabulary'> {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    isMilestone: !!s.isSeminar,
    objectives: [],
    parts: s.parts.map(p => {
      const tables = p.tables ?? [];
      const dataTables = tables.filter(t => !(t.length === 1 && t[0].length === 1));
      const quote = tables.find(t => t.length === 1 && t[0].length === 1);
      const part: LanguageSession['parts'][number] = {
        heading: p.title,
        body: p.content.join('\n\n'),
      };
      if (dataTables.length > 0) {
        part.paradigms = dataTables.map(t => ({
          title: '',
          headers: t[0],
          rows: t.slice(1),
        }));
      }
      if (quote) {
        part.callout = { text: quote[0][0] };
      }
      return part;
    }),
    exercises: s.exercises.map(e => ({
      number: e.title,
      prompt: e.body,
      answer: e.answer,
    })),
    quiz: [],
  };
}
