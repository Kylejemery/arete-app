// PHIL 703 — The School of Epictetus
// Full content build — Sessions 1–11.
//
// Mirrors the PHIL 702 architecture exactly: each session carries a
// pre-seminar briefing, three lesson parts, a 10-question short-answer quiz,
// and a practice assignment. Sessions are aligned one-to-one with the
// required-reading schedule in phil703_reading.ts (Discourses I → IV,
// closing with the Enchiridion read as a unified text). The session view
// reuses the language-course renderer via phil702ToLesson, since
// Phil703Session shares the Phil702Session shape.

import type { Phil702Session } from '@/data/phil702';

// Structurally identical to Phil702Session — one shape, one renderer.
export type Phil703Session = Phil702Session;

export const PHIL_703_SESSIONS: Phil703Session[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'The Former Slave and His School — Introduction',
    briefing:
      "Epictetus was born a slave in Hierapolis and served in Nero's court as the property of Epaphroditus, the emperor's secretary. He walked with a lame leg — by one ancient account, because his master broke it. When he was eventually freed, he taught philosophy in Rome until Domitian banished the philosophers, and then founded a school in Nicopolis that drew students from across the empire, including — a generation later, through his notes — an emperor. This session establishes what kind of text the Discourses are, what kind of school Epictetus ran, and the single distinction on which his entire philosophy rests: what is up to us, and what is not. For a man who could not control his own body, that distinction was never abstract.",
    parts: [
      {
        title: 'The Man: From Slavery to the Chair of Philosophy',
        content: [
          "Every fact of Epictetus's biography bears philosophical weight. He was born around 55 AD in Hierapolis, in Phrygia, and his name — Epiktētos — simply means 'acquired.' He was property, and his name said so. As the slave of Epaphroditus he lived at the center of Neronian Rome, close enough to power to watch what it did to the people who held it. He studied with Musonius Rufus, the greatest Stoic teacher of the age, while still enslaved — a fact worth pausing over: the discipline of desire, action, and assent was being taught to a man who legally owned nothing, not even himself.",
          "Freed after Nero's death, he taught in Rome until Domitian expelled the philosophers around 93 AD. Exile is the standard catastrophe of the ancient political world; Epictetus treated it as a change of address. He settled in Nicopolis, on the western coast of Greece, and opened a school. He owned, by report, a lamp, a bed, and a mat. When his iron lamp was stolen, he replaced it with a clay one, remarking that the thief had paid too much for it — a lamp for his integrity.",
          "The lameness matters too. Whether it came from his master's cruelty or from disease, Epictetus lived his entire adult life in a body that had been damaged while it belonged to someone else. When he says that the leg is an external, that impediment to the leg is not impediment to the will (prohairesis), he is not producing a thought experiment. He is describing his own morning.",
        ],
      },
      {
        title: 'The Text: A Classroom Overheard',
        content: [
          "Epictetus wrote nothing. What we have, we owe to his student Arrian — Flavius Arrianus, later a Roman consul and historian — who attended the school at Nicopolis and recorded what he heard. The Discourses (Diatribai) are, by Arrian's own account, his attempt to preserve not Epictetus's doctrines but his voice: 'whatever I heard him say, I tried to write down in his own words as far as possible, to preserve for myself a record of his way of thinking and the frankness of his speech.'",
          "This means the Discourses are a different kind of text from the Meditations. Marcus writes to himself in private; Epictetus talks — to students, to visitors, to the occasional dignitary who wanders in expecting flattery and leaves having been dissected. The formal curriculum of the school was the technical Stoicism of Chrysippus: logic, physics, ethics, read and analyzed in the morning. The Discourses record what happened around that curriculum — the informal talks in which Epictetus drove the technical material into his students' actual lives. We are reading the application layer, not the lecture notes.",
          "The tone is like nothing else in ancient philosophy: direct, harsh, comic, relentless. Epictetus mocks, needles, impersonates his students' excuses back at them. He compares his classroom to a doctor's surgery: 'you should not walk out of it in pleasure, but in pain — for you were not well when you came in.' The rudeness is the method. A student who leaves flattered leaves untreated.",
        ],
      },
      {
        title: 'The Doctrine: The Opening Move of Discourses I.1',
        content: [
          "The Discourses open with the distinction that everything else in Epictetus depends on. Of all the arts and faculties, only reason contemplates itself. And what does the divine order give us as genuinely our own? Not the body, not property, not reputation, not office — none of these can be guaranteed against interference. What is ours is the correct use of impressions (chrēsis phantasiōn): the power to examine what appears to us, and to assent, refuse, desire, or reject accordingly. This power — prohairesis, the faculty of choice — is by nature unenslavable. Zeus himself, Epictetus says, cannot compel my assent.",
          "Everything else follows. If only the use of impressions is up to us (eph' hēmin), then the whole of philosophical training is learning to place desire, aversion, and judgment there and nowhere else. Discourses I.2 adds the second foundation: the question of what a person will endure or refuse is settled by their sense of their own character (prosōpon). The athlete who died rather than accept a humiliating cure was not being irrational; he was refusing to survive as someone else. Philosophy trains you to know what you are worth, and to sell yourself accordingly — 'you are the one who knows yourself, how much you are worth to yourself, and at what price you will sell yourself; for people sell themselves at different rates.'",
          "Read the Enchiridion again this week — you read it in PHIL 701 — but read it now as the compressed field manual of the school you are about to enter. Every chapter of it is a discourse folded down to a card. This course unfolds the cards.",
        ],
      },
    ],
    quiz: [
      {
        type: 'mc',
        question: "1. The name 'Epiktētos' means:",
        options: [
          "'The freed one' — given to him at manumission",
          "'Acquired' — the name of property",
          "'The teacher' — an honorific from his students",
          "'The steadfast' — a Stoic virtue name",
        ],
        correct: 1,
        explanation: "The philosopher of freedom was named as a thing owned — 'acquired.' His central claim, that the will cannot be enslaved, was forged inside the condition his own name described.",
      },
      {
        type: 'mc',
        question: "2. Who recorded the Discourses?",
        options: [
          "Epictetus himself, late in life at Nicopolis",
          "Marcus Aurelius, from his tutor's notes",
          "Arrian, a student who preserved his teacher's voice",
          "Musonius Rufus, his own teacher",
        ],
        correct: 2,
        explanation: "Epictetus wrote nothing. Arrian (Flavius Arrianus), later a Roman consul and historian, recorded the classroom talks — claiming to preserve not doctrines but Epictetus's way of thinking and the frankness of his speech.",
      },
      {
        question: "3. How do the Discourses differ in kind from the Meditations?",
        answer: "The Meditations are a private practice log written by Marcus to himself; the Discourses are a public classroom overheard — informal talks recorded by a student, in which Epictetus applied the technical curriculum to his students' lives.",
      },
      {
        type: 'mc',
        question: "4. The formal morning curriculum of the school at Nicopolis was:",
        options: [
          "The informal talks recorded in the Discourses",
          "Technical Chrysippean Stoicism — logic, physics, ethics, read and analyzed",
          "Recitation of the Enchiridion",
          "Physical training in the manner of the gymnasium",
        ],
        correct: 1,
        explanation: "The Discourses are the application layer *around* the formal curriculum — the talks that drove the technical material into the students' actual conduct. We are reading what happened between the lectures.",
      },
      {
        question: "5. What does Epictetus's surgery image claim about how philosophical teaching should feel?",
        answer: "The school is a doctor's office: you should leave in pain, not pleasure, because you were not well when you came in. Discomfort is evidence of treatment; flattery is evidence of none.",
      },
      {
        type: 'msq',
        question: "6. According to Discourses I.1, which of the following are genuinely up to us (eph' hēmin)?",
        options: [
          "The health of the body",
          "Assent and refusal",
          "Reputation",
          "Desire and aversion",
          "Public office",
          "The use of impressions",
        ],
        correct: [1, 3, 5],
        explanation: "Only the operations of prohairesis — the use of impressions, assent, desire, and aversion — are fully ours. Body, reputation, and office can all be interfered with, and so were never ours in the strict sense.",
      },
      {
        question: "7. What does Epictetus mean by claiming that even Zeus cannot compel his assent?",
        answer: "That the faculty of choice is by nature unenslavable. External force can compel the body but cannot make the mind judge something true or good; assent is structurally beyond coercion.",
      },
      {
        question: "8. In Discourses I.2, what determines what a person will endure or refuse?",
        answer: "Their sense of their own character (prosōpon) — their self-conception and the price they set on themselves. The rational cost-benefit differs by person because people sell themselves at different rates.",
      },
      {
        question: "9. Why does Epictetus's lameness matter to how we read his claim that the leg is an external?",
        answer: "Because the claim is autobiography, not thought experiment. He lived in a body damaged while it was someone else's property; 'impediment to the leg is not impediment to the will' describes his own daily condition.",
      },
      {
        question: "10. Why does this course assign the Enchiridion again after PHIL 701?",
        answer: "Because it is the compressed field manual of the very school the course now enters. Read against the Discourses, each chapter reveals itself as a full classroom discourse folded down to a card — the course unfolds them.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Everything in Epictetus rests on one distinction: what is up to us, and what is not.",
      assignment: "Take a sheet of paper and divide it into two columns: 'Up to me' and 'Not up to me.' List everything currently worrying you — every project, relationship, fear, ambition — placing each item in the correct column. Be strict: outcomes, other people's opinions, your health, your reputation all go right. Your judgments, intentions, and responses go left. Keep the sheet. This is the audit the entire course will train you to run automatically.",
      duration: "25 min",
      greekTerms: "eph' hēmin — up to us / prohairesis — faculty of choice / chrēsis phantasiōn — use of impressions",
    },
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'The Socratic Inheritance — On Progress and Affection',
    briefing:
      "Epictetus called himself a Socratic before he called himself anything else. His method is the elenchus — the patient, devastating cross-examination that lets a person discover that their own commitments contradict each other. This session reads two discourses that show the method at work. In I.4, Epictetus demolishes the standard measure of philosophical progress — books read, texts mastered — and replaces it with the only real one: where have you moved your desire? In I.11, a Roman official confesses that he fled his sick daughter's bedside because he loved her too much to watch her suffer. Epictetus never tells him he is wrong. He asks questions until the man tells himself.",
    parts: [
      {
        title: 'Prokopē — What Progress Actually Is',
        content: [
          "The students in Epictetus's school were, in modern terms, graduate students — and they measured progress the way graduate students do: by mastery of texts. I can read Chrysippus. I can interpret the obscure passages. Epictetus's response in I.4 is scorching: if the interpretation of Chrysippus is the achievement, then philosophy is a branch of literary criticism, and the philosopher is merely a grammarian with better source material. 'When someone says, read me Chrysippus, and I interpret him — if I do not show deeds in harmony with his words, what am I but a grammarian instead of a philosopher?'",
          "Real progress (prokopē) is measured in one place only: the movement of desire and aversion. The person making progress has begun to withdraw desire from externals and aversion from what merely threatens externals. Where does your disturbance come from? Track it, and you find what you still treat as good and bad. The student who has read everything and still panics at a summons from the governor has made no progress at all; the student who has read one book and no longer curses at delays has made some.",
          "This gives Epictetus's school its peculiar exam structure — the one this Academy borrows. The test is never whether you can recite the doctrine. The test is what you do when the doctrine is inconvenient. Progress shows up as changed behavior under pressure or it does not exist. 'The philosopher's progress: he blames no one, praises no one, complains of no one, accuses no one; never speaks of himself as being anybody or knowing anything.'",
        ],
      },
      {
        title: 'The Father Who Fled — Discourses I.11',
        content: [
          "A Roman official visits the school and Epictetus draws out his story: when the man's small daughter was dangerously ill, he could not bear it — he fled the house and stayed away until word came that she had recovered. He offers this as proof of the depth of his love: he suffered so much that he could not remain. Most of us have told a version of this story about ourselves. It felt overwhelming, so what I did was natural.",
          "Epictetus does not denounce him. He asks questions. Was fleeing right? The man thinks it was natural. Very well — is everything natural right? Would it have been right for the child's mother to flee too? The nurse? The tutor? The man concedes each step. Then the child, sick and in danger, would have been left to die alone by everyone who loved her — as a direct consequence of the principle he just endorsed. The man's own premises, followed honestly, convict his own conduct. Nothing has been imposed on him from outside; he has simply been shown what he already believes, and that it cannot all be true at once.",
          "Then Epictetus names the real cause. The man did not flee because of his daughter's illness — her illness was outside him. He fled because of his judgment about her illness. 'It was not the child's illness that distressed you, but your opinion about it.' The proof is right there in the story: another person in the same room, facing the same illness — the nurse who stayed — was not compelled to run. Same external, different judgment, different action. What compelled him was inside him, and what is inside him is precisely the thing that could be trained. This is the Socratic inheritance: no one does wrong willingly; error is always a mistaken judgment about what is good; and therefore the correction of life is the correction of judgment.",
        ],
      },
      {
        title: 'Affection Without Slavery',
        content: [
          "It is essential to see what Epictetus is not saying in I.11, because this discourse is the standard ammunition of the accusation that Stoicism kills love. He is not telling the father to love his daughter less. He is showing him that what he called love — flight, panic, self-protective collapse — did not serve his daughter at all. Everyone agrees, under questioning, that the loving thing was to stay. His 'excess of love' produced exactly the behavior of indifference. The judgment that her illness was unbearable did not deepen his affection; it disabled it.",
          "Stoic affection (philostorgia) is affection made reliable. The father who has disciplined his judgments can sit at the bedside, hold his daughter's hand, and remain useful through the worst of it — precisely because he does not add to her illness the second catastrophe of his own despair. The discipline of desire does not remove the love; it removes the private terror that was wearing the love's uniform.",
          "Notice, finally, the form of the whole encounter. Epictetus lectures no one. The elenchus works because the contradiction is discovered, not asserted — the man walks out convicted by his own testimony, which is the only conviction that changes anyone. When you engage the Proctor in this course, expect the same treatment. It will ask you for your principle, then ask you where else it applies, then let you meet yourself. That discomfort is the surgery working.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. In Discourses I.4, why does Epictetus say the interpreter of Chrysippus risks being a mere grammarian?",
        answer: "Because if textual mastery is the achievement itself, philosophy collapses into literary criticism. Interpretation only counts as philosophy when it produces deeds in harmony with the words interpreted.",
      },
      {
        question: "2. What is the one true measure of progress (prokopē)?",
        answer: "The movement of desire and aversion — the degree to which desire has been withdrawn from externals and aversion from what threatens externals, shown in changed behavior under pressure.",
      },
      {
        question: "3. What does the well-read student who panics at the governor's summons demonstrate?",
        answer: "That reading is not progress. Despite mastering the texts, his desire and aversion are still lodged in externals, so he has made no progress at all; behavior under pressure is the exam.",
      },
      {
        question: "4. In I.11, what did the father offer as proof of his love, and what did it actually prove?",
        answer: "He offered his flight from his sick daughter's bedside as proof of overwhelming love. Under questioning it proved the opposite: his 'excess of love' produced the exact behavior of indifference — abandoning her.",
      },
      {
        question: "5. Reconstruct the elenchus Epictetus uses on the father.",
        answer: "The father claims fleeing was natural and therefore right. Epictetus asks whether it would then be right for the mother, the nurse, and the tutor to flee too. The father concedes each; the conclusion — the child left to die alone by all who love her — follows from his own premises and convicts his principle.",
      },
      {
        question: "6. What, according to Epictetus, actually caused the father's flight?",
        answer: "Not the daughter's illness (an external) but his judgment about it — the opinion that it was unbearable. The nurse facing the same illness stayed, proving the compulsion was internal and therefore trainable.",
      },
      {
        question: "7. Why is I.11 a refutation of, rather than support for, the claim that Stoicism kills love?",
        answer: "Because disciplined judgment is what makes affection reliable. The father's untrained terror disabled his love; the Stoic who does not judge the illness unbearable can stay, hold her hand, and remain useful — philostorgia made dependable.",
      },
      {
        question: "8. State the Socratic principle underlying the whole discourse.",
        answer: "No one does wrong willingly: error is always a mistaken judgment about what is good, and therefore correcting a life means correcting its judgments.",
      },
      {
        question: "9. Why does the elenchus change people when lecturing does not?",
        answer: "Because the contradiction is discovered, not asserted. The person is convicted by their own testimony — the only conviction that produces genuine change rather than defensiveness.",
      },
      {
        question: "10. Give Epictetus's behavioral portrait of the person making progress.",
        answer: "He blames no one, praises no one, complains of no one, accuses no one, and never speaks of himself as being anybody or knowing anything — the outward signature of desire withdrawn from externals.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Progress is measured by where your desire has moved, and its most visible symptom is where you place blame.",
      assignment: "Run the Enchiridion §5 audit for two days. Every time you catch yourself blaming — a person, the traffic, the weather, an institution, yourself — note it in one line. At the end, sort the notes: blaming others (uninstructed), blaming yourself (progress begun), blaming no one because you located the judgment instead (instructed). Do not perform virtue; just count honestly. The ratio is your current position on Epictetus's scale.",
      duration: "2 days, ~10 min total",
      greekTerms: "prokopē — progress / elenchus — cross-examination / philostorgia — family affection",
    },
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Logic in the Service of Life',
    briefing:
      "Why should a person who wants to live well study logic? Epictetus's students asked the same question, usually as a complaint. His answer, developed across Discourses I.17–20, is that logic is the instrument that examines everything else — including itself — and that a person who cannot evaluate reasoning is at the mercy of whoever reasons at them. But the same discourses contain his sharpest warnings: logic studied for display is worse than no logic at all. These chapters also apply the analysis of judgment to the two hardest cases: the wrongdoer, who acts on how things appear to him and therefore deserves pity rather than anger, and the tyrant, whose entire power evaporates the moment you stop valuing what he controls.",
    parts: [
      {
        title: 'Why Logic Is Necessary — I.17',
        content: [
          "Epictetus opens I.17 with a clean argument. Reason is what analyzes and completes everything else. But reason itself is a composite of impressions and judgments — so what will analyze reason? Only reason itself: it is the one faculty that contemplates itself. Therefore logic — the discipline that examines reasoning as such — is not one subject among others. It is the audit of the auditor. Skip it, and every other judgment you make is issued by an instrument that has never been calibrated.",
          "This is why the discipline of assent, the third and highest of the three fields of training, presupposes logical competence. Assent is saying yes to a proposition. If you cannot tell a valid inference from a plausible one, your yes is worthless — you will be argued into and out of positions by whoever is most confident in the room. The Stoics built the most rigorous logical system of the ancient world not out of technical enthusiasm but because bad reasoning produces bad living. Every panic is an inference. Every resentment has premises.",
          "But Epictetus immediately fences the claim. The measure of logic, like everything else in the school, is use. In I.17 he mocks the student who is proud of being able to analyze arguments but cannot analyze his own fear. Chrysippus himself is only valuable, Epictetus says, as the interpreter of nature — a signpost. 'When I find the interpreter, what remains is to use his precepts. This alone is the thing to be proud of.' A person who worships the signpost and never walks the road has understood nothing, and the more elaborate his admiration, the more complete his failure.",
        ],
      },
      {
        title: 'The Wrongdoer Acts as He Sees — I.18',
        content: [
          "Now the analysis of judgment gets its hardest test: the person who wrongs you. Epictetus's argument in I.18 is ruthless in its simplicity. People act on what appears good to them — assent follows the impression. The thief steals because stealing appears advantageous to him. The slanderer speaks because it appears right, or profitable, or deserved. If the appearance is false, then the person is not wicked but mistaken — he has, in the most literal sense, been deceived about the most important thing in his life, and he suffers for it continuously in the only currency that matters: the corruption of his own ruling faculty.",
          "Then comes the conclusion Epictetus actually wants: should you be angry at him? Anger presupposes that the wrongdoer took something of yours. But run the audit from Session 1. Did he touch your prohairesis? He took property, or reputation, or comfort — externals, things that were never yours in the strict sense. The one genuinely valuable thing in the scene, your judgment, is untouched — unless you now corrupt it yourself, on his behalf, with rage. 'These are the thoughts of one who is truly making progress: the pity that others feel for the blind and the lame, he feels for those who are blinded and lamed in their most sovereign faculties.'",
          "Notice that pity here is not condescension and certainly not passivity — Epictetus never says the thief should keep the money or the slanderer go unanswered. Roles and duties (Session 5) may require you to prosecute, correct, resist. The discourse governs the inner posture with which you do it: as a doctor treats disease, not as a victim avenges injury. The doctor does not scream at the tumor. He removes it, and his hand is steadier because he is not shaking with anger.",
        ],
      },
      {
        title: 'The Tyrant and Reason Examining Itself — I.19–20',
        content: [
          "I.19 stages the confrontation the whole ancient world understood: the philosopher before the tyrant. 'I can chain your leg,' the tyrant says. 'I can behead you.' Epictetus's reply: you can chain my leg — my leg was never mine to guarantee. You cannot chain my judgment. The tyrant's power is real but bounded: it extends exactly as far as the externals you still desire and fear, and not one inch further. This is why tyranny requires your cooperation. Every fear you retain is a handle; the man who has withdrawn desire from externals presents no handles at all. When such a man is threatened, the tyranny simply finds nothing to grip.",
          "Epictetus is not romanticizing defiance. The point is diagnostic: if the summons of a powerful man terrifies you, the problem was installed long before the summons arrived — you had already deposited your good in things he controls. The tyrant merely presents the invoice. Fear of the powerful is a symptom, and the treatment is never political; it is the relocation of desire.",
          "I.20 closes the sequence by returning to the foundation: reason contemplates itself. The trained mind runs a standing audit on its own impressions — 'this impression claims that the summons is a catastrophe; is that claim true?' — the way an assayer tests coin. Epictetus loved the assayer image: for money, he notes, we have developed an entire art of testing — we ring the coin, weigh it, distrust our eyes. For judgments, which govern the whole of life, most people accept counterfeits on sight. Logic in the service of life is exactly this: the assayer's art, applied to the only currency that was ever really yours.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. Reconstruct Epictetus's argument in I.17 for why logic is necessary.",
        answer: "Reason analyzes everything else, but reason itself needs analyzing, and only reason can contemplate itself. Logic is therefore the audit of the auditor: without it, every judgment is issued by an uncalibrated instrument.",
      },
      {
        question: "2. Why does the discipline of assent presuppose logical competence?",
        answer: "Assent is saying yes to a proposition. Without the ability to distinguish valid from merely plausible reasoning, that yes is worthless — the person will be argued into and out of positions by whoever is most confident.",
      },
      {
        question: "3. What is Epictetus's complaint against the student proud of analyzing arguments?",
        answer: "The student can analyze syllogisms but not his own fear — logic studied for display rather than use. The measure of logic, like everything in the school, is its application to one's own impressions.",
      },
      {
        question: "4. What role does Epictetus assign to Chrysippus in I.17?",
        answer: "Interpreter of nature — a signpost. The value lies in using his precepts, not admiring his texts; worshipping the signpost while never walking the road is complete failure.",
      },
      {
        question: "5. State the argument of I.18 for why the wrongdoer deserves pity rather than anger.",
        answer: "People act on what appears good to them. If the appearance is false, the wrongdoer is deceived about the most important thing in life and suffers the corruption of his own ruling faculty. He is blinded in his sovereign faculty — a case for the pity we give the blind, not anger.",
      },
      {
        question: "6. Why is anger at the wrongdoer also an error about property?",
        answer: "Anger presupposes he took something of yours, but he only touched externals — never yours in the strict sense. Your prohairesis remains untouched unless you corrupt it yourself with rage, doing on his behalf what he could not do.",
      },
      {
        question: "7. Does pity for the wrongdoer entail passivity? Explain.",
        answer: "No. Roles and duties may require prosecuting, correcting, or resisting him. The discourse governs the inner posture: act as a doctor treating disease, not a victim avenging injury — the steadier hand belongs to the one not shaking with anger.",
      },
      {
        question: "8. What is the exact boundary of the tyrant's power in I.19?",
        answer: "It extends as far as the externals you still desire and fear — the leg he can chain, the head he can take — and not one inch further. He cannot chain judgment; every retained fear is a handle, and the man without fear of externals presents no handles.",
      },
      {
        question: "9. Why is fear of the powerful a symptom rather than the disease?",
        answer: "Because the problem was installed earlier, when you deposited your good in things the powerful control. The tyrant merely presents the invoice; the treatment is relocating desire, not managing the tyrant.",
      },
      {
        question: "10. Explain the assayer image in I.20.",
        answer: "For coins we have a whole art of testing — ringing, weighing, distrusting appearances — yet judgments, which govern life, are accepted on sight. The trained mind applies the assayer's art to its own impressions before assenting.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Every disturbance is an inference. The assayer tests the coin before accepting it; you can test the impression before assenting.",
      assignment: "Once each day, catch one strong impression — an anger, a dread, an urgent desire — and put it through the assay in writing, three lines: (1) What exactly is this impression claiming? State it as a proposition. (2) Is the claimed good or harm inside or outside my prohairesis? (3) Verdict: assent, refuse, or suspend. Three lines, once a day. You are not trying to feel differently; you are practising the test itself.",
      duration: "5 min daily",
      greekTerms: "synkatathesis — assent / phantasia — impression / dokimazein — to assay, test",
    },
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Freedom and the Good — Confidence and Caution',
    briefing:
      "The paradox at the center of Discourses II.1–5: the Stoic is simultaneously the most cautious and the most confident person alive. Cautious, because in everything that depends on his own judgment he proceeds like a man carrying something priceless — which he is. Confident, because in everything else there is nothing to fear: no external can harm what matters. Most people have it exactly backwards — reckless with their judgments, terrified of circumstances. These chapters contain Epictetus's most famous image of the well-lived life: the ball-player, who plays with total skill and total seriousness while knowing the ball itself is nothing.",
    parts: [
      {
        title: 'Two Postures, Correctly Assigned — II.1',
        content: [
          "Epictetus opens Book II with what he admits sounds like a contradiction: the philosophers say we should act with confidence (tharsos) and with caution (eulabeia) at the same time. The resolution is the audit from Session 1, applied as posture. Caution belongs where the true evils are — in the domain of prohairesis, where a false assent or a misplaced desire actually damages you. Confidence belongs everywhere else, because everything else, however dramatic, is incapable of touching the good.",
          "Now look at how ordinary life assigns the two postures. We are supremely confident about our judgments — we assent instantly, on sight, to impressions about what is terrible and what is necessary — and we are cautious, anxious, hedging about circumstances: money, health, what people think, how it will turn out. Epictetus's claim is that this is not just suboptimal but precisely inverted. We guard the warehouse and leave the vault open. The whole of training is the exchange of postures: bring the caution home to where the danger is, release the confidence outward to where there is none.",
          "Death is his test case, because it is the strongest external. 'Death is nothing terrible — else it would have appeared so to Socrates. The terror consists in our opinion of death.' The sentence is Enchiridion §5 in its original classroom setting. He is not asking the student to like death. He is asking the student to locate the terror — and it is never in the corpse; it is in the judgment. What is in the judgment is in your jurisdiction. That is the ground of confidence.",
        ],
      },
      {
        title: 'The Man on Trial — II.2',
        content: [
          "II.2 is addressed to a man heading to court in a genuine Roman trial, with everything external at stake — property, exile, possibly life. Epictetus's advice scandalizes every normal instinct: decide first what you are protecting. If you are protecting the verdict, you have already lost, whatever the outcome, because you have handed your good to the jury. If you are protecting your prohairesis — going through the trial as a just, composed, honest man — then you are perfectly safe, whatever the outcome, because no jury has jurisdiction over that.",
          "He invokes Socrates as the precedent: Socrates prepared for his trial not by drafting a defense but by living fifty years of examined life — 'he who prepares his whole life is always prepared.' The preparation for any crisis is the daily practice that preceded it; the trial only publishes what the practice built. And Socrates, refusing to grovel, lost the verdict and kept everything he actually valued. The Athenians could kill him; they could not harm him. That distinction — kill but not harm — is the entire content of Stoic confidence.",
          "Note what this does not mean, because II.2 is often misread as indifference to outcomes. Epictetus does not tell the man to skip the trial or mount no defense. Make the argument, call the witnesses, do it all with full competence — the defense is your appropriate action, fully in your power to perform well. Only the verdict is not. The energy most people spend fearing the verdict, the Stoic spends preparing the defense. This is why the Stoic is more effective in the crisis, not less: fear was never a performance enhancer.",
        ],
      },
      {
        title: 'Playing the Ball Well — II.5',
        content: [
          "II.5 gives the image that resolves the whole tension between caring and not caring. Skilled ball-players, Epictetus observes, care nothing for the ball as an object — no one weeps over a ball — but they care completely about the play: the catch, the throw, the speed, the form. The ball is indifferent; the playing is everything. So with life: health, wealth, reputation, the body itself are the ball. They are what the game happens to be played with. The catching and throwing — the justice, the composure, the skill of your engagements — that is where the good lives, because that is what is yours.",
          "The image dissolves the caricature of the detached Stoic. The ball-player is not passive; he sprints, dives, commits totally. Detachment from the ball is exactly what enables total commitment to the play — the player clutching the ball in terror of losing it cannot play at all. Likewise the negotiator who must win cannot negotiate well, the parent terrified of the child's every stumble cannot parent well, the writer who cannot bear rejection cannot write honestly. Attachment to outcomes degrades performance toward them. This is the practical engine inside the Stoic paradox: caring about externals less makes you objectively better at handling them.",
          "And when the game ends — the trial is lost, the fortune gone, the diagnosis final — the ball-player's question remains the only one: did I play well? Socrates in prison, refusing escape, is Epictetus's example of a man still playing beautifully with the worst possible ball. 'He plays the game, and it is the ball he plays with' — the game was never about keeping the ball. It cannot be kept. Every player eventually hands it back.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. How does Epictetus resolve the apparent contradiction of acting with confidence and caution simultaneously?",
        answer: "By assigning each posture to its proper domain: caution belongs in the domain of prohairesis, where false assent genuinely damages you; confidence belongs toward everything external, which cannot touch the good.",
      },
      {
        question: "2. In what sense does ordinary life invert the two postures?",
        answer: "People are recklessly confident about their judgments — assenting instantly to impressions — while anxious and cautious about circumstances. They guard the warehouse (externals) and leave the vault (the ruling faculty) open.",
      },
      {
        question: "3. What does 'death is nothing terrible — else it would have appeared so to Socrates' argue?",
        answer: "That the terror of death lies in the opinion about it, not the thing itself: the same external appeared non-terrible to a rightly-ordered judge, so the terror is a judgment — and judgments are within our jurisdiction.",
      },
      {
        question: "4. What is Epictetus's first question for the man going on trial?",
        answer: "What are you protecting? If the verdict, he has already lost — his good is in the jury's hands. If his prohairesis — conducting himself justly and composedly — he is safe whatever the outcome.",
      },
      {
        question: "5. How did Socrates 'prepare' for his trial?",
        answer: "By living fifty years of examined life rather than drafting a defense — 'he who prepares his whole life is always prepared.' A crisis only publishes what daily practice has already built.",
      },
      {
        question: "6. Explain the distinction 'they can kill me, but they cannot harm me.'",
        answer: "Killing destroys externals — the body, the life. Harm, strictly, is damage to the good, which lives only in the ruling faculty. The Athenians controlled the first and had no jurisdiction over the second.",
      },
      {
        question: "7. Does II.2 counsel indifference to the trial's conduct? What is the correct division?",
        answer: "No — mount the full defense with complete competence; the defense is an appropriate action within your power. Only the verdict is not. The energy others spend fearing the verdict goes into preparing the defense.",
      },
      {
        question: "8. Unpack the ball-player image: what corresponds to the ball, and what to the play?",
        answer: "The ball is every external — health, wealth, reputation, the body. The play — the skill, justice, and composure of your engagements — is where the good lives, because only the playing is yours.",
      },
      {
        question: "9. Why does detachment from the ball improve rather than diminish performance?",
        answer: "The player clutching the ball in terror cannot play; attachment to outcomes degrades performance toward them. Releasing the outcome frees total commitment to the action — the Stoic is more effective in crisis, not less.",
      },
      {
        question: "10. When the game is lost, what is the only remaining question, and who is the model?",
        answer: "'Did I play well?' Socrates in prison, refusing escape and still playing beautifully with the worst possible ball, is the model — the game was never about keeping the ball, which every player eventually hands back.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Caution belongs on your judgments; confidence belongs toward the world. Most people have it backwards.",
      assignment: "Choose the highest-stakes situation on your calendar this week — a meeting, a conversation, a submission, a result. Before it, write two short lists: 'The ball' (every outcome you cannot control) and 'The play' (every element of your own conduct you can). Commit to evaluating yourself afterward on the play list only. After the event, grade the play honestly, one line per item — and notice, in writing, what the grading does to your feeling about the ball.",
      duration: "20 min + the event",
      greekTerms: "tharsos — confidence / eulabeia — caution / adiaphora — indifferents",
    },
  },
  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Character and Roles — Who Will You Be?',
    briefing:
      "In Discourses II.8–10, Epictetus turns from what you have to what you are. II.8 makes the most startling claim in the whole corpus: you carry God within you — the rational faculty is literally a fragment of the divine, and you defile it daily without noticing. II.9 diagnoses the standard human failure: we hold the profession of a human being and perform it like animals. II.10 then builds the ethics that follows: from each of your names — human, citizen, son or daughter, sibling, colleague — the duties can be read off directly. Stoic ethics is not a list of rules imposed from outside. It is role analysis: discover what you are, and what you must do follows.",
    parts: [
      {
        title: 'The God You Carry — II.8',
        content: [
          "Where is the good? Epictetus asks in II.8. Not in the flesh, not in property, not in office — in the rational use of impressions. But then he pushes further than anywhere else in the Discourses: that rational faculty is not merely yours; it is a fragment (apospasma) of God. The Stoic universe is a single living rational order — the logos — and the human ruling faculty is a detached portion of that very thing, embedded in a body. When you reason, the universe is reasoning locally. This is not metaphor for Epictetus. It is physics.",
          "The practical consequence lands immediately: 'You are carrying God around with you, and you do not know it. Do you suppose I mean some external god of silver or gold? You carry him within yourself, and you do not perceive that you are defiling him with unclean thoughts and filthy actions.' If a statue of the god stood in the room, you would not behave shamefully in front of it. The claim of II.8 is that the situation is strictly worse than that: the god is not watching from the corner; the god is the faculty doing the shameful thing. Every degraded judgment degrades a divine instrument.",
          "This transforms self-respect from vanity into piety. Guarding the ruling faculty — refusing to lend it to panic, resentment, servility — is not self-improvement in the modern sense. It is the maintenance of a shrine. And notice how the doctrine reframes the slave-born teacher: no configuration of external status can touch the divine fragment. The high-born senator and the lame ex-slave carry identical portions of God. Epictetus's egalitarianism is not political theory; it falls straight out of his physics.",
        ],
      },
      {
        title: 'The Profession of a Human Being — II.9',
        content: [
          "II.9 opens with a definition and an accusation. The definition: a human being is a mortal animal endowed with rational use of impressions. The accusation: holding this profession, most of us perform a different one. When we act for the belly, for the passing impulse, greedily, violently — 'to what have we descended? To a sheep.' When we act aggressively, to injure and dominate — 'to a wild beast.' The insult is precise: failure of character is not failure to meet a high standard; it is failure to perform the role you already occupy. No one blames a sheep for grazing. Everyone rightly blames a human for nothing but grazing.",
          "Then Epictetus turns the knife toward his own students — the ones proud of their Stoic reading. 'Why do you call yourself a Stoic?' The word, he says, is used the way an impostor uses a title. Show me a Stoic, and by 'show' he means: show me a person shaped by the doctrines — sick and yet happy, in danger and yet happy, dying and yet happy, exiled and yet happy, disgraced and yet happy. 'Show him to me. By the gods, I would fain see a Stoic!' If you cannot show the finished man, show one being formed — but the forming happens in conduct, never in vocabulary.",
          "The mechanism of failure is stated with total clarity: it is one thing to digest doctrines and another to memorize them. Undigested doctrine is worse than none, because it adds hypocrisy to ignorance and inoculates you against the real thing — you believe you have already taken the medicine. This is Epictetus's standing warning to every student of this Academy, and it is why the practice assignments, not the quizzes, are the actual course.",
        ],
      },
      {
        title: 'Reading Duties Off Your Names — II.10',
        content: [
          "II.10 builds the positive ethics. Begin with your names — not your personal name, but the roles you factually occupy — and each one hands you a job description. You are a human being: your governing commitments are to act as a rational, social creature, treating nothing as privately good that plunders the common good. You are a citizen of the cosmos: nothing that happens by nature's order is foreign to you; your interest is bound to the interest of the whole, 'as the foot, if it had reason, would understand that it must sometimes step in the mud.' You are a son or daughter: the role prescribes care of parents, deference, patience with their failings. A sibling: yield, be generous, and never account the cost against a brother in externals — 'you lose a little money; he gains it. But you keep the brother.'",
          "The method scales to every station: magistrate, spouse, neighbor, colleague. In each case the question 'what should I do?' becomes the tractable question 'what does this role, held by a rational social being, require here?' Notice how different this is from rule-book ethics. The rules are not imposed; they are discovered, unfolded from relationships that already exist. And when roles conflict — the citizen and the sibling, the parent and the magistrate — the ranking role is always the first one: human being, rational and social. No subordinate role can require you to become a beast to perform it.",
          "The chapter ends with the account books. When you lose money, you count the loss. What is the entry, Epictetus asks, when you lose your modesty, your fair dealing, your self-command — is nothing lost? The man who trades his integrity for an advantage has made a trade; he has simply kept no books on the side of the ledger where the real currency is. II.10's closing demand is that you keep both books. Every action is a transaction in character, and the rate of exchange is the worst-kept secret in the world: the externals are always cheaper.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What does Epictetus mean by calling the rational faculty a 'fragment' (apospasma) of God?",
        answer: "In Stoic physics the universe is a single rational order (logos), and the human ruling faculty is a detached portion of that very order embedded in a body. When you reason, the universe reasons locally — physics, not metaphor.",
      },
      {
        question: "2. Reconstruct the argument of 'you are carrying God around with you.'",
        answer: "You would not act shamefully before a statue of the god; but the divine is not watching from the corner — it is the very faculty performing your actions. Every degraded judgment therefore defiles a divine instrument you carry.",
      },
      {
        question: "3. How does II.8 turn self-respect into piety?",
        answer: "Guarding the ruling faculty — refusing to lend it to panic, resentment, or servility — becomes maintenance of a shrine rather than vanity, since the faculty guarded is a portion of God.",
      },
      {
        question: "4. What follows for human equality from the doctrine of the divine fragment?",
        answer: "No external status touches the fragment: senator and lame ex-slave carry identical portions of God. Epictetus's egalitarianism falls directly out of his physics rather than political theory.",
      },
      {
        question: "5. In II.9, what do the sheep and the wild beast represent?",
        answer: "Two modes of failing the human profession: acting for appetite and impulse (the sheep) and acting to injure and dominate (the wild beast). The failure is performing the wrong role, not falling short of an optional ideal.",
      },
      {
        question: "6. What would satisfy Epictetus's demand 'show me a Stoic'?",
        answer: "A person shaped by the doctrines in conduct — sick and yet happy, in danger, dying, exiled, disgraced and yet happy — or at least one visibly being formed. Vocabulary and reading prove nothing.",
      },
      {
        question: "7. Why is undigested doctrine worse than no doctrine?",
        answer: "It adds hypocrisy to ignorance and inoculates against the real thing — the memorizer believes he has already taken the medicine, so the actual treatment never begins.",
      },
      {
        question: "8. What is the method of II.10 for discovering your duties?",
        answer: "Read them off your names — the roles you factually occupy (human, cosmic citizen, child, sibling, magistrate, colleague). Each role, held by a rational social being, hands you its job description; duties are unfolded from existing relationships, not imposed as rules.",
      },
      {
        question: "9. When roles conflict, which one ranks first and why?",
        answer: "The role of human being — rational and social — governs all others. No subordinate role can require you to become a beast to perform it.",
      },
      {
        question: "10. Explain the account-books argument that closes II.10.",
        answer: "We keep meticulous books on external losses but no books on losses of modesty, fair dealing, and self-command. Every action is a transaction in character; keeping both ledgers reveals that the externals are always the cheaper currency.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Your duties are not imposed from outside — they unfold from the roles you already occupy.",
      assignment: "Write your role inventory. List every role you factually hold — human being, then the particulars: partner, parent or child, sibling, friend, colleague, citizen, neighbor. For each, write one sentence: what this role requires of me that I am currently not doing. Choose the single cheapest item on the list — the one requiring the least heroism — and do it before the next session. Ethics begins as bookkeeping.",
      duration: "30 min + one act",
      greekTerms: "apospasma — fragment / prosōpon — role, character / kathēkonta — appropriate actions",
    },
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'Living Among Others — Training for Society',
    briefing:
      "Discourses II.14–18 form Epictetus's treatise on the gap between the classroom and the street. II.14 tells a Roman visitor what philosophers actually do: harmonize the will with events. II.15 corrects a misreading of Stoic firmness — obstinacy is not strength when the judgment being held is diseased. II.16 names the scandal of the school: students fluent in theory who fall apart the moment a ship creaks or a summons arrives. II.17 locates the source of all human conflict in the application of preconceptions to particulars. And II.18 delivers the mechanics of habit: every impression you assent to strengthens its habit, every refusal weakens it — character is a fire you are feeding or starving with every judgment.",
    parts: [
      {
        title: 'What Philosophy Does, and What Firmness Is Not — II.14–15',
        content: [
          "A Roman named Naso visits the school, and Epictetus explains the enterprise to an outsider in one sentence: the philosopher's project is 'to bring his own will into harmony with events, so that nothing happens against our will, and nothing fails to happen that we wish to happen.' Stated to a practical Roman, the payoff is practical: the person who achieves this does not fail to get what he wants — because he has learned to want within the field of the possible — and does not fall into what he would avoid. Desire without frustration, aversion without capture. Everyone wants the result; philosophy is merely the only mechanism that can deliver it, because it adjusts the one variable actually under your control.",
          "Epictetus adds the observer's model: like men at a festival — some come to buy and sell, some to compete, some merely to watch — the philosopher comes to the world to understand the administration of it, and who administers it, and to align himself with that administration. This is the discipline of desire stated cosmically: study how the whole works, then stop demanding that it work otherwise.",
          "II.15 immediately blocks the standard corruption of this teaching. A man had resolved to starve himself to death — for no adequate reason — and defended the resolve as Stoic firmness: I must abide by my decisions. Epictetus is blunt: 'it is madness, not health.' Abide by correct judgments — judgments, he says, are like the foundation of a wall; only sound ones deserve a building on top. Firmness in a rotten judgment is not strength; it is the disease armored. The order of operations is absolute: first examine the judgment, then be immovable. Obstinacy is what immovability looks like when the examination was skipped.",
        ],
      },
      {
        title: 'Fluent in the Classroom, Helpless at Sea — II.16–17',
        content: [
          "II.16 is Epictetus's most sustained attack on his own students — and on you. In the classroom, every one of them can define the good, analyze the syllogism, prove that externals are indifferent. Then the ship groans in a storm, or the letter arrives, or the crowd hisses, and the entire education evaporates: 'we are agitated exactly as if the doctrines had never been spoken.' The diagnosis: the doctrines have been learned as answers, not as habits. Theory answers questions; only training (askēsis) answers events. 'This is why the philosophers admonish us not to be satisfied with mere learning, but to add practice, and then training.'",
          "The mechanism of the collapse is precise: in the crisis, we reach for what we have actually rehearsed. If you have rehearsed the definitions, you will produce definitions — eloquently, uselessly. If you have rehearsed applying the dichotomy under mild pressure, some of that application survives under severe pressure. Epictetus's contempt is reserved for students who blame the doctrine for their collapse, like a wrestler blaming the manual for a lost match he never trained for. Practice is not the supplement to Stoic theory. Practice is the theory, instantiated; everything else is marketing.",
          "II.17 then asks why human beings conflict at all — and answers: never over preconceptions (prolēpseis), always over their application. Everyone, everywhere, agrees in the abstract: the good is beneficial, the just is fine and fitting, the holy is to be honored. No one has ever gone to war over these sentences. War begins at application: is this act just? Is this man's advantage good? 'This is the conflict of Jews and Syrians and Egyptians and Romans — not whether the holy is to be preferred to all things, but whether this particular thing is holy or unholy.' The whole of philosophical education, on this account, is learning to apply preconceptions correctly to cases — which is why two sincere people can share every value and still be enemies, and why sincerity has never been evidence of correctness.",
        ],
      },
      {
        title: 'Feeding and Starving the Fire — II.18',
        content: [
          "II.18 supplies the physics of character. 'Every habit and every faculty is preserved and increased by the corresponding actions: the habit of walking by walking, the habit of running by running.' The same law runs the soul: every time you are angry, you have not merely had an episode; you have fed the habit of anger — 'you have increased the inflammation.' Every time you yield to an appetite, the appetite's next assault is stronger, because you funded it. Character is not a possession; it is a standing rate of reinforcement. There are no neutral repetitions.",
          "The same law, read in reverse, is the whole hope of the school. Refuse the impression, and you have starved the habit. 'If you would not be of an angry temper, do not feed the habit; throw nothing on it to make it grow. Be quiet at first, and count the days on which you have not been angry.' The counting is not a rhetorical flourish; it is the actual exercise — Epictetus prescribes streak-keeping, twenty centuries before the habit apps: one day, then two; at thirty days, sacrifice to the gods. Habit (hexis) is first weakened, then destroyed. He even names the escalation protocol: when the impression is fierce, set against it the memory of what the indulgence cost you, and the anticipated self-approval of victory — enlist pleasure on the side of the discipline.",
          "And beneath the technique, the stakes: 'the man who has a fever, and then recovers, is not in the same state as before, unless he was completely cured.' Half-recovered souls relapse at the first occasion. This is why Epictetus refuses to let training end at insight. The insight was the diagnosis. The repetitions — daily, unglamorous, countable — are the cure, and the fire you are feeding or starving right now, with today's assents, is the person you will be equipped with in the next crisis.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What one-sentence account of philosophy does Epictetus give the Roman visitor in II.14?",
        answer: "To bring one's will into harmony with events, so that nothing happens against our will and nothing we wish fails to happen — desire without frustration, achieved by adjusting the only variable under our control.",
      },
      {
        question: "2. Explain the festival image of II.14.",
        answer: "As some attend a festival to buy, sell, or compete while others come to watch and understand, the philosopher comes to the world to understand its administration and align himself with it — the discipline of desire stated cosmically.",
      },
      {
        question: "3. Why does Epictetus call the starving man's resolve 'madness, not health' despite its firmness?",
        answer: "Because firmness is only a virtue when the judgment held is sound. Judgments are the foundation of a wall — building immovably on a rotten one armors the disease. Examination must precede immovability.",
      },
      {
        question: "4. What is the scandal named in II.16?",
        answer: "Students fluent in doctrine collapse the moment a real storm, summons, or crowd arrives — agitated exactly as if the doctrines had never been spoken. Learning without training does not survive contact with events.",
      },
      {
        question: "5. Why does eloquence in the crisis not count as progress?",
        answer: "In crisis we produce what we have rehearsed. Rehearsing definitions yields definitions — eloquent and useless. Only rehearsed application of the doctrines under pressure survives pressure.",
      },
      {
        question: "6. According to II.17, what do human beings never conflict over, and where does conflict begin?",
        answer: "Never over preconceptions — everyone agrees the good is beneficial and the just is fitting. Conflict begins at application: whether this particular act, person, or cause instantiates the preconception.",
      },
      {
        question: "7. What follows from II.17 about sincerity?",
        answer: "Two sincere people can share every abstract value and still be enemies, because their applications differ. Sincerity is therefore no evidence of correctness — education must train application, not conviction.",
      },
      {
        question: "8. State the law of habit from II.18.",
        answer: "Every habit and faculty is preserved and increased by corresponding actions — walking by walking, anger by anger. Each assent feeds its habit; there are no neutral repetitions.",
      },
      {
        question: "9. What is Epictetus's prescribed exercise against an angry temper?",
        answer: "Starve the habit: throw nothing on the fire, be quiet at first, and count the days without anger — streak-keeping that first weakens and then destroys the habit (hexis), with sacrifice to the gods at thirty days.",
      },
      {
        question: "10. Why is the half-cured soul a special danger?",
        answer: "Like a fever incompletely cured, it relapses at the first occasion. Insight is only the diagnosis; unglamorous countable repetition is the cure, and stopping at insight leaves the disease intact.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Character is a rate of reinforcement: every assent feeds a habit, every refusal starves one.",
      assignment: "Choose one habit-impression to starve — the reflexive anger, the doom-scroll, the complaint, the third drink. For the next week, run Epictetus's counter: each day you do not feed it, mark the day. Keep the tally where you will see it. When the impression is fierce, use his protocol — recall exactly what the indulgence cost you last time, and how the day feels when you win. Report your count to the Proctor at the next session. The count is the assignment; a broken streak restarted is a streak, not a failure.",
      duration: "7 days, 2 min daily",
      greekTerms: "hexis — habit, disposition / askēsis — training / prolēpsis — preconception",
    },
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'God, Providence, and the Fields of Training',
    briefing:
      "Discourses III.1–5 contain the sentence this entire Academy is built on. In III.2, Epictetus lays out the three fields of training (topoi) — desire, action, assent — in their canonical order, and explains why the order matters: the school that starts with clever arguments has built the roof before the foundation. Around it, III.1 confronts a beautiful young rhetorician with the question of what beauty in a human being actually is; III.3 defines the raw material the good person works on — his own ruling faculty, nothing else; and III.5 dismisses the student who wants to go home because he is sick, with the reminder that illness, too, is part of the curriculum. Above all these chapters stands Epictetus's theology: the world is administered by a provident rational order, and the philosopher's vocation is to be its witness — to sing the hymn.",
    parts: [
      {
        title: 'The Adorned Young Man — III.1',
        content: [
          "A student of rhetoric enters the classroom — hair elaborately dressed, appearance curated to the last detail. Epictetus does not mock him; he takes the young man's project with perfect seriousness and simply asks the question underneath it: you want to be beautiful — good; what is a human being's beauty? The beauty of a dog is one thing, of a horse another; each thing is beautiful when it excels in what it is. A human being is the rational animal. Therefore the beauty of a human being is the excellence of the rational faculty — 'adorn that, and make it beautiful; leave your hair to him who formed it as he willed.'",
          "The move is pure Socratic redirection, and it is worth studying as method: Epictetus never attacks the desire. Desire for beauty, for distinction, for being admired — these are misdirected forms of a correct instinct, the instinct that the self should be made excellent. The error is only in the address. The young man is decorating the house's exterior while the interior burns. Redirected, the same energy that curls hair could discipline judgment.",
          "There is also, quietly, a theology in the closing line. Leave your hair to him who formed it — the externals of your constitution were decided by the craftsman of the whole, and are none of your business in the strict sense. Your business is the one thing handed entirely over to you. God, Epictetus says elsewhere, gave you no faculty of controlling your body's form; he gave you a divine faculty of controlling your judgments. To lavish care on the first while neglecting the second is to refuse the actual gift while polishing the wrapping.",
        ],
      },
      {
        title: 'The Three Fields of Training — III.2',
        content: [
          "Here is the architecture of the whole school, stated once, completely. There are three fields (topoi) in which the person who would be good must be trained. First, desire and aversion (orexis kai ekklisis) — that he may never fail to get what he desires nor fall into what he avoids: the discipline of desire. Second, impulse to act and not to act (hormē kai aphormē) — the domain of duties, that he may act in order, with good reason, toward others: the discipline of action. Third, assent (synkatathesis) — freedom from deception and hasty judgment: the discipline of assent. This is the passage Hadot placed at the center of his reading of all later Stoicism; Marcus's Meditations, as you saw in PHIL 702, are structured entry by entry on exactly these three.",
          "The order is pedagogy, not decoration. The first field is 'the most urgent' — because a person still desiring externals is a person still capable of panic, envy, and grief, and no logical training survives in that weather. Discipline desire first, or the passions will eat the curriculum. The second field builds on the calm the first creates: only the person no longer enslaved to outcomes can act toward others 'in order and with good reason' — the anxious act for themselves even when they appear to act for you. The third field, assent in full precision, is 'for those already making progress' — the finishing school of the judgment, certainty under all conditions, even in dreams and drunkenness, Epictetus adds, only half-joking.",
          "And then the complaint that dates the passage not at all: the philosophers of his day, Epictetus says, have inverted the order. They neglect the first two fields and specialize in the third's most technical corner — changing arguments, equivocal premises, the logic-chopping that displays well in a lecture hall. 'The result is that they lie — but tremble when they lie.' The sentence is a whole indictment: technical mastery co-existing with an untrained soul, cleverness as a performance layered over unhandled fear. The test of a curriculum is not the sophistication of its upper floors but whether the foundation was ever poured.",
        ],
      },
      {
        title: 'Your Material Is Your Own Mind — III.3, III.5, and the Hymn',
        content: [
          "III.3 gives the craftsman's answer to 'what do I work on?': 'The material of the good and excellent person is his own ruling faculty — the body is the physician's material, the land the farmer's.' Every craft is defined by its material; the craft of living has exactly one. Events, other people, fortune — these are not your material; they are the weather your material is worked in. The proper use of impressions, hour by hour, is the entire craft, and the good, Epictetus repeats, will never be found in anything but your own judgments — 'where the good is, there is also the self.'",
          "III.5 then handles the student who wants to leave school because he has fallen ill — as if illness interrupted the curriculum. Epictetus's answer: illness is the curriculum, arrived early. 'Did you not know that disease and death must overtake us, no matter what we are doing?' The whole point of the training was to have a soul that keeps its post — 'I am doing what belongs to me' — whether the body flourishes or fails. To flee the school when the examination begins is to confess the enrollment was theoretical. He tells the student what he would wish to be found doing when death overtakes him: something worthy of a rational being — and if death finds him so occupied, that is enough; no further arrangement of externals was ever going to be enough.",
          "Beneath all five chapters runs the theology that separates Epictetus from every merely therapeutic reading of Stoicism. The world is not neutral stuff; it is administered — a single rational order, provident, in which each part serves the whole. The fragment of that order lodged in you (Session 5) can do what nothing else in nature can: notice the administration, understand it, and praise it. 'If I were a nightingale, I would do what belongs to a nightingale; if a swan, what belongs to a swan. But I am a rational creature, and I ought to praise God: this is my work, and I do it — nor will I desert this post as long as it is given to me; and I exhort you to join in this same song.' The discipline of desire is not resignation. It is the hymn, practised until it is sincere.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. How does Epictetus redirect, rather than refute, the adorned young man of III.1?",
        answer: "He accepts the desire to be beautiful and asks what human beauty is: each thing is beautiful when it excels as what it is, and the human is the rational animal — so adorn the rational faculty. The instinct to perfect the self is correct; only its address is wrong.",
      },
      {
        question: "2. What theology is compressed into 'leave your hair to him who formed it'?",
        answer: "The externals of your constitution were decided by the craftsman of the whole and are not your business; your business is the one faculty handed entirely over to you. Polishing the wrapping while refusing the gift inverts the divine allocation.",
      },
      {
        question: "3. Name the three fields of training of III.2 with their Greek terms and their objects.",
        answer: "Desire and aversion (orexis/ekklisis) — never failing to get what is desired nor falling into what is avoided; impulse to act and not act (hormē/aphormē) — duties, acting in order and with good reason toward others; assent (synkatathesis) — freedom from deception and hasty judgment.",
      },
      {
        question: "4. Why must the discipline of desire come first?",
        answer: "Because a person still desiring externals remains capable of panic, envy, and grief, and no further training survives in that weather. The passions must be starved of their objects before duties or logic can be built.",
      },
      {
        question: "5. Why can only the person trained in desire act well toward others?",
        answer: "Because the anxious act for themselves even when appearing to act for you. Freedom from enslavement to outcomes is what makes action 'in order, with good reason' — genuinely other-directed — possible.",
      },
      {
        question: "6. What inversion does Epictetus accuse his contemporaries of, and what is its symptom?",
        answer: "Neglecting the first two fields to specialize in the third's technical corner — equivocal premises, changing arguments. The symptom: 'they lie — but tremble when they lie'; cleverness layered over an untrained soul.",
      },
      {
        question: "7. What is the material of the good person according to III.3, and what follows from it?",
        answer: "His own ruling faculty — as the body is the physician's material and land the farmer's. Events and other people are the weather, not the material; the entire craft of living is the hour-by-hour use of impressions.",
      },
      {
        question: "8. How does Epictetus answer the sick student who wants to leave school in III.5?",
        answer: "Illness is the curriculum arrived early: disease and death overtake us whatever we are doing, and the training exists precisely so the soul keeps its post when the body fails. Fleeing the examination confesses the enrollment was theoretical.",
      },
      {
        question: "9. What can the rational fragment do that nothing else in nature can, per the nightingale passage?",
        answer: "Notice the administration of the whole, understand it, and praise it. The nightingale sings as a nightingale; the rational creature's proper work is the hymn — conscious, articulate assent to the order of things.",
      },
      {
        question: "10. Why is the discipline of desire 'the hymn, practised until it is sincere' rather than resignation?",
        answer: "Resignation merely stops fighting events; the hymn affirms them as the administration of a provident order. The discipline aims not at numbness but at trained, truthful praise — wanting what happens because one understands the whole.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The three fields have an order: desire first, action second, assent third. Train in sequence.",
      assignment: "Each morning this week, before the day begins, dedicate the day in one written sentence: name the one external you are most likely to demand from today (a result, a response, someone's mood), and formally return it — 'this is not mine to command; my post today is X,' where X is one action fully in your power. In the evening, one line: did you keep the post? This is III.5's exercise — being findable at your work.",
      duration: "5 min morning, 2 min evening",
      greekTerms: "topos — field of training / orexis — desire / hormē — impulse / to hēgemonikon — the ruling faculty",
    },
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'The Cynic Ideal and the Inviolable Self',
    briefing:
      "Discourses III.22 is Epictetus's portrait of the perfected philosopher — painted, deliberately, as a Cynic: no house, no property, no family, no protection, and yet free, fearless, and useful to everyone he meets. A student asks casually about taking up the Cynic's staff, and Epictetus responds with the longest and most demanding discourse in the corpus: the Cynic is the scout (kataskopos) of God, sent ahead to report to mankind what is truly good and truly indifferent — and his credentials are written in what cannot touch him. III.23 then turns on the opposite figure, the display-lecturer who philosophizes for applause, and delivers the surgery line this Academy quotes on its door. III.24 completes the trilogy with the tenderest and hardest teaching: how to love people and places while holding them as what they are — given, not owned.",
    parts: [
      {
        title: 'The Scout of God — III.22',
        content: [
          "A student asks about becoming a Cynic the way one might ask about a career move, and Epictetus's answer is designed to terrify him — because the Cynic, in Epictetus's telling, is not a lifestyle but a commission. 'He is a messenger from God to men about good and evil — to show them that they have wandered.' The Cynic is the kataskopos, the advance scout: sent ahead of the army into enemy territory, he must report accurately what is to be feared and what is not. And his report is his life. Homeless, propertyless, and visibly happy, the Cynic is a walking demonstration that the things mankind guards with locks and armies were never the good, and the things mankind flees were never the evil.",
          "This is why the Cynic's freedoms are qualifications, not deprivations. He can speak frankly to anyone — kings included — because he holds nothing a king can confiscate. He belongs to everyone because he belongs to no household: all men are his sons, all women his daughters, in the sense that his entire occupation is their correction. Epictetus insists the office requires a purity beyond every other station: the Cynic's ruling faculty must be 'purer than the sun,' because a man who rebukes the world while hiding his own disease is not a scout but a fraud. And he must expect to be beaten — and to love the men who beat him, 'as a father, as a brother.' The commission includes the flogging.",
          "Epictetus did not live as a Cynic, and he does not tell his students to. The Cynic is the limit case — the demonstration, at maximum load, of what Sessions 1 through 7 claimed: that the good is entirely in the prohairesis. Most people should test that claim inside ordinary life, with a house and a family and a position (the very things the next chapter of the course takes up). But the limit case matters, the way the proof under extreme conditions matters for an engineering principle. If freedom is possible with nothing, then your freedom was never waiting on the next acquisition.",
        ],
      },
      {
        title: 'The Surgery, Not the Show — III.23',
        content: [
          "III.23 is aimed at a figure Epictetus's students knew well and ours know better: the philosopher as performer — the lecturer who wants to be told 'marvelous!,' who counts his audience, who reads the room for admiration the way a merchant reads it for sales. Epictetus grants the man his craft and destroys his category: what you are doing may be excellent, but it is exhibition (epideixis), not philosophy. The two have different aims and cannot be mixed: the exhibitor needs the audience's pleasure; the philosopher needs their improvement, and improvement, in the beginning, never feels like pleasure.",
          "Then the sentence on this Academy's door: 'The philosopher's school, men, is a surgery (iatreion). You ought not to walk out of it in pleasure, but in pain — for you are not well when you come in.' One of you has a dislocated shoulder, another an abscess, another a headache — and the exhibitor treats them all with epigrams. Can epigrams reduce a dislocation? The image fixes the entire ethics of teaching: flattered students are untreated patients, and a teacher who needs to be admired has made himself incapable of operating, because the incision is precisely what admiration forbids.",
          "The test Epictetus proposes for any teaching — and any book, any feed, any voice you allow to address you regularly — is the exit condition. How do you leave? If you leave saying 'how beautifully he spoke,' you have been to a show. If you leave stung, with your own case on your hands — 'the speaker touched me where my disease is' — you have been to the surgery. He describes his own aim with a rusticity that ends the discussion: when his students praise him, he counts it failure; 'I wish them to go out with pain, and rubbing their shoulders.' Apply the test ruthlessly, including to this course.",
        ],
      },
      {
        title: 'Given Back, Not Lost — III.24',
        content: [
          "III.24 addresses the suffering that feels most legitimate: grief at separation — the friend who sails away, the child who dies, the city one is exiled from. Epictetus's teaching here is the most quoted and most misquoted in the corpus, so read it exactly. Nothing that is another's becomes yours by your loving it. The friend, the child, the homeland were given — as the fig is given in summer, as the grapes are given in season. To demand figs in winter is folly; to demand the presence of what has been recalled is the same folly with higher stakes. 'Never say of anything, I have lost it; say, I have given it back' — the child has been given back; the friend has been given back. The language is not consolation; it is a correction of the property records.",
          "But notice what the discourse demands alongside the surrender — because this is where the misreading enters. Epictetus does not counsel loving less. He counsels loving as a rational being loves: fully, attentively, and with the knowledge of what the beloved is — mortal, leaving, not yours. 'What harm is there while you are kissing your child to whisper: tomorrow you will die?' The whisper is not morbidity. It is the practice that makes the kiss complete — the parent who has rehearsed the mortality is present in the kiss; the parent who has repressed it is already defending against the future, distracted in the exact moment love was available. Premeditation does not poison the present; it purifies it.",
          "The discourse closes the arc that III.22 opened. The Cynic showed the inviolable self at maximum load, stripped of everything; III.24 shows the same self inside a full life — loving, engaged, surrounded by people and places, and still unhostaged, because it holds them all with the open hand. This is the actual teaching of the school on attachment: not the amputation of love but the removal of the lie inside it — the clause that whispered 'this is mine and must remain.' Everything is on loan from fortune, Seneca will say in the course that follows this one; Epictetus says it harder: everything is on loan from God, and the loan was never the insult. The insult is the borrower who screams at the recall of what he signed for.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What is the Cynic's commission, and what serves as his credentials?",
        answer: "He is God's messenger and scout (kataskopos), sent to show mankind they have wandered about good and evil. His credentials are his life: homeless, propertyless, and visibly happy — a walking demonstration that externals were never the good.",
      },
      {
        question: "2. Why can the Cynic speak frankly to kings?",
        answer: "Because he holds nothing a king can confiscate. Frank speech (parrhēsia) is priced in externals; the man without them gets it free.",
      },
      {
        question: "3. Why must the Cynic's ruling faculty be 'purer than the sun'?",
        answer: "Because he rebukes the world publicly; a corrector hiding his own disease is a fraud, not a scout. The office of universal correction requires credentials no hidden vice can survive.",
      },
      {
        question: "4. If Epictetus doesn't ask students to live as Cynics, what is the Cynic for?",
        answer: "He is the limit case: the proof under maximum load that the good is entirely in the prohairesis. If freedom is possible with nothing, no one's freedom is waiting on the next acquisition; most students should verify the claim inside ordinary life.",
      },
      {
        question: "5. What distinction does III.23 draw between exhibition and philosophy?",
        answer: "Exhibition (epideixis) aims at the audience's pleasure; philosophy aims at their improvement, which at first never feels like pleasure. The two aims cannot be mixed — needing admiration makes a teacher incapable of operating.",
      },
      {
        question: "6. State the surgery image and what it implies about flattered students.",
        answer: "The philosopher's school is a surgery: you should leave in pain, not pleasure, because you were not well when you came in. Flattered students are untreated patients — the incision is what admiration forbids.",
      },
      {
        question: "7. What is the 'exit condition' test, and to what should it be applied?",
        answer: "Judge any teaching by how you leave: 'how beautifully he spoke' means you attended a show; leaving stung, with your own case in hand, means surgery. Epictetus applies it to his own teaching and the course asks you to apply it here too.",
      },
      {
        question: "8. Explain 'never say I have lost it; say I have given it back.'",
        answer: "Friends, children, homelands are given as figs are given in season — held on loan, not owned. Their departure is a recall of the loan, not a theft; the phrase corrects the property records, not merely the mood.",
      },
      {
        question: "9. Why is whispering 'tomorrow you will die' while kissing your child not morbidity?",
        answer: "Rehearsed mortality makes the parent fully present in the kiss; repressed mortality leaves the parent pre-defending against the future, distracted in the moment love was available. Premeditation purifies the present rather than poisoning it.",
      },
      {
        question: "10. How do III.22 and III.24 together define the school's actual teaching on attachment?",
        answer: "The Cynic shows the inviolable self stripped of everything; III.24 shows the same self inside a full, loving life — engaged but unhostaged, holding everything with the open hand. The teaching is not amputation of love but removal of the lie 'this is mine and must remain.'",
      },
    ],
    practiceAssignment: {
      coreIdea: "Everything you love is held on loan. Rehearsing the recall does not poison the love — it completes it.",
      assignment: "Choose one person you love and one possession or position you prize. For each, once this week, perform III.24's exercise deliberately: in a quiet moment, say to yourself in plain words that it is on loan and may be recalled — tonight, this year, eventually — and then go be fully present with it: the conversation without the phone, the work without the resentment. Afterward, write three lines on what the rehearsal did to the presence. You are testing Epictetus's claim that premeditation purifies rather than poisons.",
      duration: "2 × 20 min",
      greekTerms: "kataskopos — scout / parrhēsia — frank speech / apodidōmi — to give back",
    },
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'On Freedom — The Longest Discourse',
    briefing:
      "Discourses IV.1 is the longest sustained argument Epictetus ever made, and its subject is the word the whole school orbits: freedom. The method is Socratic demolition. Epictetus takes every person the Roman world called free — the senator, the consul, Caesar's friend, Caesar himself — and shows each one enslaved, because each one desires and fears things that other people control. Then he rebuilds the concept from the ground: the free person is the one who lives as he wishes — and only one kind of wishing cannot be obstructed. Read alongside Hadot's chapter on the figure of Socrates, the discourse reveals its hero: the man who could not be compelled, and who died rather than pretend otherwise. This is the summit of the course. Walk up slowly.",
    parts: [
      {
        title: 'The Demolition — Everyone Is Someone\'s Slave',
        content: [
          "Epictetus opens with a definition no one can refuse: free is the person who lives as he wishes — whom no one can hinder, compel, or constrain. Then he conducts the census, and no one passes. The man of consular rank? Watch him at the door of Caesar's chamberlain, paying court to a slave for access. Caesar's friend? Observe what he fears — a change in Caesar's expression — and tell me who owns him. The twice-consul is 'a slave with a great name.' Even Caesar: master of the world and hostage of the praetorian guard, of the mob, of every circumstance he must manage because he cannot bear to lose it. The Roman hierarchy of freedom is exposed as a hierarchy of leashes — differing in length, price, and decoration, converging in kind.",
          "The mechanism is stated as a law: 'Whoever has authority over any of the things you have set your heart on or want to avoid — he is your master.' Slavery, strictly, is not a legal status; it is a dependency structure. Each desire for an external issues a key to whoever controls that external, and each fear issues another. Most lives are a mass of issued keys, and most of what is called ambition is the acquisition of new masters. Epictetus, who had been a slave in the legal sense, is performing the great inversion of his biography: the chains were never the slavery; the wanting was.",
          "And the demolition is aimed inward, not upward — this must not be misread as social criticism. The audience is his own students, free men all, and the exercise is the mirror: name what you cannot bear to lose, and you have named your owner. The office you court, the approval you require, the routine whose disruption undoes you, the body whose decline you cannot face. IV.1 refuses every external solution — money, position, even manumission itself buys nothing here, 'for freedom is not acquired by satisfying yourself with what you desire, but by destroying your desire.'",
        ],
      },
      {
        title: 'The Rebuild — One Unobstructable Wish',
        content: [
          "If freedom is living as you wish, and every wish aimed at externals can be obstructed, the conclusion is forced: freedom is possible only for a rewired wish. Wish for nothing that another can withhold; refuse nothing that another can impose — place desire and aversion wholly within the prohairesis, and hindrance becomes structurally impossible. 'I have submitted my impulse to God. He wills that I have fever — I also will it. He wills that I obtain something — I also wish it. He does not will it — I do not wish it.' This is not the extinction of will but its education: the trained will runs on the rails of the real, and a will that wants what happens cannot be defeated by what happens.",
          "Epictetus anticipates the modern flinch — isn't this just surrender with better posture? — and answers with the analysis of what wishing against reality actually earns. The man who wills against events gets the events anyway, plus the grief. He pays double: the fever and the misery about the fever, the loss and the war against the loss. His 'defiance' changes no outcome; it only adds a casualty — himself. The aligned will forfeits nothing real, because the unaligned will never had the power it imagined; it merely had the suffering. Freedom through alignment is not the consolation prize. It is the only freedom that was ever on the table.",
          "And the guarantee behind the whole structure is the open door. 'Has anyone authority over you? He has authority over your body — take it, then. Over your property — take that. But your judgment — no one can master that. This is why the door stands open.' Epictetus's teaching on death here is not an invitation but an architecture: the person for whom death has become an acceptable exit cannot be issued ultimatums, because every ultimatum bottoms out in 'or else,' and every 'or else' bottoms out in death or in externals. Remove the terror of both, and coercion has no floor to stand on. The open door is rarely used; its function is to make the whole house free.",
        ],
      },
      {
        title: 'The Hero of the Discourse — Socrates, with Hadot',
        content: [
          "Hadot's chapter on Socrates (this session's secondary reading) identifies the figure standing behind IV.1 and behind Epictetus's entire teaching. Socrates is the West's proof-of-concept: the man the Athenian state could kill but could not command. Offered escape by Crito, he examined the proposal and declined it, because escaping would have required assenting to judgments he had refuted — that death is an evil, that a life bought by injustice is a life. 'Socrates does not save his skin shamefully; he saves the thing that is saved by justice.' The hemlock enters the story as the least important thing in the room.",
          "Epictetus's classroom returns to Socrates constantly — not as history but as evidence. Every claim of IV.1 was, in Socrates, load-tested: that the tyrant's power ends at the body (Anytus and Meletus 'can kill me, but they cannot harm me'); that the aligned will cannot be defeated (he wished to act justly, and did — where is the defeat?); that the open door abolishes coercion (they hurried him to it, and found him unhurried). Hadot's point is that Socrates functions in ancient philosophy the way the saint functions in religion: not an argument but an existence — the demonstration that the standard is livable, which no syllogism can supply.",
          "And this closes the course's own loop, because Epictetus is the second demonstration. A slave rebuilt the Socratic freedom from beneath — from the position every Athenian gentleman assumed made philosophy impossible — and proved the doctrine's most radical entailment: that the freedom in question has no prerequisites. Not birth, not health, not citizenship, not even legal ownership of one's own legs. When you engage the Proctor this session, it will ask you IV.1's question in its rudest form, the form Epictetus loved: you say you are free — show me. Your evidence, like the Cynic's, can only be your life: name the ultimatum that no longer has a floor under it. If there is none yet, name the key you will revoke first.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What definition of freedom opens IV.1, and how does the census that follows use it?",
        answer: "Free is the one who lives as he wishes, whom no one can hinder or compel. The census tests each supposedly free Roman — senator, consular, Caesar's friend, Caesar — against it, and every one fails because each desires or fears what others control.",
      },
      {
        question: "2. State the law of mastery at the center of the discourse.",
        answer: "Whoever has authority over anything you have set your heart on, or want to avoid, is your master. Every desire for an external issues a key to whoever controls it; slavery is a dependency structure, not a legal status.",
      },
      {
        question: "3. What is the 'great inversion' of Epictetus's biography performed in IV.1?",
        answer: "The legally enslaved man shows that chains were never the slavery — the wanting was. Legal freedom and manumission buy nothing, because freedom is acquired not by satisfying desire but by destroying desire for externals.",
      },
      {
        question: "4. Why must IV.1 not be read as social criticism, and what is the exercise instead?",
        answer: "Its audience is Epictetus's own free-born students and its aim is the mirror: name what you cannot bear to lose and you have named your owner. The target is the reader's dependency structure, not Rome's hierarchy.",
      },
      {
        question: "5. Reconstruct the rebuild: how does rewiring the wish make freedom structurally possible?",
        answer: "Since every wish aimed at externals can be obstructed, place desire and aversion wholly within the prohairesis — wish for nothing another can withhold, refuse nothing another can impose. A will that wants what happens cannot be defeated by what happens.",
      },
      {
        question: "6. How does Epictetus answer the objection that alignment is merely surrender?",
        answer: "The man who wills against events gets the events anyway plus the grief — he pays double and changes nothing. The unaligned will never had power, only suffering; alignment forfeits nothing real and is the only freedom actually available.",
      },
      {
        question: "7. What is the function of the open door, given that it is rarely used?",
        answer: "It abolishes coercion's foundation: every ultimatum bottoms out in death or externals, and the person untroubled by both cannot be threatened. The door's existence, not its use, makes the whole house free.",
      },
      {
        question: "8. Why did Socrates refuse Crito's escape?",
        answer: "Escaping required assenting to judgments he had refuted — that death is an evil and that a life bought by injustice is worth living. He saved what justice saves rather than his skin.",
      },
      {
        question: "9. What does Hadot mean by Socrates functioning as an existence rather than an argument?",
        answer: "Like the saint in religion, Socrates demonstrates that the standard is livable — a proof no syllogism can supply. Ancient philosophy points to him as evidence that the doctrine has been load-tested in a life.",
      },
      {
        question: "10. In what sense is Epictetus himself the second demonstration?",
        answer: "He rebuilt Socratic freedom from the slave's position — the position assumed to make philosophy impossible — proving the freedom has no prerequisites: not birth, health, citizenship, or even legal ownership of one's own body.",
      },
    ],
    practiceAssignment: {
      coreIdea: "Name what you cannot bear to lose, and you have named your master. Freedom is the revocation of the keys.",
      assignment: "Write your census. List, honestly, the five things you most fear losing or most need to obtain — position, approval, routine, health, a person's regard. Beside each, name who or what controls it: that is the master the desire has appointed. Then choose the smallest key on the list and revoke it this week with one concrete act: the opinion you stop courting, the outcome you formally release in writing, the contingency you rehearse until it loses its floor. Bring the census to the Qualifying Conversation — it will be asked for.",
      duration: "40 min + one act",
      greekTerms: "eleutheria — freedom / prohairesis — faculty of choice / anempodistos — unhindered",
    },
  },

  // ── SESSION 10 ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'The Enchiridion as Distillation',
    briefing:
      "You have now read the school; this session reads the handbook the school was folded into. The Enchiridion — 'the thing held in the hand,' a soldier's word for a dagger — is Arrian's compression of the Discourses into fifty-three portable chapters. You read it in PHIL 701 as an introduction. Read it now, in one sitting, as a graduate of the classroom it came from, and it becomes a different book: every chapter unfolds back into discourses you can name. This session studies the architecture of the compression — what Arrian kept, what he cut, and what the cutting cost — alongside Hadot's warning that philosophical discourse, however portable, is not yet philosophy. The handbook is the dagger. The Discourses taught the hand.",
    parts: [
      {
        title: 'The Architecture of the Handbook',
        content: [
          "Read in one sitting, the Enchiridion reveals a deliberate architecture. It opens exactly where the Discourses open, because there is nowhere else to open: §1 is the dichotomy of control, stated in four sentences that Book I of the Discourses spent chapters establishing. The early chapters install the discipline of desire (§2: transfer aversion to what is yours; §8: 'wish that what happens should happen as it does, and you will be serene'). The middle chapters translate it into roles and situations — the play whose casting is not yours (§17), the banquet where you wait for the dish to reach you (§15), the ship's passenger gathering shells with an ear for the captain's call (§7). The late chapters turn to practice among people: the regimen of §33, the response to slander (§§42, 48), and the closing warning of §46 — do not talk about your principles; digest them, and show the fruit.",
          "The compression has a logic Arrian learned from his teacher: keep the imperative, cut the argument. The Discourses argue — they stage the elenchus, they anticipate objections, they let the interlocutor squirm toward the conclusion. The Enchiridion commands. §5 states that people are disturbed not by things but by judgments about things — but you were in the room, in Session 2, when that claim was extracted from a weeping father under cross-examination; the handbook keeps the verdict and discards the trial. This is why the Enchiridion reads as gnomic where the Discourses read as alive, and why centuries of readers who knew only the handbook met a sterner, colder Epictetus than his students ever did — the humor, the tenderness toward the struggling student, the theology of the hymn are almost entirely in the cut material.",
          "Understand the genre and the cost becomes a feature. An encheiridion is what you carry because you cannot carry the armory. It presupposes the training it does not contain — a field manual for soldiers already drilled, not a substitute for the drilling. Arrian compressed the Discourses for men like himself: students leaving Nicopolis for commands and consulships, who needed the school's voice in a form that fits in a campaign tent. The correct use of the book, then and now, is re-expansion: each chapter is a mnemonic that should unfold, in the trained reader, back into the full discourse — the argument, the examples, the voice. This session's exercise tests exactly that.",
        ],
      },
      {
        title: 'Reading the Cards Back Into Discourses',
        content: [
          "Take the unfolding test across the chapters you now have the equipment for. §5 — 'men are disturbed not by things but by their judgments about things' — unfolds into I.11's weeping father and the whole analysis of Sessions 2 and 3. §17 — the play whose role the author assigns, 'your business is to act the part well; to choose it belongs to another' — unfolds into II.10's role ethics and I.2's prosōpon. §11 — 'never say I have lost it; say I have given it back' — is III.24 folded to two sentences, with the fig-season argument and the whispered memento cut away. §21 — keep death before your eyes daily — is the compression of the open door of IV.1. §29 — count the cost before becoming a philosopher, as the wrestler counts the training — compresses III.15 and the whole ethic of II.16's askēsis. §53 — the verses to carry ('Lead me, Zeus, and thou, Destiny') — is the hymn of III.5 and I.16, reduced to a soldier's prayer.",
          "The exercise is not literary genealogy; it is a diagnostic of your own training. Where a chapter unfolds for you — where you can supply the argument, the discourse, the example behind the imperative — the material is digested; the card is backed by the armory. Where a chapter remains merely aphoristic — pleasant, quotable, inert — you have found the seam in your own formation, the doctrine you memorized in PHIL 701 but never metabolized. The Enchiridion read after the Discourses is therefore a mirror of the reader: the same fifty-three chapters, and every reader receives a different book, exactly as deep as their practice.",
          "Note also what has no card at all. There is no chapter of theology proper — the fragment of God (II.8), the nightingale hymn (I.16), the providential administration (III.5) survive only as the closing prayer's tone. There is almost no logic — the assayer's art of Sessions 3 survives as bare instructions to 'test' impressions. And there is no Socratic method: the handbook cannot cross-examine you. These are not oversights; they are the boundary of the genre. What requires a teacher, a community, and time — everything this Academy calls the seminar — cannot be compressed onto cards. Arrian knew what he was cutting. He had sat in it.",
        ],
      },
      {
        title: 'Hadot\'s Warning — Discourse Is Not Philosophy',
        content: [
          "Hadot's chapter for this session draws the distinction that governs how you should hold both texts for the rest of your life: the distinction between philosophical discourse and philosophy itself. Philosophy, for the whole ancient tradition, is a way of living — the actual, hourly exercise of the disciplines. Philosophical discourse — lectures, books, handbooks, this very session — exists in service of that life: it justifies it, structures it, transmits it. The discourse is real and necessary; the Stoics themselves insisted on its rigor. But it is related to philosophy as the map to the journey, and the ancient schools never confused a man who owned maps with a man who had traveled.",
          "The warning lands with special force on the Enchiridion, precisely because it is so portable. A handbook can be carried without being used; it can become an amulet — owned, quoted, gifted, tattooed — the perfect object for the modern failure mode in which Stoicism is a content genre rather than a practice. §46 anticipates this exactly: 'do not, for the most part, talk among the uninstructed about your principles, but do what follows from them — as Socrates so completely avoided ostentation. Sheep do not vomit up their grass to show the shepherds how much they have eaten; they digest it inwardly, and produce wool and milk outwardly.' The chapter is the handbook warning you about the handbook: the temptation to display the cards instead of playing them.",
          "So the course ends where the school always ended: at the exit condition. You now hold the complete apparatus of Epictetus's teaching — the classroom in four books and the field manual in fifty-three chapters. The one question that remains is Arrian's question, the one he answered by writing everything down and then leaving for his command: what will the notes be for? Next session is the Qualifying Conversation. It will not ask what the Enchiridion says. It will ask what, in your last three months, it has been for — wool and milk, or grass, exhibited.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What does 'encheiridion' mean, and what does the genre presuppose?",
        answer: "'The thing held in the hand' — a soldier's word for a dagger; a field manual. The genre presupposes the training it does not contain: it serves soldiers already drilled, not readers seeking a substitute for the drilling.",
      },
      {
        question: "2. Describe the handbook's overall architecture.",
        answer: "It opens with the dichotomy of control (§1), installs the discipline of desire in the early chapters (§§2, 8), translates it into roles and situations in the middle (§§7, 15, 17), and closes with practice among people and the warning to digest rather than display (§§33, 42–48, 46).",
      },
      {
        question: "3. What is Arrian's compression principle, and what does it cost?",
        answer: "Keep the imperative, cut the argument: verdicts without the trials that produced them. The cost is the living Epictetus — the elenchus, the humor, the tenderness, the theology — leaving centuries of handbook-only readers a colder teacher than his students knew.",
      },
      {
        question: "4. Unfold §5 and §11 back into their discourses.",
        answer: "§5 (disturbed by judgments, not things) unfolds into I.11's cross-examination of the weeping father; §11 (never 'I lost it' but 'I gave it back') is III.24 compressed, minus the fig-season argument and the whispered memento mori.",
      },
      {
        question: "5. What does the unfolding exercise diagnose in the reader?",
        answer: "Where a chapter unfolds into its argument and examples, the doctrine is digested; where it stays merely quotable and inert, the reader has found undigested material — a seam in their own formation. Each reader receives the book at exactly the depth of their practice.",
      },
      {
        question: "6. Name two things that have no card in the Enchiridion, and why.",
        answer: "The theology (the fragment of God, the hymn) and the Socratic method (the handbook cannot cross-examine you); the logic survives only as bare instructions. What requires a teacher, community, and time cannot be compressed onto cards — the boundary of the genre, not an oversight.",
      },
      {
        question: "7. State Hadot's distinction between philosophical discourse and philosophy.",
        answer: "Philosophy is the way of living — the hourly exercise of the disciplines; discourse (books, lectures, handbooks) exists in its service, as the map serves the journey. The schools never confused owning maps with having traveled.",
      },
      {
        question: "8. Why is the Enchiridion especially vulnerable to becoming an 'amulet'?",
        answer: "Its portability lets it be owned, quoted, and displayed without being used — the perfect object for treating Stoicism as a content genre rather than a practice.",
      },
      {
        question: "9. Explain the sheep-and-wool image of §46.",
        answer: "Sheep do not vomit up grass to show how much they have eaten; they digest it and produce wool and milk. Principles should likewise be shown in conduct produced, not in talk — the handbook warning readers about displaying the handbook.",
      },
      {
        question: "10. What is 'Arrian's question,' and how does it frame the Qualifying Conversation?",
        answer: "What will the notes be for? Arrian wrote everything down and then went to live his commands. The Qualifying Conversation accordingly asks not what the Enchiridion says but what, in your recent life, it has been for — wool and milk, or exhibited grass.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The Enchiridion is a deck of mnemonics: each card should unfold, in the trained reader, into the full discourse behind it.",
      assignment: "Read the Enchiridion in one sitting, pen in hand. Mark each chapter with one of two symbols: an arrow if it unfolds for you (you can name the discourse, the argument, or the example behind it), a dash if it stays inert. Then choose one dash-chapter and carry it — literally, written on a card or a lock screen — for the rest of the week, applying it once a day until it unfolds. Bring your marked copy to the Qualifying Conversation: the dashes are your remaining syllabus.",
      duration: "90 min + 1 week carry",
      greekTerms: "encheiridion — handbook, dagger / gnōmē — maxim / pepsis — digestion",
    },
  },

  // ── SESSION 11 — SEMINAR ───────────────────────────────────────────────────
  {
    id: 11,
    title: 'Qualifying Conversation — The School Examined',
    isSeminar: true,
    briefing:
      "Session XI is a seminar, not a lecture. You have sat in Epictetus's classroom for ten sessions; now the classroom turns and examines you, exactly as it examined the rhetorician, the official, and the man on his way to trial. The required preparation is a choice: select the one passage from the Discourses you most want to contest or defend — the claim you believe is wrong, or the claim you believe is true and are not yet living. The Qualifying Conversation will run on your passage, Socratically: your principle, then where else it applies, then the gap between your assent and your conduct. Remember the exit condition of III.23 — you should leave this conversation rubbing your shoulder.",
    parts: [
      {
        title: 'Preparing for the Conversation',
        content: [
          "The Qualifying Conversation tests whether PHIL 703 has been a course you studied or a school you attended. Come with your chosen passage — contested or defended — and with your census from Session 9 and your marked Enchiridion from Session 10. The Proctor's method will be the one you have now watched for ten sessions: it will ask for your claim, ask for its grounds, apply it to a case you did not choose, and let you meet the result. Prepare to speak to all of the prompts below, but expect the conversation to follow its own thread — Epictetus's classroom never ran on rails.",
        ],
      },
      {
        title: 'Socratic Prompts — The Doctrine Contested',
        content: [
          "Epictetus claims freedom is available to everyone, including slaves — that no configuration of external circumstance can touch it. This is either the deepest insight in the history of ethics or a doctrine that consoles the oppressed while excusing the oppressor. You have read the whole corpus now: which is it? Defend your answer against the strongest version of the other side — and note that Epictetus himself, the slave with the broken leg, is evidence claimed by both readings.",
          "The dichotomy of control assigns your body to the 'not up to us' column. Modern readers flinch here more than anywhere: illness, disability, and pain seem to reach past the body into the judgment itself — exhaustion corrodes assent. Is the dichotomy's boundary where Epictetus drew it? Or does his own lameness prove exactly what he said it proves?",
          "The wrongdoer of I.18 deserves pity, not anger, because he acts on how things appear to him. Follow the doctrine to its edges: does it survive the genuinely malicious — the abuser, the tyrant with full information? Is there a wrong the doctrine cannot digest, or is your resistance to it precisely the untrained judgment Epictetus predicted you would defend?",
        ],
      },
      {
        title: 'Socratic Prompts — The School Attended',
        content: [
          "Session 9's census asked you to name your masters. Name them now, aloud, and report: which key have you actually revoked in these eleven weeks — not admired the revoking of, revoked? What ultimatum has lost its floor? If the answer is none, apply II.16 to yourself: where is the seam between your fluency and your training?",
          "Epictetus kept a school; Marcus kept a notebook; Arrian took notes and left for his command. The course ends with the same fork: what, concretely, is your practice now that it was not before PHIL 703 — the daily assay, the role inventory, the streak count, the rehearsed recall? Show the wool and milk, or name the grass still undigested. 'Enough big words' — the school's own standard, applied to the school's own graduate.",
        ],
      },
    ],
    quiz: [
      {
        question: "1. What is the single distinction on which the whole of Epictetus rests, and where is it established?",
        answer: "What is up to us (the use of impressions, prohairesis) and what is not (body, property, reputation, office) — established in Discourses I.1 as the opening move of the entire corpus.",
      },
      {
        question: "2. What is the true measure of progress, and what is its most visible symptom?",
        answer: "The movement of desire and aversion away from externals (I.4), visible in where you place blame: the instructed blame no one, having located the judgment instead (Ench §5).",
      },
      {
        question: "3. Why is logic necessary, and what is its fence?",
        answer: "Reason alone contemplates itself, so logic is the audit of the auditor — required for assent to be worth anything (I.17). Its fence: logic for display is worse than none; the measure is use on one's own impressions.",
      },
      {
        question: "4. Assign confidence and caution to their proper domains.",
        answer: "Caution belongs to the domain of prohairesis, where false assent genuinely harms; confidence toward everything external, which cannot touch the good (II.1). Ordinary life inverts this assignment.",
      },
      {
        question: "5. How does the ball-player image resolve the caring/not-caring paradox?",
        answer: "The ball (every external) is indifferent; the play (the skill and justice of your engagement) is everything. Detachment from the ball is what enables total commitment to the play (II.5).",
      },
      {
        question: "6. What does it mean that duties are 'read off your names'?",
        answer: "Each role you factually occupy — human, citizen, child, sibling, colleague — hands you its job description; ethics unfolds from existing relationships, with the role of rational social human ranking first (II.10).",
      },
      {
        question: "7. State the law of habit and its reverse.",
        answer: "Every habit is fed by corresponding acts — anger by angers, appetite by indulgences; there are no neutral repetitions. In reverse: refuse the impression and the habit starves — count the days (II.18).",
      },
      {
        question: "8. Name the three fields of training in order, and justify the order.",
        answer: "Desire, action, assent (III.2). Desire first because passions destroy all training; action second because only the unenslaved act well toward others; assent last as the finishing precision of those already progressing.",
      },
      {
        question: "9. What is the function of the Cynic and of the open door in the school's architecture?",
        answer: "The Cynic is the limit case proving the good needs no externals (III.22); the open door is the architecture abolishing coercion — ultimatums bottom out in death and externals, and lose their floor when neither terrifies (IV.1).",
      },
      {
        question: "10. What distinguishes having studied PHIL 703 from having attended the school?",
        answer: "Study produces fluency about Epictetus; attendance means the exercises have changed conduct — keys revoked, habits starved, the assay run daily. The Qualifying Conversation tests the latter: what you now do, not what you can recite.",
      },
    ],
    practiceAssignment: {
      coreIdea: "The Qualifying Conversation runs on your passage: the claim you contest, or the claim you assent to and are not yet living.",
      assignment: "Before the seminar, write one page. Part one: your chosen passage from the Discourses, and your honest position on it — contested or defended, with your best argument. Part two: your census verdict — the one master actually weakened in these eleven weeks, with the evidence, or the admission that fluency outran training, with the seam named. Bring the page. The conversation will begin from its weakest sentence.",
      duration: "60 min",
      greekTerms: "elenchus — cross-examination / askēsis — training / eleutheria — freedom",
    },
  },
];

// Adapts a Phil703Session for the LanguageLessonContent renderer — identical
// contract to phil702ToLesson (sessions carry no subtitle, objectives, or
// exercises; the quiz renders separately as reveal cards).
export { phil702ToLesson as phil703ToLesson } from '@/data/phil702';
