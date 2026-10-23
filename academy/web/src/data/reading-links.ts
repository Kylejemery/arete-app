// Where a Required Reading row can be read.
//
// Primary texts in the corpus open in the Library reader at the passage:
// /library?chunk=<rag_corpus id> lands on the chunk the cited section begins
// in (the reader looks the chunk's page up, so the link survives re-paging),
// and text=Author::Work opens the work instead if that chunk is ever
// deprecated. Works whose rows carry no section labels open at the start.
// Each link goes to the first passage a row cites.
//
// Modern scholarship is linked to its DOI or publisher page, never to a copy.
//
// Rows with no entry (texts not yet in the corpus, such as Sextus and the
// Aristotelian commentators, and the student's own material) show no link.
// The table is keyed on the row's exact source and passage text, so a row
// whose wording changes loses its link until its entry is updated.

type CorpusLink = [text: string, chunk?: string, quote?: string];

const CORPUS_LINKS: Record<string, CorpusLink> = {
  // PHIL 702
  "Marcus Aurelius || Meditations I.1–17 (complete — the acknowledgements)": ["Marcus Aurelius::Meditations", '1022bf4d-c0d0-4e0a-9361-7c80438e33c7'],
  "Marcus Aurelius || Meditations II (complete)": ["Marcus Aurelius::Meditations", '4b544a66-2eae-4c9d-b164-9b7c1cab7faa'],
  "Marcus Aurelius || Meditations III (complete); IV.1–10": ["Marcus Aurelius::Meditations", '91d8797d-4d6b-4100-9c75-01659c9311b9'],
  "Marcus Aurelius || Meditations IV.11–51; V.1–8": ["Marcus Aurelius::Meditations", 'f1ab168d-376a-4e96-b154-7c91a25eca09'],
  "Marcus Aurelius || Meditations V.9–36; VI.1–20": ["Marcus Aurelius::Meditations", 'd4861da6-c46d-43be-9dba-6b8b67017ff2'],
  "Marcus Aurelius || Meditations VI.21–54; VII.1–20": ["Marcus Aurelius::Meditations", '0453d745-6e2d-4a2c-90e7-509791c19a9c'],
  "Marcus Aurelius || Meditations VII.21–75; VIII.1–20": ["Marcus Aurelius::Meditations", 'dbc18deb-c137-415f-beb5-144d9b953352'],
  "Marcus Aurelius || Meditations VIII.21–61; IX (selected)": ["Marcus Aurelius::Meditations", '47b5916b-1c13-4c00-814a-e22b5002dfc8'],
  "Marcus Aurelius || Meditations X–XI (selected passages)": ["Marcus Aurelius::Meditations", '14de9367-3224-48b5-adcd-2c126efaeeaa'],
  "Marcus Aurelius || Meditations XI.18 (the ten heads against anger)": ["Marcus Aurelius::Meditations", '922c3fbd-3575-4a11-9481-d5b70908d6f6'],
  "Marcus Aurelius || Meditations XII (complete — the final book)": ["Marcus Aurelius::Meditations", '3920712e-2927-43d5-bcbf-afa189480458'],
  // PHIL 703
  "Epictetus || Discourses I.1–2 (complete)": ["Epictetus::Discourses", 'a7ad78d9-b194-4488-b36c-bf4047a08348'],
  "Epictetus || Encheiridion (complete — re-read from PHIL 701)": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Epictetus || Discourses I.4 (on progress); I.11 (on family affection)": ["Epictetus::Discourses", '74c12065-d801-4441-b1ed-54ad14506898'],
  "Epictetus || Discourses I.17–20 (on logic and life)": ["Epictetus::Discourses", '6ac645b1-47db-48aa-9fd7-924e33c884c7'],
  "Epictetus || Discourses I.28 (that we should not be angry with men)": ["Epictetus::Discourses", 'dea7b615-8cb2-4fae-abf2-3eae8fa22f39'],
  "Epictetus || Discourses II.1–5 (on freedom and the good)": ["Epictetus::Discourses", 'a64596e9-fa82-49f0-be75-7a699d30dfd8'],
  "Epictetus || Discourses II.8–10 (on character and roles)": ["Epictetus::Discourses", 'a5be4793-e4d3-4dfe-9e26-e6d0c0184606'],
  "Epictetus || Discourses II.14–18 (on society and the Cynic)": ["Epictetus::Discourses", '306bf727-b488-4889-8c58-ad5fcaa74ebc'],
  "Epictetus || Discourses III.1–5 (on God and nature)": ["Epictetus::Discourses", '6c74e73c-4d59-4c2c-b56c-e9c425481315'],
  "Epictetus || Discourses III.22–24 (the Cynic and the philosopher)": ["Epictetus::Discourses", '31064731-97d6-4a8b-b679-95c7b819317c'],
  "Epictetus || Discourses IV.1 (complete — on freedom; the longest discourse)": ["Epictetus::Discourses", '89af926d-92e7-41b9-9eac-0d7ff9ff1419'],
  "Epictetus || Encheiridion (complete — read as a unified text, not passage by passage)": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  // PHIL 704
  "Seneca || Epistulae Morales Ep. 1–5 (complete)": ["Seneca::Letters", '9622a69e-ea3f-438a-8d79-b24c0974a9ec'],
  "Seneca || Epistulae Morales Ep. 6–12 (complete)": ["Seneca::Letters", '0319357a-0db8-4e7e-a2d2-b9abf077089f'],
  "Seneca || Epistulae Morales Ep. 41, 47 (complete)": ["Seneca::Letters", '260386f9-6eb6-4850-84e5-2ef61b0f3f85'],
  "Seneca || Epistulae Morales Ep. 70, 77 (complete)": ["Seneca::Letters", 'b9c0abc8-f839-465c-a744-2951f37ba31d'],
  "Seneca || Epistulae Morales Ep. 90, 92 (complete)": ["Seneca::Letters", '20f6917e-edc0-4e7b-9b98-d74924c266c0'],
  "Seneca || De Brevitate Vitae (complete)": ["Seneca::On the Shortness of Life", 'daa38ee9-031e-4f6a-a4f2-f0a33e6b6928'],
  "Seneca || De Tranquillitate Animi (complete)": ["Seneca::On Peace of Mind", 'd12ac1fd-8ab8-4952-884e-43dd6269f1ce'],
  "Seneca || De Providentia (complete)": ["Seneca::On Providence", '44ba44f7-5b1f-4615-a8b5-1575114bf404'],
  "Seneca || De Vita Beata (complete)": ["Seneca::On a Happy Life", 'b4976870-3fc1-442c-ab24-b178e685502a'],
  "Seneca || De Clementia I (complete)": ["Seneca::Clemency", '89e4f25c-b906-4b9e-873b-1a92e708ec9a'],
  "Seneca || Epistulae Morales Ep. 124 (complete — on virtue and the good)": ["Seneca::Letters", '4d29dbaa-736d-46a7-aa9a-123a07d4f7b6'],
  // PHIL 706
  "Plato || Protagoras 352a–358d (no one is overcome by pleasure against knowledge)": ["Plato::Protagoras"],
  "Plato || Gorgias 466d–468e (tyrants do what seems best, not what they will)": ["Plato::Gorgias"],
  "Plato || Meno 77b–78b (no one desires bad things)": ["Plato::Meno"],
  "Epictetus || Discourses 1.18 (that we should not be angry with those who err)": ["Epictetus::Discourses", '6f1c56e5-c295-4357-b85f-76437d3acbc4'],
  "Epictetus || Discourses 1.28 (that we should not be angry with humanity)": ["Epictetus::Discourses", 'dea7b615-8cb2-4fae-abf2-3eae8fa22f39'],
  "Epictetus || Discourses 2.26 (every error involves a contradiction the agent doesn't see)": ["Epictetus::Discourses", '767598ce-8dab-4374-9dfe-b14b861a3027'],
  "Epictetus || Enchiridion 42": ["Epictetus::Enchiridion", '29f273c5-9a6d-4b96-93a6-31a39c558918'],
  "Seneca || De Ira 1.1–1.4 (the portrait of anger)": ["Seneca::On Anger", '11b2739c-41be-4e31-adcf-4e54219d6703'],
  "Seneca || De Ira 2.1–2.4 (the two-movements doctrine: first motion vs. assent)": ["Seneca::On Anger", '2935087f-84ca-45ce-b3af-28fa4c6f8582'],
  "Aulus Gellius || Attic Nights 19.1 (the Stoic in the storm — pallor without passion)": ["Gellius::Attic Nights"],
  "Seneca || De Ira 1.5–1.21 (refutation of Aristotle; anger not useful in war, punishment, or greatness of soul)": ["Seneca::On Anger", '9c501e3c-6cd4-40ca-810c-201d5f8e7f6b'],
  "Seneca || De Ira 3.5–3.6 (anger's costs to the angry)": ["Seneca::On Anger", '901dccbc-0ec0-4653-8667-0b42b7a1a292'],
  "Marcus Aurelius || Meditations 2.1, 7.22, 7.26, 8.14, 11.18 (the daily rehearsal of the doctrine)": ["Marcus Aurelius::Meditations", '4b544a66-2eae-4c9d-b164-9b7c1cab7faa'],
  "Epictetus || Discourses 1.28 revisited (Medea as the limit case)": ["Epictetus::Discourses", 'dea7b615-8cb2-4fae-abf2-3eae8fa22f39'],
  "Seneca || De Ira 2.18–2.36, 3.10–3.13 (delay, self-examination, remedies)": ["Seneca::On Anger", '1a20f6ab-dca8-4d63-9c76-4e54a8e0156f', 'Now that we have discussed the questions propounded concerning anger'],
  "Seneca || De Ira 3.36 (the nightly review — \"I sit in judgment on my day\")": ["Seneca::On Anger", '487ffe06-92a8-4680-9972-a969f09f245d'],
  "Marcus Aurelius || Meditations 2.1 (the morning rehearsal)": ["Marcus Aurelius::Meditations", '4b544a66-2eae-4c9d-b164-9b7c1cab7faa'],
  // PHIL 707
  "Epictetus || Discourses 2.18 (how impressions gain strength through habit)": ["Epictetus::Discourses", '671526df-342d-4dcc-91b0-c357b6c0adf3'],
  "Epictetus || Enchiridion 1, 45": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Epictetus || Discourses 4.12 (on attention)": ["Epictetus::Discourses", '6c97c9dc-2008-4982-9d76-1f314b42f8df'],
  "Seneca || Letters 2 (on scattered reading and restlessness — eerily current)": ["Seneca::Letters", '5e909dad-610b-4b6a-83da-eabdd0baa59a'],
  "Epictetus || Enchiridion 33, 48": ["Epictetus::Enchiridion", '31b73879-d65f-4cd0-8c01-4041c38ec2b8'],
  "Marcus Aurelius || Meditations 4.19, 8.44 (posthumous fame)": ["Marcus Aurelius::Meditations", 'dd3d3dd1-58c2-4cea-af46-6992abad1af2'],
  "Epictetus || Discourses 2.18 (habituation of desire)": ["Epictetus::Discourses", '671526df-342d-4dcc-91b0-c357b6c0adf3'],
  "Musonius Rufus || Lectures 18A–B (on food), 12 (on sexual indulgence)": ["Musonius Rufus::Lectures", 'af1ec21c-c309-4583-b6c9-3a34fa702b11'],
  "Seneca || Letters 83 (drunkenness)": ["Seneca::Letters", '06e62a2f-7da4-4d2f-b917-5f5141c8e16d'],
  "Seneca || Letters 16, 87, 108 (wealth and simplicity)": ["Seneca::Letters", '6f2df4ac-24d1-4c87-99b9-24c27d9bd088'],
  "Marcus Aurelius || Meditations 5.15": ["Marcus Aurelius::Meditations", '0969f560-0b49-4ad9-a4d8-1eac3aa60dd0'],
  "Epictetus || Enchiridion 44 (\"I am richer than you, therefore…\")": ["Epictetus::Enchiridion", '22387b97-3309-4207-a440-0ce150f2b148'],
  "Seneca || Letters 13 (we suffer more in imagination), 24": ["Seneca::Letters", 'aea8a188-3b75-4e11-a039-ee47ecc6d8b5'],
  "Epictetus || Discourses 1.28 (cross-reference from PHIL 706)": ["Epictetus::Discourses", 'dea7b615-8cb2-4fae-abf2-3eae8fa22f39'],
  "Marcus Aurelius || Meditations 2.1 applied to the political other": ["Marcus Aurelius::Meditations", '4b544a66-2eae-4c9d-b164-9b7c1cab7faa'],
  "Epictetus || Discourses 2.22 (on friendship — only the good can be friends)": ["Epictetus::Discourses", 'c6dce522-e99b-4b47-b94c-894ba35826a9'],
  "Seneca || Letters 3, 9 (friendship and self-sufficiency)": ["Seneca::Letters", '18f61129-b494-4352-950a-c0047d5d102b'],
  "Musonius Rufus || Lecture 13A (companionship in marriage)": ["Musonius Rufus::Lectures", 'e999b495-120f-4bed-9da8-1d92ae6775eb'],
  "Seneca || Letters 18 (set aside days for practice)": ["Seneca::Letters", 'efac5c6b-866b-4f8e-bc5a-4c4e99cb9630'],
  "Musonius Rufus || Lectures 6–7 (training)": ["Musonius Rufus::Lectures", '3aaf59c8-a027-47d3-ae5c-034bcb3d6420'],
  "Epictetus || Discourses 3.12 (askēsis rightly understood)": ["Epictetus::Discourses", 'e4d25187-99ba-430c-9eb9-40c5c408e3ba'],
  // PHIL 801
  "Diogenes Laertius || Lives VII.76-83 (Hicks)": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '0b12119b-5019-4600-98b9-20bc2cc1139a'],
  "Diogenes Laertius || Lives VII.63-70": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", 'ccd12ad3-a59d-4677-b77f-629cc660b865'],
  "Diogenes Laertius || Lives VII.71-74": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '0188bfdf-30f2-4517-8244-1fa27d5ae588'],
  "Cicero || De Fato 12-15; Academica II.143": ["Cicero::De Fato", '893c3cd5-7d9b-487b-8c83-429b10e42861'],
  "Epictetus || Discourses II.19.1-5": ["Epictetus::Discourses", 'e2bb3346-e979-4736-a8f3-17560de15922'],
  "Diogenes Laertius || Lives VII.75": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '0b12119b-5019-4600-98b9-20bc2cc1139a'],
  "Plutarch || On Stoic Self-Contradictions 1055d-f": ["Plutarch::On Stoic Self-Contradictions", '09a3ccf2-bdcb-49d9-9571-d4fb59b34c87'],
  "Diogenes Laertius || Lives VII.77-78, 195": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '0b12119b-5019-4600-98b9-20bc2cc1139a'],
  "Diogenes Laertius || Lives VII.79-81": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", 'f9d254ff-01b0-4b37-b98d-9d71132839a9'],
  "Diogenes Laertius || Lives VII.70, 75, 78, 187": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '0188bfdf-30f2-4517-8244-1fa27d5ae588'],
  "Cicero || Academica II.92-95": ["Cicero::Academica"],
  // PHIL 701
  "Epictetus || Encheiridion §§1–2 (complete)": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Diogenes Laertius || Lives VII.101–104 (on goods and indifferents)": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", 'f796fb00-33da-4e38-96ff-084da75b85d7'],
  "Epictetus || Encheiridion §§1, 5, 16, 20": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Epictetus || Discourses I.1 (complete)": ["Epictetus::Discourses", 'a7ad78d9-b194-4488-b36c-bf4047a08348'],
  "Epictetus || Encheiridion §§2, 4, 8, 14": ["Epictetus::Enchiridion", 'f294f5ba-fc0c-4512-98c3-a2c1e878c51f'],
  "Epictetus || Discourses III.2.1–5": ["Epictetus::Discourses", '95c629e9-a8de-4286-aa46-1e82996c69ab'],
  "Epictetus || Discourses II.10 (complete)": ["Epictetus::Discourses", '39150d42-5a7b-467e-8f99-0a590c5710f3'],
  "Epictetus || Encheiridion §§17, 24, 30": ["Epictetus::Enchiridion", '5e46a4d2-7503-4f1c-920c-e212901a9b4a'],
  "Epictetus || Encheiridion §§20, 34, 45": ["Epictetus::Enchiridion", 'c49c56b1-90f9-444f-bcfc-65d55caa1bf0'],
  "Epictetus || Discourses II.18 (complete)": ["Epictetus::Discourses", '671526df-342d-4dcc-91b0-c357b6c0adf3'],
  "Diogenes Laertius || Lives VII.110–116 (on the passions)": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", '9efd52c6-a4d0-405e-b36e-87d511212c4a'],
  "Epictetus || Discourses I.28 (complete)": ["Epictetus::Discourses", 'dea7b615-8cb2-4fae-abf2-3eae8fa22f39'],
  "Marcus Aurelius || Meditations IV.3 (complete); V.8; VI.2; IX.28": ["Marcus Aurelius::Meditations", '81c52c23-cddc-4f67-8bf4-3cda1ab3760f'],
  "Epictetus || Encheiridion §§8, 17, 53": ["Epictetus::Enchiridion", '3f1125c8-c3ca-4a2a-a9d5-d18f256a587f'],
  "Cleanthes || Hymn to Zeus (complete — about 39 lines)": ["Cleanthes::Hymn To Zeus"],
  "Epictetus || Discourses I.4 (complete)": ["Epictetus::Discourses", '74c12065-d801-4441-b1ed-54ad14506898'],
  "Seneca || Epistulae Morales Ep. 1 (complete)": ["Seneca::Letters", '9622a69e-ea3f-438a-8d79-b24c0974a9ec'],
  "Diogenes Laertius || Lives VII.84–89 (on the Stoic telos)": ["Diogenes Laërtius::Lives of Eminent Philosophers, Book VII", 'e624f24d-83d0-4efd-98d3-19457ace3554'],
  "Marcus Aurelius || Meditations V.1 (complete); VIII.7": ["Marcus Aurelius::Meditations", '5ad3e2b0-c5b7-4dc7-96a9-31a5e36a460f'],
  "Seneca || Epistulae Morales 33 (complete)": ["Seneca::Letters", '33d0f416-ed59-4b30-9368-807244fa4a33'],
  "Seneca || Epistulae Morales 84 (complete)": ["Seneca::Letters", '15d86d1d-b099-420d-a734-fee8dd585909'],
  "Epictetus || Encheiridion §49": ["Epictetus::Enchiridion", 'd7d629f2-7229-4f2b-9f7b-0f470423eedb'],
  "Review: Encheiridion §§1–2, 5, 8, 14, 17, 20, 53 || see text": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Review: Encheiridion §§1–5, 8, 17, 53; Discourses I.1, I.4 || see text": ["Epictetus::Enchiridion", 'd7bbd147-7ea2-4e29-83fc-36186f6e1211'],
  "Cicero || De Finibus III.16–22 and 41–48; IV.20–23": ["Cicero::De Finibus"],
  "Aristotle || Nicomachean Ethics I.8–10": ["Aristotle::Nicomachean Ethics"],
  "Cicero || De Fato 28–30, 40–43": ["Cicero::De Fato", 'd8ea8fd5-952c-41c3-9f58-105f3050a3e3'],
  "Plutarch || On Common Conceptions 1060B–1063 (selections)": ["Plutarch::Against the Stoics on Common Conceptions"],
  "Musonius Rufus || Lecture 5, 'Which is more effective, theory or practice?'": ["Musonius Rufus::Lectures", '8520da28-d4a4-4ac8-bd1c-013bf1640fd0'],
};

// Matched against "<source> <passage>"; first match wins. Each link was
// checked against Crossref or the publisher's page on 2026-10-23. No stable
// link was found for Sellars, The Art of Living; Nussbaum, Anger and
// Forgiveness; or Frede, Die stoische Logik, so those rows stay plain text.
const SCHOLARSHIP_LINKS: [RegExp, string][] = [
  [/Inner Citadel/, 'https://www.hup.harvard.edu/books/9780674007079'],
  [/PhWoL/, 'https://www.wiley.com/en-us/Philosophy+as+a+Way+of+Life%3A+Spiritual+Exercises+from+Socrates+to+Foucault-p-9780631180333'],
  [/^Long, Epictetus/, 'https://doi.org/10.1093/0199245568.001.0001'],
  // The Acumen 2006 edition the reading lists cite, now on Cambridge Core.
  [/^Sellars, Stoicism/, 'https://doi.org/10.1017/upo9781844653720'],
  [/^Sellars, Marcus Aurelius/, 'https://doi.org/10.4324/9780429052651'],
  [/Lessons in Stoicism/, 'https://www.penguin.co.uk/books/312681/lessons-in-stoicism-by-sellars-john/9780141990040'],
  // Princeton's 2009 updated edition; the 1994 printing has no DOI.
  [/Therapy of Desire/, 'https://doi.org/10.1515/9781400831944'],
  [/Stoic Syllogistic/, 'https://doi.org/10.1093/oso/9780198236702.003.0004'],
  // The whole "Logic" chapter (Barnes, Bobzien, Mignucci); her Stoic section has no DOI of its own.
  [/Cambridge History of Hellenistic Philosophy/, 'https://doi.org/10.1017/CHOL9780521250283.006'],
  [/Chrysippus' Modal Logic/, 'https://philpapers.org/rec/BOBCML'],
  [/Stoic Sequent Logic/, 'https://doi.org/10.1080/01445340.2019.1579624'],
  [/Epistemic Theory of Vagueness/, 'https://doi.org/10.1111/j.0066-7372.2003.00051.x'],
  [/Multiple Generality/, 'https://philpapers.org/rec/BOBSLA'],
  [/^Mates Stoic Logic/, 'https://doi.org/10.1525/9780520349070'],
  // The volume Doubt and Dogmatism; the essay has no record of its own.
  [/Proof Destroyed/, 'https://philpapers.org/rec/SDAD'],
  [/Connexive Implication/, 'https://doi.org/10.2307/2270458'],
  [/^Williamson Vagueness/, 'https://doi.org/10.4324/9780203014264'],
];

export function readingHref(r: { source: string; passage: string }): string | null {
  const corpus = CORPUS_LINKS[`${r.source} || ${r.passage}`];
  if (corpus) {
    const [text, chunk, quote] = corpus;
    const sp = new URLSearchParams();
    if (chunk) sp.set('chunk', chunk);
    if (quote) sp.set('q', quote);
    sp.set('text', text);
    return `/library?${sp.toString()}`;
  }
  const cite = `${r.source} ${r.passage}`;
  for (const [pattern, url] of SCHOLARSHIP_LINKS) if (pattern.test(cite)) return url;
  return null;
}
