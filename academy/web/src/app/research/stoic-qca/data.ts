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
