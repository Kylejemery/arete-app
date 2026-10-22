// PHIL 801, Required Reading
// Keyed by session number (1-14). Session 14 is the qualifying examination.
//
// Modern scholarship is read by the student in the original; the corpus holds
// Bobzien 1996 and 2002 in full (research_sources) and the rest as Mode 2
// summaries, so the course text paraphrases and never reproduces them.

import type { ReadingItem } from '@/data/phil703_reading';

const BOBZIEN_1996 = 'Bobzien, "Stoic Syllogistic", Oxford Studies in Ancient Philosophy 14 (1996)';
const BOBZIEN_1999 = 'Bobzien, "Logic" (the Stoics), Cambridge History of Hellenistic Philosophy (1999)';

export const PHIL801_READING: Record<number, ReadingItem[]> = {
  1: [
    { source: 'Diogenes Laertius', passage: 'Lives VII.76-83 (Hicks)', note: 'The doxographic spine: arguments, syllogisms, the indemonstrables, the themata named.' },
    { source: 'Sextus Empiricus', passage: 'Outlines of Pyrrhonism II.134-167; Against the Logicians II.223-238', note: 'The hostile witness. Read for what he reports and for what his argument needs him to report.' },
    { source: BOBZIEN_1996, passage: 'pp. 133-145 (sections 1-2)', note: 'How the evidence is sorted: indemonstrables, modes, types, accounts.' },
    { source: 'Arete Academy', passage: 'docs/corpus/ACQUISITION_PLAN.md, Part 4 (the eight admission tests); themata/evidence/suite.yaml, items S001 and S018', note: 'The exercise material.' },
  ],
  2: [
    { source: 'Diogenes Laertius', passage: 'Lives VII.63-70', note: 'Sayables, assertibles, the classification of simple assertibles; VII.69 on double negation.' },
    { source: 'Sextus Empiricus', passage: 'Against the Logicians II.70-103', note: 'Assertibles as truth-bearers; definite, indefinite and middle; negation at 89 and 103.' },
    { source: 'Alexander of Aphrodisias', passage: 'in An. Pr. 177.25-178.4 (Wallies)', note: '"Dion is dead" and "this one is dead": the destroyed assertible.' },
    { source: BOBZIEN_1999, passage: 'pp. 92-104', note: 'The theory of assertibles.' },
  ],
  3: [
    { source: 'Sextus Empiricus', passage: 'Outlines of Pyrrhonism II.110-112', note: 'The four accounts of the conditional.' },
    { source: 'Diogenes Laertius', passage: 'Lives VII.71-74', note: 'The connectives and their truth conditions; the conflict criterion at 73.' },
    { source: 'Cicero', passage: 'De Fato 12-15; Academica II.143', note: 'Chrysippus and the diviners; the quarrel over the conditional.' },
    { source: 'Aulus Gellius', passage: 'Noctes Atticae XVI.8', note: 'Exclusive disjunction and the compound assertibles in Latin dress.' },
    { source: BOBZIEN_1999, passage: 'pp. 104-117', note: 'Non-simple assertibles.' },
  ],
  4: [
    { source: 'Epictetus', passage: 'Discourses II.19.1-5', note: 'The Master Argument as Epictetus reports it.' },
    { source: 'Diogenes Laertius', passage: 'Lives VII.75', note: 'The Stoic modal definitions.' },
    { source: 'Plutarch', passage: 'On Stoic Self-Contradictions 1055d-f', note: 'Chrysippus against Diodorus on the possible.' },
    { source: 'Boethius', passage: 'in De Interpretatione, 2nd ed., 234-235 (Meiser)', note: 'The fullest statement of the Stoic definitions.' },
    { source: BOBZIEN_1999, passage: 'pp. 83-92 (the Megarics) and 117-121', note: 'The Master Argument and the Stoic modal system. The 2000s modal logic paper is held only as a summary.' },
  ],
  5: [
    { source: 'Sextus Empiricus', passage: 'Outlines of Pyrrhonism II.146-150, 156-167; Against the Logicians II.429-434, 443', note: 'The four ways an argument fails; redundancy; one-premiss arguments.' },
    { source: 'Diogenes Laertius', passage: 'Lives VII.77-78, 195', note: 'Valid and invalid; Chrysippus\'s two books on redundancy.' },
    { source: 'Alexander of Aphrodisias', passage: 'in An. Pr. 17.10-18.7', note: 'One-premiss arguments: Chrysippus against Antipater.' },
    { source: BOBZIEN_1996, passage: 'pp. 175-181', note: 'Duplicated arguments, doublets, non-redundancy.' },
    { source: 'Arete Academy', passage: 'themata/FINDINGS.md (F1); themata/evidence/suite.yaml S009, S011, S016', note: 'The redundancy conflict in the ledger.' },
  ],
  6: [
    { source: 'Diogenes Laertius', passage: 'Lives VII.79-81', note: 'The five indemonstrables in order.' },
    { source: 'Sextus Empiricus', passage: 'Against the Logicians II.223-227; Outlines of Pyrrhonism I.69, II.157-158', note: 'The accounts; the many-disjunct fifth; the modes.' },
    { source: 'Cicero', passage: 'Topica 53-57', note: 'Seven basic forms, two of them not Stoic.' },
    { source: BOBZIEN_1996, passage: 'pp. 133-145 (section 1)', note: '(A1)-(A5) and the 32 subtypes.' },
  ],
  7: [
    { source: 'Apuleius', passage: 'De Interpretatione 209.12-14 (Moreschini)', note: 'The first thema, in Latin.' },
    { source: 'Alexander of Aphrodisias', passage: 'in An. Pr. 278.12-14; 284.10-17; 164.27-31', note: 'The third thema; the synthetic theorem; the second thema called useless.' },
    { source: 'Simplicius', passage: 'in De Caelo 237.2-4 (Heiberg)', note: 'The other third thema.' },
    { source: 'Galen', passage: 'On the Doctrines of Hippocrates and Plato II.3.18-19; Institutio Logica 6.5', note: 'The themata grouped; Antipater\'s shorter analysis.' },
    { source: 'Sextus Empiricus', passage: 'Against the Logicians II.229-238', note: 'Worked analyses and the dialectical theorem at 231.' },
    { source: BOBZIEN_1996, passage: 'pp. 145-153 (section 2)', note: 'Why Simplicius over Alexander.' },
  ],
  8: [
    { source: BOBZIEN_1996, passage: 'pp. 153-175 (sections 3-4)', note: 'T1-T4, the hidden-structure types, the decision procedure, the check against the testimonia.' },
    { source: 'Frede', passage: 'Die stoische Logik (1974), pp. 172-196', note: 'The rival reconstruction, read through Bobzien\'s notes 45, 49, 50, 54 if the book is not to hand.' },
    { source: 'Mates', passage: 'Stoic Logic (1953), ch. 5', note: 'The Alexander-based reconstruction.' },
    { source: 'Origen', passage: 'Contra Celsum VII.15', note: 'Two mode-forming premisses.' },
  ],
  9: [
    { source: BOBZIEN_1996, passage: 'pp. 181-192 (sections 5-6)', note: 'Structural properties, the 21 forms, relevance and connexive parallels, completeness.' },
    { source: 'Bobzien', passage: '"Stoic Sequent Logic and Proof Theory" (2019)', note: 'Backward proof search in substructural sequent logics; read against section 5.' },
    { source: 'Barnes', passage: '"Proof Destroyed", in Doubt and Dogmatism (1980), pp. 161-181', note: 'The relevance conjecture Bobzien confirms.' },
    { source: 'McCall', passage: '"Connexive Implication", Journal of Symbolic Logic 31 (1966)', note: 'The nearest modern system.' },
  ],
  10: [
    { source: 'Arete Academy', passage: 'themata/THEMATA_PROJECT.md; FINDINGS.md; results/candidates.md; evidence/suite.yaml; evidence/rules.yaml', note: 'The laboratory. Unreviewed research in progress.' },
    { source: 'Arete Academy', passage: 'themata/lean/Stoic/Params.lean; Themata/Rules.lean; FirstThema.lean; Sugihara.lean', note: 'Read, not run: the parameter space, the two rule shapes, the S020 theorem, the countermodel.' },
    { source: 'Origen', passage: 'Contra Celsum VII.15', note: 'S020, the item that forces the first thema.' },
  ],
  11: [
    { source: 'Diogenes Laertius', passage: 'Lives VII.70, 75, 78, 187', note: 'Indefinite assertibles; the donkey sentence; arguments valid in the specific sense; the Nobody.' },
    { source: 'Alexander of Aphrodisias', passage: 'in An. Pr. 84, 345, 373', note: 'Subsyllogistic and unmethodically concluding arguments.' },
    { source: 'Galen', passage: 'Institutio Logica 17-19', note: 'Unmethodicals; Posidonius\'s "power of an axiom" at 18.8; subsyllogistic at 19.6.' },
    { source: BOBZIEN_1999, passage: 'pp. 151-157 (section 7)', note: 'Arguments valid in the specific sense.' },
    { source: 'Bobzien and Shogry', passage: '"Stoic Logic and Multiple Generality", Philosophers\' Imprint 20 (2020)', note: 'Held only as a summary in the corpus; read the paper.' },
  ],
  12: [
    { source: 'Bobzien', passage: '"Chrysippus and the Epistemic Theory of Vagueness", Proceedings of the Aristotelian Society 102 (2002), pp. 217-238', note: 'Held in full in research_sources.' },
    { source: 'Williamson', passage: 'Vagueness (1994), pp. 12-27', note: 'The position under attack.' },
    { source: 'Cicero', passage: 'Academica II.92-95', note: 'The charioteer and Chrysippus\'s silence.' },
    { source: 'Sextus Empiricus', passage: 'Against the Logicians I (M 7).242-246, 253-257, 416-421', note: 'The sage and the sorites; the cognitive impression.' },
  ],
  13: [
    { source: 'Arete Academy', passage: 'docs/academy/PHIL_801_SYLLABUS.md; themata/results/candidates.md', note: 'Paper topics and the candidate matrix.' },
    { source: BOBZIEN_1996, passage: 'pp. 188-192 (section 6)', note: 'The open questions the paper may take up.' },
  ],
  14: [
    { source: 'The student', passage: 'The research paper, final draft', note: 'Defended under questioning.' },
  ],
};
