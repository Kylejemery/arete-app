// Case data for the Stoic QCA page. Scores use a four-value fuzzy scale:
// 0 fully out, 0.33 more out than in, 0.67 more in than out, 1 fully in.
// Keep in sync with public/research/stoic-qca/stoic_qca_codebook.xlsx (Scores sheet).

export type Condition = "POW" | "WLTH" | "ADV" | "TEACH" | "PROF" | "COURT";
export type SetName = Condition | "CONS";

export interface StoicCase {
  name: string;
  period: string;
  scores: Record<SetName, number>;
  teachKnown: 0 | 1;
  consTested: 0 | 1;
  sources: string;
  notes: string;
}

export type EvidenceStatus = "drafted" | "reviewed";

/**
 * How a score is supported. excerpt: at least one verbatim corpus passage.
 * citation_only: cited to a source not in the corpus. absence: a 0 resting
 * on nothing being recorded. none: nothing found that supports the score.
 */
export type Support = "excerpt" | "citation_only" | "absence" | "none";

/**
 * One piece of evidence. excerpt is verbatim chunk_text from rag_corpus row
 * chunkId (OCR artifacts and footnote numbers kept as they are). A source
 * that is not in the corpus has excerpt and chunkId null and says so in note.
 */
export interface Evidence {
  citation: string;
  excerpt: string | null;
  chunkId: string | null;
  note?: string;
}

export interface ScoreEvidence {
  /** The published score the rationale was written for. */
  scoredAs: number;
  rationale: string;
  support: Support;
  /** A reason the published score may be wrong, raised while drafting. */
  concern?: string;
  evidence: Evidence[];
  status: EvidenceStatus;
}

export const SCALE = [0, 0.33, 0.67, 1] as const;

export const ANCHORS: { set: SetName; label: string; anchors: string }[] = [
  { set: "CONS", label: "Lived consistently with the doctrine (outcome)", anchors: "1: the sources treat his life as matching his teaching under a real test. 0.67: broadly consistent, minor criticism. 0.33: serious contemporary charges of hypocrisy. 0: abandoned or betrayed the doctrine." },
  { set: "POW", label: "Political power", anchors: "1: supreme or consular authority. 0.67: senior office or chief adviser to a ruler. 0.33: civic or ambassadorial role. 0: none." },
  { set: "WLTH", label: "Wealth", anchors: "1: among the richest of his society. 0.67: propertied elite. 0.33: modest means. 0: poverty or slavery." },
  { set: "ADV", label: "Severe adversity", anchors: "1: slavery, exile, or condemnation. 0.67: major loss, illness, or catastrophe. 0.33: episodic hardship. 0: none recorded." },
  { set: "TEACH", label: "Stoic lineage", anchors: "1: trained directly under a recognized Stoic teacher. 0.67: a Stoic mentor in the household or sustained contact. 0.33: indirect or mixed influence. 0: none recorded." },
  { set: "PROF", label: "Philosopher by vocation", anchors: "1: taught philosophy as his career. 0: career in public life." },
  { set: "COURT", label: "Courtier", anchors: "1: served at the pleasure of a monarch as adviser or officer. 0.67: partly so. 0: held office in his own right, opposed the throne, or was the monarch himself." },
];

export const CASES: StoicCase[] = [
  {
    "name": "Zeno of Citium",
    "period": "c. 334-262 BCE",
    "scores": {
      "POW": 0,
      "WLTH": 0.33,
      "ADV": 0.67,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Diogenes Laertius (DL) 7.1-7.31; Athenian decree at DL 7.10-12",
    "notes": "Lost a merchant fortune in a shipwreck (DL 7.2-5). The Athenian decree honored his life as matching his teaching. WLTH reflects life after the loss."
  },
  {
    "name": "Cleanthes",
    "period": "c. 330-230 BCE",
    "scores": {
      "POW": 0,
      "WLTH": 0,
      "ADV": 0.67,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "DL 7.168-176",
    "notes": "Drew water at night to pay for study. ADV coded as sustained poverty rather than catastrophe."
  },
  {
    "name": "Chrysippus",
    "period": "c. 279-206 BCE",
    "scores": {
      "POW": 0,
      "WLTH": 0.33,
      "ADV": 0.33,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 0,
    "sources": "DL 7.179-202",
    "notes": "Paternal property reportedly confiscated to a royal treasury (DL 7.181). Anecdotes of arrogance keep CONS below 1. Little record of conduct under pressure."
  },
  {
    "name": "Diogenes of Babylon",
    "period": "c. 230-150 BCE",
    "scores": {
      "POW": 0.33,
      "WLTH": 0.33,
      "ADV": 0,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Cicero, Academica 2.137; Seneca, De Ira 3.38",
    "notes": "Envoy to Rome in 155 BCE. The anecdote of calm when spat on is thin evidence for CONS."
  },
  {
    "name": "Panaetius",
    "period": "c. 185-110 BCE",
    "scores": {
      "POW": 0.33,
      "WLTH": 0.67,
      "ADV": 0,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 0,
    "sources": "Cicero, De Officiis (esp. Book 1); Cicero, Pro Murena 66",
    "notes": "Aristocratic Rhodian; companion of Scipio Aemilianus. COURT = 0 because Scipio was not a monarch."
  },
  {
    "name": "Posidonius",
    "period": "c. 135-51 BCE",
    "scores": {
      "POW": 0.67,
      "WLTH": 0.67,
      "ADV": 0.33,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Cicero, Tusculan Disputations 2.61; Plutarch, Marius 45",
    "notes": "Held the prytany at Rhodes and served as envoy to Rome. The gout lecture before Pompey is the main test evidence."
  },
  {
    "name": "Athenodorus Cananites",
    "period": "c. 74 BCE-7 CE",
    "scores": {
      "POW": 0.67,
      "WLTH": 0.67,
      "ADV": 0,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0.67,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 0,
    "sources": "Strabo 14.5.14; Plutarch, Sayings of Kings and Commanders 207C",
    "notes": "Teacher and adviser of Octavian; later reformed the government of Tarsus. Key test case for the COURT condition."
  },
  {
    "name": "Dionysius the Renegade",
    "period": "c. 330-250 BCE",
    "scores": {
      "POW": 0,
      "WLTH": 0.33,
      "ADV": 0.67,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "DL 7.166-167; Cicero, Tusculan Disputations 2.60",
    "notes": "Studied under Zeno; abandoned Stoicism for Cyrenaic hedonism during severe eye pain."
  },
  {
    "name": "Egnatius Celer",
    "period": "fl. 60s CE",
    "scores": {
      "POW": 0,
      "WLTH": 0.33,
      "ADV": 0,
      "TEACH": 0,
      "PROF": 1,
      "COURT": 0,
      "CONS": 0
    },
    "teachKnown": 0,
    "consTested": 1,
    "sources": "Tacitus, Annals 16.32; Histories 4.10, 4.40; Juvenal, Satires 3.116",
    "notes": "Testified against his patron and pupil Barea Soranus under Nero; later condemned after Musonius prosecuted him. TEACH = 0 means no recorded teacher. WLTH is a guess."
  },
  {
    "name": "Musonius Rufus",
    "period": "c. 30-100 CE",
    "scores": {
      "POW": 0,
      "WLTH": 0.67,
      "ADV": 1,
      "TEACH": 0,
      "PROF": 1,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 0,
    "consTested": 1,
    "sources": "Tacitus, Annals 14.59, 15.71; Histories 3.81, 4.10, 4.40",
    "notes": "Equestrian; exiled by Nero to Gyaros. TEACH = 0 reflects no recorded teacher, not an absence of one (see TEACH_KNOWN)."
  },
  {
    "name": "Epictetus",
    "period": "c. 50-135 CE",
    "scores": {
      "POW": 0,
      "WLTH": 0,
      "ADV": 1,
      "TEACH": 1,
      "PROF": 1,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Arrian, Discourses 1.7.32, 1.9.29; Aulus Gellius 15.11",
    "notes": "Born a slave, lame, expelled from Rome under Domitian. Studied under Musonius."
  },
  {
    "name": "Persaeus",
    "period": "c. 307-243 BCE",
    "scores": {
      "POW": 0.67,
      "WLTH": 0.67,
      "ADV": 0.67,
      "TEACH": 1,
      "PROF": 0,
      "COURT": 1,
      "CONS": 0.33
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "DL 7.6, 7.36; Athenaeus 4.162",
    "notes": "Zeno's pupil sent to the court of Antigonus Gonatas; commanded Acrocorinth when it fell in 243 BCE. Antigonus reportedly tested him with false news of his estate's loss (DL 7.36). PROF = 0 because his career was at court and in command."
  },
  {
    "name": "Rutilius Rufus",
    "period": "c. 158-78 BCE",
    "scores": {
      "POW": 1,
      "WLTH": 0.67,
      "ADV": 1,
      "TEACH": 1,
      "PROF": 0,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Cicero, Brutus 113-116; Velleius Paterculus 2.13; Valerius Maximus 6.4.4; Seneca, De Beneficiis 6.37",
    "notes": "Consul 105 BCE; studied under Panaetius. Convicted on a widely believed false charge and lived out his exile in the province he was accused of plundering."
  },
  {
    "name": "Cato the Younger",
    "period": "95-46 BCE",
    "scores": {
      "POW": 0.67,
      "WLTH": 0.67,
      "ADV": 1,
      "TEACH": 0.67,
      "PROF": 0,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Plutarch, Cato Minor; Cicero, Pro Murena 60-66",
    "notes": "Praetor, never consul. Lived with the Stoic Athenodorus Cordylion. Suicide at Utica. Cicero mocks his rigor, which is not a charge of inconsistency."
  },
  {
    "name": "Seneca",
    "period": "c. 4 BCE-65 CE",
    "scores": {
      "POW": 0.67,
      "WLTH": 1,
      "ADV": 1,
      "TEACH": 0.67,
      "PROF": 0,
      "COURT": 1,
      "CONS": 0.33
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Tacitus, Annals 13.42, 14.52-56, 15.60-64; Cassius Dio 61.10; Seneca, Letters 108",
    "notes": "Nero's adviser and suffect consul 56 CE; exiled to Corsica; forced suicide. Charges of hypocrisy about his wealth drive CONS = .33, while his death scene pulls the other way. Contested case."
  },
  {
    "name": "Thrasea Paetus",
    "period": "d. 66 CE",
    "scores": {
      "POW": 1,
      "WLTH": 0.67,
      "ADV": 1,
      "TEACH": 0.33,
      "PROF": 0,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Tacitus, Annals 14.12, 16.21-35; Epictetus, Discourses 1.1.26",
    "notes": "Suffect consul 56 CE; forced suicide under Nero. His Stoic label is partly a later attribution. Boundary case."
  },
  {
    "name": "Helvidius Priscus",
    "period": "d. c. 75 CE",
    "scores": {
      "POW": 0.67,
      "WLTH": 0.67,
      "ADV": 1,
      "TEACH": 0.33,
      "PROF": 0,
      "COURT": 0,
      "CONS": 1
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Tacitus, Histories 4.5-6; Suetonius, Vespasian 15; Epictetus, Discourses 1.2.19-24",
    "notes": "Praetor 70 CE; son-in-law of Thrasea; exiled and executed under Vespasian. Teacher unnamed in the sources."
  },
  {
    "name": "Marcus Aurelius",
    "period": "121-180 CE",
    "scores": {
      "POW": 1,
      "WLTH": 1,
      "ADV": 0.67,
      "TEACH": 1,
      "PROF": 0,
      "COURT": 0,
      "CONS": 0.67
    },
    "teachKnown": 1,
    "consTested": 1,
    "sources": "Meditations Book 1; Cassius Dio 72; Historia Augusta, Life of Marcus",
    "notes": "Emperor, so COURT = 0: he was the throne, not a courtier. Taught by Junius Rusticus and Apollonius. The Commodus succession keeps CONS at .67."
  }
];

// Per-score evidence, keyed by case name. Drafted against the published scores;
// every excerpt was checked as an exact substring of its rag_corpus chunk.
export const EVIDENCE: Record<string, Record<SetName, ScoreEvidence>> = {
  "Zeno of Citium": {
    "POW": {
      "scoredAs": 0,
      "rationale": "No office of any kind is recorded; he lived at Athens as a foreigner, declined Athenian citizenship, and the honours paid him (keys of the walls, crown, statue) were marks of esteem, not office. Matches 0 (none).",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 3 (tr. Goodwin)",
          "excerpt": "Zeno and Cleanthes would not be made citizens of Athens , lest they might seem to injure their own countries.",
          "chunkId": "5d9d604a-9d9a-4342-bd69-9eccceea6023"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "I am sure that you will answer that they lived in the manner in which they taught that men ought to live: yet no one of them governed a state.",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.33,
      "rationale": "Coded on his adult philosophic life: frugal living after the shipwreck, and Seneca says the early Stoics lacked the property that brings public standing. Modest means.",
      "support": "excerpt",
      "concern": "Score may be wrong: DL 7.13 (citing an unnamed source) says Zeno kept a large fortune after reaching Greece and lent it at interest, which would put him at 0.67 (propertied elite) and contradicts the data.ts note that WLTH reflects life after a loss. DL 7.13: \"It is said that he had more than a thousand talents when he came to Greece, and that he lent this money on bottomry.\" (chunk a8b62104-64b2-4b5e-bcb5-21e1961d5591, verified). DL 7.5 adds that some say he sold his cargo in Athens rather than losing it. His frugality looks chosen rather than forced. Suggest 0.67, or keep 0.33 with the note rewritten to say the sources conflict.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.27 (tr. Hicks)",
          "excerpt": "He showed the utmost endurance, and the greatest frugality; the food he used required no fire to dress, and the cloak he wore was thin.",
          "chunkId": "a6ad9113-4ade-4100-894d-08b952dfb895"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "“They had not,” you reply, “the amount of property or social position which as a rule enables people to take part in public affairs.”",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.67,
      "rationale": "Shipwreck with the loss of a merchant cargo of purple, the major loss that turned him to philosophy. Matches 0.67 (major loss).",
      "support": "excerpt",
      "concern": "Score may be wrong (low confidence): DL records versions that remove the loss. DL 7.5: \"But some say that he disposed of his cargo in Athens, before he turned his attention to philosophy.\" (chunk 017126c9-db0a-4773-a5ce-6a64e9a85a6c, verified), and DL 7.13 has him lending a fortune of over a thousand talents. DL 7.28 also says he \"had enjoyed good health without an ailment to the last\" (chunk a6ad9113-4ade-4100-894d-08b952dfb895, verified). If the shipwreck is treated as uncertain, 0.33 (episodic hardship) fits better. Suggest keep 0.67 only if the shipwreck version is preferred, and say so in the notes.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.2 (tr. Hicks)",
          "excerpt": "He was shipwrecked on a voyage from Phoenicia to Peiraeus with a cargo of purple.",
          "chunkId": "4b20bf8b-9d5e-4f98-9576-d8187105db51"
        },
        {
          "citation": "Diogenes Laertius 7.4 (tr. Hicks)",
          "excerpt": "Hence he is reported to have said, “I made a prosperous voyage when I suffered shipwreck.”",
          "chunkId": "017126c9-db0a-4773-a5ce-6a64e9a85a6c"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "Trained directly and for many years under named teachers: Crates, then Stilpo, Xenocrates, Polemo and Diodorus for twenty years in all.",
      "support": "excerpt",
      "concern": "Score may be wrong under the codebook as written: TEACH 1 requires a recognized Stoic teacher, and Zeno founded the school, so none existed. His teachers were a Cynic (Crates, DL 7.2-3), Megarians (Stilpo, Diodorus) and Academics (Xenocrates, Polemo, DL 7.2, 7.25). Strictly that is 0.33 (indirect or mixed influence). Suggest either amend the codebook to read \"a recognized philosophical teacher in the tradition the school grew from\" for founders, or lower to 0.33. Not changed.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.2 (tr. Hicks)",
          "excerpt": "He was a pupil of Crates, as stated above. Next they say he attended the lectures of Stilpo and Xenocrates for ten years",
          "chunkId": "4b20bf8b-9d5e-4f98-9576-d8187105db51"
        },
        {
          "citation": "Diogenes Laertius 7.3 (tr. Hicks)",
          "excerpt": "From that day he became Crates’s pupil, showing in other respects a strong bent for philosophy, though with too much native modesty to assimilate Cynic shamelessness.",
          "chunkId": "017126c9-db0a-4773-a5ce-6a64e9a85a6c"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Taught philosophy as his career: lectured in the Painted Stoa and headed the school for decades.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.5 (tr. Hicks)",
          "excerpt": "Hither, then, people came henceforth to hear Zeno, and this is why they were known as men of the Stoa, or Stoics",
          "chunkId": "41ed157c-f482-4419-836f-4eecb2da1910"
        },
        {
          "citation": "Diogenes Laertius 7.28 (tr. Hicks)",
          "excerpt": "But Apollonius says that he presided over the school for fifty-eight years.",
          "chunkId": "32020dba-ceb8-48bd-98ce-694de2e722e2"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He refused King Antigonus Gonatas' repeated invitations to court and sent pupils instead; he held no post under any monarch.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.6 (tr. Hicks)",
          "excerpt": "Antigonus (Gonatas) also favoured him, and whenever he came to Athens would hear him lecture and often invited him to come to his court. This offer he declined",
          "chunkId": "41ed157c-f482-4419-836f-4eecb2da1910"
        },
        {
          "citation": "Diogenes Laertius 7.9 (tr. Hicks)",
          "excerpt": "So he sent Persaeus and Philonides the Theban; and Epicurus in his letter to his brother Aristobulus mentions them both as living with Antigonus.",
          "chunkId": "b2093fa4-cdf3-47e8-a599-9e47be3cc53a"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "The Athenian decree states that his conduct matched his teaching, and Antigonus praised him for staying unchanged by royal gifts, a real test. Seneca treats his life as matching the doctrine.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.10, Athenian decree (tr. Hicks)",
          "excerpt": "affording to all in his own conduct a pattern for imitation in perfect consistency with his teaching, it has seemed good to the people",
          "chunkId": "ad3ab4c1-908a-4eeb-b0f0-e153c28e52db"
        },
        {
          "citation": "Diogenes Laertius 7.15 (tr. Hicks)",
          "excerpt": "“Because,” said he, “the many ample gifts I offered him never made him conceited nor yet appear poor-spirited.”",
          "chunkId": "87e2ff37-f939-4836-b1fc-6716cf3ef142"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "I ask you whether Cleanthes, Chrysippus, and Zeno lived in accordance with their doctrine? I am sure that you will answer that they lived in the manner in which they taught that men ought to live",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        },
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 1 (tr. Goodwin); hostile and late (c. 100 CE), not contemporary",
          "excerpt": "it is manifest that they have lived rather according to the writings and sayings of others than their own professions",
          "chunkId": "77d1ecd3-b3b4-46ef-9771-c0c1cfd36260",
          "note": "Counter-evidence: a later polemical charge that the early Stoics wrote on politics but never practised it. Not contemporary, so it does not meet the 0.33 level."
        }
      ],
      "status": "drafted"
    }
  },
  "Cleanthes": {
    "POW": {
      "scoredAs": 0,
      "rationale": "No office of any kind is recorded; he lived at Athens as a foreigner and declined citizenship.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 3 (tr. Goodwin)",
          "excerpt": "Zeno and Cleanthes would not be made citizens of Athens , lest they might seem to injure their own countries.",
          "chunkId": "5d9d604a-9d9a-4342-bd69-9eccceea6023"
        },
        {
          "citation": "Seneca, On Peace of Mind 1 (De Tranquillitate Animi 1.10, tr. Stewart)",
          "excerpt": "I follow the advice of Zeno, Cleanthes, and Chrysippus, all of whom bid one take part in public affairs, though none of them ever did so himself",
          "chunkId": "6afe5c09-0264-4eb0-8444-48bde26e3a67"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0,
      "rationale": "Arrived in Athens with four drachmas and lived by manual labour at night, drawing water. Matches 0 (poverty).",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.168 (tr. Hicks)",
          "excerpt": "He arrived in Athens, as some people say, with four drachmas only, and meeting with Zeno he studied philosophy right nobly and adhered to the same doctrines throughout.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "Diogenes Laertius 7.168 (tr. Hicks)",
          "excerpt": "He was renowned for his industry, being indeed driven by extreme poverty to work for a living.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "Seneca, Letters 44.3 (tr. Gummere)",
          "excerpt": "Cleanthes worked at a well and served as a hired man watering a garden.",
          "chunkId": "96cd9767-ff1a-4725-9349-2a33da5fd091"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.67,
      "rationale": "Published coding treats lifelong poverty and manual labour as sustained hardship; he was also hauled before the Areopagus to explain his living, and his final illness led to his death by fasting.",
      "support": "excerpt",
      "concern": "Score may be wrong: the codebook's 0.67 is a major loss, illness or catastrophe, and poverty is not on the ADV scale; it is already scored as WLTH 0, so it is counted twice. What DL records is episodic: a court inquiry that ended in acquittal and a donation (DL 7.168-169), and a gum inflammation in extreme old age that he chose to end by fasting (DL 7.176). That fits 0.33 (episodic hardship). Suggest lower to 0.33, or amend the codebook to say sustained poverty counts as ADV 0.67.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.168 (tr. Hicks)",
          "excerpt": "He is said to have been brought into court to answer the inquiry how so sturdy a fellow as he made his living",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "Diogenes Laertius 7.174 (tr. Hicks)",
          "excerpt": "We are told that he wrote down Zeno’s lectures on oyster-shells and the blade-bones of oxen through lack of money to buy paper.",
          "chunkId": "116ccaa2-8f7c-40ad-b768-13efac833ab9"
        },
        {
          "citation": "Diogenes Laertius 7.176 (tr. Hicks)",
          "excerpt": "He had severe inflammation of the gums, and by the advice of his doctors he abstained from food for two whole days.",
          "chunkId": "634a5ac8-8fbd-435a-8534-ed096480b013"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "Studied directly under Zeno, the founder, for nineteen years and shared his life.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.176 (tr. Hicks)",
          "excerpt": "having spent nineteen years as Zeno’s pupil",
          "chunkId": "634a5ac8-8fbd-435a-8534-ed096480b013"
        },
        {
          "citation": "Seneca, Letters 6.6 (tr. Gummere)",
          "excerpt": "Cleanthes could not have been the express image of Zeno, if he had merely heard his lectures; he shared in his life",
          "chunkId": "f8205b46-c7d4-40f1-a89c-e8e0f926dfb3"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Succeeded Zeno as head of the school, taught pupils such as Sphaerus and Chrysippus, and wrote extensively.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.174 (tr. Hicks)",
          "excerpt": "although Zeno had many other eminent disciples, he was able to succeed him in the headship of the school.",
          "chunkId": "116ccaa2-8f7c-40ad-b768-13efac833ab9"
        },
        {
          "citation": "Diogenes Laertius 7.177 (tr. Hicks)",
          "excerpt": "Amongst those who after the death of Zeno became pupils of Cleanthes was Sphaerus of Bosporus",
          "chunkId": "634a5ac8-8fbd-435a-8534-ed096480b013"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "Held no post under a monarch. When Ptolemy asked him to come to court he sent Sphaerus instead; Antigonus attended his lectures and gave him money, which is patronage, not service.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.185 (tr. Hicks)",
          "excerpt": "When Ptolemy wrote to Cleanthes requesting him to come himself or else to send some one to his court, Sphaerus undertook the journey",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854"
        },
        {
          "citation": "Diogenes Laertius 7.169 (tr. Hicks)",
          "excerpt": "We are also told that Antigonus made him a present of three thousand drachmas.",
          "chunkId": "12d95754-5083-4eaa-ad5e-a8f0b7d669b4"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "Sources treat his life of labour and poverty as the doctrine lived out; he bore public ridicule unmoved and refused a public donation at Zeno's word. Seneca names him as living as he taught.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.169 (tr. Hicks)",
          "excerpt": "The Areopagites were satisfied and voted him a donation of ten minas, which Zeno forbade him to accept.",
          "chunkId": "12d95754-5083-4eaa-ad5e-a8f0b7d669b4"
        },
        {
          "citation": "Diogenes Laertius 7.173 (tr. Hicks)",
          "excerpt": "He was present in the theatre when the poet Sositheus uttered the verse — Driven by Cleanthes’ folly like dumb herds, and he remained unmoved in the same attitude.",
          "chunkId": "a974ef0e-328d-4eb6-b816-5af5fcf1c070"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "I ask you whether Cleanthes, Chrysippus, and Zeno lived in accordance with their doctrine? I am sure that you will answer that they lived in the manner in which they taught that men ought to live",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        },
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 1 (tr. Goodwin); hostile and late (c. 100 CE), not contemporary",
          "excerpt": "it is manifest that they have lived rather according to the writings and sayings of others than their own professions",
          "chunkId": "77d1ecd3-b3b4-46ef-9771-c0c1cfd36260",
          "note": "Counter-evidence: later polemical charge against the early Stoics as a group. Not contemporary, so it does not meet the 0.33 level."
        }
      ],
      "status": "drafted"
    }
  },
  "Chrysippus": {
    "POW": {
      "scoredAs": 0,
      "rationale": "No office of any kind is recorded; Seneca and Plutarch both say the early Stoic heads never held public office.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On Peace of Mind 1 (De Tranquillitate Animi 1.10, tr. Stewart)",
          "excerpt": "I follow the advice of Zeno, Cleanthes, and Chrysippus, all of whom bid one take part in public affairs, though none of them ever did so himself",
          "chunkId": "6afe5c09-0264-4eb0-8444-48bde26e3a67"
        },
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 1 (tr. Goodwin); hostile and late (c. 100 CE), not contemporary",
          "excerpt": "many by Cleanthes , and most of all by Chrysippus , concerning policy, governing, and being governed, concerning judging and pleading, and yet there is not to be found in any of their lives either leading of armies, making of laws, going to parliament",
          "chunkId": "77d1ecd3-b3b4-46ef-9771-c0c1cfd36260"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.33,
      "rationale": "His inherited property was confiscated before he turned to philosophy, and nothing records wealth afterwards; Seneca says the early Stoics lacked the property for public life. Modest means.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.181 (tr. Hicks)",
          "excerpt": "Hecato says that he came to the study of philosophy, because the property which he had inherited from his father had been confiscated to the king’s treasury.",
          "chunkId": "124d817d-a20d-4cf6-aedd-e567988ab811"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "“They had not,” you reply, “the amount of property or social position which as a rule enables people to take part in public affairs.”",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.33,
      "rationale": "Published coding treats the confiscation of his inheritance as episodic hardship; no other hardship, illness or danger is recorded before his sudden death.",
      "support": "excerpt",
      "concern": "Score may be wrong: confiscation of an entire inheritance to a royal treasury is a major loss, which is the codebook's 0.67, and it is the same kind of event as Zeno's shipwreck, which is coded 0.67. DL 7.181 (verified, chunk 124d817d-a20d-4cf6-aedd-e567988ab811). Suggest raise to 0.67 for consistency with Zeno, or lower Zeno to match; the two should not differ.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.181 (tr. Hicks)",
          "excerpt": "the property which he had inherited from his father had been confiscated to the king’s treasury.",
          "chunkId": "124d817d-a20d-4cf6-aedd-e567988ab811"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "Studied directly under Cleanthes, Zeno's successor (DL also mentions Zeno and, later, the Academy).",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.179 (tr. Hicks)",
          "excerpt": "He was a pupil of Cleanthes. Before this he used to practise as a long-distance runner; but afterwards he came to hear Zeno, or, as Diocles and most people say, Cleanthes",
          "chunkId": "dd48163f-3cc3-45b9-b853-542f0e7d1983"
        },
        {
          "citation": "Diogenes Laertius 7.184 (tr. Hicks)",
          "excerpt": "he joined Arcesilaus and Lacydes and studied philosophy under them in the Academy.",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854",
          "note": "Mixed training as well, but the direct Stoic training still meets level 1."
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Taught philosophy as his career: kept a school in the Odeum, held open-air classes in the Lyceum, and wrote over 705 books.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.184 (tr. Hicks)",
          "excerpt": "On one occasion, as Hermippus relates, when he had his school in the Odeum, he was invited by his pupils to a sacrificial feast.",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854"
        },
        {
          "citation": "Diogenes Laertius 7.185 (tr. Hicks)",
          "excerpt": "Chrysippus was the first who ventured to hold a lecture-class in the open air in the Lyceum.",
          "chunkId": "d105f03c-736e-4b41-9996-e66565c01686"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "Refused Ptolemy's invitation to court and dedicated no work to any king.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.185 (tr. Hicks)",
          "excerpt": "When Ptolemy wrote to Cleanthes requesting him to come himself or else to send some one to his court, Sphaerus undertook the journey, while Chrysippus declined to go.",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854"
        },
        {
          "citation": "Diogenes Laertius 7.185 (tr. Hicks)",
          "excerpt": "At any rate, of all his many writings he dedicated none to any of the kings.",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "Broadly consistent (Seneca names him among those who lived as they taught, and he refused royal patronage), with minor criticism: DL calls him arrogant, and Plutarch charges that his writings contradict his life. No conduct under real pressure is recorded.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.185 (tr. Hicks)",
          "excerpt": "He appears to have been a very arrogant man.",
          "chunkId": "3e55ad46-025c-4403-9c96-bcbc2611a854"
        },
        {
          "citation": "Diogenes Laertius 7.183 (tr. Hicks)",
          "excerpt": "His opinion of himself was so high that when some one inquired, “To whom shall I entrust my son?” he replied, “To me",
          "chunkId": "124d817d-a20d-4cf6-aedd-e567988ab811"
        },
        {
          "citation": "Seneca, On Leisure 7 (De Otio, tr. Stewart)",
          "excerpt": "I ask you whether Cleanthes, Chrysippus, and Zeno lived in accordance with their doctrine? I am sure that you will answer that they lived in the manner in which they taught that men ought to live",
          "chunkId": "5b60eeff-da4c-4755-949b-e71868ed08ba"
        },
        {
          "citation": "Plutarch, On Stoic Self-Contradictions 1 (tr. Goodwin); hostile and late",
          "excerpt": "Such a one then was Chrysippus , an old man, a philosopher, one who praised the regal and civil life, and thought there was no difference between a scholastic and voluptuous one.",
          "chunkId": "5d9d604a-9d9a-4342-bd69-9eccceea6023",
          "note": "Later polemical charge that his life contradicted his teaching; not contemporary."
        }
      ],
      "status": "drafted"
    }
  },
  "Diogenes of Babylon": {
    "POW": {
      "scoredAs": 0.33,
      "rationale": "His only public role was as one of the three philosopher-envoys Athens sent to the Roman senate in 155 BCE, a civic or ambassadorial role. Cicero adds that the envoys had never been concerned in public affairs, which rules out any higher level.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, Tusculan Disputations 4.5 (tr. Yonge, ch. III)",
          "excerpt": "Diogenes the Stoic, and Carneades the Academic, were sent as ambassadors by the Athenians to our senate. And as these had never been concerned in public affairs",
          "chunkId": "8d11af60-4ef5-4106-a75a-b1a75a8c2fa3"
        },
        {
          "citation": "Cicero, Academica 2.137 (tr. Yonge, ch. XLV)",
          "excerpt": "I have read in Clitomachus, that when Carneades and Diogenes the Stoic were standing in the capitol before the senate",
          "chunkId": "adb86916-30c3-4e41-a608-21715ea0cdc6"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 310 (scholarship)",
          "excerpt": "of the Stoics Diogenes of Babylon*, who himself acted as a political representative of Athens, is stated to have shown interest in this subject",
          "chunkId": "8f5555dd-2d81-4acc-b381-934db877ed68"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.33,
      "rationale": "Modest means is the default for a working school head; the corpus says nothing direct about his property. The only economic detail is that he took the ordinary dialectician's fee of a mina from pupils, which fits a teacher living by teaching.",
      "support": "none",
      "concern": "No direct support found for WLTH 0.33 (the fee anecdote is indirect). Suggest keep: nothing in the corpus points to either wealth or poverty, and 0.33 is the neutral reading for a salaried school head; the score rests on inference, not evidence.",
      "evidence": [
        {
          "citation": "Cicero, Academica 2.98 (tr. Yonge)",
          "excerpt": "for he had learnt dialectics of that Stoic, and a mina was the pay of the dialecticians",
          "chunkId": "2ba79887-49fa-4618-8a50-f5c70d5cb00c",
          "note": "indirect: shows he taught for fees, not his level of wealth"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0,
      "rationale": "The sources record no slavery, exile, condemnation, or major loss for him. Being spat on while lecturing is an insult, not hardship at the 0.33 level.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He was a direct pupil of Chrysippus and succeeded him (after Zeno of Tarsus) as head of the Stoa, so he trained directly under a recognized Stoic teacher. Plutarch credits Zeno (of Tarsus) with drawing him into philosophy.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Eduard Zeller, The Stoics, Epicureans and Sceptics, ch. III (scholarship)",
          "excerpt": "The proper scholars of Chrysippus were without doubt numerous; [59] but few of their names are known to us. [60] The most important among them appear to have been Zeno of Tarsus, [61] and Diogenes of Seleucia, [62] who succeeded Chrysippus in the presidency of the School.",
          "chunkId": "902ca2a1-6e1a-4282-9280-5faa540391d9"
        },
        {
          "citation": "Plutarch, On the Fortune of Alexander 1 (Moralia 328D; Goodwin ed., Essays and Miscellanies vol. 1)",
          "excerpt": "No less we wonder at the prevailing reason of Zeno, by whom the Babylonian Diogenes was charmed into the love of philosophy.",
          "chunkId": "13ed3bdf-1e07-480d-9758-ab33525fab0b"
        },
        {
          "citation": "Cicero, De Natura Deorum 1.41 (tr. Yonge)",
          "excerpt": "Diogenes the Babylonian was a follower of the doctrine of Chrysippus",
          "chunkId": "230a7338-7259-403e-96fc-9cc06cf8dde3"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Philosophy was his career: he headed the Stoic school at Athens, taught dialectic for fees (Carneades was his pupil), and had pupils including Antipater and Laelius.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Officiis 3.51 (tr. Miller)",
          "excerpt": "Diogenes of Babylonia, a great and highly esteemed Stoic, consistently holds one view; his pupil Antipater, a most profound scholar, holds another.",
          "chunkId": "3cb44d5e-38de-49c6-ac4f-93f742effc6e"
        },
        {
          "citation": "Cicero, Academica 2.98 (tr. Yonge)",
          "excerpt": "for he had learnt dialectics of that Stoic, and a mina was the pay of the dialecticians",
          "chunkId": "2ba79887-49fa-4618-8a50-f5c70d5cb00c"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He never served a monarch; his one public role was as an envoy of democratic Athens. The sources record no royal adviser or officer role.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "Seneca presents him as keeping his temper when spat on in the middle of a lecture on anger, and Gellius (via Arnold) notes his sober, temperate manner. No contemporary charge of hypocrisy appears. The evidence is one anecdote rather than a sustained test, so broadly consistent is the right level.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On Anger 3.38 (tr. Stewart)",
          "excerpt": "Not a greater one, probably, than was offered to the Stoic philosopher Diogenes, in whose face an insolent young man spat just when he was lecturing upon anger. He bore it mildly and wisely.",
          "chunkId": "b2a0a982-5b3e-4ecf-86c7-3e4c511f9175"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 113, citing Gellius 6(7).14.10 (scholarship)",
          "excerpt": "We are told that Diogenes made a good impression by his sober and temperate style",
          "chunkId": "3297253a-da21-4152-8b64-fba83150b60f"
        },
        {
          "citation": "Eduard Zeller, The Stoics, Epicureans and Sceptics, note 720 (scholarship)",
          "excerpt": "Diogenes of Seleucia says that it is permitted to circulate base money, knowingly to conceal defects in a purchase from the purchaser, and such like.",
          "chunkId": "11062bbf-379e-4022-9d54-b23d9a6decc2",
          "note": "context only: criticism of his casuistry (Cicero, De Officiis 3.51-55), a doctrinal laxity, not a charge that his life contradicted his teaching"
        }
      ],
      "status": "drafted"
    }
  },
  "Panaetius": {
    "POW": {
      "scoredAs": 0.33,
      "rationale": "He held no Roman or Rhodian office in the corpus record; his public role was as Scipio's chosen companion on the eastern embassy and as a benefactor of his own country through Scipio's favour, a civic or ambassadorial role. Hicks stresses that he acted in a private capacity.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, Academica 2.5 (tr. Yonge)",
          "excerpt": "Panætius was above all other men the chosen companion of Publius Africanus, in that noble embassy which he was employed on before he entered on the censorship",
          "chunkId": "a589f8ae-9801-4d02-a792-a5310476707d"
        },
        {
          "citation": "Plutarch, Precepts of Statecraft (Moralia 814C; Goodwin ed., Essays and Miscellanies vol. 5)",
          "excerpt": "as did Polybius and Panaetius, who through the favor of Scipio to them greatly advantaged their countries for the obtaining felicity.",
          "chunkId": "34515865-26da-4e89-b82d-623e30d76f18"
        },
        {
          "citation": "Cicero, Pro Murena 66",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Inscriptions from Lindos naming Panaetius as priest (hieropoios) of Poseidon Hippios",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus (epigraphic; not checked)"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Arnold describes him as a gentleman of position in wealthy Rhodes, and Cicero calls him a noble and dignified man fit for intimacy with Scipio and Laelius: propertied elite, but nothing marks him among the very richest.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 113 (scholarship)",
          "excerpt": "He was a gentleman of position in the wealthy and well-governed island state",
          "chunkId": "3297253a-da21-4152-8b64-fba83150b60f"
        },
        {
          "citation": "Cicero, De Finibus 4.79 (tr. Yonge)",
          "excerpt": "Panætius—a noble and dignified man, worthy of the intimacy which he enjoyed with Scipio and Lælius",
          "chunkId": "634b5d2d-4a5d-40cd-ac2e-97e02fef31ce"
        },
        {
          "citation": "Strabo 14.2.13 (Rhodian family background)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0,
      "rationale": "The sources record no exile, condemnation, illness, or major loss. He lived long in Rome and Athens by choice, and died as head of the school.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He studied at Athens under Diogenes of Babylon and then his successor Antipater of Tarsus, both heads of the Stoa (and earlier, probably, under Crates at Pergamum).",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 113 (scholarship)",
          "excerpt": "attached himself to Diogenes’, and after his death to his successor Antipater*.",
          "chunkId": "3297253a-da21-4152-8b64-fba83150b60f"
        },
        {
          "citation": "Eduard Zeller, The Stoics, Epicureans and Sceptics, notes to ch. III (scholarship)",
          "excerpt": "Panætius, whose pupil he is elsewhere called (Suid. Ἀπολλόδ.), was himself a pupil of Diogenes’ successor, Antipater (Cic. Divin. i. 3, 6)",
          "chunkId": "194c960d-18c6-457f-ab3f-cec580bc88e6"
        },
        {
          "citation": "Cicero, De Divinatione 1.6 (discipulus Antipatri Panaetius)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "He headed the Stoic school at Athens for the last two decades of his life and taught a circle of Roman and Greek pupils (Rutilius Rufus, Posidonius, Hecato).",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 113 (scholarship)",
          "excerpt": "At the time of Scipio’s death Panaetius became the head of the Stoic school at Athens, and held this position till his own death twenty years later”.",
          "chunkId": "019a5591-0e4d-4712-8086-123d25047a00"
        },
        {
          "citation": "Cicero, De Officiis 3.10 (tr. Miller)",
          "excerpt": "Publius Rutilius Rufus, who also was a pupil of Panaetius's",
          "chunkId": "2d9ee664-a003-4d48-9ac3-3fa1160f12f3"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He served no monarch. He lived in the household of Scipio Aemilianus, a Roman magistrate in a republic, as a private friend and teacher, which the codebook does not count as service at a monarch's pleasure.",
      "support": "excerpt",
      "concern": "Codebook edge case, not a clear error: Plutarch (Moralia 814C) files Panaetius under 'friendship with princes', and he lived for years as a dependent in a great man's house. If the COURT condition is meant to capture dependence on a powerful patron rather than on a crowned monarch, 0.33 could be argued. Under the codebook as written (monarch), keep 0.",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. on the Middle Stoa (scholarship)",
          "excerpt": "Yet he lived for years in the house of Scipio Africanus the younger, at Rome, accompanied him on embassies and campaigns, and was perhaps the first Greek who in a private capacity had any insight into the working of the Roman state",
          "chunkId": "56b1e694-2efd-4003-a066-b9a797ca44b5"
        },
        {
          "citation": "Cicero, De Officiis 1.90 (tr. Miller)",
          "excerpt": "Panaetius tells us that Africanus, his pupil and friend, used to say:",
          "chunkId": "e9b392b5-7a23-4c87-9892-203a1060a9e8"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "Cicero praises his character warmly (noble and dignified, almost the greatest of the Stoics), and no source charges him with hypocrisy. The criticism in the corpus is doctrinal (softening the school's severity, doubting the conflagration and divination), not about his life, and there is no recorded test, so broadly consistent fits.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Finibus 4.79 (tr. Yonge)",
          "excerpt": "Panætius—a noble and dignified man, worthy of the intimacy which he enjoyed with Scipio and Lælius",
          "chunkId": "634b5d2d-4a5d-40cd-ac2e-97e02fef31ce"
        },
        {
          "citation": "Cicero, Academica 2.107 (tr. Yonge)",
          "excerpt": "Panætius, almost the greatest man, in my opinion, of all the Stoics",
          "chunkId": "f40393dd-05bc-46b0-9bc6-cc7b572b9a8a"
        },
        {
          "citation": "Cicero, Pro Murena 66",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Posidonius": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "The published score rests on his holding the prytany, the chief magistracy of Rhodes, plus an embassy to Rome. The corpus confirms only that he took an active part in Rhodian politics and represented the Rhodians at Rome in 86 BCE; the prytany itself is not attested in the corpus.",
      "support": "excerpt",
      "concern": "Corpus evidence supports only the 0.33 level (ambassador; general political activity). The 0.67 depends on the prytany, attested in Strabo 7.5.8, which is not in the corpus. Suggest keep 0.67 if the Strabo citation is checked, since the prytany was the senior Rhodian magistracy; otherwise the corpus alone would justify 0.33.",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 117 (scholarship)",
          "excerpt": "who after studying under Panaetius at Athens travelled widely, finally settling at Rhodes, and there took an active part in political life.",
          "chunkId": "a62a6238-c1dd-4f48-974f-cba046adbb77"
        },
        {
          "citation": "St. G. W. J. Stock, A Guide to Stoicism, chronological table (scholarship)",
          "excerpt": "Born at Apameia in Syria Became a citizen of Rhodes Represented the Rhodians at Rome 86",
          "chunkId": "999a21f3-79a1-43ba-b8a9-659d45576047"
        },
        {
          "citation": "Strabo 7.5.8 (Posidonius held the prytany at Rhodes)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Plutarch, Marius 45 (embassy to Marius in 86 BCE)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Suda, s.v. Posidonius",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Propertied elite is inferred from his Rhodian citizenship, long research travels, and tenure of high office. The corpus has no direct statement about his property.",
      "support": "none",
      "concern": "No corpus support found for WLTH 0.67. Suggest keep, with the reason that years of self-funded travel (Hicks: Spain, Gaul, Africa, Sicily, Liguria) and Rhodian magistracy imply means; but this is inference. If the prytany is not confirmed, 0.33 would be the evidence-neutral default.",
      "evidence": [
        {
          "citation": "Strabo 7.5.8 (office at Rhodes, implying property qualification)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus; indirect at best"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.33,
      "rationale": "Pompey found him very ill with a severe attack of gout; a painful illness endured episodically fits episodic hardship, not a major catastrophe.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, Tusculan Disputations 2.61 (tr. Yonge, ch. XXV)",
          "excerpt": "but was informed that he was very ill of a severe fit of the gout",
          "chunkId": "e2f1c5d5-4643-49d9-853f-b3d4be19580d"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He studied under Panaetius, head of the Stoa, at Athens; Cicero calls him Panaetius's pupil.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Officiis 3.8 (tr. Miller)",
          "excerpt": "Posidonius, a pupil of his, records that Panaetius was still alive thirty years after he published those three books.",
          "chunkId": "6b0a5582-1d6e-4c98-9e96-3ed195c6c4f3"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 117 (scholarship)",
          "excerpt": "who after studying under Panaetius at Athens travelled widely, finally settling at Rhodes, and there took an active part in political life.",
          "chunkId": "a62a6238-c1dd-4f48-974f-cba046adbb77"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "He ran a school at Rhodes that drew many pupils, Cicero among them, so teaching philosophy was his career; his offices were a side activity.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. on the Middle Stoa (scholarship)",
          "excerpt": "When he settled as a teacher at Rhodes his fame attracted numerous scholars. He became known to many eminent Romans, among them Marius, Rutilius, Pompey, and Cicero.",
          "chunkId": "56baf388-b561-46b8-a8a0-16cae10db901"
        },
        {
          "citation": "Cicero, De Officiis, index s.v. Posidonius (tr. Miller; translator's apparatus)",
          "excerpt": "disciple of Panaetius at Athens, III, 8; established a school at Rhodes where Cicero studied under him",
          "chunkId": "717a2bf0-339e-4061-b899-b665e92f65ee"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "Any office he held was held in his own right as a Rhodian citizen; he served no monarch. Roman magnates (Marius, Pompey) visited or received him, but as visitors to a teacher or as an envoy's counterparts, not as his masters.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 117 (scholarship)",
          "excerpt": "who after studying under Panaetius at Athens travelled widely, finally settling at Rhodes, and there took an active part in political life.",
          "chunkId": "a62a6238-c1dd-4f48-974f-cba046adbb77"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "His one recorded test is the gout episode: in severe pain he lectured Pompey that nothing is good but what is honourable and refused to call pain an evil. Seneca ranks him among the greatest contributors to philosophy, and no source charges him with hypocrisy.",
      "support": "excerpt",
      "concern": "Score may be low: the codebook gives 1 when sources treat the life as matching doctrine under a real test, and Cicero presents the gout lecture exactly that way, with no criticism of his conduct anywhere in the corpus. Suggest consider 1, or keep 0.67 only if a single anecdote is judged too thin to count as a 'real test' (the same standard applied to Diogenes of Babylon).",
      "evidence": [
        {
          "citation": "Cicero, Tusculan Disputations 2.61 (tr. Yonge, ch. XXV)",
          "excerpt": "and that in his paroxysms he would often say, “Pain, it is to no purpose, notwithstanding you are troublesome, I will never acknowledge you an evil.”",
          "chunkId": "e2f1c5d5-4643-49d9-853f-b3d4be19580d"
        },
        {
          "citation": "Seneca, Letters 90.20 (tr. Gummere)",
          "excerpt": "Posidonius—who, in my estimation, is of the number of those who have contributed most to philosophy",
          "chunkId": "056a3c8e-2958-4074-8832-0d061b75e3d1"
        },
        {
          "citation": "Plutarch, Marius 45",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Athenodorus Cananites": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "He was a senior adviser in the household of Augustus and was later sent to reform the government of Tarsus, which matches senior office or chief adviser to a ruler.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 107 (scholarship)",
          "excerpt": "Octavius took his teacher with him to Rome, and he had the credit of exercising a restraining influence on his patron. In B.C. 30 he was sent in his old age to reform the government of his native city Tarsus.",
          "chunkId": "df56422b-af01-4962-9d74-50ff04b43953"
        },
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 107 (scholarship)",
          "excerpt": "two teachers, nominally Stoics, who held high positions in the household of Augustus",
          "chunkId": "df56422b-af01-4962-9d74-50ff04b43953"
        },
        {
          "citation": "Strabo 14.5.14 (reform of Tarsus, expulsion of Boethus)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Propertied elite is assumed from his family standing at Tarsus and his place at court; no passage in the corpus states his means.",
      "support": "none",
      "concern": "Score may be wrong or is at least unsupported: the corpus says nothing about his property. Keep 0.67 only if Strabo or another source is checked; otherwise mark it a guess in the notes. (Plutarch, On Brotherly Love, tells of an Athenodorus who shared out his inherited estate after his brother Xeno's property was confiscated, chunk 333506b2-6eb1-4439-bbc5-1e99f3c7217d, but that Athenodorus is not securely identified with Cananites and should not be used.)",
      "evidence": [
        {
          "citation": "Strabo 14.5.14",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0,
      "rationale": "No exile, condemnation, major loss or illness is recorded for him in the corpus; he retired from court in old age by his own request.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He was a pupil of Posidonius, a recognized Stoic teacher.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 107 (scholarship)",
          "excerpt": "was a pupil of Posidonius, and whilst teaching at Apollonia counted amongst his pupils Julius Caesar’s great-nephew Octavius, who was afterwards to become the emperor Augustus",
          "chunkId": "df56422b-af01-4962-9d74-50ff04b43953"
        },
        {
          "citation": "Strabo 14.5.14",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "He made his career as a teacher of philosophy, teaching at Apollonia where Octavius was his pupil, and wrote on moral subjects.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 107 (scholarship)",
          "excerpt": "was a pupil of Posidonius, and whilst teaching at Apollonia counted amongst his pupils Julius Caesar’s great-nephew Octavius, who was afterwards to become the emperor Augustus",
          "chunkId": "df56422b-af01-4962-9d74-50ff04b43953"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0.67,
      "rationale": "He served at Augustus's court at the emperor's pleasure, needing leave to retire, but also acted in his own right as reformer of Tarsus, so partly a court figure.",
      "support": "excerpt",
      "concern": "Possible case for 1 rather than 0.67: the Plutarch passage shows him serving and staying at the emperor's pleasure. 0.67 is defensible only because of the later Tarsus reform, which rests on Strabo (not in corpus) and Arnold.",
      "evidence": [
        {
          "citation": "Plutarch, Sayings of Kings and Commanders, Caesar Augustus 7 (Moralia 207C)",
          "excerpt": "Athenodorus the philosopher, by reason of his old age, begged leave that he might retire from court, which Caesar granted",
          "chunkId": "7656a765-c617-4b40-90f9-f3b306534a7b"
        },
        {
          "citation": "Plutarch, Sayings of Kings and Commanders, Caesar Augustus 7 (Moralia 207C)",
          "excerpt": "Whereupon Caesar caught him by the hand and said, I have need of your presence still; and he kept him a year longer",
          "chunkId": "7656a765-c617-4b40-90f9-f3b306534a7b"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "Sources present him as giving frank counsel and restraining Augustus, with only mild criticism (Seneca thinks he withdrew from public life too soon); his life was not put to a severe test (consTested 0).",
      "support": "excerpt",
      "concern": "Identity caveat: Arnold notes the Seneca quotations may belong to the younger Athenodorus (Cananites) or to another; the Seneca criticism should be cited with that caveat.",
      "evidence": [
        {
          "citation": "Plutarch, Sayings of Kings and Commanders, Caesar Augustus 7 (Moralia 207C)",
          "excerpt": "Remember, said he, Caesar, whenever you are angry, to say or do nothing before you have repeated the four-and-twenty letters to yourself.",
          "chunkId": "7656a765-c617-4b40-90f9-f3b306534a7b"
        },
        {
          "citation": "Seneca, On Tranquillity of Mind (De Tranquillitate Animi) 4.1 (tr. Stewart)",
          "excerpt": "Athenodorus seems to have yielded too completely to the times, to have fled too soon",
          "chunkId": "771da847-575a-402a-9a9f-9fd6cd8a9947"
        }
      ],
      "status": "drafted"
    }
  },
  "Dionysius the Renegade": {
    "POW": {
      "scoredAs": 0,
      "rationale": "No office or political role is recorded; the sources describe only a literary and philosophical life.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.33,
      "rationale": "Modest means is a default; the corpus records his father's name and his pleasures but nothing about his property.",
      "support": "none",
      "concern": "Unsupported, not clearly wrong: nothing in the corpus states his wealth. DL 7.167 says he frequented brothels and indulged in excesses after leaving Zeno, which hints at some means but is not evidence of a level. Keep 0.33 and mark it a guess in the notes.",
      "evidence": [],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.67,
      "rationale": "A severe illness (ophthalmia in Diogenes, kidney pain in Cicero) is recorded and drove his change of school, matching major illness.",
      "support": "excerpt",
      "concern": "Score holds, but note the sources disagree on the illness: eyes in DL 7.166 and Cicero, Fin. 5.94; kidneys in Tusc. 2.60. He also ended his life by starvation near eighty (DL 7.167).",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.166 (tr. Hicks)",
          "excerpt": "Dionysius , the Renegade, declared that pleasure was the end of action; this under the trying circumstance of an attack of ophthalmia. For so violent was his suffering that he could not bring himself to call pain a thing indifferent.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "Cicero, Tusculan Disputations 2.60 (tr. Yonge)",
          "excerpt": "Dionysius of Heraclea, a man certainly of no resolution, having learned fortitude of Zeno, quitted it on being in pain; for, being tormented with a pain in his kidneys, in bewailing himself he cried out, that those things were false which he had formerly conceived of pain.",
          "chunkId": "fbcdb082-ab4f-4bbb-904d-cc5989f1d226"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He studied directly under Zeno, after Heraclides, Alexinus and Menedemus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.166 (tr. Hicks)",
          "excerpt": "At first, as Diocles relates, he was a pupil of his fellow-townsman, Heraclides, next of Alexinus and Menedemus, and lastly of Zeno.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "Cicero, Academica 2.71 (tr. Yonge)",
          "excerpt": "whether he believed the doctrine of his master Zeno, that whatever was honourable was the only good",
          "chunkId": "a2ac6fe6-f82b-46bb-b526-6751198e834c"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "His life was spent in letters and philosophy, with a list of philosophical works and no public career; one tradition makes Aratus his pupil.",
      "support": "excerpt",
      "concern": "Weakly supported: no corpus source says outright that he taught philosophy as a career; the score rests on his writings and the late tradition that Aratus studied with him. Keep, since there is no sign of a public career.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.167 (tr. Hicks)",
          "excerpt": "After living till he was nearly eighty years of age, he committed suicide by starving himself. The following works are attributed to him: Of Apathy, two books On Training, two books. Of Pleasure, four books.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        },
        {
          "citation": "E. Zeller, The Stoics, Epicureans and Sceptics, note 28 (scholarship)",
          "excerpt": "Other accounts (Ibid. ii. 431; 442; 446) describe him as a pupil of Dionysius of Heraclea",
          "chunkId": "81d2c65d-6f63-4dc0-848e-3f2b68b2a450"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "No service to any monarch is recorded.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0,
      "rationale": "He abandoned the doctrine that pain is indifferent under the test of pain and went over to the Cyrenaics; Cicero calls the desertion shameful.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Finibus 5.94 (tr. Yonge)",
          "excerpt": "Dionysius of Heraclea appears to have deserted the Stoics in a shameful manner, on account of the pain of his eyes; as if he had learnt from Zeno not to be in pain when he was in pain.",
          "chunkId": "ebc6b455-64a8-4354-ac69-3573353d776c"
        },
        {
          "citation": "Diogenes Laertius 7.167 (tr. Hicks)",
          "excerpt": "When he fell away from Zeno, he went over to the Cyrenaics, and used to frequent houses of ill fame and indulge in all other excesses without disguise.",
          "chunkId": "28aea869-d2db-44b7-a105-c1dbc1a50393"
        }
      ],
      "status": "drafted"
    }
  },
  "Egnatius Celer": {
    "POW": {
      "scoredAs": 0,
      "rationale": "No office of any kind is recorded for him; he appears only as a client and philosopher in Soranus' circle and as a witness in Nero's prosecution.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.33,
      "rationale": "Modest means is a guess (the data notes say so). The corpus says nothing about his property, and the sources outside it do not give a clear basis either.",
      "support": "none",
      "concern": "No corpus support for WLTH 0.33; the published note already calls it a guess. Keep with that caveat, or treat WLTH as missing for this case if the analysis allows it.",
      "evidence": [
        {
          "citation": "Tacitus, Annals 16.32",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Tacitus, Histories 4.10, 4.40",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0,
      "rationale": "Published as no hardship recorded. But the corpus records his condemnation, which the codebook scores as ADV 1.",
      "support": "none",
      "concern": "Score may be wrong: the codebook gives ADV 1 for condemnation, and both the published notes ('later condemned after Musonius prosecuted him') and Stock's chronology in the corpus record that Celer was condemned (Tac. Hist. 4.10, 4.40). Suggest raising ADV from 0 to 1, unless the codebook is meant to exclude a just punishment that came after the betrayal. If so, the codebook should say so.",
      "evidence": [
        {
          "citation": "Stock, A Guide to Stoicism, chronology table (scholarship), citing Tacitus, Histories 4.10 and Juvenal 3.116",
          "excerpt": "Procured the condemnation of Publius Celer (Tac H iv 10, Juv Sat iii 116)",
          "chunkId": "62abcc20-fe70-4d82-a602-7e5110862515"
        },
        {
          "citation": "Tacitus, Histories 4.40 (the trial and condemnation)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0,
      "rationale": "The sources record no Stoic teacher for him (teachKnown = 0). The corpus has nothing on his training and nothing that contradicts the 0.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Tacitus presents him as a professed Stoic who acted as teacher to Barea Soranus, and Juvenal calls him the Stoic who killed his friend and pupil. That is philosophy as a career, not public office. Neither source is in the corpus.",
      "support": "citation_only",
      "evidence": [
        {
          "citation": "Tacitus, Annals 16.32 (Celer as Soranus' client, presenting himself as a Stoic)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Juvenal, Satires 3.116 (the Stoic informer who killed his friend and pupil Barea)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He held no position at court. He was a client of Soranus, and his only link to Nero was as a prosecution witness, not as an adviser or officer.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0,
      "rationale": "He testified against his patron and pupil Soranus, which Tacitus and Juvenal treat as a betrayal of the philosophy he professed. The corpus has only the indirect record that Musonius later had him condemned.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Stock, A Guide to Stoicism, chronology table (scholarship), indirect: records the later condemnation, not the betrayal itself",
          "excerpt": "Procured the condemnation of Publius Celer (Tac H iv 10, Juv Sat iii 116)",
          "chunkId": "62abcc20-fe70-4d82-a602-7e5110862515"
        },
        {
          "citation": "Tacitus, Annals 16.32",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Tacitus, Histories 4.10, 4.40",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Juvenal, Satires 3.116",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Musonius Rufus": {
    "POW": {
      "scoredAs": 0,
      "rationale": "He held no magistracy or appointed post. His public acts (joining the senate's peace envoys in 69, prosecuting Celer) were the acts of a private man.",
      "support": "absence",
      "concern": "Borderline: Arnold (from Tacitus, Hist. 3.81) has him going out with the senate's envoys to the Flavian army in 69, which could be read as POW 0.33 (ambassadorial role). Suggest keeping 0, because Tacitus has him join the delegation on his own initiative rather than being appointed, but the coder should decide this explicitly.",
      "evidence": [
        {
          "citation": "Arnold, Roman Stoicism §131 (scholarship), on 69 CE",
          "excerpt": "the senate sent delegates to propose terms of peace. Musonius joined them, and ventured to address the common soldiers",
          "chunkId": "db110e31-ec4b-4456-b9fa-4510d77984b0"
        },
        {
          "citation": "Tacitus, Histories 3.81 (he attached himself to the envoys)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Propertied elite: Tacitus gives his rank as equestrian. The corpus does not state his rank or wealth.",
      "support": "citation_only",
      "evidence": [
        {
          "citation": "Tacitus, Histories 3.81 (Musonius Rufus of equestrian rank)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Exile: Nero banished him after the Pisonian conspiracy, to Gyaros. His own lecture on exile speaks as an exile.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Musonius Rufus, Lecture IX, That exile is not an evil (tr. Lutz, p. 75)",
          "excerpt": "Are you not aware that I am an exile? Well, then, have I been deprived of freedom of speech?",
          "chunkId": "8020f8b1-c27f-4246-b737-ca6898c7a4c2"
        },
        {
          "citation": "Arnold, Roman Stoicism §131 (scholarship)",
          "excerpt": "After the conspiracy of Piso, Musonius was banished from Rome by Nero, together with most of the eminent personalities of the capital",
          "chunkId": "42dd0cf3-c3cb-435f-9bd7-1b10c004bfc7"
        },
        {
          "citation": "Tacitus, Annals 15.71",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0,
      "rationale": "The sources record no teacher for him (teachKnown = 0). This means none is recorded, not that he had none. The corpus names no teacher of Musonius and does not contradict the 0.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Taught philosophy as his career: scholarship calls him a professional teacher, and his pupils included Epictetus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Hicks, Stoic and Epicurean p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        },
        {
          "citation": "Epictetus, Discourses 3.23.29 (tr. Long)",
          "excerpt": "Rufus was used to say: “If you have leisure to praise me, I am speaking to no purpose.”",
          "chunkId": "4d7def64-2a2b-476f-a680-36fce4a40d5e"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He never served a ruler as adviser or officer. He was exiled by Nero, and under Vespasian he kept the emperor's confidence without holding a court post.",
      "support": "absence",
      "evidence": [
        {
          "citation": "Arnold, Roman Stoicism §131 (scholarship); context only, not an office",
          "excerpt": "retained the confidence of the emperor even at a time when his advisers secured his assent to a measure for expelling other philosophers from the capital",
          "chunkId": "db110e31-ec4b-4456-b9fa-4510d77984b0"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "His life is treated as matching the doctrine under a real test: exile borne without complaint, and his 69 CE appeal to the troops at personal risk. Tacitus criticised that intervention as untimely, but this was a criticism of his judgement, not a charge of hypocrisy.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Arnold, Roman Stoicism §131 (scholarship)",
          "excerpt": "he was the Cato of his generation, trusted by all in politics. parties for his absolute rectitude of character, and respected for his fearlessness",
          "chunkId": "42dd0cf3-c3cb-435f-9bd7-1b10c004bfc7"
        },
        {
          "citation": "Hicks, Stoic and Epicurean p. 142 (scholarship)",
          "excerpt": "Musonius nearly lost his life by his courageous interposition in the last stage of the civil conflict between Vitellius and Vespasian",
          "chunkId": "7d5ebcbb-a65d-4c30-bbea-2fc0297accb1"
        },
        {
          "citation": "Musonius Rufus, Lecture IX (tr. Lutz, p. 75); his own claim, not independent",
          "excerpt": "for if I have been deprived of my country, I have not been deprived of my ability to endure exile.",
          "chunkId": "339b09bb-b6e0-44ef-b2df-b4929692ddd0"
        },
        {
          "citation": "Tacitus, Histories 3.81 (criticises the intervention as ill-timed)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Epictetus": {
    "POW": {
      "scoredAs": 0,
      "rationale": "He held no office of any kind. He was a slave and then a private teacher. The sources record none, and nothing in the corpus contradicts the 0.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0,
      "rationale": "Slavery: he was a slave in the household of Epaphroditus, Nero's freedman.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.26 (tr. Long)",
          "excerpt": "Did he laugh at him, as we slaves of Epaphroditus did?",
          "chunkId": "5686ae94-ba94-4b55-b9f9-ce124b697b04"
        },
        {
          "citation": "Arnold, Roman Stoicism §133 (scholarship)",
          "excerpt": "Epictetus was born a slave, and only obtained his freedom in mature years",
          "chunkId": "09130bd0-b311-44ad-ab6b-519059bf9244"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "He was a slave, he was lame, and he was expelled from Rome under Domitian. Slavery and expulsion each meet the ADV 1 level.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.9 (tr. Long), on his master",
          "excerpt": "Thus also Musonius Rufus, in order to try me, used to say: This and this will befall you from your master",
          "chunkId": "1bc92642-20a5-4c33-85cb-a63176b7a161"
        },
        {
          "citation": "Epictetus, Discourses 1.16.20 (tr. Long)",
          "excerpt": "For what else can I do, a lame old man, than sing hymns to God?",
          "chunkId": "6ac645b1-47db-48aa-9fd7-924e33c884c7"
        },
        {
          "citation": "Arnold, Roman Stoicism §133 (scholarship)",
          "excerpt": "Like other philosophers, he was expelled from Rome by Domitian in A.D. 89",
          "chunkId": "1fdabc3c-3197-47b0-9d75-e525107ee672"
        },
        {
          "citation": "Aulus Gellius, Attic Nights 15.11 (expulsion of the philosophers under Domitian); the corpus holds only Gellius 19.1",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He trained directly under Musonius Rufus, a recognized Stoic teacher. Epictetus recalls being tested and corrected by him in person.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.7.32 (tr. Long; the 56 is the translator's note number in the chunk)",
          "excerpt": "This is the very remark which I made to Rufus56 when he blamed me for not having discovered the one thing omitted in a certain syllogism",
          "chunkId": "8ef20876-6556-4d7d-bb00-37967a5545c2"
        },
        {
          "citation": "Arnold, Roman Stoicism §134 (scholarship)",
          "excerpt": "in his early youth he was taken to task by his teacher Musonius for underrating this part of philosophy",
          "chunkId": "0bcf5670-459f-4c19-bf56-d522db42cccb"
        },
        {
          "citation": "Stock, A Guide to Stoicism, chronology table (scholarship)",
          "excerpt": "A freedman of Epaphroditus, Disciple of C Musonius Rufus",
          "chunkId": "62abcc20-fe70-4d82-a602-7e5110862515"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 1,
      "rationale": "Taught philosophy as his career, at Rome and then at Nicopolis until his death.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Arnold, Roman Stoicism §133 (scholarship)",
          "excerpt": "he retired to Nicopolis; there he gave lectures till the time of his death",
          "chunkId": "0bcf5670-459f-4c19-bf56-d522db42cccb"
        },
        {
          "citation": "Hicks, Stoic and Epicurean p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He never served a monarch as adviser or officer. As a slave he belonged to Epaphroditus, a freedman of Nero, but that was household servitude, not a court post. Nothing in the corpus contradicts the 0.",
      "support": "absence",
      "evidence": [],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "Sources treat his life as matching his doctrine under real tests: slavery, lameness and exile. Scholarship in the corpus holds him up as an example of practice matching precept.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Davidson, The Stoic Creed p. 33 (scholarship)",
          "excerpt": "we have Epictetus and Marcus Aurelius, who are brilliant examples to all ages of practice conforming to precept",
          "chunkId": "656f542f-6f56-4cda-8539-16b926ca45d5"
        },
        {
          "citation": "Hicks, Stoic and Epicurean p. 151 (scholarship)",
          "excerpt": "the later Stoics, and especially Epictetus, in their practical teaching adhered firmly to the principles laid down by Zeno",
          "chunkId": "5a0ce602-b99d-48d9-a8f8-97e25a2802e2"
        }
      ],
      "status": "drafted"
    }
  },
  "Persaeus": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "He was secretary in the royal household, tutor to the king's son, and later commander of the Acrocorinth for Antigonus Gonatas, a senior office under a ruler.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.36 (tr. Hicks)",
          "excerpt": "Of the many disciples of Zeno the following are the most famous: Persaeus , son of Demetrius, of Citium, whom some call a pupil and others one of the household, one of those sent him by Antigonus to act as secretary; he had been tutor to Antigonus’s son Halcyoneus.",
          "chunkId": "d0a5cfff-70a2-425a-94d0-f9de48a031ba"
        },
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 89 (scholarship)",
          "excerpt": "Antigonus placed him in command of the acropolis at Corinth, which was nevertheless taken by Aratus of Sicyon in 243 B.c. According to one account, Persaeus was wounded in the attack, and after- wards put to death by the conqueror®; others relate that: he",
          "chunkId": "5153bb46-a805-4106-9e1b-08c3947405c3"
        },
        {
          "citation": "Plutarch, Life of Aratus 18-23; Pausanias 2.8.4, 7.8.3",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "He held an estate that the king could plausibly threaten and lent money to friends, consistent with propertied elite at court.",
      "support": "excerpt",
      "concern": "Note for the WLTH and ADV pair: one tradition makes him Zeno's slave in youth (see ADV). The 0.67 reflects his position at court, not his origin.",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.36 (tr. Hicks)",
          "excerpt": "And Antigonus once, wishing to make trial of him, caused some false news to be brought to him that his estate had been ravaged by the enemy, and as his countenance fell, “Do you see,” said he, “that wealth is not a matter of indifference?”",
          "chunkId": "d0a5cfff-70a2-425a-94d0-f9de48a031ba"
        },
        {
          "citation": "Plutarch, On Shyness (De vitioso pudore) 11, Moralia 533B",
          "excerpt": "But Persaeus,[663] when he lent a sum of money to one of his friends, had the fact duly attested by a banker in the market-place",
          "chunkId": "95a9f186-55e0-413e-958c-6c1e5a773674"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.67,
      "rationale": "He lost the Acrocorinth to Aratus in 243 BCE and by one account was wounded and killed, a major catastrophe.",
      "support": "excerpt",
      "concern": "Score may be too low: the codebook puts slavery at ADV 1, and Arnold says 'good authorities' (Gellius 2.18.8, Athenaeus, both not in corpus) make Persaeus Zeno's servant (oiketes) before he became his fellow-lodger. Arnold also cites Seneca for Zeno having no slave, and Seneca, Consolation to Helvia 12.4, says Zeno 'had none' (in the corpus as chunk fd773923-fb41-43aa-b146-5c393e39f200), so the slavery is contested. Suggest 1 if the Gellius tradition is accepted, otherwise keep 0.67 and note the dispute. The DL 7.36 estate loss was a false report, so it is not adversity.",
      "evidence": [
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 89 (scholarship)",
          "excerpt": "According to one account, Persaeus was wounded in the attack, and after- wards put to death by the conqueror®; others relate that: he escaped to Cenchreae”.",
          "chunkId": "5fcc26b3-06a0-440d-b055-bc28c7de8f20"
        },
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 89 (scholarship)",
          "excerpt": "He was the fellow- townsman of Zeno, and, as good authorities assert, at first his personal servant (oi«érys)* and afterwards his fellow- lodger.",
          "chunkId": "5153bb46-a805-4106-9e1b-08c3947405c3"
        },
        {
          "citation": "Aulus Gellius, Attic Nights 2.18.8 (Persaeus as Zeno's slave)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Athenaeus 4.162 (13.607); Plutarch, Aratus 23; Pausanias 2.8.4",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "He was Zeno's pupil and lived in the same house with him.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.13 (tr. Hicks)",
          "excerpt": "He shared the same house with Persaeus",
          "chunkId": "a8b62104-64b2-4b5e-bcb5-21e1961d5591"
        },
        {
          "citation": "R. D. Hicks, Stoic and Epicurean, ch. 1 (scholarship)",
          "excerpt": "Among his pupils Persaeus, also from Citium, lived in the same house with Zeno, who sent him as his substitute to the court of Antigonus when he declined the king's invitation for himself.",
          "chunkId": "11b809ca-5410-4b3a-8ef9-76a6dd79767b"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "His career was at the Macedonian court as secretary, tutor and commander rather than as head of a school.",
      "support": "excerpt",
      "concern": "Minor counter-evidence, score likely right: DL 7.28 cites Persaeus's 'ethical lectures' (\"Persaeus, however, in his ethical lectures makes him die at the age of seventy-two\", chunk a6ad9113-4ade-4100-894d-08b952dfb895), so he did lecture, but nothing suggests teaching was his career.",
      "evidence": [
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 99 (scholarship)",
          "excerpt": "Persaeus, Aratus, and others had turned aside ofCleanthes. from the direct pursuit of philosophy, and their contact with science and politics might easily sully the purity of their philosophic creed.",
          "chunkId": "ce14dfc7-c864-4244-96dc-31f5bfe09074"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 1,
      "rationale": "He was sent to Antigonus Gonatas at the king's request and served him as secretary, tutor and garrison commander, wholly at the king's pleasure.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 7.9 (tr. Hicks)",
          "excerpt": "So he sent Persaeus and Philonides the Theban; and Epicurus in his letter to his brother Aristobulus mentions them both as living with Antigonus.",
          "chunkId": "b2093fa4-cdf3-47e8-a599-9e47be3cc53a"
        },
        {
          "citation": "Diogenes Laertius 7.36 (tr. Hicks)",
          "excerpt": "Of the many disciples of Zeno the following are the most famous: Persaeus , son of Demetrius, of Citium, whom some call a pupil and others one of the household, one of those sent him by Antigonus to act as secretary; he had been tutor to Antigonus’s son Halcyoneus.",
          "chunkId": "d0a5cfff-70a2-425a-94d0-f9de48a031ba"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.33,
      "rationale": "Contemporaries charged him with bad conduct at court: Antigonus's test exposed his attachment to wealth, and Menedemus called him the worst of men for blocking Eretrian democracy.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Diogenes Laertius 2.143, Life of Menedemus (tr. Yonge)",
          "excerpt": "Persæus was the only man with whom he had an implacable quarrel; for he thought that when Antigonus himself was willing to re-establish the democracy among the Eretrians for his sake, Persæus prevented him.",
          "chunkId": "1bc96a89-9fac-4f09-85a9-60e682fd8ea0"
        },
        {
          "citation": "Diogenes Laertius 2.143, Life of Menedemus (tr. Yonge)",
          "excerpt": "“He may, indeed, be a philosopher, but he is the worst man that lives or that ever will live.”",
          "chunkId": "1bc96a89-9fac-4f09-85a9-60e682fd8ea0"
        },
        {
          "citation": "E. V. Arnold, Roman Stoicism, sec. 89 (scholarship)",
          "excerpt": "He adapted himself easily to court life, and is said to have written a treatise on the theory of the banquet, in which he did not rise above the moral standard of his neighbours*.",
          "chunkId": "5153bb46-a805-4106-9e1b-08c3947405c3"
        },
        {
          "citation": "Athenaeus 4.162 (banquet conduct); Plutarch, Aratus 23 (admits he was wrongly taught about the wise man as general)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Rutilius Rufus": {
    "POW": {
      "scoredAs": 1,
      "rationale": "Consul in 105 BCE, which is consular authority (level 1). The corpus does not record the consulship; the published sources for it are not in the corpus, so the score rests on citation only. Suggest keep: the consulship is standard and uncontested.",
      "support": "citation_only",
      "evidence": [
        {
          "citation": "Cicero, Brutus 113-116",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Velleius Paterculus 2.13",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "A member of the senatorial nobility with landed property: Cicero's Cotta, his nephew, mentions his farm at Formiae. Nothing in the corpus places him among the very richest, so propertied elite (0.67) fits.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Natura Deorum 3.86 (Cotta speaking)",
          "excerpt": "This argument might have some weight if, in bringing Rutilius as an instance, I had only complained of the loss of his farm at Formiae ; but I spoke of a personal misfortune, his banishment.",
          "chunkId": "6aa97e31-4c6a-494c-bada-2184c80fa546"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Convicted and exiled, which is the codebook's level 1 (exile or condemnation). Seneca and Cicero both treat the conviction as unjust.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Letters 24.4 (tr. Gummere)",
          "excerpt": "Sentence of conviction was borne by Rutilius as if the injustice of the decision were the only thing which annoyed him. Exile was endured by Metellus with courage, by Rutilius even with gladness;",
          "chunkId": "1575fa27-9302-4929-aae3-5f993f54740f"
        },
        {
          "citation": "Cicero, De Natura Deorum 3.80 (Cotta speaking)",
          "excerpt": "Why is Rutilius , my uncle, a man of the greatest virtue and learning, now in banishment?",
          "chunkId": "09f3bb66-bcb1-412c-b649-3ee04aacb44b"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "A direct pupil of Panaetius, head of the Stoic school, which is level 1.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Officiis 3.10 (citing Posidonius)",
          "excerpt": "He writes in one of his letters that Publius Rutilius Rufus, who also was a pupil of Panaetius's, used to say",
          "chunkId": "2d9ee664-a003-4d48-9ac3-3fa1160f12f3"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "His career was in public life and law (jurisconsult, magistrate, legate in Asia); philosophy and letters came only in exile.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Cicero, De Officiis 2.47",
          "excerpt": "His frequent visits to the home of Publius Mucius assisted young Publius Rutilius to gain a reputation for integrity of character and for ability as a jurisconsult.",
          "chunkId": "f05375c5-e628-40cc-bf80-952439e668a2"
        },
        {
          "citation": "Cicero, De Officiis, index of names (editorial, Loeb/Miller)",
          "excerpt": "with Quintus Scaevola in Asia he repressed the extortion of the publicans, was banished, and devoted his life to philosophy and literature, III, 10.",
          "chunkId": "809e540e-b8b8-41ca-8a07-43abea9e663b"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "A Republican magistrate holding office in his own right, with no monarch to serve. The nearest thing to a ruler, Sulla, he refused.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Letters 24.4 (tr. Gummere)",
          "excerpt": "the latter refused to return when Sulla summoned him,—and nobody in those days said “No” to Sulla!",
          "chunkId": "1575fa27-9302-4929-aae3-5f993f54740f"
        },
        {
          "citation": "Seneca, On Providence 3.7",
          "excerpt": "because he was the only man who refused anything to Sulla the dictator, and when recalled from exile all but went further awa",
          "chunkId": "29def88a-1faf-4bb7-89b5-000bfe95ee0e"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "The sources treat him as a standing example of innocence borne out under a real test: an unjust conviction met with a plain defence, and exile accepted without complaint. No charge of inconsistency is recorded in the corpus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Letters 79.14 (tr. Gummere)",
          "excerpt": "If Rutilius had not resigned himself to wrong, his innocence and virtue would have escaped notice; the hour of his suffering was the hour of his triumph.",
          "chunkId": "0ce7964c-6827-4a48-97ea-7caf4493fe69"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 326 (scholarship; cites Cic. de Or. 1.229)",
          "excerpt": "in Publius Rutilius Rufus a Roman could be found who, like Socrates, would not when on his trial consent to any other defence than a plain statement of the facts, in which he neither exaggerated his own merits nor made any plea for mercy",
          "chunkId": "67e1496f-4904-4fa3-bed4-f02257773b61"
        },
        {
          "citation": "Seneca, On Benefits 6.37",
          "excerpt": "My wish is, that my country should blush at my being banished, rather than that she should mourn at my having returned.",
          "chunkId": "b219d405-79da-4e4d-b1bb-3404c6115d98"
        }
      ],
      "status": "drafted"
    }
  },
  "Cato the Younger": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "He reached the praetorship but was refused the consulship, so senior office (0.67) rather than consular authority.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On Benefits 5.17",
          "excerpt": "to Cato the Roman people refused the praetorship, and persisted in refusing the consulship.",
          "chunkId": "56b44e6c-1083-4954-b828-efadb707ce80"
        },
        {
          "citation": "Seneca, Letters 71.8 (tr. Gummere)",
          "excerpt": "Is there no difference between Cato’s being elected praetor and his failure at the polls?",
          "chunkId": "e713344b-8e1f-4b66-9e57-96f7c3b0bcc6"
        },
        {
          "citation": "Plutarch, Cato Minor",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Seneca gives his fortune as four million sesterces, well below Crassus, the benchmark of the richest Romans. Propertied elite (0.67) fits; the passage names his great-grandfather the Censor, so it is the younger Cato.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On a Happy Life 21",
          "excerpt": "Marcus Cato, when he was praising Curius and Coruncanius and that century in which the possession of a few small silver coins were an offence which was punished by the Censor, himself owned four million sesterces; a less fortune no {229} doubt, than that of Crassus, but larger than of Cato the Censor.",
          "chunkId": "3a9a625b-b87f-4eeb-a105-a780796055ab"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Electoral defeats, public insult, a lost civil war, and suicide at Utica to avoid falling into Caesar's hands. Seneca treats him as the case Fortune pressed hardest.",
      "support": "excerpt",
      "concern": "Score may be wrong: under a strict reading of the codebook, level 1 is slavery, exile, or condemnation, and the corpus records none of these for Cato. It records defeat, insult, being 'under accusation' (Seneca, Letters 104.30) and a self-chosen death after military defeat, which reads as major loss or catastrophe (0.67). Keep 1 only if death forced by political defeat is meant to count with condemnation, as it does in practice for Seneca and Thrasea (who were condemned).",
      "evidence": [
        {
          "citation": "Seneca, Letters 104.29 (tr. Gummere)",
          "excerpt": "Take that of the younger Marcus Cato, with whom Fortune dealt in a more hostile and more persistent fashion.",
          "chunkId": "9dd47454-506c-42f9-907c-1bcc2bb6ac35"
        },
        {
          "citation": "Seneca, On Constancy 2",
          "excerpt": "Think you that the people could do any wrong to such a man when they tore away his praetorship or his toga? when they bespattered his sacred head with the rinsings of their mouths?",
          "chunkId": "39bbbad4-c6e6-4324-8c47-2f6f04709488"
        },
        {
          "citation": "Seneca, Letters 67.7 (tr. Gummere)",
          "excerpt": "the wound of Cato which was torn open by Cato’s own hand",
          "chunkId": "0f9ec312-d30b-421b-81c6-5c435c7379e7"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0.67,
      "rationale": "A Stoic mentor lived in his household: Arnold records that Athenodorus (Cordylion) of Tarsus left Pergamum to live with Cato in Rome, and other Stoics (Antipater of Tyre, Apollonides) were his companions. That is level 0.67, not formal training under a school head.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 121 (scholarship)",
          "excerpt": "In his old age he left Pergamus and came to reside at Rome with M. Porcius Cato in B.c. 70. Amongst the younger friends of Cato were ANTIPATER of Tyre, who wrote on practical ethics,",
          "chunkId": "d87b0a3f-c394-41a4-9c82-05e8a336ac73"
        },
        {
          "citation": "Cicero, De Officiis, index of names (editorial, Loeb/Miller)",
          "excerpt": "Antipater, of Tyre (1st century), friend of Cato the younger; a Stoic, II, 86.",
          "chunkId": "7bfef855-c65e-4f5c-a167-ffa64e030394"
        },
        {
          "citation": "Cicero, De Finibus 3.7",
          "excerpt": "I found Marcus Cato, whom I did not know to be there, sitting in the library, surrounded by a number of the books of the Stoics.",
          "chunkId": "106bf6cc-f5e4-4369-b764-cc3eb6387221"
        },
        {
          "citation": "Plutarch, Cato Minor 10, 16 (Athenodorus Cordylion)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "His career was entirely in public life: magistracies, the senate, a province, and the civil war.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Letters 104.29 (tr. Gummere)",
          "excerpt": "His whole life was passed either in civil warfare, or under a political regime which was soon to breed civil war.",
          "chunkId": "9dd47454-506c-42f9-907c-1bcc2bb6ac35"
        },
        {
          "citation": "Seneca, Letters 104.30 (tr. Gummere)",
          "excerpt": "in the praetorship, in defeat, under accusation, in his province, on the platform, in the army, in death.",
          "chunkId": "8da96391-2226-4b59-a432-025d63a26ded"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He held office in his own right and opposed both Caesar and Pompey; he served no monarch.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Letters 104.30 (tr. Gummere)",
          "excerpt": "when the citizens were leaning towards either Caesar or Pompey, Cato alone established a definite party for the Republic.",
          "chunkId": "8da96391-2226-4b59-a432-025d63a26ded"
        },
        {
          "citation": "Seneca, Letters 24.7 (tr. Gummere)",
          "excerpt": "I have fought, till now, for my country’s freedom, and not for my own,",
          "chunkId": "5c34d280-29cc-4461-a3e0-d60f61d7e077"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "The Stoic sources make him the model of the wise man whose life matched the doctrine, tested by defeat and death. Arnold stresses that Cicero, a contemporary rival, vouched for his sincerity. Cicero's criticism in De Finibus 4 is of the doctrine, and his mockery in Pro Murena (not in corpus) is of rigor, not of inconsistency.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On Constancy 2",
          "excerpt": "it is more certain that the immortal gods have given Cato as a pattern of a wise man to us, than that they gave Ulysses or Hercules to the earlier ages;",
          "chunkId": "39bbbad4-c6e6-4324-8c47-2f6f04709488"
        },
        {
          "citation": "Seneca, Letters 104.30 (tr. Gummere)",
          "excerpt": "No one ever saw Cato change, no matter how often the state changed: he kept himself the same in all circumstances",
          "chunkId": "8da96391-2226-4b59-a432-025d63a26ded"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 326 (scholarship)",
          "excerpt": "If Cicero, as a contemporary and a colleague in political life, was little liable to illusions as to his character and success, his testimony to Cato’s sincerity is all the more valu- able",
          "chunkId": "737f78f4-e21d-4cdc-84ce-5ce40893a126"
        },
        {
          "citation": "Cicero, Pro Murena 60-66",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Seneca": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "Chief adviser to Nero (with Burrus), which is level 0.67. The corpus gives quaestor and praetor and calls the consulship doubtful; the suffect consulship of 56 CE is attested only in sources not in the corpus.",
      "support": "excerpt",
      "concern": "Score may be wrong (consistency): the published note gives Seneca a suffect consulship in 56 CE, and the codebook's level 1 is 'supreme or consular authority'. Thrasea Paetus, also suffect consul in 56 CE, is scored POW 1. Either Seneca goes up to 1, or the codebook should say that a suffect consulship under the principate does not count as consular authority and Thrasea comes down to 0.67. The corpus itself only reaches 0.67 (adviser), and L'Estrange calls the consulship doubtful.",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 126 (scholarship)",
          "excerpt": "He played a part in the court of Claudius, and in time became the tutor, and ultimately the minister, of Nero.",
          "chunkId": "f1c8a155-93c6-4801-85db-746024829f51"
        },
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "he came first to be _quæstor_, then _prætor,_ and some will have it that he was chosen _consul_; but this is doubtful.",
          "chunkId": "efefcd29-d721-4d72-8456-db7fd3986fff"
        },
        {
          "citation": "Tacitus, Annals 13.2 and 14.53-56; suffect consulship 56 CE",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 1,
      "rationale": "Among the richest men of his time: inherited wealth greatly increased by Nero's gifts, gardens, villas and huge loans. The charge that he lived as a rich man is one he answers himself in On a Happy Life.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "His gardens, villas, lands, possessions, and incredible sums of money, are agreed upon at all hands; which drew an envy upon him.",
          "chunkId": "d121b070-c349-4829-98a6-dec39d547f55"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 126 (scholarship)",
          "excerpt": "Seneca’s powers and industry carried him to high political station, and greatly increased his inherited wealth.",
          "chunkId": "f1c8a155-93c6-4801-85db-746024829f51"
        },
        {
          "citation": "Seneca, On a Happy Life 21",
          "excerpt": "But how is it that this man studies philosophy and nevertheless lives the life of a rich man?",
          "chunkId": "3a9a625b-b87f-4eeb-a105-a780796055ab"
        },
        {
          "citation": "Tacitus, Annals 13.42; Cassius Dio 61.10",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Exiled to Corsica (41-49 CE) and later condemned and forced to suicide by Nero: exile and condemnation, level 1.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, Consolation to Helvia 18",
          "excerpt": "I shall make no complaints about my childlessness or my exile,",
          "chunkId": "6e147062-fcd3-4293-9898-6bea4c0cdde9"
        },
        {
          "citation": "St. George Stock, A Guide to Stoicism, chronology (scholarship)",
          "excerpt": "Seneca Exiled to Corsica 41 Recalled from exile 49 Forced by Nero to commit suicide 65",
          "chunkId": "62abcc20-fe70-4d82-a602-7e5110862515"
        },
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "Go back to him then, says Nero, and tell him, _that he is condemned to die_.",
          "chunkId": "f3ddfa99-da3b-4a5c-891a-799d07520132"
        },
        {
          "citation": "Tacitus, Annals 15.60-64",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0.67,
      "rationale": "He attended the Stoic Attalus as a young man, alongside the Pythagorean Sotion and Papirius Fabianus; the published score treats this as sustained but mixed contact.",
      "support": "excerpt",
      "concern": "Score may be wrong: the codebook's level 1 is 'trained directly under a recognized Stoic teacher'. Seneca calls Attalus 'the Stoic Attalus' and 'my master', describes attending his school daily (Letters 108.3), and Arnold calls Attalus 'his teacher' (sec. 126). That reads as 1. Keep 0.67 only if the codebook means a school head or a teacher of the first rank, or if the mixed influences (Sotion, Fabianus) are meant to pull it down; if so, say so in the codebook.",
      "evidence": [
        {
          "citation": "Seneca, Letters 108.3 (tr. Gummere)",
          "excerpt": "This was the advice, I remember, which Attalus gave me in the days when I practically laid siege to his class-room, the first to arrive and the last to leave.",
          "chunkId": "deb3aadb-66b2-48bb-b8fc-b1d4dc287cc9"
        },
        {
          "citation": "Seneca, Letters 67.15 (tr. Gummere)",
          "excerpt": "The Stoic Attalus was wont to say:",
          "chunkId": "e651d452-6781-4fb8-a3bd-c7618f5469c4"
        },
        {
          "citation": "Seneca, Letters 81.22 (tr. Gummere)",
          "excerpt": "My master Attalus used to say:",
          "chunkId": "b0c92c77-827e-4204-8e23-38316869a75b"
        },
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "He was a great hearer of the celebrated men of those times; as Attalus, Sotion, Papirius, Fabianus,",
          "chunkId": "efefcd29-d721-4d72-8456-db7fd3986fff"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "His career was in public life: the bar, the quaestorship and praetorship, and Nero's service. He wrote and advised pupils but did not teach philosophy for a living.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 126 (scholarship)",
          "excerpt": "In an age when a governmental career was freely open to talent, Seneca’s powers and industry carried him to high political station",
          "chunkId": "f1c8a155-93c6-4801-85db-746024829f51"
        },
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "His father was not at all pleased with his humor of _philosophy_, but forced him upon the _law_, and for a while he practiced _pleading_.",
          "chunkId": "efefcd29-d721-4d72-8456-db7fd3986fff"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 1,
      "rationale": "He served at the emperor's pleasure as Nero's tutor and minister, and was dismissed and killed at that pleasure. On Clemency is addressed to Nero.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Roger L'Estrange, 'Seneca's Life and Death' (preface to Seneca's Morals, after Lipsius, paraphrasing Tacitus; secondary, early modern; corpus labels it author Seneca, work Morals)",
          "excerpt": "Being Nero’s tutor and governor, all things were well so long as Nero followed his counsel.",
          "chunkId": "efefcd29-d721-4d72-8456-db7fd3986fff"
        },
        {
          "citation": "Seneca, On Clemency 1.1",
          "excerpt": "I have determined to write a book upon clemency, Nero Caesar, in order that I may as it were serve as a mirror to you,",
          "chunkId": "a390ff9a-e243-4e32-bbcf-858ea2f4ae65"
        },
        {
          "citation": "Seneca, Consolation to Polybius 13",
          "excerpt": "even from the corner in which I am confined his mercy has unearthed and restored to light many exiles",
          "chunkId": "d3385a55-84e0-4072-ac7b-b851adf30f64",
          "note": "Shows dependence on the emperor's favour."
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.33,
      "rationale": "Contemporaries charged him with talking one way and living another, above all about his wealth; he records and answers the charge himself, and Augustine repeats a version of it. His death scene and Arnold's defence pull the other way, which is why the case is contested.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Seneca, On a Happy Life 18",
          "excerpt": "“You talk one way,” objects our adversary, “and live another.”",
          "chunkId": "6e58f757-3da4-47df-bf9f-31e37d941de3"
        },
        {
          "citation": "Seneca, On a Happy Life 21",
          "excerpt": "Why does he say that wealth ought to be despised and yet possess it?",
          "chunkId": "3a9a625b-b87f-4eeb-a105-a780796055ab"
        },
        {
          "citation": "Augustine, City of God 6.10",
          "excerpt": "It was in part possessed by him, I say, for he possessed it in writing, but not in living.",
          "chunkId": "e2eca72d-5d9f-456a-bfb9-8e3863dcd3bc"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sec. 126 (scholarship; counter-evidence)",
          "excerpt": "But if he did not imitate the unbending stiffness of Cato, we have still no reason to credit the personal calumnies that pursued him at court.",
          "chunkId": "f1c8a155-93c6-4801-85db-746024829f51"
        },
        {
          "citation": "Tacitus, Annals 13.42 (Suillius' charges); Cassius Dio 61.10",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Thrasea Paetus": {
    "POW": {
      "scoredAs": 1,
      "rationale": "Scored 1 for consular authority: he was suffect consul in 56 CE. The corpus only places him among men of high position in imperial Rome; the consulship itself rests on Tacitus and the consular fasti, which are not in the corpus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them, but outside this inner circle there were many men of high position and distinction in imperial Rome, men like Paetus Thrasea and Helvidius Priscus, who",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        },
        {
          "citation": "Tacitus, Annals 16.21-22 (Thrasea as consular senator); consular fasti for 56 CE",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Propertied elite: a senator of consular rank necessarily met the senatorial census. Nothing in the corpus speaks to his property; Tacitus (gardens and household at his death) is not in the corpus.",
      "support": "citation_only",
      "evidence": [
        {
          "citation": "Tacitus, Annals 16.34 (Thrasea in his gardens with guests at the arrival of the death sentence)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Condemnation: Nero had him put to death (forced suicide in 66 CE). Plutarch records the killing; Hicks places him among those who sealed their lives with their blood.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Plutarch, Political Precepts (Moralia; Goodwin ed., Essays and Miscellanies vol. 5)",
          "excerpt": "as Nero himself, a little before he put to death Thraseas, whom of all men he both most hated and feared, when one accused him for giving a wrong and unjust sentence, said: I wish Thraseas was but as great a lover of me, as he is a most upright judge.",
          "chunkId": "5c0b8c04-ebe0-477c-a0da-31a0be4a60aa"
        },
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 114 (scholarship; continues the sentence of p. 113)",
          "excerpt": "took part in the philosophic propaganda and were prepared to seal the testimony of their lives with their blood.",
          "chunkId": "3d4f1906-e7ea-4624-a264-287f97452a18"
        },
        {
          "citation": "Tacitus, Annals 16.21-35 (prosecution, senate condemnation, death)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0.33,
      "rationale": "Indirect or mixed influence: no Stoic teacher is named for him. Epictetus records an exchange between Thrasea and Rufus (Musonius Rufus), which shows contact with a Stoic teacher but not training under him; at his death his companion was Demetrius the Cynic (Tacitus, not in corpus).",
      "support": "excerpt",
      "concern": "Score may be wrong (weak, suggest keep): Epictetus 1.1.26-27 shows a direct philosophical exchange between Thrasea and Musonius Rufus. If read as sustained contact with a Stoic mentor this would fit 0.67, but it is a single anecdote and no teacher is named, so 0.33 remains defensible.",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.1.26-27 (tr. George Long)",
          "excerpt": "Thrasea12 used to say, I would rather be killed today than banished tomorrow. What then did Rufus13 say to him? If you choose death as the heavier misfortune, how great is the folly of your choice?",
          "chunkId": "05cdf1ab-816e-4733-99ff-eb2808c147fe"
        },
        {
          "citation": "Tacitus, Annals 16.34-35 (Demetrius the Cynic at his death)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "Career in public life, not a teacher of philosophy. Hicks explicitly sets him outside the circle of professional teachers like Epictetus and Musonius, among men of high position.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them, but outside this inner circle there were many men of high position and distinction in imperial Rome, men like Paetus Thrasea and Helvidius Priscus, who",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "Opposed the throne rather than serving at the pleasure of the emperor. Hicks names him as the type of the Stoic in opposition; Plutarch says Nero both hated and feared him above all men.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, pp. 369-370 (scholarship)",
          "excerpt": "The most eminent Stoics were usually found in the ranks of the opposition, carrying on against the Caesars the hopeless struggle to which as a party and a sect they had been committed by Cato of Utica. But whether in opposition like Thrasea or in office like Seneca",
          "chunkId": "7f24c997-8398-48a9-b3f4-e33450ffd705"
        },
        {
          "citation": "Plutarch, Political Precepts (Moralia; Goodwin ed., Essays and Miscellanies vol. 5)",
          "excerpt": "as Nero himself, a little before he put to death Thraseas, whom of all men he both most hated and feared, when one accused him for giving a wrong and unjust sentence, said: I wish Thraseas was but as great a lover of me, as he is a most upright judge.",
          "chunkId": "5c0b8c04-ebe0-477c-a0da-31a0be4a60aa"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "Life matched the doctrine under a real test: he chose death over submission and became an exemplar for later Stoics, including Marcus Aurelius. Even Nero is reported to have called him a most upright judge.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 114 (scholarship; continues the sentence of p. 113)",
          "excerpt": "took part in the philosophic propaganda and were prepared to seal the testimony of their lives with their blood.",
          "chunkId": "3d4f1906-e7ea-4624-a264-287f97452a18"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.14 (tr. George Long)",
          "excerpt": "through him I learned to know Thrasea, Helvidius, Cato, Dion, Brutus",
          "chunkId": "021a1db2-05c7-400d-91d3-6904db5389a7"
        },
        {
          "citation": "Epictetus, Discourses 1.1.26-27 (tr. George Long)",
          "excerpt": "Thrasea12 used to say, I would rather be killed today than banished tomorrow. What then did Rufus13 say to him? If you choose death as the heavier misfortune, how great is the folly of your choice?",
          "chunkId": "05cdf1ab-816e-4733-99ff-eb2808c147fe"
        },
        {
          "citation": "Tacitus, Annals 16.21-35 (conduct at trial and death)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  },
  "Helvidius Priscus": {
    "POW": {
      "scoredAs": 0.67,
      "rationale": "Senior office: he was praetor in 70 CE. The corpus confirms he was a senator acting against Vespasian; the praetorship itself is in Tacitus, not in the corpus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.2.19-21 (tr. George Long)",
          "excerpt": "Priscus Helvidius21 also saw this, and acted conformably. For when Vespasian sent and commanded him not to go into the senate, he replied, “It is in your power not to allow me to be a member of the senate, but so long as I am, I must go in.”",
          "chunkId": "692d31ab-8e81-49cf-b1ba-c1c9fb801deb"
        },
        {
          "citation": "Tacitus, Histories 4.4-6 (praetor-designate and praetor, 69-70 CE)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 0.67,
      "rationale": "Propertied elite by virtue of senatorial rank. Nothing in the corpus speaks to his property; Tacitus (Histories 4.5) gives his origin as the son of a senior centurion from Cluviae, i.e. a family that rose into the senate.",
      "support": "citation_only",
      "evidence": [
        {
          "citation": "Tacitus, Histories 4.5 (origin and family)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 1,
      "rationale": "Exile and condemnation: banished and later put to death under Vespasian. Epictetus records Vespasian's threat of death and his answer, and later refers to his murderer.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.2.19-21 (tr. George Long)",
          "excerpt": "“But if you do, I shall put you to death.” “When then did I tell you that I am immortal? You will do your part, and I will do mine: it is your part to kill; it is mine to die, but not in fear: yours to banish me; mine to depart without sorrow.”",
          "chunkId": "692d31ab-8e81-49cf-b1ba-c1c9fb801deb"
        },
        {
          "citation": "Epictetus, Discourses 4.1.123 (tr. George Long)",
          "excerpt": "“Nor did Helvidius655 at Rome fare badly?”⁠—No; but his murderer did.",
          "chunkId": "1bf8754d-9a0b-4c4c-86a9-b64f2064be13"
        },
        {
          "citation": "Suetonius, Vespasian 15 (relegation and execution)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Tacitus, Annals 16.33 (first exile, after Thrasea's condemnation)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 0.33,
      "rationale": "Indirect or mixed influence: no Stoic teacher is named. Hicks counts him among the men of high position who took part in the philosophic movement, but the corpus records no training under a recognised teacher.",
      "support": "excerpt",
      "concern": "Score may be wrong (weak, suggest keep): Tacitus, Histories 4.5 (not in corpus) says he studied philosophy in his youth under teachers of the Stoic view. That is direct Stoic training, which could support 0.67, but with no named recognised teacher 0.33 is a reasonable reading.",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them, but outside this inner circle there were many men of high position and distinction in imperial Rome, men like Paetus Thrasea and Helvidius Priscus, who",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        },
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 114 (scholarship; continues the sentence of p. 113)",
          "excerpt": "took part in the philosophic propaganda and were prepared to seal the testimony of their lives with their blood.",
          "chunkId": "3d4f1906-e7ea-4624-a264-287f97452a18"
        },
        {
          "citation": "Tacitus, Histories 4.5 (as a young man devoted himself to philosophy, following teachers who held virtue the only good; teacher unnamed)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "Career in public life (senator, praetor). Hicks places him outside the inner circle of professional teachers.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, ch. IV, p. 113 (scholarship)",
          "excerpt": "Professional teachers like Epictetus and his master Musonius Rufus devoted their whole lives to the task of instructing all who were willing to hear them, but outside this inner circle there were many men of high position and distinction in imperial Rome, men like Paetus Thrasea and Helvidius Priscus, who",
          "chunkId": "c5fd4375-9268-458f-aeff-c47a2b17f5ce"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "Opposed the throne: Epictetus shows him defying Vespasian's order to stay out of the senate and to stay silent.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.2.19-21 (tr. George Long)",
          "excerpt": "Priscus Helvidius21 also saw this, and acted conformably. For when Vespasian sent and commanded him not to go into the senate, he replied, “It is in your power not to allow me to be a member of the senate, but so long as I am, I must go in.”",
          "chunkId": "692d31ab-8e81-49cf-b1ba-c1c9fb801deb"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 1,
      "rationale": "Life matched the doctrine under a real test: Epictetus presents him as acting in accordance with what he saw, facing death without fear, and as an example to others; Marcus Aurelius lists him among the exemplars.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Epictetus, Discourses 1.2.19-21 (tr. George Long)",
          "excerpt": "Priscus Helvidius21 also saw this, and acted conformably. For when Vespasian sent and commanded him not to go into the senate, he replied, “It is in your power not to allow me to be a member of the senate, but so long as I am, I must go in.”",
          "chunkId": "692d31ab-8e81-49cf-b1ba-c1c9fb801deb"
        },
        {
          "citation": "Epictetus, Discourses 1.2.19-21 (tr. George Long)",
          "excerpt": "“But if you do, I shall put you to death.” “When then did I tell you that I am immortal? You will do your part, and I will do mine: it is your part to kill; it is mine to die, but not in fear: yours to banish me; mine to depart without sorrow.”",
          "chunkId": "692d31ab-8e81-49cf-b1ba-c1c9fb801deb"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.14 (tr. George Long)",
          "excerpt": "through him I learned to know Thrasea, Helvidius, Cato, Dion, Brutus",
          "chunkId": "021a1db2-05c7-400d-91d3-6904db5389a7"
        }
      ],
      "status": "drafted"
    }
  },
  "Marcus Aurelius": {
    "POW": {
      "scoredAs": 1,
      "rationale": "Supreme authority: Roman emperor 161-180 CE. Arnold calls him first of all a Roman prince and chief representative of Rome's institutions.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "W.L. Davidson, The Stoic Creed, pp. 34-35 (scholarship)",
          "excerpt": "M. Aurelius Antoninus (born 121 A.D. ; Emperor, 161-180 A.D.).",
          "chunkId": "6ba8a115-522a-4101-8739-ff09174e49ee"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 136 (scholarship)",
          "excerpt": "Aurelius was in the first instance a Roman prince; to the institutions of Rome and to his own position as their chief representative he owed his chief allegiance.",
          "chunkId": "2e853fab-afb2-439c-97ea-d781aa0aa3cd"
        }
      ],
      "status": "drafted"
    },
    "WLTH": {
      "scoredAs": 1,
      "rationale": "Among the richest of his society: raised in the imperial household and emperor himself. Meditations 1.17 speaks of life in a palace, and 1.3 implies a family whose normal habits were those of the rich.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Marcus Aurelius, Meditations 1.17 (tr. George Long)",
          "excerpt": "that I was subjected to a ruler and father who was able to take away all pride from me, and to bring me to the knowledge that it is possible for a man to live in a palace without wanting either guards or embroidered dresses, or torches and statues, and such-like show",
          "chunkId": "7ef2f3ab-aeb0-4079-a18a-1aff3cfa8b15"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.3 (tr. George Long)",
          "excerpt": "simplicity in my way of living, far removed from the habits of the rich.",
          "chunkId": "645c0657-82d5-41d4-a03a-05a52915055a"
        }
      ],
      "status": "drafted"
    },
    "ADV": {
      "scoredAs": 0.67,
      "rationale": "Major illness: he records thanks for remedies against spitting of blood and giddiness, and that his body held out; he also wrote in the field at Carnuntum during the northern wars. The loss of children and the revolt of Avidius Cassius are in Cassius Dio and the Historia Augusta, not in the corpus.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Marcus Aurelius, Meditations 1.17 (tr. George Long)",
          "excerpt": "that remedies have been shown to me by dreams, both others, and against bloodspitting and giddiness",
          "chunkId": "7ef2f3ab-aeb0-4079-a18a-1aff3cfa8b15"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.17 (tr. George Long)",
          "excerpt": "that my body has held out so long in such a kind of life",
          "chunkId": "7ef2f3ab-aeb0-4079-a18a-1aff3cfa8b15"
        },
        {
          "citation": "Marcus Aurelius, Meditations 2.17 (closing note, 'This in Carnuntum') (tr. George Long)",
          "excerpt": "This in Carnuntum.",
          "chunkId": "91d589f4-e634-4a3b-bb13-d76e1cd70273"
        },
        {
          "citation": "Cassius Dio 72 (wars, plague, revolt of Avidius Cassius)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        },
        {
          "citation": "Historia Augusta, Life of Marcus (deaths of children)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    },
    "TEACH": {
      "scoredAs": 1,
      "rationale": "Trained directly under recognised Stoic teachers: Junius Rusticus, who gave him Epictetus's discourses, and Apollonius. Arnold places Rusticus in the succession of Stoic teachers after Arrian.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "Marcus Aurelius, Meditations 1.7 (tr. George Long)",
          "excerpt": "I am indebted to him for being acquainted with the discourses of Epictetus, which he communicated to me out of his own collection.",
          "chunkId": "72b1afa1-fffe-425f-909b-8c36db2d5091"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.8 (tr. George Long)",
          "excerpt": "From Apollonius I learned freedom of will and undeviating steadiness of purpose; and to look to nothing else, not even for a moment, except to reason",
          "chunkId": "b57e158f-fa00-4357-8e14-cea449d80828"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.17 (tr. George Long)",
          "excerpt": "that I knew Apollonius, Rusticus, Maximus",
          "chunkId": "7ef2f3ab-aeb0-4079-a18a-1aff3cfa8b15"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 135 (scholarship)",
          "excerpt": "After Arrian had given up the teaching of philosophy for public life Q. JUNIuS RusTICUS succeeded to the conse position he left vacant.",
          "chunkId": "81f0ffaa-24ec-425d-9cb9-beb2a93a4005"
        },
        {
          "citation": "St. George Stock, A Guide to Stoicism, Dates and Authorities (scholarship)",
          "excerpt": "Q Junius Rusticus ... Cos 162 Teacher of M Aurelius who learnt from him to appreciate Epictetus M Aurelius Antoninus Emperor ... 161-180",
          "chunkId": "62abcc20-fe70-4d82-a602-7e5110862515"
        }
      ],
      "status": "drafted"
    },
    "PROF": {
      "scoredAs": 0,
      "rationale": "Career in public life as emperor; philosophy was the occupation of his leisure hours, not his profession.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 136 (scholarship)",
          "excerpt": "He was fairly well instructed, but by no means learned, in its doctrines; he adhered with sincerity, but without ardour, to its practical precepts. In the leisure hours of a busy life it was his comfort and his relaxation to express his musings in the form of philosophic reflections.",
          "chunkId": "2e853fab-afb2-439c-97ea-d781aa0aa3cd"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 136 (scholarship)",
          "excerpt": "Aurelius was in the first instance a Roman prince; to the institutions of Rome and to his own position as their chief representative he owed his chief allegiance.",
          "chunkId": "2e853fab-afb2-439c-97ea-d781aa0aa3cd"
        }
      ],
      "status": "drafted"
    },
    "COURT": {
      "scoredAs": 0,
      "rationale": "He was the monarch, so he did not serve at another's pleasure. Before his accession he lived at court under Antoninus (Meditations 1.17, 6.12), but the codebook scores the monarch 0.",
      "support": "excerpt",
      "evidence": [
        {
          "citation": "W.L. Davidson, The Stoic Creed, pp. 34-35 (scholarship)",
          "excerpt": "M. Aurelius Antoninus (born 121 A.D. ; Emperor, 161-180 A.D.).",
          "chunkId": "6ba8a115-522a-4101-8739-ff09174e49ee"
        },
        {
          "citation": "Marcus Aurelius, Meditations 6.12 (tr. George Long)",
          "excerpt": "Let the court and philosophy now be to thee step-mother and mother",
          "chunkId": "b7ab5b18-51f6-4f24-acca-b1e25de21947"
        },
        {
          "citation": "Marcus Aurelius, Meditations 1.17 (tr. George Long)",
          "excerpt": "that I was subjected to a ruler and father who was able to take away all pride from me, and to bring me to the knowledge that it is possible for a man to live in a palace without wanting either guards or embroidered dresses, or torches and statues, and such-like show",
          "chunkId": "7ef2f3ab-aeb0-4079-a18a-1aff3cfa8b15"
        }
      ],
      "status": "drafted"
    },
    "CONS": {
      "scoredAs": 0.67,
      "rationale": "Broadly consistent with minor criticism. The published reason, the succession of Commodus, rests on Cassius Dio and the Historia Augusta, which are not in the corpus. The corpus criticism is Arnold's: lukewarm adherence and persecution of Christians; Davidson and Hicks praise his practice.",
      "support": "excerpt",
      "concern": "Score may be wrong (weak, suggest keep): the corpus scholarship leans toward 1. Davidson calls him a brilliant example of practice conforming to precept and Hicks says his example outweighed his precepts. The only corpus criticism is Arnold (sincere but without ardour; the sword, the cross and the stake for 'atheists'). The Commodus reason for 0.67 is not supported by any corpus text. 0.67 is defensible as 'minor criticism', but the corpus alone would support 1.",
      "evidence": [
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 138 (scholarship)",
          "excerpt": "One further argument, he held in reserve; the sword, the cross, and the stake for the ‘atheists’ who refused to be convinced. He was, after all, a king™®.",
          "chunkId": "44b33b35-8257-4369-b9da-b9a14e50b75d"
        },
        {
          "citation": "E. Vernon Arnold, Roman Stoicism, sect. 136 (scholarship)",
          "excerpt": "He was fairly well instructed, but by no means learned, in its doctrines; he adhered with sincerity, but without ardour, to its practical precepts. In the leisure hours of a busy life it was his comfort and his relaxation to express his musings in the form of philosophic reflections.",
          "chunkId": "2e853fab-afb2-439c-97ea-d781aa0aa3cd"
        },
        {
          "citation": "W.L. Davidson, The Stoic Creed, p. 33 (scholarship)",
          "excerpt": "we have Epictetus and Marcus Aurelius, who are brilliant examples to all ages of practice conforming to precept.",
          "chunkId": "656f542f-6f56-4cda-8539-16b926ca45d5"
        },
        {
          "citation": "R.D. Hicks, Stoic and Epicurean, p. 141 (scholarship)",
          "excerpt": "This duty is especially emphasised by Marcus Aurelius, whose example far outweighed his precepts, for he wore himselfout in the toils andlabours of his imperial office.",
          "chunkId": "7b29fb01-77c3-421a-8678-9eea6cf9a53f"
        },
        {
          "citation": "Marcus Aurelius, Meditations 6.30 (tr. George Long)",
          "excerpt": "Take care that thou art not made into a Caesar, that thou art not dyed with this dye; for such things happen.",
          "chunkId": "f51bbfc9-e304-4174-a694-a7e4423d7d30"
        },
        {
          "citation": "Cassius Dio 72.36 and Historia Augusta, Life of Marcus (Commodus made co-emperor and successor)",
          "excerpt": null,
          "chunkId": null,
          "note": "source not in corpus"
        }
      ],
      "status": "drafted"
    }
  }
};
