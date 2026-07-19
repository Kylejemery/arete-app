// PHIL 706 — The Impossibility of Willing Evil
// Full content build — Sessions 1–7.
//
// Year 2 doctrine course: anger, error, and the Socratic foundation of Stoic
// ethics. Course thesis: anger presupposes that the offender knowingly chose
// evil; Socratic intellectualism denies that this ever happens; therefore
// anger always rests on a false judgment and can be eliminated, not managed.
// Mirrors the PHIL 702 architecture (briefing, three parts, 10-question
// mixed quiz, practice assignment); session 7 is the capstone dialogue.
// Sessions align with phil706_reading.ts; authoring source:
// data/reference/PHIL_706_Course_Outline.md. The anger practicum runs
// weeks 2–6 (see /dashboard/practicum) and feeds Sessions 6–7.

import type { Phil702Session } from '@/data/phil702';

// Structurally identical to Phil702Session — one shape, one renderer.
export type Phil706Session = Phil702Session;

export const PHIL_706_SESSIONS: Phil706Session[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'No One Does Wrong Willingly — The Socratic Foundation',
    briefing:
      "This course assembles one argument across six sessions: all anger is unnecessary because no one does wrong willingly. Not two doctrines — one argument. Anger presupposes that the offender knowingly chose evil; Socratic intellectualism denies that this ever happens; therefore anger always rests on a false judgment, and what rests on a false judgment can be eliminated, not merely managed. The argument begins four centuries before the Stoa, in three Platonic dialogues where Socrates defends the most counterintuitive claim in ancient ethics: virtue is knowledge, vice is ignorance, and nobody — not the thief, not the tyrant, not you at your worst — has ever done wrong while seeing it clearly as wrong. Your task this session is not to believe the thesis. It is to understand exactly what it claims, why Socrates thought it followed from the structure of desire itself, and what it must explain away. You will meet the strongest objection — 'I knew it was wrong and did it anyway' — and you will not resolve it yet. That is Session 5's work. This session only plants the charge.",
    parts: [
      {
        title: 'Virtue Is Knowledge — The Protagoras Argument',
        content: [
          "In the Protagoras (352a–358d), Socrates confronts the common picture of moral failure: a person knows what is best but is 'overcome by pleasure' — dragged past their own knowledge like a slave. Most people, then and now, treat this as the obvious description of everyday experience. You knew the second bottle was a bad idea; pleasure overpowered the knowing. Socrates calls this picture absurd, and his argument is a masterpiece of reduction. Suppose, as the many do, that the good just is pleasure and the bad just is pain. Then 'I did the bad thing because I was overcome by pleasure' translates to 'I chose the greater pain because I was overcome by the lesser pleasure' — which is not weakness but bad arithmetic. The agent mismeasured. Nearby pleasures loom large the way nearby objects do; distant pains shrink. What looks like being overpowered is actually a perspective error in the measurement of goods.",
          "The conclusion Socrates draws is radical: if wrongdoing is mismeasurement, then what the wrongdoer lacks is not willpower but an art of measurement (metrētikē technē) — a knowledge that would hold appearances steady the way a ruler corrects the illusion of the shrinking road. 'No one who either knows or believes that there is another possible course of action, better than the one he is following, will ever continue on his present course.' Knowledge, for Socrates, is not a passenger that desire can overrule. If it is present — genuinely present, not recited — it governs. What we call akrasia, being overcome, is knowledge failing to be present at the moment of action: eclipsed, distorted, or never real knowledge at all, only opinion wearing its clothes.",
          "Notice what this argument does not claim. It does not claim people never act badly — the dialogues exist because they constantly do. It does not claim people always act on their considered, reflective judgment. It claims that at the moment of action, the agent always pursues what then and there appears best to them. The failure is upstream of the will, in the appearing. This relocation is the entire foundation of the course: if the failure lives in how things appear — in judgment — then the fitting response to wrongdoing is whatever corrects judgment. Punishment might do that. Teaching might. Rage cannot; rage has never once made anything appear more truly.",
        ],
      },
      {
        title: 'The Tyrant Does What Seems Best — Not What He Wills',
        content: [
          "The Gorgias (466d–468e) sharpens the thesis with the hardest case available to a Greek audience: the tyrant, the man who can kill, exile, and confiscate at whim. Polus offers him as the obvious refutation — surely this man does whatever he wants. Socrates answers with a distinction that will echo through every Stoic text in this course: the tyrant does what seems best to him (ha dokei autōi beltista einai) but not what he wants (ha bouletai). What every agent wants, Socrates argues, is the good — their own genuine good. Actions are never wanted for themselves; they are wanted for the good they appear to deliver. We take medicine for health, sail for wealth, kill — if we are tyrants — for security or greatness. If the killing in fact delivers misery, corruption of soul, endless fear, then the tyrant has done what seemed best and precisely failed to do what he wanted.",
          "The argument's engine is the claim that all desire aims at the good. Nobody pursues a thing under the description 'this is bad for me and I want it because it is bad.' Even the self-destructive act is chosen under some description of good — relief, escape, defiance, the only exit visible. The wrongdoer is thus never an enemy of the good; he is a bad archer aiming at it. This is why Socrates can say, without irony, that the tyrant is the least powerful man in the city: power is the capacity to get what you want, and the tyrant, systematically wrong about the good, systematically gets what no one wants — a diseased soul with an army.",
          "Hold this distinction with precision, because the whole course turns on it. 'They knew what they were doing' — the sentence at the heart of every justified rage — equivocates between two claims. That the offender knew the facts of the act: often true. The fraudster knew the accounts were false; Socrates never denies factual knowledge. And that the offender knew the act was bad for them, saw its full badness clearly, and chose it as bad: this, Socrates holds, has never once happened in the history of agency. Between the facts and the choice sits an appearance of good — 'this betrayal is my advantage' — and that appearance is false. The wrongdoer is exactly as free in the moment of wrongdoing as a man doing long division with a wrong times table: fully active, fully responsible for the calculation — and mistaken.",
        ],
      },
      {
        title: 'Hamartia — Missing the Mark, and the Objection That Waits',
        content: [
          "The Meno (77b–78b) closes the loop. Meno asserts what everyone believes: some people desire bad things. Socrates dismantles it with two questions. Those who desire bad things — do they believe the bad things are good, or know them to be bad? If they believe them good, they desire what they take to be good, and the thesis stands: their desire aims at the good and their belief has missed it. And if they supposedly know the things are bad — do they think the bad things benefit them? But whoever is harmed becomes wretched, and 'is there anyone who wants to be wretched?' The desire for bad-known-as-bad dissolves under inspection. What remains is only error: desire aiming at benefit, judgment mislabeling harm as benefit. Nobody desires the bad; some people are wrong about what the good is.",
          "The Greek carries the doctrine in a single word. Hamartia — later the tragedians' word, later still the New Testament's word for sin — means missing the mark, an archery term. The archer wants to hit the target; that is the only reason to draw the bow. Wrongdoing as hamartia means: every wrong act is a shot aimed at the good that lands elsewhere. Contrast the picture buried in our word 'transgression' — a stepping-across, a willful crossing of a known line. The entire Western apparatus of moral rage lives in that second picture: the offender saw the line, and crossed. The Socratic picture removes the picture's premise. There is no clear-eyed crossing. There are only archers, all aiming at the same target, most of them badly trained, some of them catastrophically so.",
          "Now the objection — state it in its strongest form, because you will live with it until Session 5. Akrasia seems to be a datum of experience: 'I knew it was wrong, I felt it was wrong while my hand was doing it, and I did it anyway.' Aristotle thought this real enough to spend a book of the Nicomachean Ethics on it against Socrates. Ordinary language convicts with it; every courtroom assumes it. If even one such case is what it claims to be — clear knowledge of the bad, present and undistorted at the moment of action, overridden by desire — then intellectualism is false, anger's constituting belief is sometimes true, and this course's argument dies in its first session. Do not resolve the tension cheaply. Carry it. The Stoics will answer it not by denying the experience but by re-describing what 'knew' means in it — and the re-description will need the machinery of impressions and assent you built in PHIL 705.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: '1. In the Protagoras, Socrates argues that being "overcome by pleasure" is actually:',
        options: [
          'A failure of willpower that training can correct',
          'A mismeasurement — choosing the greater pain because near pleasures loom large',
          'Proof that desire is stronger than knowledge',
          'A moral flaw deserving punishment rather than teaching',
        ],
        correct: 1,
        explanation: "On the many's own hedonic premises, 'overcome by pleasure' translates to 'chose the greater pain over the lesser' — bad arithmetic, not weakness. The failure is in measurement, which is why the remedy is an art of measurement, not more willpower.",
      },
      {
        type: 'mc',
        question: '2. The Gorgias distinction at the heart of this course is between:',
        options: [
          'What the tyrant does in public and what he does in private',
          'What seems best to the agent and what the agent actually wants',
          'What is legal and what is just',
          'What the agent wants and what society permits',
        ],
        correct: 1,
        explanation: "The tyrant does what seems best to him but not what he wants — because all desire aims at the genuine good, and his judgment of the good is false. He is a bad archer, not an enemy of the target.",
      },
      {
        question: '3. Reconstruct the Meno argument that no one desires bad things.',
        answer: 'Those who "desire bad things" either believe them good — in which case they desire apparent goods and have simply misjudged — or would have to knowingly desire what harms them; but harm makes one wretched, and no one wants to be wretched. So desire for bad-known-as-bad dissolves; only error about the good remains.',
      },
      {
        question: '4. What does hamartia literally mean, and what picture of wrongdoing does it replace?',
        answer: "Missing the mark — an archery term. It replaces the picture of transgression: a willful stepping-across of a known line. On the hamartia picture there is no clear-eyed crossing; every wrong act is a shot aimed at the good that lands elsewhere.",
      },
      {
        type: 'msq',
        question: '5. Which of the following does Socratic intellectualism actually claim?',
        options: [
          'People never act badly',
          'At the moment of action, agents pursue what then appears best to them',
          'The wrongdoer lacks knowledge, not willpower',
          'Factual knowledge of the act is impossible for wrongdoers',
          'All desire aims at the (apparent) good',
          'People always follow their calm, considered judgment',
        ],
        correct: [1, 2, 4],
        explanation: "Intellectualism claims the failure lives in the appearing/judging, not the willing. It does not deny bad action, does not deny the fraudster knows the accounts are false (factual knowledge), and does not claim considered judgment always wins — only that action tracks what appears best at the moment.",
      },
      {
        question: '6. Why does Socrates call the tyrant the least powerful man in the city?',
        answer: 'Power is the capacity to get what you want. All want is for the genuine good; the tyrant, systematically wrong about the good, systematically obtains what no one wants — a corrupted, fearful soul. He does what seems best and thereby fails to do what he wills.',
      },
      {
        question: "7. Distinguish the two claims hidden in 'they knew what they were doing.'",
        answer: "Knowledge of the facts of the act (the fraudster knew the accounts were false) — often true and never denied. Knowledge that the act was bad, seen clearly as bad and chosen as such — this is what intellectualism denies ever happens. Between fact and choice sits a false appearance of good.",
      },
      {
        question: '8. If wrongdoing is a cognitive failure, what follows for the fitting response to it?',
        answer: 'The fitting response is whatever corrects judgment — teaching, demonstration, in some cases corrective punishment as medicine. Rage is excluded not because it is impolite but because it corrects nothing: it has no power to make anything appear more truly.',
      },
      {
        question: '9. State the akrasia objection in its strongest form, as this session requires you to carry it.',
        answer: "'I knew it was wrong — knew it while my hand was doing it — and did it anyway.' If even one such case involves clear, present knowledge of the bad overridden by desire, intellectualism is false and anger's constituting belief is sometimes true. Aristotle pressed exactly this against Socrates.",
      },
      {
        question: '10. Why does this course begin with Plato rather than the Stoics?',
        answer: "Because the Stoic case against anger is not free-standing advice but the conclusion of the Socratic argument: anger presupposes knowing choice of evil; intellectualism denies such choice exists; the Stoics inherit, refine, and weaponize this foundation. Without Session 1, Sessions 2–6 are assertions.",
      },
    ],
    practiceAssignment: {
      coreIdea: 'Every agent pursues what appears good to them — including you, at your worst.',
      assignment: "Choose one act of your own from the past month that you regard as a wrong — a lie, a cruelty, a betrayal of your own standard. Write three sentences. First: the act, stated without softening. Second: the good as it appeared to you at the moment of acting — what benefit, relief, protection, or satisfaction the act seemed to deliver. Third: where the appearance was false. Do not write 'I knew better' — excavate what you were actually aiming at. You are performing the Socratic diagnosis on the one wrongdoer whose inner state you can examine directly.",
      duration: '20 min',
      greekTerms: 'hamartia — missing the mark / akrasia — being overcome (the phenomenon to explain) / metrētikē technē — the art of measurement',
    },
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'The Thief and the Mistaken Judgment — Epictetus on Error',
    briefing:
      "Four centuries after Socrates, a former slave teaches the intellectualist thesis as if it had never been controversial — because for him it is not a thesis but an operating instruction. Discourses 1.18 opens with a challenge from the classroom: surely we may be angry at the thief, the adulterer, the man who wrongs us? Epictetus answers with the doctrine in one sentence: they are mistaken about goods and evils, and the fitting response to a mistake is the one you give any error — show it, and if you cannot show it, pity the one who holds it. Never rage. This session reads the two great anger discourses (1.18 and 1.28) plus 2.26, where Epictetus explains the mechanism: every wrong act contains a contradiction the agent cannot see, and the skilled reprover is the one who makes it visible. You now have the machinery from PHIL 705 to say precisely where the offender's error lives: in assent to a false impression about the good. This session also opens your anger practicum — from this week until Session 6, you log every episode of anger or proto-anger in the practicum, using the protocol in the practice assignment. The doctrine will remain theory until it meets your own Tuesday.",
    parts: [
      {
        title: 'The Impaired Eye — Discourses 1.18',
        content: [
          "Epictetus begins from a premise his students already grant — the Socratic account of action: a person cannot judge one thing beneficial and desire another; cannot judge one thing right and impulse toward another. The mind assents to how things appear to it; action follows assent. Then the turn: if this is so, 'why are you angry with him?' The thief and the adulterer have not chosen evil under the description evil. They are 'mistaken about the greatest matters' — blinded, not in eyesight, but 'in the judgment that distinguishes good from evil.' And then the sentence that should end every courtroom fantasy of righteous rage: 'if it is a great misfortune to be deprived of the greatest things, show him his error and you will see how he desists. But if you do not show him, do not be surprised that he persists — for he is acting on the only appearance he has.'",
          "The analogy Epictetus reaches for is disability — deliberately, from a man with a lame leg. 'Ought we not to pity the blind and the lame? Why then are we not merciful to those who are blinded and lamed in their governing faculty?' Nobody rages at blindness. You do not scream at a man for failing to read a sign he cannot see; if you are decent, you read it to him. The thief's condition is strictly analogous on the intellectualist account: an impairment of the faculty that sees good and evil. The only reason we rage at moral blindness while pitying ocular blindness is that we believe the moral blindness was chosen — that behind the false judgment stands a clear-eyed self that picked it. Session 1 removed that belief. There is no chooser behind the judgment; there is only the judgment.",
          "Epictetus then relocates the harm — the move that makes the doctrine livable rather than saintly. What has the thief actually taken? Your lamp. What has he paid? 'He lost his trustworthiness for a lamp; he became a thief for a lamp.' The exchange rates are absurd once stated. On Stoic axiology the only genuine harm is damage to one's own prohairesis, and the thief has inflicted that damage — on himself. You have lost an external; he has corrupted the only thing that was ever worth anything. This is why Epictetus can say the wrongdoer is the injured party without any paradox: the crime is a self-inflicted wound that happens to inconvenience you. Rage at him adds a second casualty — your own governing faculty — to a scene that already has one.",
        ],
      },
      {
        title: 'Appearances and the Persistence of Error — Discourses 1.28 and 2.26',
        content: [
          "Discourses 1.28 grounds the doctrine one level deeper, in the theory of impressions. 'What is the reason we assent to a thing? Because it appears to us to be so.' It is impossible, Epictetus insists, to assent to what appears false — try, right now, to believe it is night. The appearance holds you. Then the transfer: when a man assents to a falsehood about the good, 'be sure that he did not wish to assent to a falsehood — for every soul is unwillingly deprived of the truth, as Plato says — but the false seemed to him true.' The offender stands to his false judgment exactly as you stand to your inability to believe it is night: held by an appearance. In the moral case we should feel the same absence of anger we feel toward someone who miscounts change in bad light — with one addition: the moral error costs its holder infinitely more.",
          "It is here that Epictetus first stages Medea — the case built to break the doctrine, which Session 5 will meet in full. Medea says, in Euripides' lines that every student knew: 'I understand what evils I intend to do, but passion is stronger than my counsels.' Knowing wrongdoing, in her own voice. Epictetus reads it clinically: she takes revenge on her husband to be more advantageous than saving her children — 'she thinks gratifying her anger and taking vengeance on her husband more profitable than saving her children.' The 'I understand' is real — she knows the acts are called evil, knows they are ruinous by every measure she once held — and yet at the moment of action, vengeance appears as her good, the one thing worth having. 'It is the deception that is the error,' Epictetus says, and asks for the response the whole course is building: 'Why then are you angry with her, unhappy woman that she is, because she has gone astray in the greatest matters and has been transformed from a human being into a viper? Why not, if anything, pity her?'",
          "Discourses 2.26 supplies the mechanism of correction. Every error involves a contradiction: the wrongdoer wants to act rightly — wants their own good, wants to be in the right; all pursuit proves it — and does what will not achieve it. 'He who is in error does not wish to err, but to be in the right; plainly then he is not doing what he wishes.' The thief wants profit and buys self-corruption; the liar wants safety and forfeits the trust that was his actual security. The error persists only while the contradiction is invisible. Hence the definition that turns reproof into a skill: 'he who can show each person the contradiction which causes his error, and can clearly bring home to him how he fails to do what he wishes and does what he does not wish — that man is powerful in argument.' Show a person sharply enough that their own act defeats their own aim, and they abandon it as spontaneously as you drop a mistaken sum. 'But if you do not show it, do not be angry with him — for he does what seems right to him. What else can anyone do?'",
        ],
      },
      {
        title: 'Where the Error Lives — Assent, and the Practicum Opens',
        content: [
          "You built this machinery in PHIL 705; now set it into the anger doctrine with precision. An impression (phantasia) arrives — in the offender: 'taking this is my advantage'; 'she deserves this'; 'this lie is my safety.' The impression is not yet the error; impressions arrive unbidden, in thieves and sages alike. The error is sunkatathesis — assent — the governing faculty's stamp of TRUE on the impression. That stamp is the whole crime. Everything downstream — impulse, act, lamp gone — is mechanical consequence of a judgment about the good. This is why Enchiridion 42 compresses the entire doctrine into a domestic instruction: when someone speaks ill of you, remember 'he does what he does because it appears so to him.' He cannot follow what appears to you, only to him; if he sees falsely, 'he is the one harmed, for he is the one deceived.' Repeat, says Epictetus, on each occasion: 'It seemed so to him' (edoxen autōi). Four words that are the complete analysis of every offense you will ever receive.",
          "Watch what the vocabulary does to the offender's malice. 'He knew exactly what he was doing' — run it through the machinery. He had the impression of his advantage; he assented; he acted. At which step did he see, clearly and presently, that the act was bad for him and choose it under that description? The machinery has no slot for that step. Assent to 'this is bad for me, simply and fully, and I take it' is what Discourses 1.28 rules out as psychologically impossible — you cannot stamp TRUE on what appears false, and 'bad for me, chosen as such' never appears true. What malice actually is, on this account: assent to a monstrous impression of the good — 'their suffering is my satisfaction,' 'cruelty is my strength.' Monstrous, and mistaken. The more premeditated the malice, the more elaborate the false judgment — premeditation multiplies the error, not the clear-sightedness. This is exactly the re-description of 'knowing wrongdoing' that Session 1 promised, and Medea is its test case; Session 5 will decide whether it survives her.",
          "Now the practicum. Doctrine about anger that is not tested against your own anger is recitation, and this Academy's Evaluator has no mercy for recitation. From this week until Session 6, log every episode of anger — including flashes that never became words — in the anger practicum. The protocol has four steps at the moment (or the same evening), plus a nightly review you will learn formally in Session 6. One: log the flash — situation and first movement, body and mind, no judgment yet. Two: the judgment — did you assent to 'I was wronged and retaliation is fitting'? What exactly did you tell yourself? Three: the offender's good — what mistaken good was the other person pursuing? This field is required, and 'they're just evil' is not an answer; it is the abdication this whole course exists to make impossible. Four: the corrected response — what would teaching, pity, or firm correction look like here? You are not required to have responded well. You are required to have analyzed honestly. Session 6 runs on this data; the capstone will ask you what your own most frequent judgment turned out to be.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: '1. In Discourses 1.18, Epictetus argues we should not be angry with the thief because:',
        options: [
          'The theft of an external is too trivial to merit any response',
          'Anger would be socially counterproductive',
          'The thief is mistaken about goods and evils — blinded in the judging faculty — and error calls for showing or pity',
          'The thief may have extenuating circumstances we cannot know',
        ],
        correct: 2,
        explanation: "The argument is not about triviality or tactics. The thief acts on the only appearance he has; his condition is strictly analogous to blindness — an impairment of the faculty that distinguishes good from evil — and nobody rages at the blind.",
      },
      {
        question: '2. Why does Epictetus compare the wrongdoer to a person with impaired vision, and what belief must be removed for the comparison to hold?',
        answer: "Both act on a defective presentation of reality they did not choose. The comparison holds only once you remove the belief that behind the false moral judgment stands a clear-eyed self that picked it. There is no chooser behind the judgment; there is only the judgment.",
      },
      {
        question: "3. What did the lamp thief pay for the lamp, and what doctrine of harm makes that the right description?",
        answer: 'He lost his trustworthiness for a lamp — became a thief for a lamp. On Stoic axiology the only genuine harm is damage to one\'s own prohairesis; the victim lost an external, the thief corrupted his governing faculty. The wrongdoer is the injured party.',
      },
      {
        type: 'mc',
        question: "4. 'Every soul is unwillingly deprived of the truth' functions in Discourses 1.28 to show that:",
        options: [
          'People should study logic before ethics',
          'Assent to a falsehood is never desired as falsehood — the false seemed true, so the error is a deception, not a choice of evil',
          'The soul is immortal and returns to truth after death',
          'Only philosophers can attain true judgments',
        ],
        correct: 1,
        explanation: "You cannot assent to what appears false (try believing it is night). The offender who assents to a false good is held by an appearance exactly as you are — the error is suffered, not elected.",
      },
      {
        question: '5. How does Epictetus read Medea\'s "passion is stronger than my counsels" without abandoning intellectualism? (Preview — Session 5 completes this.)',
        answer: "She judges vengeance more profitable than saving her children — gratifying her anger appears as her good at the moment of action. Her 'I understand' is knowledge of what the acts are called and cost by her former measures, not clear present sight of them as bad chosen as bad. The deception is the error; the response owed is pity.",
      },
      {
        question: '6. State the contradiction that, per Discourses 2.26, lives inside every wrong act.',
        answer: 'The wrongdoer wants to be in the right and to secure their own good — all pursuit proves it — and does what will not achieve it. The thief wants profit and buys self-corruption. He is not doing what he wishes; the error persists only while this contradiction is invisible to him.',
      },
      {
        question: '7. What makes someone "powerful in argument" on Epictetus\'s definition, and why does that skill replace anger?',
        answer: 'The ability to show each person the contradiction causing their error — how they fail to do what they wish and do what they do not wish. Made visible, the error is dropped like a mistaken sum. If you cannot show it, anger remains useless: the person does what seems right to them. What else can anyone do?',
      },
      {
        type: 'msq',
        question: '8. Per this session, which of the following are true of the phantasia–sunkatathesis analysis of an offense?',
        options: [
          'The arriving impression is already the error',
          'The error is the assent — the stamp of TRUE on a false impression of the good',
          'Everything downstream of assent is mechanical consequence',
          "Malice is assent to a monstrous impression of the good — 'their suffering is my satisfaction'",
          'Premeditation proves clear-sighted choice of evil',
          "Assent to 'this is bad for me, simply and fully, and I take it' is psychologically impossible",
        ],
        correct: [1, 2, 3, 5],
        explanation: "Impressions arrive unbidden in thieves and sages alike — the crime is the assent. Premeditation multiplies the false judgment, not the clear-sightedness; the machinery has no slot for choosing the seen-as-bad.",
      },
      {
        question: "9. Unpack Enchiridion 42's instruction — 'It seemed so to him' — as a complete analysis of receiving an insult.",
        answer: "The insulter acts on his own appearance, not yours; he cannot do otherwise. If the appearance is false, the harm falls on him — he is the one deceived. Repeating 'edoxen autōi' locates the event correctly: his error, his damage, nothing of yours touched unless you add assent of your own.",
      },
      {
        question: '10. What does the practicum protocol require in its third step, and why is "they\'re just evil" a rejected entry?',
        answer: "It requires naming the mistaken good the offender was pursuing. 'They're just evil' asserts the willing-evil picture this course has dismantled — it is the abdication of analysis, treating the offender as a chooser of the seen-as-bad, which intellectualism holds has never once occurred.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The offender is held by a false appearance of the good — and your anger is your own assent to a false appearance of harm.",
      assignment: "Open your anger practicum this week (Dashboard → Practicum). Log every episode of anger or irritation — including flashes that never surfaced — using the four-step protocol: the flash (situation and first movement, no judgment); the judgment (did you assent to 'I was wronged and retaliation is fitting' — in what exact words?); the offender's good (the mistaken good they were pursuing — required, and 'they're just evil' is rejected); the corrected response (what teaching, pity, or firm correction would look like). Additionally, once this week, run the Enchiridion 42 drill live: at the next slight — interruption, rudeness, a cutting remark — say internally, before anything else, 'It seemed so to them,' and log what that did to the sequence.",
      duration: '15 min per episode + nightly',
      greekTerms: 'phantasia — impression / sunkatathesis — assent / edoxen autōi — it seemed so to him / prohairesis — the governing faculty',
    },
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Anger Anatomized — Seneca and the Two Movements',
    briefing:
      "De Ira is the longest surviving ancient treatise on a single emotion, written by a man who had watched Caligula's court from the inside and knew exactly what institutionalized rage looks like. Its first movement is a portrait — anger as 'brief madness,' the ugliest and most frenzied of the passions — but its philosophical core is an anatomy. Book 2 dissects the experience of getting angry into stages: the involuntary first movement (the flash of heat, the jolt at an insult — what the Stoics called propatheia), and then anger proper, which exists only when the mind assents to a composite judgment: I have been wronged, and it is fitting that I retaliate. Everything in this course hangs on the line between those stages. The flash is nature and carries no moral weight; you will feel it until you die. The assent is yours. This session teaches you to find that line in your own experience — your practicum log is already collecting the raw material — because what is voluntary can be refused, and what can be refused can be eliminated. The Peripatetics wanted anger moderated, harnessed, dosed. Seneca's anatomy explains why that is like asking for a moderate leap from a cliff: assent is not a dial, it is a threshold. Once crossed, the mind does not govern the passion; the passion governs the mind.",
    parts: [
      {
        title: 'The Portrait — De Ira 1.1–1.4',
        content: [
          "Seneca opens with the face. Other passions can hide; anger declares itself: eyes blazing, complexion flushed or draining, lips trembling, teeth clenched, the voice breaking into something not quite human — 'no plague has cost the human race more.' Where other vices drive the mind, anger hurls it. His formal name for it is brief madness (brevis insania), and he means the clinical comparison: the angry man, like the madman, has lost the capacity to receive correction; reason cannot get a hearing because the faculty that would hear has been captured. 'Certain wise men have said that anger is a brief madness; for it is equally devoid of self-control, forgetful of decency, unmindful of ties, persistent and diligent in whatever it begins, closed to reason and counsel, excited by trifling causes, apt to perceive neither what is true nor just.'",
          "Then the definition, which carries the entire Stoic analysis inside it: anger is 'a burning desire to avenge a wrong' — cupiditas ulciscendae iniuriae — or, in the fuller formula Seneca inherits, a desire to repay suffering on one who is judged to have harmed one unjustly. Read it as a Stoic and every word is a judgment. Desire to avenge: an impulse toward retaliation as a good — vengeance judged fitting, beneficial, owed. A wrong: injury judged to have occurred, and judged unjust — deliberate, culpable, the kind an agent chose. Anger is not a pressure that builds in the body; it is a conclusion. It has premises. And premises can be false.",
          "Note carefully what the definition makes anger require: the judgment that I have been wronged — not merely damaged. A falling tile damages you; only an agent wrongs you, and only an agent who acted knowingly and unjustly. Anger's own logic, in other words, presupposes the willing wrongdoer — the clear-eyed chooser of evil that Sessions 1 and 2 dismantled. Seneca will not cash that connection fully until we assemble the syllogism in Session 5, but see it already standing in the definition: if no one does wrong willingly, then the injury-as-outrage that anger requires never occurs as judged, and every instance of anger contains a factual error about the offender's mind. The portrait shows anger ugly; the definition shows it false. Ugly could be endured if it were true.",
        ],
      },
      {
        title: 'The Two Movements — De Ira 2.1–2.4',
        content: [
          "Book 2 opens with the question the whole anatomy serves: does anger begin from judgment or from impulse — 'does it arise of its own accord, or like much else that goes on within us, with our knowledge?' Seneca's answer creates the two-stage structure. First: a movement of the mind that is not voluntary — the jolt at an insult, heat rising at the sight of injustice, the start at bad news. These first movements (what the Greek tradition called propatheiai) are 'a preparation for passion, not passion itself.' They cannot be prevented by reason, any more than a shiver at cold water, a wince at a scraping sound, vertigo at a cliff edge. 'None of these things is in our power; no reasoning avails to keep them from occurring.' The strongest proof is theatrical: we flush at a staged insult, weep at a fiction, tense at a shipwreck in a painting. No one judges the painting to have wronged them. The body rehearses passion without the mind's signature.",
          "Anger proper begins at the second movement: assent. The impression arrives — 'I have been injured; it would be fitting to avenge this' — and the mind, 'with the approval of the will' (cum voluntatis adsensu), stamps it true. Seneca is exact about the content: anger is 'a movement of a mind proceeding to revenge by choice and judgment' — the mind 'assents to the appearance of injury received.' This is why anger 'never occurs without the mind's approval': it dares nothing on its own; it must have the judgment 'I was wronged, retaliation is owed' underwritten before it can act. The composite structure matters for practice: two clauses, either of which can be refused. 'I was wronged' — was I? By an agent choosing evil knowingly, or by someone assenting to a false good, Session 2's blind man with a hammer? 'Retaliation is fitting' — is it? What exactly does the suffering of the mistaken correct? Anger needs both clauses signed. Decline either signature and the flash dies where it stood: a propatheia, a body-event, weather.",
          "Aulus Gellius preserves the perfect field test (Attic Nights 19.1). A Stoic philosopher is caught in a violent storm at sea; the passengers watch him go pale, tremble — visibly shaken like everyone else. When the storm passes, a rich passenger mocks him: what kind of sage turns white? The philosopher pulls out a book of Epictetus and reads the doctrine: the appearances strike sage and fool alike — the pallor, the contraction, the jolt are nature's tax, paid by everyone. What distinguishes the sage is what happens next: he 'does not assent' — he withholds the judgment 'something terrible is happening to me' that would convert the body's alarm into the soul's passion. The fool's mind 'approves' the first movement and collapses into it. Pallor without passion: the entire two-movements doctrine in one seasick philosopher. Your practicum flashes are the pallor. What you sign afterward is the passion.",
        ],
      },
      {
        title: 'Voluntary, Therefore Eliminable — Against the Moderation Doctrine',
        content: [
          "Now draw the consequence that separates Stoic therapy from every counseling tradition since: because anger exists only at assent, and assent is the one act that is wholly ours, anger is voluntary — and the voluntary can be refused entirely. Not suppressed after arising: refused at the gate, unformed. The propatheia is exempt from the project — Seneca never asks you not to flush, and a doctrine that did would be asking you not to have a nervous system. The project targets the signature alone. This is also why no guilt attaches to the flash, a point your practicum requires you to live: logging 'heat rose, jaw clenched' is logging weather, not sin. The examined life begins one step later, at the question the log's second field asks — did you sign?",
          "The Peripatetics — Aristotle's school — held the moderation doctrine this anatomy is built to destroy: anger in the right amount, at the right target, is useful; the virtue is a mean, not an absence; anger is the spur of courage and the fuel of justice. Seneca's structural reply comes straight from the two movements: you cannot dose assent. 'It is easier to exclude harmful passions than to rule them; easier to deny them admittance than, after admittance, to control them' — for once the mind 'has been thrown into commotion and shaken from its balance, it is enslaved to the thing that drives it.' The request 'be angry, but moderately' asks the mind to sign the judgment 'retaliation is fitting' and then retain jurisdiction over what the signature licenses. But the signature is a transfer of jurisdiction: reason that has certified vengeance as good has already resigned as the assessor of how much vengeance is good. 'The best course is to reject at once the first incitement to anger, to resist its very germs' — the moderation doctrine is the plan to leap moderately from the cliff.",
          "Feel the ground this session has gained for the course's argument. Session 1: wrongdoing is error, never willing evil. Session 2: the error lives in assent to a false impression of the good — and the wrongdoer, deceived, is owed showing or pity. This session: your anger is the same machine running in you — an impression ('wronged! retaliate!') seeking your signature, and everything hangs on withholding it. The symmetry is the course's deepest lesson: the offender assented to a false good; the moderation doctrine invites you to assent to a false good ('fitting vengeance'); the two errors are the same error, and the practicum's four fields walk you out of both. What remains is to prove the impression false in every case — that no offense, however malicious, ever satisfies 'they knowingly chose evil.' That is Sessions 4 and 5: first the demolition of anger's usefulness, then the syllogism that convicts it of resting, always, on a factual mistake.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: "1. Seneca's formal definition of anger is:",
        options: [
          'An excess of the spirited part of the soul, needing moderation',
          'A burning desire to avenge a wrong — impulse toward retaliation judged fitting against injury judged unjust',
          'An involuntary physiological storm triggered by insult',
          'A social display evolved to deter repeat offenses',
        ],
        correct: 1,
        explanation: "Cupiditas ulciscendae iniuriae. Every word is a judgment: injury judged to have occurred and been unjust, retaliation judged fitting. Anger is a conclusion with premises — and premises can be false.",
      },
      {
        question: "2. Why does Seneca call anger 'brief madness,' and what is clinical rather than rhetorical in the comparison?",
        answer: 'Like the madman, the angry man has lost the capacity to receive correction — reason cannot get a hearing because the faculty that would hear is captured. Closed to counsel, blind to the true and just: the comparison describes a functional incapacity, not just ugly behavior.',
      },
      {
        question: '3. What are the propatheiai, and what is the strongest evidence that they are not passions?',
        answer: "Involuntary first movements — the jolt, heat, pallor, tears — 'preparation for passion, not passion itself,' unpreventable by reason like a shiver or vertigo. Strongest evidence: we flush at staged insults and weep at fictions, where no one judges themselves wronged. The body rehearses passion without the mind's signature.",
      },
      {
        type: 'mc',
        question: '4. Anger proper exists, on the two-movements doctrine, exactly when:',
        options: [
          'The physiological arousal crosses a threshold of intensity',
          'The provocation is objectively unjust',
          "The mind assents to the composite judgment 'I have been wronged and retaliation is fitting'",
          'The first movement is not discharged through expression',
        ],
        correct: 2,
        explanation: "Anger 'never occurs without the mind's approval' — it is a movement of the mind proceeding to revenge by choice and judgment. No assent, no anger: only weather.",
      },
      {
        question: '5. Why does the composite (two-clause) structure of anger\'s judgment matter for practice?',
        answer: "Because either clause can be independently refused. 'I was wronged' — or was I damaged by someone assenting to a false good? 'Retaliation is fitting' — what does the suffering of the mistaken correct? Anger needs both signatures; declining either leaves the flash a body-event.",
      },
      {
        question: '6. Retell the Gellius storm episode and state what it proves.',
        answer: 'A Stoic in a violent storm goes pale and trembles like everyone else; mocked afterward, he cites Epictetus: appearances strike sage and fool alike, but the sage withholds assent to "something terrible is happening to me" while the fool approves it. Pallor without passion — the two movements are separable in live experience.',
      },
      {
        question: '7. Why does no guilt attach to the first movement, and what practical consequence does this have for your practicum log?',
        answer: 'The flash is unpreventable nature — no reasoning keeps it from occurring, so it cannot be commanded and carries no moral weight. Practically: logging "heat rose, jaw clenched" is logging weather. The examined life begins at the log\'s second field: did you assent?',
      },
      {
        question: "8. Reconstruct Seneca's structural argument against the Peripatetic moderation doctrine.",
        answer: "Moderation requires reason to sign 'retaliation is fitting' yet retain jurisdiction over dosage. But the signature is a transfer of jurisdiction: once the mind is shaken from balance it is enslaved to what drives it; reason that certified vengeance as good has resigned as assessor of how much is good. Easier to refuse admittance than to govern after admitting — you cannot leap moderately from a cliff.",
      },
      {
        type: 'msq',
        question: '9. Which of the following follow from the claim that anger is voluntary?',
        options: [
          'Anger can be refused at the gate, not merely suppressed after arising',
          'The propatheia must also be eliminated for full virtue',
          'Anger is a legitimate target for complete elimination',
          'The angry person has, at some point, signed a judgment',
          'Elimination requires never feeling the first flash again',
        ],
        correct: [0, 2, 3],
        explanation: 'Voluntariness locates anger at assent, which can be withheld — hence eliminable in full. The propatheia is exempt: Seneca never asks you not to flush; a doctrine that did would be asking you not to have a nervous system.',
      },
      {
        question: "10. State the symmetry this session establishes between the offender's error and your anger.",
        answer: "The offender assented to a false impression of the good ('this betrayal is my advantage'); anger invites you to assent to a false impression of the good ('fitting vengeance'). Same machine, same error, in two minds. The practicum's fields walk both analyses; what remains is proving anger's impression false in every case — Sessions 4 and 5.",
      },
    ],
    practiceAssignment: {
      coreIdea: 'The flash is nature and carries no guilt; anger begins at your signature — and signatures can be withheld.',
      assignment: "This week your practicum log gains precision. For every episode, mark the exact seam between the two movements: describe the first movement in purely physical terms (heat, clench, surge — weather report language), then quote the judgment that sought your assent, verbatim, in its two clauses: what told you 'I was wronged,' and what told you 'retaliation is fitting.' Record whether you signed — one clause, both, or neither — and at what moment the signing happened (instantly? after rehearsing the offense?). Once this week, attempt a live refusal: at the flash, name it aloud or internally as weather — 'first movement' — and delay any judgment for ten breaths. Log what the impression did when left unsigned: held, faded, or returned with reinforcements.",
      duration: '15 min per episode + nightly',
      greekTerms: 'propatheia — first movement / pathos — passion / orgē — anger / brevis insania — brief madness / cum voluntatis adsensu — with the will’s assent',
    },
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Against Useful Anger — The Demolition of the Defenses',
    briefing:
      "Nobody defends anger as pleasant. Its defenders — from Aristotle's school to your own mind at its most convinced — defend it as useful: the spur of courage, the engine of justice, the energy of moral seriousness, the only language cruelty understands. If any of those defenses stands, elimination is a mistake — you would be disarming the good. So Book 1 of De Ira is a systematic demolition, and this session walks its wrecking pattern: anger as motivation in war and daily struggle, anger as the executor of justice and punishment, anger as greatness of soul, anger as deterrent. Seneca's master principle throughout: whatever anger does, reason does better, and anger adds only distortion. The demolition matters doubly for us moderns, because our therapeutic culture has quietly conceded the Stoic case's conclusion while rejecting its premise — 'anger management' assumes anger is a permanent resident to be housed and scheduled, not a false judgment to be refuted. And a warning as you read: the strongest defense — righteous anger at genuine injustice — will feel like it survives this session. Note that feeling in your practicum. Session 5 will show why even it rests on the mistake about willing evil; today we only take away its usefulness.",
    parts: [
      {
        title: 'The Motivation Defense — War, Struggle, and the Unreliable Weapon',
        content: [
          "Aristotle's school held that anger is the whetstone of courage — that the soldier without it lacks fire, that great deeds need hot blood. Seneca answers with the professional soldier's own standards. 'Reason by itself is enough not only to see what is to be done but to do it'; anger is a weapon that wields its bearer. The angry fighter abandons formation, overextends, cannot retreat, cannot feint, cannot wait — 'the enemy most easily defeated is the one who fights in a rage.' Discipline defeats fury as a standing fact of military history: the berserker charge breaks against the line that holds. 'Anger is not useful even in war or in peace; for it makes war seem like an easy matter, and since it wishes to be dangerous, it is itself exposed to danger.' If courage needed anger, the coolest troops would be the worst; they are the best.",
          "Generalize the point past the battlefield, because the motivation defense mostly lives in civilian clothes: I need my anger to stand up to my boss, to fight for my child, to push through the confrontation I would otherwise dodge. Seneca's diagnosis: what you are calling anger's necessity is reason's abdication. The impulse to protect your child does not come from anger — it comes from love and the judgment that protection is owed; anger is a parasite on that judgment, adding tremor to the hand and distortion to the aim. The test is empirical, and your practicum is running it: examine any episode where anger 'got things done' and separate what the doing required — clarity about the wrong, resolve, energy, persistence — from what anger contributed — the shaking voice, the overshot threat, the words that turned a negotiation into a feud, the apology owed afterward that cost back the ground gained. 'Virtue should never be aided by vice'; a cause that needs rage is a cause you have not yet actually judged worth acting on — because if you had, the judgment would suffice.",
          "The defender retreats to greatness of soul: is not anger at least large — the response of a spirit too big to be trampled? Seneca is at his most cutting here: 'there is nothing great in anger; it is the swelling of a diseased thing, not the strength of a sound one.' Anger is not large; it is inflamed smallness — the certain symptom of a mind that has judged itself injurable by externals, which is precisely the judgment magnanimity has outgrown. 'No one is made braver through anger, except one who without anger would not have been brave at all: anger does not come to assist courage, but to take its place.' The genuinely great soul is unwoundable not because it is armored but because it keeps its good where no offense reaches — and what cannot be wounded has nothing to avenge. Every angry 'how dare they' is an affidavit of where you have stored your good: in the dare-able.",
        ],
      },
      {
        title: 'The Justice Defense — The Undistorted Judge',
        content: [
          "The noblest defense: anger at injustice is justice's own energy — the judge should feel outrage at the crime, the citizen at the atrocity; not to be angry is not to care. Seneca's reply is the treatise's most important argument, and it runs through the judge. Justice is a measuring act: what happened, what was culpable, what correction fits, what the person's whole condition calls for. Anger is, by the anatomy of Session 3, assent to a judgment already formed — 'wronged! retaliation is owed!' — before the measuring is done. The angry judge is therefore not a stern judge; he is a corrupted instrument, measuring with a bent ruler he holds because it feels straight. 'The sword of justice is ill-placed in the hands of an angry man'; anger 'does not judge the case, but follows its own impulse.' Where the crime is real, anger is not the perception of its reality — it is the thing standing between the judge and the perception, inflating, personalizing, demanding the satisfaction of the punisher rather than the good of the whole. Justice needs the full sight of the wrong; anger is a way of not fully seeing it.",
          "What does correction look like with the anger subtracted? Seneca's answer is the physician: punishment as medicine, administered 'without anger, with the appearance of severity but not its passion.' The doctor amputating does not hate the leg. Punishment retains every legitimate function — restraint of the dangerous, correction of the corrigible, deterrence of others, in extremity the removal of the incurable — and performs each better when rage is subtracted, because each is a dosing problem: how much, for whom, toward what end. The punisher-as-physician asks what will heal; the punisher-as-avenger asks what will satisfy — and satisfaction has no natural dosage, which is why vengeance escalates and medicine does not. Note what this preserves from Session 2: the offender is the mistaken one, the blind-in-the-judging-faculty; correction that might cure him is owed; rage that merely repays him is a second error added to his. Seneca even licenses the pretense of anger, the raised voice as instrument, where the patient responds to nothing gentler — theater, with reason backstage holding the dose.",
          "Now the deterrence defense in its modern dress: without anger, wrongdoers walk; rage is the price signal that keeps predators honest; a person incapable of anger advertises himself as prey. Unbundle it. Deterrence requires consequences credibly delivered — and the credible delivery of consequences is a matter of resolve, not temperature. The unangry are not the unresisting; the Stoic who will calmly end the partnership, file the suit, testify, strike back in war, is more deterring than the volcano, because his response has no exploitable failure mode: he cannot be baited, flattered off course, exhausted into a settlement, or provoked into the overreach that hands his opponent the moral high ground. What actually advertises prey is the flash-and-fade pattern anger produces — huge display, no follow-through, then guilt-driven concession. Firmness is a property of judgment; anger is a property of judgment's absence; the predator reads the difference perfectly. Your boundary does not need your blood pressure. It needs your verdict, and verdicts, as Session 3 taught, are exactly what anger prevents you from forming well.",
        ],
      },
      {
        title: "The Costs, the Modern Frame, and the Defense Still Standing",
        content: [
          "Book 3 turns the ledger to what anger costs the angry, and Seneca writes it as the treatise's darkest accounting: 'no passion is more eager for revenge than anger, and for that very reason none is more unfit to take it'; hasty and frantic, 'like almost all desires, it hinders itself in the attainment of what it hastens to.' The angry man cannot even execute vengeance competently. And the collateral: 'anger, though it be unwilling, must return upon itself' — it punishes the bearer with the sleepless replaying of the offense, the corrosion of every tie ('while it injures another it injures itself'), the life spent, as Seneca says of humanity at war with itself, breaking what cannot be bent. Weigh it in practicum terms: sum the actual returns of your ten most recent signed angers — wrongs corrected, respect gained, terms improved — against the invoice: hours of rehearsal, words requiring repair, the enemy manufactured, the self you had to be for the duration. Seneca's wager is that the ledger has never once balanced. 'No plague has cost the human race more.'",
          "Set the Stoic thesis now against its modern rival, because you will defend the difference in the capstone. Contemporary therapeutic culture — and its philosophical wing, which Nussbaum's Anger and Forgiveness both represents and complicates — treats anger as a permanent resident of the psyche: evolutionarily installed, ineliminable, to be managed — vented safely, expressed assertively, channeled into activism. Notice the concession hiding in 'management': it grants that anger, unmanaged, is destructive — grants the whole Senecan ledger — while assuming the source cannot be touched, only the plumbing. The Stoic claim is precisely that the source can be touched, because the source is not a reservoir but a judgment, renewed at every episode by a fresh act of assent. Nothing needs to be vented, because nothing is stored; what is called 'suppression' — the managed man biting down on a formed anger — is indeed toxic, and the Stoic prescription is not suppression but non-formation: the verdict refused at the gate, after which there is nothing to suppress. Nussbaum herself, from outside the Stoa, reconstructs anger's inner payback-wish and finds it irrational — either the metaphysical magic of thinking the offender's suffering undoes the wrong, or the narcissism of down-ranking the offender to restore relative status — and her conclusion lands strikingly near Seneca: the rational residue of anger is not anger but the forward-looking pursuit of welfare and correction. The management frame houses a tenant; the Stoic frame checks his credentials and finds he was never entitled to the room.",
          "End by conceding, carefully, what this session has not proven. The demolition shows anger useless — everything it claims to do, judgment does better. Uselessness is not falsity. The defender can retreat to a last position: 'granted, my anger at the fraud, the abuse, the atrocity helps nothing — but it is fitting; some things deserve anger, whether or not it pays.' Righteous anger, decoupled from utility, held as pure moral perception. Locate this defense in your own chest — the case where calm response feels not just difficult but obscene, complicity in miniature. Your practicum's hardest entries live here. Now see what the defense must assume to stand: that the offender's act was the kind that deserves repayment-in-suffering — that behind it stood a chooser who saw the evil as evil and elected it, since error, as every session has established, calls for correction and pity, not desert. 'They deserve it' is the willing-evil picture in its last costume. Session 5 assembles the full syllogism against it and takes it through the hardest cases — the abuser, the fraud, Medea with the knife. What falls tomorrow is not anger's usefulness, already rubble, but its truth.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: '1. Seneca\'s master principle against every instrumental defense of anger is:',
        options: [
          'Anger is too unpleasant to be worth its results',
          'Whatever anger does, reason does better — anger adds only distortion',
          'Anger is acceptable in emergencies but not in deliberation',
          'Anger belongs to the young and should be outgrown',
        ],
        correct: 1,
        explanation: 'The demolition never argues that motivation, courage, justice, or deterrence are unnecessary — it argues each is performed better by undistorted judgment, so anger contributes nothing but the distortion.',
      },
      {
        question: '2. Why does the angry fighter lose to the disciplined one, and what does this show about the courage defense?',
        answer: 'The angry fighter cannot retreat, feint, or wait — anger wields its bearer, and the enemy most easily defeated fights in a rage. If courage needed anger, the coolest troops would be the worst; they are the best. Anger does not assist courage; it takes its place in those who otherwise have none.',
      },
      {
        question: "3. Diagnose, in Seneca's terms, the civilian claim 'I need my anger to stand up for myself.'",
        answer: "What is called anger's necessity is reason's abdication. Protection comes from love plus the judgment that protection is owed; anger parasitizes that judgment, adding tremor and distortion. If the cause were fully judged worth acting on, the judgment would suffice — virtue should never be aided by vice.",
      },
      {
        question: "4. Why is anger 'inflamed smallness' rather than greatness of soul?",
        answer: 'Anger is the swelling of a diseased thing, not the strength of a sound one — the symptom of a mind that judges itself injurable by externals. Magnanimity keeps its good where no offense reaches; what cannot be wounded has nothing to avenge. Every "how dare they" is an affidavit of where you stored your good.',
      },
      {
        type: 'mc',
        question: '5. The undistorted-judge argument holds that anger corrupts justice because:',
        options: [
          'Judges should feel no emotions of any kind',
          'Anger arrives as a verdict already formed before the measuring is done — a bent ruler held because it feels straight',
          'Most accusations turn out to be false',
          'Punishment is never actually justified',
        ],
        correct: 1,
        explanation: "Justice is a measuring act; anger is assent to 'wronged — retaliation owed' prior to measurement. The angry judge follows his impulse, not the case. Anger is not the perception of the crime's reality but what stands between the judge and that perception.",
      },
      {
        question: '6. Unpack the physician model of punishment and why subtraction of anger improves every legitimate penal function.',
        answer: 'Punishment as medicine: restraint, correction, deterrence, in extremity removal — each a dosing problem answered by what will heal, administered with severity\'s appearance but not its passion. The avenger asks what will satisfy, and satisfaction has no natural dosage — which is why vengeance escalates and medicine does not. The doctor does not hate the leg.',
      },
      {
        question: '7. Answer the deterrence defense: does the person incapable of anger advertise himself as prey?',
        answer: 'Deterrence requires consequences credibly delivered — a matter of resolve, not temperature. The calm responder who will end the partnership, file the suit, or strike back has no exploitable failure mode: he cannot be baited, exhausted, or provoked into overreach. What advertises prey is anger\'s flash-and-fade — display, no follow-through, guilt-driven concession. The predator reads the difference perfectly.',
      },
      {
        type: 'msq',
        question: '8. Which of the following belong to Seneca\'s accounting of what anger costs the angry?',
        options: [
          'Anger is uniquely eager for revenge and uniquely unfit to take it',
          'Anger returns upon itself, punishing the bearer',
          'Anger improves memory for genuine wrongs',
          'While it injures another it injures itself',
          'Anger hinders itself in attaining what it hastens toward',
        ],
        correct: [0, 1, 3, 4],
        explanation: 'The frantic haste that defines anger makes it incompetent even at vengeance; the rehearsal, corroded ties, and self-injury complete the ledger that, on Seneca\'s wager, has never once balanced.',
      },
      {
        question: "9. State the concession hidden inside the 'anger management' frame, and the Stoic alternative to both venting and suppression.",
        answer: "Management concedes that anger unmanaged is destructive — the whole Senecan ledger — while assuming the source is untouchable, only the plumbing adjustable. The Stoic claim: the source is a judgment renewed by fresh assent each episode, so the alternative is non-formation — the verdict refused at the gate. Nothing is stored, so nothing needs venting; suppression (biting down on a formed anger) is a failure mode of management, not a Stoic practice.",
      },
      {
        question: '10. What defense of anger survives this session, and what must it assume to stand?',
        answer: "Righteous anger decoupled from utility: 'it helps nothing, but some things deserve anger.' To stand, it must assume the offender's act deserves repayment-in-suffering — that behind it stood a chooser who saw evil as evil and elected it — since error calls for correction and pity, not desert. That assumption is the willing-evil picture, and Session 5's syllogism targets exactly it.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Whatever anger does, reason does better — test the claim against your own ledger, not Seneca's.",
      assignment: "Run the audit this session assigned. Take your ten most recent signed angers from the practicum (or as many as the log holds) and build the two-column ledger: returns — wrongs actually corrected, terms actually improved, respect actually gained — against costs — hours of internal rehearsal, words that required repair, relationships taxed, the follow-through that never came. Then find your one surviving defense: the episode or standing grievance where anger still feels not useful but fitting — where calm response would feel like complicity. Write its entry in full protocol form, and add one sentence naming what the anger must believe about the offender's mind for 'they deserve it' to be true. Bring that sentence to Session 5. It is the last wall, and you should watch it fall having built it yourself.",
      duration: '30 min + per-episode logging',
      greekTerms: 'orgē — anger / megalopsychia — greatness of soul / dikē — justice / remedia — remedies',
    },
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'The Synthesis — Why Anger Is Always False',
    briefing:
      "Everything now assembles. Session 1 established the Socratic premise: no one does wrong willingly — every wrongdoer pursues an apparent good and misses the real one. Session 2 gave the premise its Stoic mechanism: the error lives in assent to a false impression, and the deceived one is the harmed one. Session 3 anatomized anger: it exists only as assent to the composite judgment 'I was wronged and retaliation is fitting.' Session 4 stripped its defenses of usefulness and left one wall standing: 'some things deserve anger.' This session takes the wall down with a single syllogism — anger's constituting judgment requires the willing wrongdoer; the willing wrongdoer does not exist; therefore anger always, without exception, rests on a factual error about the human mind in front of you. Not sometimes disproportionate, not usually imprudent: false. Then the hard cases, at full strength — premeditated fraud, deliberate cruelty, and Medea holding the knife over her children saying 'I understand what evils I intend to do' — because a doctrine that survives only easy cases is a mood, not a doctrine. And the objection that matters most in a court-owning civilization: does explaining evil excuse it? Marcus, who ran an empire's courts while writing the doctrine into his morning, is this session's proof that it does not.",
    parts: [
      {
        title: 'The Syllogism — and Marcus Rehearsing It at Dawn',
        content: [
          "State the argument with the precision you will need to defend it. Premise one, from the anatomy of Session 3: anger is constituted by assent to a composite judgment whose first clause is 'this person wronged me' — where 'wronged' means more than 'damaged': it means the injury was unjust and culpable, chosen by an agent who saw the evil and elected it. A falling tile damages; only a willing agent wrongs. Anger's own internal logic requires the knowing chooser of evil — strip that requirement and the judgment collapses into 'this person damaged me through error,' which supports correction, protection, even restraint, but not the repayment-in-suffering that anger desires. Premise two, from Sessions 1 and 2: the knowing chooser of evil does not exist — every agent pursues the apparent good; wrongdoing is hamartia, the missed shot at benefit; assent to 'this is bad for me, seen fully as bad, and I choose it' is psychologically impossible. Conclusion: anger's constituting judgment is false in every instance — not exaggerated, not unwise: factually false, the way a sum is false. Anger is a belief about the offender's mind, and the belief is always wrong.",
          "This is why Marcus Aurelius — emperor, judge, commander, a man professionally surrounded by liars and assassins — begins his day by rehearsing the syllogism before meeting its test cases. Meditations 2.1: 'Say to yourself at daybreak: I shall meet the meddling, the ungrateful, the overbearing, the treacherous, the envious, the unsociable. All this has befallen them because they are ignorant of good and evil.' Read the structure: first the premeditation — the offenses are forecast, so no impression arrives with surprise's leverage; then the diagnosis — ignorance of good and evil, the intellectualist premise applied in advance to everyone he will meet; then the consequence — 'I can neither be harmed by any of them, for no one will involve me in what is shameful, nor can I be angry with my kinsman or hate him; for we have come into being to work together.' The passage is not comfort; it is a proof run every morning so that by the time the treacherous colleague actually appears, the conclusion is already loaded: this is the ignorance I diagnosed at dawn, wearing a face.",
          "Marcus's shorter entries show the doctrine compressed for combat use. 7.22: 'It is a human being's nature to love even those who stumble' — and the ground follows immediately: it becomes possible 'the moment you realize that they are your kin, that they do wrong through ignorance and against their own will (akontas).' Akontas — unwillingly — the Socratic term itself, in the emperor's private Greek. 7.26: 'When someone does you wrong, ask yourself at once: what conception of good and evil led him to do it? Once you have seen that, you will pity him, and feel neither surprise nor anger.' Notice the mechanism is a question — the practicum's third field, fourteen centuries early: find the conception, and the anger has nothing to stand on. And 8.14: before every encounter, 'ask what assumptions this person holds about the goods and evils of life — for if he holds such views about pleasure and pain and reputation, it will not seem surprising or strange to me that he acts as he acts; and I shall remember that he is compelled to act so.' The wrongdoer acts under the compulsion of his own value-scheme — as compelled by 'betrayal is my advantage' as you are by 'two and two are four.'",
        ],
      },
      {
        title: 'The Hard Cases — Premeditation, Cruelty, and Medea',
        content: [
          "Take the cases built to break the doctrine, at full strength. The fraudster: months of planning, forged accounts, rehearsed sincerity — surely premeditation proves clear sight? Run the machinery: what did he see? That the accounts were false — factual knowledge, granted in Session 1. That discovery meant ruin — granted; hence the concealment. What he never saw: the act itself as bad for him, chosen under that description. His entire enterprise was conducted under the impression 'this wealth is my good, and it can be secured this way' — an impression he assented to, elaborated, defended nightly against the protest of his own foreboding. Premeditation does not thin the error; it thickens it. Each planning session was another act of assent, another coat of paint on the false good. The fraud is not a man who saw clearly for months; he is a man who spent months constructing the blindness his act required. And his 'I knew exactly what I was doing,' spoken later in court or confession, reports the facts he knew — never the value he saw. Ask him, at the moment of signing, 'was this bad for you, all things weighed?' and the honest answer is the only one intellectualism needs: 'it did not seem so then.'",
          "The cruel man is harder, because his apparent good is the suffering itself — no further prize behind it. The bully, the torturer, the online sadist: 'their pain is my satisfaction.' Does the doctrine break where malice becomes its own reward? It does not — it diagnoses. 'Their pain is my satisfaction' is itself a judgment about the good: that domination is strength, that another's humiliation restores one's own diminishment, that the feeling of power over a suffering thing is worth having. Every clause is false — and known false from the inside, eventually, by the emptiness each episode leaves, which the cruel man reads as a dose problem and treats with escalation. Cruelty is not clear sight of evil chosen as evil; it is the most catastrophic value-error a soul can make, the mistaking of one's own disease for one's food. This is why Epictetus asks, of such a person, 'why not, if anything, pity him?' — not because the cruelty is small, but because the diagnosis is enormous: 'transformed from a human being into a viper,' by increments of assent, each one aimed at an apparent good. The victim needs protection — the doctrine never wavers on that. But the perpetrator needs what the blind need, and rage gives the blind nothing.",
          "And Medea — the case Epictetus himself chose as the limit, because she says the forbidden sentence in her own voice: 'I understand what evils I intend to do, but thumos is stronger than my counsels.' Knowing evil, elected in full view — apparently. Look again with the machinery. What does her 'I understand' contain? That killing her children is called evil, is irreversible, destroys what she loves — the facts and the former valuations, all present. But watch the second clause: thumos — her rage at Jason — 'is stronger.' Stronger how? Not as a wind is stronger than a sail; Session 3 dismantled that picture — passion is not a force that overrides judgment but a judgment that has captured the office. What her sentence actually reports is a comparison of goods concluded in favor of vengeance: leaving Jason unpunished appears, to her, at that moment, unbearable — worse than the death of her children. 'She thinks gratifying her anger and taking vengeance on her husband more advantageous than saving her children' — Epictetus's clinical reading. Her tragedy is not knowledge overpowered; it is the apparent good relocated, by injury and rage, onto vengeance — the most documented value-catastrophe in ancient literature. She is the doctrine's deepest confirmation: even at the extreme, where the agent narrates her own wrongdoing, what we find is not the willing chooser of evil but assent to a monstrous good. 'It is the deception that is the error. Why then are you angry with her... why not, if anything, pity her?'",
        ],
      },
      {
        title: 'Explaining Is Not Excusing — Correction Without Retribution',
        content: [
          "Now the objection that guards the courtroom: if no one does wrong willingly, no one is responsible; if Medea deserves pity, the doctrine has excused her; a civilization that believes this cannot punish, cannot protect, cannot condemn. The answer requires one clean distinction. To excuse an act is to judge that it needs no response — no correction, no restraint, no repair. To explain an act is to identify what produced it, precisely so that the response can be aimed. The doctrine explains everything and excuses nothing: the fraud's error cost real victims real ruin; the correction owed — restitution, restraint, the demolition of his false good in full view — is not reduced by one unit because the error was an error. What the explanation removes is exactly one item: retribution — suffering inflicted not to protect, correct, or deter, but because suffering is deserved, the repayment of seen-and-chosen evil. Retribution's currency is the willing wrongdoer, and the mint has closed. Everything else in the apparatus of accountability survives, run by the physician of Session 4: restraint of the dangerous (the viper is handled, whatever the diagnosis), correction of the corrigible, deterrence by credible consequence, protection of the injured — each aimed better for being aimed by an undistorted judge at an accurately described target.",
          "Responsibility itself survives, relocated. The offender is not responsible in the retributive sense — author of a chosen evil, owing suffering — but is fully responsible in the operative sense: the error is his error, seated in his assent, and correction therefore rightly addresses him — his judgments, his habits of assent, his account of the good. This is the responsibility a teacher assigns, not the responsibility an avenger requires. Notice it is also precisely the responsibility you take for your own past wrongs when the doctrine is applied in the mirror — the Session 1 practice assignment ran exactly this analysis on you. You did not excuse yourself; you located the false good, and the locating was the beginning of the correction. The symmetry is the doctrine's integrity check: any account of the offender's mind that you would reject as too harsh or too lenient for your own worst act is mis-calibrated for his. One machinery, all agents, no exemptions — including the exemption rage demands for its target, and the exemption shame demands for you.",
          "Marcus 11.18 — the passage your PHIL 702 forward-pointer flagged years of study ago — now reads as what it is: the complete syllogism packed as a field kit, 'ten gifts from Apollo' to be counted on the fingers when anger arrives. Among the heads, find every session of this course. That we are made for one another and correction, not destruction, is the response to error (first head). That the offenders 'act as they do under a kind of compulsion — for what else can they do?' — the value-scheme compulsion of 8.14 (second and fourth heads). That you yourself do wrong, and refrain from some wrongs only for reputation's sake — the mirror check (fourth head). That you cannot even be certain of the wrongness without knowing the whole context — the epistemic humility of the undistorted judge (fifth head). That anger harms you more than the provocation does — Seneca's ledger (eighth head). That expecting the bad not to act badly is asking the fig tree not to bear figs — the premeditation of 2.1 (ninth and tenth). One head, the ninth in most orderings, adds what this course has not yet said aloud: kindness, where genuine and unfeigned, is 'invincible' — the strongest of the responses, capable of doing what rage pretends to do and cannot: actually changing the offender's judgment. The doctrine's endpoint is not a defensive crouch against provocation. It is the recovery of every resource — firmness, correction, wit, kindness — that anger's false verdict was spending on retaliation. Session 6 turns the whole argument into a daily regimen; your practicum has been collecting its raw material for four weeks.",
        ],
      },
    ],
    quiz: [
      {
        question: '1. State the full syllogism this course has been building, naming which sessions established each premise.',
        answer: "P1 (Session 3): anger is constituted by assent to 'this person wronged me — unjustly, culpably, knowingly — and retaliation is fitting.' P2 (Sessions 1–2): the knowing chooser of evil does not exist; all wrongdoing is pursuit of an apparent good — hamartia. Conclusion: anger's constituting judgment is false in every instance. Not disproportionate — factually false, like a wrong sum.",
      },
      {
        type: 'mc',
        question: "2. Which premise does anger itself deny?",
        options: [
          'That retaliation is ever imprudent',
          'That the offender pursued an apparent good — anger requires instead a knowing chooser of evil',
          'That first movements are involuntary',
          'That justice requires punishment',
        ],
        correct: 1,
        explanation: "Anger's 'wronged' means more than 'damaged' — it asserts the injury was chosen by one who saw the evil and elected it. Strip that and the judgment collapses into 'damaged through error,' which licenses correction but not repayment-in-suffering.",
      },
      {
        question: '3. Analyze the structure of Meditations 2.1 as a proof run rather than a comfort.',
        answer: 'Premeditation (the offenses forecast, denying surprise its leverage), diagnosis (ignorance of good and evil — the intellectualist premise applied in advance), consequence (no harm possible to the prohairesis, no anger at kin, cooperation as the shared nature). By the time the treacherous colleague appears, the conclusion is pre-loaded: this is the diagnosed ignorance, wearing a face.',
      },
      {
        question: '4. Why does premeditation thicken rather than thin the fraudster\'s error?',
        answer: "Each planning session was another act of assent to 'this wealth is my good, securable this way' — another coat of paint on the false good, defended nightly against his own foreboding. He is not a man who saw clearly for months but one who spent months constructing the blindness his act required. His 'I knew what I was doing' reports facts known, never value seen.",
      },
      {
        question: '5. How does the doctrine handle cruelty, where the suffering itself is the apparent good?',
        answer: "'Their pain is my satisfaction' is itself a value-judgment — domination as strength, another's humiliation as repair of one's own diminishment — and every clause is false, as the post-episode emptiness attests (which the cruel man misreads as a dosage problem). Cruelty is the soul's most catastrophic value-error, mistaking its disease for its food: enormous diagnosis, hence pity; real danger, hence restraint.",
      },
      {
        question: "6. Give Epictetus's reading of Medea's 'thumos is stronger than my counsels.'",
        answer: "Not force overriding judgment — Session 3 dismantled that picture. Her sentence reports a comparison of goods concluded for vengeance: Jason unpunished appears worse to her than her children dead. She thinks vengeance more advantageous than saving them. Even the self-narrating wrongdoer at the limit shows assent to a monstrous apparent good — the doctrine's deepest confirmation, and the ground of 'why not, if anything, pity her?'",
      },
      {
        type: 'msq',
        question: '7. Which of the following survive the elimination of retribution?',
        options: [
          'Restraint of the dangerous',
          'Correction of the corrigible',
          'Suffering inflicted because suffering is deserved',
          'Deterrence by credible consequence',
          'Restitution and protection of the injured',
        ],
        correct: [0, 1, 3, 4],
        explanation: "Only retribution — repayment of seen-and-chosen evil — loses its currency when the willing wrongdoer goes. Everything else in accountability survives and improves, aimed by an undistorted judge at an accurately described target.",
      },
      {
        question: '8. Distinguish the responsibility the doctrine removes from the responsibility it preserves.',
        answer: 'Removed: retributive responsibility — authorship of chosen evil, owing suffering. Preserved: operative responsibility — the error is his error, seated in his assent, so correction rightly addresses his judgments and habits. The responsibility a teacher assigns, not the one an avenger requires; identical to the responsibility you take for your own worst act.',
      },
      {
        question: '9. State the mirror-symmetry integrity check and what it calibrates.',
        answer: 'Any account of the offender\'s mind you would reject as too harsh or too lenient for your own worst act is mis-calibrated for his. One machinery, all agents, no exemptions — neither the exemption rage demands for its target (pure willing evil) nor the exemption shame demands for you. Session 1\'s self-diagnosis assignment was this check installed in advance.',
      },
      {
        question: '10. Why does Marcus call unfeigned kindness "invincible," and what does this reveal about the doctrine\'s endpoint?',
        answer: "Kindness aimed at the offender's judgment can do what rage pretends to and cannot: actually change the false conception driving the behavior. The endpoint is not a defensive crouch but recovery of every resource — firmness, correction, wit, kindness — that anger's false verdict was spending on retaliation.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Anger is a belief about the offender's mind — and the belief is always false.",
      assignment: "Take the sentence you wrote at the end of Session 4 — what your last-wall anger must believe about the offender's mind — and put it through the syllogism in writing. Name the apparent good the offender was pursuing (the practicum's third field, now at full strength: premeditation, cruelty, and 'they knew exactly what they were doing' are no longer exemptions). Then write the corrected response the case actually calls for — restraint, restitution, teaching, distance, protection — and mark explicitly what dropped out: the retributive remainder, the suffering-because-deserved. Finally, run the mirror check: write the same analysis for your own worst act from Session 1, and confirm the two entries use the same machinery. If the offender's entry says 'evil' where yours says 'error,' one of them is dishonest — find which.",
      duration: '40 min',
      greekTerms: 'akontas — unwillingly (Marcus’s own word) / thumos — rage, spirit / hamartia — missing the mark / dikaiosunē — justice',
    },
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'The Practice — Living Without Anger',
    briefing:
      "The argument is complete; what remains is the regimen. A doctrine that convicts anger of resting on a false judgment has one honest consequence: the judgment must be caught, examined, and refused in the field — at the traffic merge, in the meeting, at the dinner table — or the conviction is a museum piece. Book 3 of De Ira is Seneca's clinical manual, and this session extracts its three load-bearing practices. Delay, because anger's judgment can only be signed while the impression is fresh and swollen — 'the greatest remedy for anger is postponement.' The evening audit, Seneca's own nightly tribunal — 'I sit in judgment on my day' — which you have been running informally as the practicum's fifth step and will now run in full form. And the morning preparation, Marcus's 2.1, which you will stop reading and start writing: your own daybreak rehearsal, naming your own meddling and ungrateful, with the intellectualist premise built into its load-bearing line. This session also convenes your practicum review: five weeks of episodes are now data, and the questions the capstone will ask — what is your most frequent constituting judgment? what standing belief does it rest on? — get their first full-dress answers here. The course ends not when you can state the syllogism but when the syllogism meets your Tuesday and holds.",
    parts: [
      {
        title: 'Delay — The First Remedy',
        content: [
          "'The greatest remedy for anger is postponement (maximum remedium irae mora est). Ask this of your anger at the outset — not that it pardon, but that it judge.' Seneca's first prescription is mechanically precise, and the two-movements anatomy explains why it works. Anger exists only at assent; assent can only be given to an impression as it presents itself; and the anger-impression has a half-life — it presents at maximum swelling in the first moments, when the injury fills the whole visual field and the offender's mind is pure malice. Delay does not fight the impression; it outlasts the swelling. 'Its first onset is fierce; if it waits, it will abate.' The judgment 'I was wronged and retaliation is fitting' that seemed self-evident at second zero is, at minute ten, visibly a claim — and claims can be examined. You are not calming yourself; you are letting the evidence arrive before the verdict.",
          "Seneca stocks the delay with content — the interval is not empty waiting but active cross-examination, and his questions map exactly onto your practicum fields. Against the first clause ('I was wronged'): is it certain? 'Many things will seem other than they are' — the reported insult mangled in transmission, the slight that was distraction, the tone you supplied yourself. He tells the story of the slave-master enraged at a knight for drinking, who discovered the man simply had not seen him; 'give even the accused a hearing.' Against the culpability the clause smuggles in: run Session 5 — what conception of good moved them? 'He is compelled to act so.' Against the second clause ('retaliation is fitting'): what will the retaliation actually purchase, at what price — Session 4's ledger, consulted before signing rather than after. And underneath all three, the mirror: 'we are all inconsiderate and imprudent... all bad men. Each of us will find in his own breast the fault he censures in another.' The delay converts the courtroom from summary execution to actual trial — and the practicum's protocol, you now see, was never a diary format. It was the trial transcript, and you have been training as the judge.",
          "Practice the delay as a physical discipline, because assent rides on the body's timetable. Seneca's tactics are unembarrassed by their smallness: slow everything — 'let the mind's pace be slackened'; relax the face, unclench the hands, lower the voice deliberately, because the passion's outer form feeds its inner one ('the countenance should be composed; the mind is shaped by its bearing'). Walk, if walking is available; write the reply and do not send it — the ancient version was the letter held overnight. None of this is the cure; all of it is the tourniquet that keeps the judgment unsigned until the examining mind arrives. And when — not if — you sign anyway: the episode is not a failure of the doctrine but a data point for it. Log it whole. The Stoics' own term for you is prokoptōn, the one making progress; Seneca confesses in these very pages to sitting in nightly judgment on his own relapses. The standard is not zero flashes — that was never on offer. The standard is a lengthening interval between flash and signature, and a shortening interval between signature and the honest audit of it.",
        ],
      },
      {
        title: 'The Evening Audit — De Ira 3.36',
        content: [
          "'All our senses ought to be trained to endurance... The mind should be summoned each day to give an account of itself. Sextius used to do this: when the day was over and he had retired to his night's rest, he would ask his mind: what bad habit have you cured today? What fault have you resisted? In what respect are you better?' Anger, Seneca continues, 'will cease and become more controllable if it knows it must appear each day before a judge.' Then the personal testimony, unmatched in ancient literature for its plainness: 'I make use of this privilege, and daily plead my case before myself. When the light has been removed and my wife, long aware of my habit, has fallen silent, I scan the whole of my day and retrace all my deeds and words. I hide nothing from myself, I pass over nothing. For why should I fear any of my mistakes, when I can say: see that you do not do it again — this time I pardon you.'",
          "Study the tribunal's design, because every clause is doing therapeutic work. It is daily and total — 'I pass over nothing' — because anger's judgments hide in episodes too small to seem worth auditing: the sarcastic reply, the silent contempt at the slow cashier, the rehearsed grievance in the shower. It is private and fearless — 'why should I fear my mistakes?' — because the audit's enemy is the shame that makes the mind blur its own record; Seneca's tribunal has no sentencing phase, only findings and a single instruction: see that you do not do it again. And it is specific. His own recorded findings are almost comically concrete: I argued too combatively at dinner over a point that did not matter — 'the debate was about a trifle, and I spoke more keenly than was seemly'; I corrected a man in a way that improved nothing and offended everything; I took the seating arrangement at a banquet as an injury. Each finding ends with a maxim shaped for reuse: truth spoken to the unwilling is truth wasted; some men would be better friends if they were worse dinner guests. The audit's product is not guilt. It is a corrected instruction set, loaded for tomorrow.",
          "Your practicum's fifth step now takes this full form, nightly, whether or not the day held an episode. The empty-day audit matters as much as the eventful one: scan for the near-misses — impressions that arrived and were refused (log what refused them; that is your working technique, and you should know its name), and the small signed angers that never made the log because they wore the costume of 'being right.' For logged episodes, the audit adds the retrospective fields the moment could not fill: what did the delay reveal, if you delayed? What was the offender's conception of the good, now that you can ask calmly — and does the third field's answer from the heat of the moment survive the evening's re-examination? What would the corrected response have been, and is any piece of it still performable tomorrow — the repair, the clarification, the boundary stated without temperature? Close each audit with Sextius's three questions verbatim: what habit cured, what fault resisted, in what respect better. Five weeks of these entries are the empirical spine of your capstone: the Proctor will ask what your most frequent constituting judgment is, and 'let me check my data' is the only answer this Academy respects.",
        ],
      },
      {
        title: 'The Morning Preparation — Writing Your Own 2.1',
        content: [
          "The evening audit corrects backward; the morning preparation arms forward. You have read Meditations 2.1 for two courses; this session you write your own, because Marcus's meddling, ungrateful, overbearing, treacherous, envious, and unsociable were his actual daily roster — courtiers, petitioners, flatterers, and at least one general who would eventually rebel — and yours is different. The premeditation only works when it is specific enough to be recognized on contact: the colleague who takes credit in the standup, the parent who criticizes sideways, the driver at the merge, the anonymous account that knows exactly where the lever is. Write the roster honestly and the day loses its power to surprise you; 'nothing befalls unexpected' was Seneca's half of the practice — the mind that has rehearsed the blow receives it standing.",
          "The structure of your composition follows Marcus's three movements, and the second is load-bearing. First movement — the forecast: 'Today I will meet...' — your actual roster, named by behavior, not by name. Second movement — the diagnosis, and here the entire course must be present in one clause: they act so through ignorance of good and evil; the credit-taker believes standing is safety, the sideways critic believes control is love, the anonymous account believes contempt is significance — each compelled by a conception of the good, none a willing chooser of evil. Write the specific mistaken good for each figure on your roster; this is the practicum's third field, pre-computed at dawn, so that at the moment of contact the analysis is already done and the anger-impression arrives pre-refuted. Third movement — the consequence: none of them can harm me, because none of them can reach my prohairesis without my assent; and none of them is my enemy, because we are made for cooperation — kin through reason if through nothing else. End, if you follow Marcus fully, with the fig-tree clause turned on yourself: to be surprised that the credit-taker took credit is to be surprised that figs are figs; the surprise, not the credit-taking, was your error.",
          "A closing word on what this regimen is for, before the capstone tests it. The three practices interlock into a single day-shaped discipline: the morning preparation loads the diagnosis, the delay holds the gate at contact, the evening audit reviews the tape and corrects the instruction set — judgment tended at dawn, defended at noon, examined at night. This is what the ancients meant by askēsis: not effortful suppression — the doctrine has abolished the thing suppression would be needed for — but training, the kind that makes the correct analysis arrive faster than the false impression. Seneca's promise for the trained state is not gray detachment but its opposite: the mind released from anger's bookkeeping is 'calm and unharassed,' free to be firm without cost, kind without weakness, just without distortion — free, in Marcus's word, to be invincible in the only contest that matters. You will stand in the capstone with a syllogism, five weeks of data, and a morning liturgy in your own handwriting. The Proctor will try to take all three away from you. That is the final exercise: keeping them.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: "1. 'Maximum remedium irae mora est' works because:",
        options: [
          'Time heals emotional wounds through natural forgetting',
          'The anger-impression has a half-life — assent can only be signed at maximum swelling, and delay lets the claim become examinable',
          'Delayed retaliation is more effective retaliation',
          'The offender usually apologizes if given time',
        ],
        correct: 1,
        explanation: "Delay does not fight the impression; it outlasts the swelling. The judgment self-evident at second zero is visibly a claim at minute ten — 'ask of your anger not that it pardon, but that it judge.'",
      },
      {
        question: '2. What cross-examination fills the delay interval? Map its questions onto the practicum fields.',
        answer: "Against 'I was wronged': is it certain — mangled report, unseen context, supplied tone? ('Give even the accused a hearing.') Against culpability: what conception of good moved them — field three. Against 'retaliation is fitting': what will it purchase at what price — Session 4's ledger, consulted before signing. Underneath: the mirror — each finds in his own breast the fault he censures.",
      },
      {
        question: '3. Why does Seneca prescribe bodily tactics — slowed pace, composed face, lowered voice — for a judgment problem?',
        answer: "Assent rides on the body's timetable: the passion's outer form feeds its inner one ('the mind is shaped by its bearing'). The tactics are not the cure but the tourniquet — they keep the judgment unsigned until the examining mind arrives.",
      },
      {
        question: '4. What is the standard of progress for the prokoptōn, if not zero flashes?',
        answer: 'A lengthening interval between flash and signature, and a shortening interval between signature and honest audit. The flash was never on offer for elimination; signed episodes are data points for the doctrine, not refutations of it — Seneca himself confesses nightly relapses in these very pages.',
      },
      {
        question: "5. Describe Sextius's tribunal as Seneca practices it, and name its three closing questions.",
        answer: "Nightly, when the light is out: scan the whole day, retrace all deeds and words, hide nothing, fear nothing — findings without a sentencing phase, closing in 'see that you do not do it again; this time I pardon you.' The three questions: what bad habit have you cured today? What fault have you resisted? In what respect are you better?",
      },
      {
        type: 'mc',
        question: "6. The audit is designed to be private and fearless because:",
        options: [
          'Public confession would embarrass the household',
          "Shame makes the mind blur its own record — the audit's enemy is the fear that corrupts the evidence",
          'Anger should be kept secret from others',
          'Legal liability could attach to written findings',
        ],
        correct: 1,
        explanation: "'Why should I fear any of my mistakes, when I can say: see that you do not do it again?' Findings without punishment keep the record honest; the product is a corrected instruction set, not guilt.",
      },
      {
        question: '7. Why does the empty-day audit matter as much as the eventful one?',
        answer: "Anger's judgments hide in episodes too small to seem worth auditing — the sarcasm, the silent contempt, the shower-rehearsed grievance wearing the costume of 'being right.' The empty day also holds near-misses: impressions refused, whose refusing technique should be named and kept. Total scan, nothing passed over.",
      },
      {
        question: "8. Give the three movements of the morning preparation and identify the load-bearing clause.",
        answer: "Forecast (today I will meet — the actual roster, named by behavior); diagnosis (they act through ignorance of good and evil — with the specific mistaken good written for each figure); consequence (none can harm my prohairesis without my assent; none is my enemy — kin through reason, made for cooperation). Load-bearing: the diagnosis, which pre-computes the practicum's third field so the anger-impression arrives pre-refuted.",
      },
      {
        question: '9. What does the fig-tree clause add when turned on yourself?',
        answer: 'To be surprised that the credit-taker took credit is to be surprised that figs are figs — the surprise, not the offense, was your error. It relocates the morning\'s last correction from the offender\'s behavior (predictable) to your expectation (adjustable).',
      },
      {
        question: '10. How do the three practices interlock, and what is askēsis in this regimen — what is it not?',
        answer: 'Morning loads the diagnosis, delay holds the gate at contact, evening reviews the tape and corrects the instruction set: judgment tended at dawn, defended at noon, examined at night. Askēsis is training that makes the correct analysis arrive faster than the false impression — not suppression, for which the doctrine has abolished the need: nothing is formed, so nothing needs holding down.',
      },
    ],
    practiceAssignment: {
      coreIdea: 'Judgment tended at dawn, defended at noon, examined at night — the doctrine becomes a day.',
      assignment: "Install the full regimen this week, all three practices daily. Morning: write your own 2.1 — your roster named by behavior, the specific mistaken good diagnosed for each figure, the consequence clause, the fig tree turned on yourself — and rewrite it each morning rather than rereading it; the composition is the preparation. Contact: the delay, with its cross-examination, at every flash; log per protocol. Night: the Sextius tribunal in full form — total scan, near-misses included, retrospective fields completed for every episode, closing with the three questions verbatim. Then, before the capstone: convene your own practicum review. Read all five weeks of entries and write the two answers the Proctor will demand: your most frequent constituting judgment, quoted in your own recurring words — and beneath it, the standing belief about yourself or the world that keeps issuing that judgment. Bring both, with the log, to the capstone.",
      duration: '10 min morning + 10 min night + per-episode',
      greekTerms: 'askēsis — training / prokoptōn — the one making progress / mora — delay / premeditatio malorum — rehearsal of ills',
    },
  },

  // ── SESSION 7 — CAPSTONE ───────────────────────────────────────────────────
  {
    id: 7,
    title: 'Capstone Dialogue — The Doctrine Under Fire',
    isSeminar: true,
    briefing:
      "The capstone is an oral examination under pressure, and the pressure is the point. You will be given a scenario of deliberate, malicious harm — aimed at you, personally, because the doctrine is easy about other people's injuries — and asked to run the full framework live: the offender's mistaken judgment named, the falsity of anger's constituting belief shown, the corrective response prescribed without either rage or capitulation. You will then defend the elimination thesis against the strongest objection the Proctor can field — righteous anger, moral motivation, or the excuse worry — without retreating into the management frame the course has dismantled. And you will be examined on your own data: five weeks of practicum entries, your most frequent constituting judgment, and the standing belief beneath it. Recitation earns nothing here; the Evaluator runs at capstone strictness, and only novel transfer counts. The examination standard is the one this Academy has used since PHIL 701: not what you can state, but what you now do — and the log in your hands is the record of the difference.",
    parts: [
      {
        title: 'Preparing for the Dialogue',
        content: [
          "Come with three artifacts. First, the syllogism, stated cold in your own words — both premises with their sources, the conclusion with its exact modality (false, not excessive). Second, your practicum review from Session 6: the most frequent constituting judgment, quoted, and the standing belief beneath it, named. Third, your current morning preparation, in your own handwriting, with the diagnosis clause you actually use. The Proctor will not ask for these directly; it will ask questions that are unanswerable without them. Expect the scenario early, and expect it to be built for you — the Proctor has your practicum context and will aim the malice where your log says the lever is. That is not cruelty; it is the only honest test of a doctrine whose whole claim is that it holds where it hurts.",
        ],
      },
      {
        title: 'The Standing Challenges',
        content: [
          "The scenario will be some concrete instance of the hard family: the partner who defrauded deliberately, the knowing lie that cost you your reputation, the reckless choice that injured someone you love, the stranger whose cruelty was aimed at what you built. Run the machinery in order and aloud: the facts the offender knew (granted, always); the apparent good their assent constructed ('their suffering is my satisfaction' included — Session 5 showed it is a value-judgment like any other); why 'they knowingly chose evil' is false of them as it was false of Medea; and then the response — the full physician's kit, restraint to restitution, with the retributive remainder explicitly identified and explicitly declined. The Proctor will press the gap between explaining and excusing; hold the Session 5 distinction and show that every protective and corrective measure survives.",
          "Then the objection round. Righteous anger: does the atrocity not deserve rage — is calm not complicity? (Session 4's undistorted judge, plus Session 5's demolition of desert.) Moral motivation: has the movement for every justice not run on anger — would the reformers have reformed without it? (Session 4's separation of resolve from temperature; what corrected injustice was the judgment, wearing anger as a costly passenger.) The excuse worry: if no one does wrong willingly, is responsibility not abolished and the doctrine a predator's charter? (Operative versus retributive responsibility; the teacher's assignment, not the avenger's requirement.) You will draw one of these at the Proctor's choice. Defend without the management retreat — 'anger is natural and just needs channeling' concedes the premise the whole course refuted.",
          "Last, the data round. What is your most frequent constituting judgment — in your recurring words, not the textbook's? What standing belief keeps issuing it — about what you are owed, what respect signals, what an unanswered slight makes you? Which practice has actually moved the interval — morning, delay, or audit — and what does your log show about the weeks you skipped it? The course thesis was never that you would exit anger-free; it was that anger is false, and that a person who knows this, with technique and data, progresses measurably. Show the measure.",
        ],
      },
    ],
    quiz: [
      {
        question: '1. State the course syllogism with the modality of its conclusion exact.',
        answer: "Anger is constituted by assent to 'this person knowingly wronged me and retaliation is fitting' (Session 3). No one does wrong knowingly — all wrongdoing is pursuit of an apparent good (Sessions 1–2). Therefore anger's constituting judgment is false — factually false in every instance, not merely excessive or imprudent.",
      },
      {
        question: "2. What, precisely, did Socrates claim the tyrant lacks, and why does 'he knew what he was doing' equivocate?",
        answer: "The tyrant does what seems best, not what he wills — lacking knowledge of his genuine good. 'Knew what he was doing' equivocates between factual knowledge of the act (often true) and clear present sight of the act as bad, chosen as bad (never true — the appearance of good always intervenes).",
      },
      {
        question: '3. Why is the wrongdoer, on Discourses 1.18, the injured party — and what follows for the response owed?',
        answer: 'He has damaged the only thing of genuine worth — his own prohairesis — in exchange for an external. Blinded in the judging faculty, he is owed what the blind are owed: showing if possible, pity otherwise, restraint where dangerous. Never rage, which corrects nothing and adds a second casualty.',
      },
      {
        question: '4. Distinguish propatheia from pathos and locate the exact point of responsibility.',
        answer: "The first movement — jolt, heat, pallor — is involuntary preparation, unpreventable by reason, morally weightless. Passion exists only at assent to the composite judgment. Responsibility lives at the signature: pallor without passion is the trained state, per the storm-tossed Stoic of Gellius 19.1.",
      },
      {
        question: '5. Rebut the strongest instrumental defense of anger you faced in this course, in two sentences.',
        answer: "Righteous anger at injustice: justice is a measuring act, and anger is a verdict formed before measurement — the angry judge holds a bent ruler that feels straight. Everything justice needs — full sight of the wrong, resolve, correction, deterrence — is performed better with the anger subtracted; what anger alone adds is the demand for satisfaction, which has no natural dose.",
      },
      {
        question: "6. How does Medea confirm rather than refute the doctrine?",
        answer: "Her 'I understand what evils I intend' contains the facts and former valuations — but her act reports a comparison of goods concluded for vengeance: Jason unpunished appeared worse than her children dead. Even the self-narrating wrongdoer at the limit shows assent to a monstrous apparent good, not clear-eyed election of evil. Hence Epictetus: why not, if anything, pity her?",
      },
      {
        question: '7. What exactly drops out of accountability when the willing wrongdoer goes, and what survives?',
        answer: 'Only retribution drops — suffering inflicted because deserved, the repayment of seen-and-chosen evil. Restraint, correction, restitution, deterrence, protection all survive, administered by the physician: dosed by what heals, not what satisfies, and aimed better for the accurate diagnosis.',
      },
      {
        question: '8. Why does the elimination thesis reject both venting and suppression, and what replaces them?',
        answer: 'Both assume a formed anger that must go somewhere — the management frame\'s tenant. On the Stoic account nothing is stored: anger is a judgment renewed by fresh assent, so the alternative is non-formation — the verdict refused at the gate. Where refusal fails, the audit converts the episode to data, not to a reservoir.',
      },
      {
        question: '9. Name the three practices of the regimen and the function of each in one clause.',
        answer: 'Morning preparation — loads the diagnosis so impressions arrive pre-refuted; delay — holds the gate at contact until the claim can be judged; evening audit — reviews the tape, completes the analysis, corrects the instruction set. Dawn, noon, night: one judgment, tended in three tenses.',
      },
      {
        question: '10. What is the difference between having studied PHIL 706 and having completed it?',
        answer: 'Study produces the syllogism on demand. Completion shows in the log: a lengthening interval between flash and signature, a named most-frequent judgment with the standing belief beneath it, and a corrected response actually performed where retaliation once was. The capstone examines the log, not the memory.',
      },
    ],
    practiceAssignment: {
      coreIdea: 'The capstone examines what you do with the doctrine when it is your own injury on the table.',
      assignment: "Before the dialogue, prepare the three artifacts: the syllogism cold, in your own words; the practicum review — most frequent constituting judgment quoted, standing belief named, with the log to back it; your current morning preparation in full. Then write one page on the hardest genuine injury of your own past — not hypothetical, yours — running the complete framework: the apparent good the person pursued, the falsity of the willing-evil belief you held or hold about them, the corrective response (including what is still performable now), and the retributive remainder, identified and declined. The Proctor may never see this page. You will be different in the dialogue for having written it.",
      duration: '90 min',
      greekTerms: 'elenchus — cross-examination / askēsis — training / apatheia — freedom from passion / eupatheia — good feeling, the trained state’s positive affect',
    },
  },
];
