# Arete Corpus Acquisition Plan

A standing policy for what enters the corpus and why. Version 2, September 2026. This document is meant to be revised as the corpus grows; the question set in Part 2 is the part that should change most often.

Part 3 is what to go and acquire. Part 4 is the standard for judging what arrives unbidden. Part 5 is what every ingest must record.

---

## Part 1: The diagnosis

The corpus holds 12,409 chunks across roughly 45 author identities. It is deep on Stoic ethics, deep on Plutarch, and increasingly good on Plato. Measured against what a corpus needs in order to generate philosophical insight rather than paraphrase, it has one structural problem and three hygiene problems.

**The structural problem: the corpus cannot argue with itself.**

Insight is not produced by accumulation. It is produced when two positions that actually contradict each other are both present in retrievable form, and something has to give. Your Tension Agent exists to hunt exactly this, and at present it has almost nothing to hunt with. The corpus contains the Stoic position on nearly every question it covers, and a serious opposing position on almost none. The only sustained critic in the whole corpus is Plutarch, who is ancient, Platonist, and there by accident of the Moralia being one large public domain file.

Concretely, the corpus can currently state the Stoic view that virtue suffices for happiness, that the cosmos is providentially ordered, that emotions are mistaken judgments, and that one should live according to nature. It cannot state, from a primary text, the Epicurean case that order is the product of blind necessity, the Academic case that certainty is unavailable, the Aristotelian case that external goods are necessary, the Augustinian case that Stoic apatheia is a form of pride, the Humean case that no ought follows from any is, or the Nietzschean case that "live according to nature" is an incoherent instruction. Every one of those is a canonical objection with a public domain English text available, and every one of them is absent.

This is what limits the Synthesis, Inquiry, Tension, and Dreaming agents. They are being asked to do philosophy with a library that agrees with itself.

**Hygiene problem one: provenance is incomplete.** `translator` is populated on 3,397 of 12,409 rows, 27 percent. `source_url` on 7,855, 63 percent. `word_count` on 1,941, 16 percent. For a corpus whose output is meant to be academically defensible, the translation a passage came from is not optional metadata. Stoic technical vocabulary varies so much between translators that the same doctrine is unrecognizable across two renderings, which is the entire reason the physics concordance was necessary.

**Hygiene problem two: passages are not citable.** `section_label` is populated on 96 percent of rows but is derived from filename segments and chunk position, not from the text's own divisions. A retrieved passage cannot currently be cited as *Discourses* 1.14.6 or *Meditations* 4.40. It can only be cited as a chunk. Anything the Scribe publishes on the strength of this corpus therefore has to be re-verified by hand against a real text, which is a permanent tax on every piece of writing the system supports.

**Hygiene problem three: the layer fields are unusable.** `source_type` is NULL on all 12,409 rows. `text_type` carries five values whose distinctions do not track anything real. This is covered in the remediation prompt and is not repeated here.

---

## Part 2: The organizing principle

**Acquire positions, not authors.**

The significance map currently models the corpus as a set of authors with chunk thresholds. That measures volume. A corpus can satisfy every threshold in that map and still be unable to state a single serious objection to itself.

The proposal is to add a second map alongside it: a set of canonical philosophical questions, the positions available on each, and which works in the corpus occupy each position and in what role. The roles are:

- **states** — the text sets out the position without defending it (a doxography, a summary)
- **defends** — the text argues for the position
- **attacks** — the text argues against it
- **complicates** — the text accepts the position but shows a cost, tension, or limit

The Coverage Gap Agent then reports on argumentative asymmetry rather than thin authors: "Q06 has four works defending and zero attacking." The Tension Agent gets a map to sample from instead of sampling blind. The Inquiry Agent can be told to pursue questions where the corpus holds positions but no text occupies the *complicates* role, which is where the genuinely interesting questions live.

The important property is that this improves as the corpus grows. Every text added gets registered against the questions it bears on, so the argumentative shape of the corpus is always legible, and the gaps that matter announce themselves.

### The initial question set

Fifteen questions. These are chosen because each one is genuinely contested, each one bears on the Arete curriculum, and each one has public domain texts on more than one side.

| ID | Question | Stoic position | Currently held opposition |
| --- | --- | --- | --- |
| Q01 | Is the cosmos rational and providentially ordered? | Yes; the cosmos is a living rational being | Plutarch only |
| Q02 | Is the soul corporeal? | Yes; only bodies act | None |
| Q03 | Can perception deliver certainty? | Yes; the cognitive impression is the criterion | Cicero *Academica* (partial) |
| Q04 | Does virtue suffice for happiness? | Yes | Cicero *De Finibus*, Aristotle *NE* (partial) |
| Q05 | Are emotions mistaken judgments, to be extirpated? | Yes | Plutarch only |
| Q06 | Can an ought be derived from nature? | Yes; physics grounds ethics | None |
| Q07 | Is moral responsibility compatible with fate? | Yes; assent is co-fated | None |
| Q08 | What is the relation of an individual mind to the whole? | A fragment of the divine reason | None |
| Q09 | Does the good life require fortune or external goods? | No | Aristotle (partial) |
| Q10 | Should the philosopher engage in politics? | Yes, with reservation | Contested within the corpus already |
| Q11 | What, if anything, survives death? | Dispersal into the elements | Plato (partial) |
| Q12 | Is mind fundamental or derivative of arrangement? | Pneuma is basic and graded | None |
| Q13 | Is the sage possible, and has anyone been one? | In principle yes, in fact almost never | Plutarch only |
| Q14 | Is philosophy a body of doctrine or a way of life? | A way of life | Contested; Hadot summaries only |
| Q15 | Are all wrongdoers acting in ignorance? | Yes; Socratic intellectualism | None |

Q06 deserves special notice. It is the crux of your whole project, it is the question the Scribe commission calls the crux, and the corpus currently holds no text that presses it. Hume's paragraph at *Treatise* III.i.1 and Nietzsche's attack at *Beyond Good and Evil* 9 are the two canonical statements of the objection, and both are free.

---

## Part 3: Acquisition list

All URLs verified September 2026. All items are public domain in the United States unless marked. Public domain here means the *translation* is pre-1931, not the composition.

### Tier A: removes the worst argumentative asymmetries

These are ordered by how much they change what the corpus can do, not by importance in the history of philosophy.

| Work | Questions | Source |
| --- | --- | --- |
| Nietzsche, *Beyond Good and Evil* (Zimmern 1907) | Q06, Q05, Q13, Q14 | `gutenberg.org/cache/epub/4363/pg4363.txt` |
| Hume, *Treatise of Human Nature* (Green & Grose) | Q06, Q05, Q03 | `.../53791/pg53791.txt` and `.../53792/pg53792.txt` |
| Lucretius, *De Rerum Natura* (Leonard 1916) | Q01, Q02, Q11, Q12 | `.../785/pg785.txt` |
| Augustine, *City of God* (Dods 1871) | Q05, Q01, Q10, Q13 | `.../45304/pg45304.txt` and `.../45305/pg45305.txt` |
| Aristotle, *De Anima* (Hicks 1907) | Q02, Q12 | `archive.org/download/aristotledeanim00hickgoog/aristotledeanim00hickgoog_djvu.txt` |
| Diogenes Laertius, *Lives*, complete (Yonge 1853) | Q01, Q04, Q10, Q11 | `.../57342/pg57342.txt` |
| Cicero, *De Divinatione*, *De Legibus*, *De Re Publica* (Yonge/Barham) | Q06, Q01, Q10 | `archive.org/download/treatisesofcicer00ciceuoft/treatisesofcicer00ciceuoft_djvu.txt` |
| Boethius, *Consolation of Philosophy* (James 1897) | Q01, Q07, Q09 | `.../14328/pg14328.txt` |
| Seneca, *Natural Questions* (Clarke 1910) | Q01, Q12, Q02 | `.../76392/pg76392.txt` |
| Nietzsche, *Genealogy of Morals* (Samuel 1913) | Q05, Q13, Q15 | `.../52319/pg52319.txt` |

Notes on Tier A:

The Diogenes Laertius file is the highest value per ingest on the whole list. One file gives Book 6 (the Cynics, which you have a personal interest in and the corpus has nothing on), Book 10 (Epicurus, including the Letter to Menoeceus and the Principal Doctrines, which is the entire Epicurean position in compressed form), and Books 1 through 5. Note that it is Yonge's translation and you already hold Hicks for Book 7, so decide deliberately whether to hold both renderings of Book 7 or to exclude Yonge's Book 7 at ingest. Holding both is defensible and arguably useful, since translator divergence on technical terms is itself philosophically informative, but it must be a decision rather than an accident.

The Cicero archive.org volume contains *De Legibus*, which is the natural law text and therefore the most direct ancient statement of the inference Q06 asks about. It is the pro-side text that Hume and Nietzsche need to be arguing against.

Augustine is the most consequential critic of Stoicism in the entire reception history and the corpus has none of him. *City of God* IX and XIV on the passions, and XIX on the happy life, are the load bearing books.

### Tier B: the modern metaphysics layer

The last session assumed this layer would require hand-fed Mode 2 summaries. It does not. Russell's *The Analysis of Matter* was released on Project Gutenberg in December 2025, and the rest of the backbone is likewise public domain and machine readable. This changes the economics of the panpsychism project considerably.

| Work | Questions | Source |
| --- | --- | --- |
| Russell, *The Analysis of Matter* (1927) | Q12, Q02 | `.../77427/pg77427.txt` |
| Eddington, *The Nature of the Physical World* (1928) | Q12, Q03 | `.../72963/pg72963.txt` |
| Whitehead, *Science and the Modern World* (1925) | Q12, Q01 | `.../68611/pg68611.txt` |
| James, *Principles of Psychology* (1890) | Q12, Q02, Q08 | `.../57628/pg57628.txt` and `.../57634/pg57634.txt` |
| James, *Varieties of Religious Experience* (1902) | Q08, Q14 | `.../621/pg621.txt` |
| Bergson, *Creative Evolution* (Mitchell 1911) | Q12, Q01 | `.../26163/pg26163.txt` |

This layer must be fenced from counselor and Dispatch retrieval before any of it is ingested. See the remediation prompt, Task 5.

Only the living authors now require Mode 2 summarization: Chalmers, Strawson, Goff, Shani, Nagasawa, Tononi, Hoffman. That is a much smaller manual burden than previously assumed, perhaps fifteen passages.

### Tier C: structural completeness

| Work | Questions | Source |
| --- | --- | --- |
| Spinoza, *Ethics* (Elwes 1883) | Q07, Q01, Q05 | `.../3800/pg3800.txt` |
| Kant, *Critique of Practical Reason* (Abbott) | Q06, Q07 | `.../5683/pg5683.txt` |
| Kant, *Fundamental Principles* (Abbott) | Q06 | `.../5682/pg5682.txt` |
| Hume, *Enquiry Concerning the Principles of Morals* | Q06, Q04 | `.../4320/pg4320.txt` |
| Schopenhauer, *World as Will and Idea* (Haldane & Kemp) | Q05, Q09, Q11 | `.../38427`, `.../40097`, `.../40868` |
| Nietzsche, *The Joyful Wisdom* (Common 1910) | Q13, Q14 | `.../52881/pg52881.txt` |
| Burnet, *Early Greek Philosophy* (1920) | Q01, Q12 | `.../67097/pg67097.txt` |
| Plotinus, *Complete Works* (Guthrie 1918) | Q02, Q08, Q12 | `.../42930/pg42930.txt` and siblings 42931 to 42933 |
| Cicero, *De Senectute* and *De Amicitia* (Shuckburgh) | Q09, Q11 | `.../2808/pg2808.txt` |
| Philo, *Works* (Yonge 1854) | Q01, Q08 | `earlychristianwritings.com/yonge/` |
| Lipsius, *Two Bookes of Constancie* (Stradling 1594) | Q05, Q09, Q14 | EEBO scan; heavy Elizabethan OCR noise |
| Aulus Gellius, *Attic Nights* (Beloe 1795) | various | `archive.org/download/atticnights01gelluoft/atticnights01gelluoft_djvu.txt` |

Burnet is how you get the Heraclitus fragments, which are the immediate source of the Stoic logos and fire doctrine, in a translation you can actually use. Plotinus should be Guthrie rather than MacKenna: the widely mirrored one-volume MacKenna is the 1956 revision and is still in copyright, and only MacKenna's first volume is safely public domain.

### Corrections to existing holdings

- **Epictetus, *Discourses*.** Verify the current 459 chunks are Long's complete four books and not the abridged *Selection* that circulates on Gutenberg as ebook 10661. Spot checks suggest it is complete, but this was not confirmed. The complete Long is at `archive.org/download/discoursesofepic033057mbp/discoursesofepic033057mbp_djvu.txt`.
- **Aristotle.** The corpus holds *Nicomachean Ethics* only. *De Anima* is Tier A. *Physics* (Hardie & Gaye 1930, public domain by one year, in `archive.org/download/worksofaristotle0002wdro/worksofaristotle0002wdro_djvu.txt`) and *Metaphysics* (Ross 1908, Wikisource) are worth adding for Q12.
- **Plato.** *Timaeus* is already queued. *Phaedo* and *Phaedrus* should follow for Q02 and Q11.

### Wanted but not available

These are the texts the corpus most needs and cannot legally have in full. They stay Mode 2 summary only.

- **Sextus Empiricus, *Outlines of Pyrrhonism*.** The only complete English is Bury 1933, still in copyright. This is a real loss, because Sextus is simultaneously the best surviving source on Stoic epistemology and its most serious ancient attack, which makes him the ideal Q03 text. Partial stopgap: Mary Mills Patrick's 1899 *Sextus Empiricus and Greek Scepticism* translates Book I, at `.../17556/pg17556.txt`.
- **Long and Sedley, *The Hellenistic Philosophers* (1987).** The standard fragment collection. Summary only.
- **Arius Didymus / Stobaeus epitome of Stoic ethics.** No public domain English.
- **Hierocles, *Elements of Ethics*.** The circles of oikeiosis. No public domain English.
- **Alexander of Aphrodisias, *De Fato*.** The best ancient attack on Stoic compatibilism, and the natural opponent for Q07.

---

## Part 4: The admission standard

Everything above is about texts we go looking for. This part is about texts that arrive: a PDF someone sends, a book encountered mid-project, a paper surfaced by the Inquiry Agent. The corpus is meant to be a Stoic wisdom machine, holding whatever genuinely connects to or extends the ancient material on the art of living, the cosmos, and consciousness. That ambition is broad by design, which is exactly why the gate has to be explicit. A corpus that admits everything adjacent stops being able to say anything.

Eight tests. A candidate must pass the first four. Tests five through eight determine how it is admitted rather than whether.

### The four that decide admission

**1. Provenance.** Can a reader check it? Named author with a traceable identity, a publisher or peer-reviewed venue, real citations that point at real things. Self-published work is not automatically excluded, but it has to clear the remaining tests on its own strength with no institutional credit extended.

**2. Does it argue, or does it assert?** The decisive test. A text earns its place by making a case that could fail. Look for whether it states the strongest objection to its own position and does something with it. A text that raises the objection and answers it with a shrug, or that never raises it, is an opinion rather than an argument, and a corpus full of opinions cannot generate insight because there is nothing in it to press against.

**3. Does it occupy a cell in the question map?** Name the question, the position, and the role: states, defends, attacks, or complicates. If it fits nowhere, one of two things is true. Either the map is missing a question, in which case add the question, or the text does not belong here. "Interesting and adjacent" is not a cell.

**4. Does the corpus need this position from this text?** The fifth defender of a position already well held is negative value, not neutral. Every chunk added shifts retrieval mass away from what is already there. Prefer the text that fills an empty role over the text that reinforces a full one, even when the second is the better book.

### The four that shape how it enters

**5. Does it chunk well?** A real constraint of this architecture and easy to forget. Some excellent books make poor retrieval material: dense, allusive, argument spread across chapters, meaning carried by structure rather than by any given passage. A 400-word fragment of such a text retrieved into a counselor prompt is worse than nothing, because it looks authoritative and says little. Where the argument does not survive fragmentation, ingest a Mode 2 summary rather than the text, even if the text is legally available verbatim.

**6. What is its legal form?** Public domain pre-1931 translation, verbatim. Open licensed with attribution, verbatim if the license permits and the license is confirmed rather than assumed. Everything else, Mode 2 summary. This is settled policy and this test only asks which of the three applies.

**7. Does it carry a commitment that will leak?** Some texts bring a metaphysical or devotional frame that will bleed into counselor voice or the Daily Dispatch if unfenced. This is not a reason to reject. It is a reason to record the commitment in the position notes and to decide the fence before ingesting. A text held as an opponent is valuable; a text silently absorbed as agreement is a defect.

**8. Will it still be true in ten years?** This is the test the "most up to date science" ambition most needs, because that ambition is a standing liability. Individual empirical findings in psychology and neuroscience date badly and a corpus does not notice when they do. A corpus that ingested the confident 2011 literature would still be holding ego depletion and power posing as settled results. The rule: prefer meta-analyses, review articles, and findings that have survived a decade over novel individual studies, and give every empirical ingest a `review_by` date so the Coverage Gap Agent can surface claims that have gone stale. Philosophy does not need this; empirical science does, and mixing them without marking which is which is how a wisdom corpus quietly becomes a repository of retracted results.

### Two worked examples

**Singh, "Cosmological Becoming: The Texture of Reality" (2026). Rejected.** Fails test 1 (self-published, no venue, no affiliation) and decisively fails test 2. Section 4 raises the strongest objection to its own thesis, whether structural organization implies consciousness, and answers it with "this is not empirically proven, but neither is its negation," which is a symmetry of ignorance rather than an argument. It cites James's *A Pluralistic Universe* in support of the claim that consciousness complexifies rather than emerges, when that is the text where James works through the combination problem, the central objection to precisely this position, which the paper never mentions. Of interest for one reason only: its ladder of crystal, plant, animal, human, universe independently reproduces the Stoic pneuma ladder without citing the Stoics, which is evidence that the shape is intuitive rather than evidence that the two traditions converge.

**Gilbert, "Interdependence and Identity: Moral Relation in an Historical World," *Cosmos and History* 21.2 (2025). Admitted as summary.** Passes 1 (peer reviewed, Portland State, dense and checkable footnotes). Passes 2: it argues, takes a position on the composition problem, and engages the actual literature including Shani and Keppler, Albahari, and the Seager handbook. Passes 3 on Q06, Q08, and Q12. Passes 4, since the corpus holds nothing on Q08 at all. On test 5 it chunks poorly, being abstract and continental with the argument carried across sections, so it enters as a Mode 2 summary. On test 6 the journal is open access but the license is not stated on its about page, which makes summary the safe form regardless. On test 7 it carries a Personalist commitment that is in real tension with Stoicism, and that tension is the reason to hold it: see below.

The Gilbert paper is worth dwelling on as a model of what a good bridge text looks like. It never mentions the Stoics, which is a gap in the paper and an opportunity for the corpus. Its central concept, interdependence as a moral force binding persons across time, is functionally *oikeiosis* and *sympatheia* under other names, and it should be registered against Cicero's *De Finibus* III and Marcus on the limbs of the body. More valuable still, it asks the question that separates Stoic providence from thin modern panpsychism and asks it explicitly: is the panpsyche personal, perspectival, evaluative, morally laden, is it the Good? Gilbert says the composition problem is the less interesting question and that one is the more interesting. That is objection three in the Scribe commission, raised independently by a philosopher with no stake in Stoicism.

And it disagrees with the Stoics in a way that is productive rather than merely different. Gilbert's Personalism holds that persons are the most real thing there is and that normativity is grounded in persons in relation. Stoicism holds that the cosmos is the most real thing and that persons are fragments of it. Both derive an ethics of interdependence from a monistic metaphysics, and they ground it in opposite places. Register the paper as `complicates` on Q08, never as `defends`, and the Tension Agent has something real to work with.

---

## Part 5: Standards for everything added from here

These apply to every future ingest, whether by you, by the nightly agent, or by a Claude Code session.

1. **`translator` and `source_url` are required.** No exceptions, including for anonymous or original-English works, where `translator` is set to the string `original` rather than left null. Backfill is out of scope for now; the rule applies going forward.
2. **`edition_year` is required** for translations, because public domain status depends on it and because translator divergence on technical vocabulary is a philosophical fact about the passage, not a bibliographic footnote.
3. **`locator` is required where the text has canonical divisions.** Book, chapter, section, letter, or Stephanus number as the text itself provides. A retrieved passage should be citable as *Discourses* 1.14 without a human going back to the source. Where a text has no canonical divisions, `locator` is null and `section_label` carries the structural heading.
4. **Every new work is registered against the question map** at ingest, with at least one position and role. A work that bears on no question in the map either belongs to a question the map is missing, in which case add the question, or does not belong in the corpus.
5. **Modern copyrighted material stays Mode 2**, per the existing copyright principle. Nothing in this plan changes that.
6. **Deprecate, never delete.** Superseded ingests get `deprecated = true` so retrieval quality changes are reversible and auditable.
7. **Empirical claims carry a `review_by` date.** Per admission test 8. Philosophy does not expire on a schedule; psychology and neuroscience do, and the corpus has no way to notice unless the date is recorded at ingest.
8. **Every candidate runs the eight tests in Part 4** and the result is recorded, including for rejections. A short rejection note is worth keeping, because the same paper will be offered again.

---

## Part 6: How this document gets used

Revisit the question set quarterly, or whenever the Inquiry Agent surfaces a question the map does not contain. The acquisition list is a snapshot and will go stale; the question set and the standards in Part 4 are the durable parts.

The test of whether this is working is not corpus size. It is whether the Tension Agent can find real contradictions and whether the Synthesis Agent produces documents that state an objection the corpus itself supplies, rather than an objection it invents. When a synthesis document can say "Augustine presses this at *City of God* XIV.9 and the Stoic reply at *Tusculans* IV is available but incomplete," the corpus is doing philosophy. Until then it is reciting.
