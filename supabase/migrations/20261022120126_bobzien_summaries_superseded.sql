-- Bobzien: three paper summaries superseded.
--
-- A read of the full texts on 2026-10-21 (research_sources holds Stoic
-- Syllogistic in full; the CHHP chapter is held as OCR in Kyle's Papers
-- folder) found the Mode 2 summaries wrong where it matters:
--
--   * Stoic Syllogistic (OSAP 14, 1996). The summary says the reconstructed
--     system satisfies reflexivity and monotonicity and fails antilogism.
--     Section 5 of the paper (pp. 181-2) says the opposite: reflexivity and
--     monotonicity fail (plurality of premisses; the redundancy restriction),
--     antilogism is the first thema, contraction is partly covered by the
--     second. The Themata project's rule R03 was built on the wrong reading.
--   * "Stoic Logic (Cambridge Companion), part 1 / part 2". The work is
--     chapter 5, Logic, of The Cambridge History of Hellenistic Philosophy
--     (1999); the Stoic section is pp. 92-157. The "Cambridge Companion"
--     attribution was an inference (CORPUS_REMEDIATION_2026-09.md). The part
--     2 summary also misnumbers the third to fifth indemonstrables, calls the
--     dialectical theorem the third thema, and credits Mignucci's section on
--     paradoxes (p. 157 onward) to Bobzien.
--
-- Papers enter as summaries through paper_submissions and the paper ingest
-- (academy/web/src/lib/papers/ingest.ts; academy/corpus-ingestion/
-- reingest-papers.js), which upserts on (author, work, program_id,
-- chunk_index). Kyle asked for deprecate-and-replace rather than the paper
-- path's replace-in-place, so this migration:
--
--   1. marks the nine live chunks deprecated and moves them to chunk_index
--      1000-1002, out of the upsert key range, so the replacement can land at
--      0.. without overwriting them. Ids, text and embeddings are untouched.
--   2. sets approved = false on the concept_passage_map rows planted on the
--      three old first chunks. Those rows carry a copy of the wrong text and
--      the synthesis and coverage agents read it as an approved passage.
--      Nothing is deleted; the triage note says why.
--   3. corrects the three submissions: work titles, year and venue, the
--      summary text (rewritten from the full texts, in our own words), and
--      clears rag_chunk_ids so the re-ingest does not delete the deprecated
--      rows.
--
-- The replacement chunks are then written by
--   node academy/corpus-ingestion/reingest-papers.js --id <the three ids>
-- which embeds the new summaries, plants the concepts on the new first
-- chunk, and records the new chunk ids on the submissions.
--
-- Dependents checked 2026-10-22: no library_comments, library_overrides,
-- cited_by or question registrations on these three works (the one Bobzien
-- registration, Q07, is on the modal logic paper, untouched).

begin;

do $$
declare
  n_live int;
  n_ids int;
begin
  select count(*) into n_live
  from rag_corpus
  where author = 'Susanne Bobzien'
    and work in ('Stoic Logic (Cambridge Companion), part 1',
                 'Stoic Logic (Cambridge Companion), part 2',
                 'Stoic Syllogistic')
    and program_id = 'stoicism-phd'
    and coalesce(deprecated, false) = false
    and chunk_index between 0 and 2;
  if n_live <> 9 then
    raise exception 'expected 9 live Bobzien chunks, found %', n_live;
  end if;

  select count(*) into n_ids
  from paper_submissions
  where id in ('8f1c3a3a-39f3-4f1c-9ba5-fa057ffdd96e',
               '652c2779-1585-4a21-a1e4-6fc2aacda33f',
               'a867c219-78fd-475b-bfa2-774763afa7dc')
    and status = 'ingested'
    and array_length(rag_chunk_ids, 1) = 3;
  if n_ids <> 3 then
    raise exception 'expected 3 ingested submissions with 3 chunk ids each, found %', n_ids;
  end if;
end $$;

-- 1. Deprecate and move the old chunks out of the live key range.
update rag_corpus
set deprecated = true,
    chunk_index = chunk_index + 1000
where id in (
  'c0b46da3-c354-466f-b43f-3db186609228', '99a7163c-5173-4453-b2fd-6d33b1af1148', 'b4037fea-65da-4a01-8414-7b8c42650c91',
  'a94845be-9245-4327-b1d0-770bc5dc6064', '8604e1b8-e0ce-4006-9fab-0d112c553a89', '3991b8ca-0c5b-4189-84b9-5260aebf8bc9',
  '562791d2-28ed-4b57-b5ad-112693d25b3e', '76b4b6e1-9e59-478b-8807-457e1a7756b2', 'f3d8243e-6416-40d7-ae29-fe8e60516e86'
);

-- 2. Withdraw approval from the concept plantings on the old first chunks.
update concept_passage_map
set approved = false,
    triage_note = coalesce(triage_note || ' ', '')
      || 'Superseded 2026-10-22: the summary chunk this points at was wrong and is deprecated; see migration 20261022120126.'
where chunk_id in (
  'c0b46da3-c354-466f-b43f-3db186609228',
  'a94845be-9245-4327-b1d0-770bc5dc6064',
  '562791d2-28ed-4b57-b5ad-112693d25b3e'
);

-- 3. Correct the submissions. The summaries below are the Mode 2 text the
-- re-ingest will chunk by paragraph.

update paper_submissions
set work = 'Logic (Cambridge History of Hellenistic Philosophy), part 1: assertibles and arguments',
    year = '1999',
    venue = 'The Cambridge History of Hellenistic Philosophy, ch. 5, pp. 92-125',
    rag_chunk_ids = null,
    review_notes = 'Summary rewritten 2026-10-22 from the chapter (OCR, Kyle''s Papers/Ingested). The work is the Cambridge History chapter, not a Cambridge Companion. Previous chunks deprecated by migration 20261022120126.',
    updated_at = now(),
    summary_text = $sum$
Susanne Bobzien's treatment of Stoic logic in chapter 5 ("Logic") of The Cambridge History of Hellenistic Philosophy (1999) occupies pages 92 to 157. This first part covers pages 92 to 125: the theory of assertibles and the theory of arguments. Bobzien's thesis is that Stoic logic is a logic of the validity of arguments, and that its basic items are assertibles (axiomata), not sentences and not thoughts. An assertible is a self-complete sayable that can be stated, and it is the thing that is true or false. It differs from a sentence, since one sentence can express different assertibles at different times and in different mouths, and it differs from a propositional content, since an assertible can only be asserted, never asked or commanded. Assertibles have their truth values at a time and can change them, so Stoic logic has to handle "changing assertibles," and much of the Stoic classification is motivated by that.

Bobzien reconstructs the Stoic classification of simple assertibles from Sextus (M 8.96 to 100) and Diogenes Laertius (7.69 to 70): definite assertibles formed with a demonstrative ("this one walks"), middle ones with a name ("Dion walks"), and indefinite ones ("someone walks"), with their truth conditions and the relations among them. Negation is a prefix on the whole assertible, and the Stoics distinguished it from assertibles with a negative predicate. The definite assertible depends on deixis, and Bobzien discusses the case, reported by Alexander of Aphrodisias, of "this one is dead": once the person dies there is nothing to point to and the assertible is destroyed rather than made true. She shows how the Stoics regimented ordinary language for logical purposes, repeating the subject in full rather than relying on pronouns.

For non-simple assertibles Bobzien sets out the connectives and their truth conditions: the conditional, the "since" assertible, the causal assertible, conjunction, and disjunction. The conditional is where the Hellenistic debate lies. Philo's conditional is false only when the antecedent is true and the consequent false; Diodorus requires that it never was and never will be so; Chrysippus requires a connection (synartesis), spelled out as conflict between the antecedent and the contradictory of the consequent; a fourth account based on "emphasis" is also reported. Bobzien notes Chrysippus's advice to the diviners (Cicero, De Fato 12 to 15) to cast their theorems as negated conjunctions rather than conditionals, which shows the conflict criterion at work. Stoic disjunction is exclusive, and Bobzien doubts that any Stoic connective was understood truth-functionally. Universal statements are regimented as indefinite conditionals, "if something is S, that thing is P."

Bobzien's section on modal logic (pages 117 to 121) stresses that it is a logic of the modal properties of assertibles rather than of modal propositions. She presents Chrysippus's four definitions of possible, impossible, necessary and non-necessary, each with a Philonian clause about the assertible's internal capacity and a further clause about external circumstances not hindering, over a span of present and future time. She sets these against Diodorus's definitions, which make the possible what is or will be true, and so against the Master Argument, treated in the preceding Megaric section of the chapter. Chrysippus's system allows for things that never happen but could have, which is the logical space his account of fate and responsibility needs. Bobzien also reports Chrysippus's rejection of the principle that only the possible follows from the possible, using the conditional "if Dion is dead, this one is dead," whose consequent is destroyed when its antecedent comes true.

The theory of arguments (pages 121 to 125) treats an argument as a compound of assertibles, itself a sayable rather than a sentence or a thought. An argument needs at least two premisses and a conclusion: "p, therefore p" and "p and q, therefore p" are not arguments at all, though "if p, p; p; therefore p" is one, and a valid one. Validity is defined through the conditional formed from the conjunction of the premisses and the conclusion, and Bobzien raises the question whether using one notion of consequence both for the truth of conditionals and for the validity of arguments puts the system under strain. She lays out the Stoic ways an argument fails: disconnection of premisses from conclusion, redundancy (an extra premiss, as in "if it is day, it is light; it is day; and virtue benefits; therefore it is light"), bad form, and deficiency. True arguments are valid arguments with true premisses, and demonstrations are true arguments that reveal something non-evident.

The chapter is a synthesis rather than a polemic, but Bobzien marks where she disagrees: with Mates's reading of Stoic possibility as what is not externally prevented, and with parts of Frede's 1974 analysis. She also marks where the evidence underdetermines reconstruction, especially on the conditional, on the Stoic modal definitions and on how "changing assertibles" were handled. For the corpus, this part is the standard account of what an assertible is, of the Stoic connectives and of the Stoic criterion of validity, and it is the background that part 2 (the syllogistic) assumes. The Megaric section (pages 83 to 92), which contains the Master Argument, is not covered by this summary.
$sum$
where id = '8f1c3a3a-39f3-4f1c-9ba5-fa057ffdd96e';

update paper_submissions
set work = 'Logic (Cambridge History of Hellenistic Philosophy), part 2: syllogistic',
    year = '1999',
    venue = 'The Cambridge History of Hellenistic Philosophy, ch. 5, pp. 126-157',
    rag_chunk_ids = null,
    review_notes = 'Summary rewritten 2026-10-22 from the chapter (OCR, Kyle''s Papers/Ingested). Indemonstrables now numbered as the chapter has them; the dialectical theorem is no longer called the third thema; the section on paradoxes from p. 157 is Mignucci''s and is not summarised. Previous chunks deprecated by migration 20261022120126.',
    updated_at = now(),
    summary_text = $sum$
This second part of Susanne Bobzien's treatment of Stoic logic in The Cambridge History of Hellenistic Philosophy (1999) covers pages 126 to 157: section 6, the syllogistic, and section 7, arguments valid in the specific sense. (Section 8, on paradoxes, which begins on page 157, is by Mario Mignucci and is not part of this summary.) Bobzien's thesis is that the Stoics built a propositional syllogistic on five basic argument forms, the indemonstrables, and a small set of rules, the themata, by which other syllogisms are analysed into indemonstrables. A syllogism is an argument valid in virtue of its form, and the Stoics also recognised valid arguments that are not syllogisms.

Bobzien presents the five indemonstrables in the order the sources give (Diogenes Laertius 7.80 to 81; Sextus): first, "if p, q; p; therefore q"; second, "if p, q; not q; therefore not p"; third, "not both p and q; p; therefore not q"; fourth, "either p or q; p; therefore not q"; fifth, "either p or q; not p; therefore q." The Stoics described them by their modes, schematic forms using "the first" and "the second" for the assertibles, and Bobzien distinguishes the indemonstrables themselves from their modes, their types and their accounts. She explains why these five were chosen: anyone who understands the connective in the leading premiss can see that the conclusion follows, so the indemonstrables need no proof. She notes the subtypes produced by negative and affirmative constituents, the fifth indemonstrable with more than two disjuncts reported in Sextus (PH 1.69), which cannot be reduced to the two-disjunct form, and Cicero's list of seven basic forms (Topics 53 to 57), two of which the Stoics did not count.

The themata are the rules of analysis. Bobzien reports the first thema from Apuleius: when from two assertibles a third follows, then from either of them together with the contradictory of the conclusion the contradictory of the other follows. The third thema survives in two versions, in Alexander of Aphrodisias and in Simplicius; it allows the conclusion of one two-premiss argument to be combined with an external premiss in a further argument, and the whole to count as one syllogism. The second and fourth themata are lost in their wording. Bobzien reports that the Peripatetic "synthetic theorem" (Alexander, in An. Pr. 284) did the work of the second to fourth themata together, and that Sextus's "dialectical theorem" (M 8.231), which may be Antipater's simplification, allows the reduction of the same arguments. She then walks through Sextus's worked analyses of multi-premiss arguments and sets out the types of argument each rule handles. The dialectical theorem is a later substitute for the second to fourth themata, not the third thema under another name.

Bobzien discusses the arguments the Stoics took to be syllogisms although they look odd: duplicated arguments such as "if p, p; p; therefore p," indifferently concluding arguments such as "either p or q; p; therefore p," and arguments with two mode-forming premisses. She also discusses what makes an argument not a syllogism: a single premiss, a redundant premiss, or a form that cannot be analysed into indemonstrables. Wholly hypothetical arguments, "if p, q; if q, r; therefore if p, r," are treated as valid but not syllogistic. These cases show that the Stoic notion of a syllogism is narrower than modern formal validity.

Section 7 (pages 151 to 152) treats arguments valid in the specific sense, the second class of valid arguments in Diogenes Laertius 7.78. Subsyllogistic arguments differ from a syllogism only in that one of their assertibles, though equivalent to the one in the syllogism, has a different linguistic form, for instance "q follows from p" in place of "if p, q" (Alexander, in An. Pr. 84 and 373; Galen, Institutio logica 19.6). Unmethodically concluding arguments, such as "it is day; therefore it is light" or "you say that you have horns; you say it truly; therefore you have horns," owe their validity to an unstated universal premiss; Alexander reports that the Stoics reconstructed them by adding a conditional formed from that premiss, and Galen reports Posidonius's phrase "the power of an axiom" for what makes them conclude. Bobzien shows how an Aristotelian syllogism in Barbara, rewritten with Stoic indefinite conditionals, becomes a wholly hypothetical argument and so, for the Stoics, valid but not a syllogism.

Bobzien's reconstruction places the Stoic system closer to a natural-deduction or sequent-style system than to an axiomatic calculus, and she is explicit about its limits: the second and fourth themata are reconstructed, the sources on analysis are mostly hostile or late (Alexander, Galen), and the Stoic treatment of unmethodically concluding arguments is known only in outline. For the corpus this part is the reference account of the five indemonstrables in their correct order, of the themata as the sources preserve them, and of the distinction between syllogisms and arguments valid in the specific sense. Bobzien's own detailed reconstruction of the themata is in her 1996 paper "Stoic Syllogistic," which the corpus holds separately.
$sum$
where id = '652c2779-1585-4a21-a1e4-6fc2aacda33f';

update paper_submissions
set venue = 'Oxford Studies in Ancient Philosophy 14, pp. 133-192',
    rag_chunk_ids = null,
    review_notes = 'Summary rewritten 2026-10-22 from the full text in research_sources. The previous summary reversed the paper''s section 5 results (reflexivity, monotonicity, contraction, antilogism). Previous chunks deprecated by migration 20261022120126.',
    updated_at = now(),
    summary_text = $sum$
Susanne Bobzien's "Stoic Syllogistic" (Oxford Studies in Ancient Philosophy 14, 1996, pages 133 to 192) reconstructs Chrysippus's theory of deduction from the five indemonstrables and the four themata. Bobzien's thesis is that Stoic syllogistic is an argumental, reductive system: its objects are arguments, not propositions; a syllogism is an argument that is valid in virtue of its form and has at least two premisses; the accounts of the five indemonstrables work like basic rules; and the themata are applied backwards, breaking a given argument into component two-premiss arguments until only indemonstrables remain. She argues that the classical propositional calculus is the wrong yardstick for this system, and that its closest modern relatives are relevance and connexive logics.

Sections 1 and 2 set out the evidence. Bobzien distinguishes four things that discussions often run together: the indemonstrable arguments themselves, their modes (schematic forms with "the first" and "the second"), their types, and their accounts, the general descriptions that do the work in analysis. She gives the accounts (A1) to (A5), with the subtypes that negated and affirmative constituents produce, from Diogenes Laertius 7.76 to 81 and Sextus Empiricus (M 8.223 to 238; PH 2.156 to 157). For the themata the evidence is thin: the first thema is preserved in Apuleius; the third in two versions, Alexander of Aphrodisias (in An. Pr. 278) and Simplicius (in De Caelo 237); the synthetic theorem that Alexander says did the work of the second to fourth themata (in An. Pr. 284); and the dialectical theorem in Sextus (M 8.231). Bobzien prefers Simplicius's version of the third thema and argues that Alexander adapted his to Aristotle's Prior Analytics, looking at the rule from the side of synthesis rather than analysis.

Sections 3 and 4 give her reconstruction. The first thema (T1) is a contraposition rule: when two assertibles yield a third, either of them with the contradictory of the conclusion yields the contradictory of the other; a full version (T1+) does the same for arguments with more than two premisses. The second, third and fourth themata are chain-inference rules, each splitting one two-premiss argument off the argument under analysis. The second (T2) handles arguments in which a premiss has implicitly been used more than once; the third (T3) handles arguments with an external premiss, one taken in addition to the conclusion of the first component argument; the fourth (T4) combines the two. Bobzien lays down the requirements any reconstruction must meet: the rules must be formulable in ordinary Greek, must apply to the indemonstrables, must reduce arguments with two or more premisses, and must give a decision procedure. She then checks her rules against every reported analysis, including Sextus's worked examples, "duplicated" arguments such as "if p, p; p; therefore p," indifferently concluding arguments, and arguments with two mode-forming premisses from Origen (Contra Celsum 7.15). Against Frede she argues that his second thema is a contraction rule rather than a chain rule and so cannot reduce an argument on its own, and that his forward method does not match the sources; against Mates, Kneale, Becker and others she argues that reconstructions built on Alexander's version inherit his Aristotelian adaptation.

Section 5 states the structural properties of the reconstructed system, and here the paper is often misreported. Reflexivity does not hold: "if A, A" is a true conditional, but "A, therefore A" is not an argument, since an argument needs at least two premisses. Monotonicity does not hold, because a redundant premiss makes an argument invalid (Sextus, M 8.431). Cut is provided by the second to fourth themata, with the restriction that the component arguments have at least two premisses. Permutation of premisses holds. Contraction is partly covered by the second thema, with a restriction on arguments of the form "A, A, therefore B," which Bobzien argues the Stoics did not count as arguments at all. Premiss repetition probably does not hold, suppression has no application, and antilogism is exactly what the first thema provides. In natural-deduction terms the system has "and"-introduction, "if"-elimination and "or"-elimination, but no "and"-elimination, "if"-introduction or "or"-introduction. Bobzien lists twenty-one sequents valid in the classical calculus that have no Stoic analogue, and shows that the irreducible complex forms each contain a one-premiss "argument" that modern logicians also regard as paradoxical. Scholars such as Mueller and Mignucci added reflexivity, monotonicity and contraction to prove completeness; Bobzien argues this props the system up with rules the Stoics rejected. The nearest modern system is McCall's connexive implication, though neither contains the other, and the result confirms Barnes's conjecture that Chrysippus anticipated relevance logic.

Section 6 asks whether the system is complete. Sextus (PH 2.156 to 157 and 194) and Diogenes Laertius (7.78) report the Stoic claim that every syllogism is either an indemonstrable or reducible to indemonstrables by the themata. Bobzien reads this as a claim that the rules capture a pre-technical notion of syllogismhood, and she shows that the system respects the Stoic constraints on that notion: no argument with fewer than two premisses, no redundant premiss, no premiss doublets, and no wholly hypothetical argument is reducible. A residue of complex forms that are not reducible and not excluded by any known constraint can be explained only by conjecture, perhaps by a requirement that a syllogism be composed of self-evidently valid steps. She states the maximal completeness claim the Stoics could have made, with five conditions, and says a proof of it may be possible, while noting that whether the Stoics achieved it cannot be decided from the evidence. The paper does not take account of Milne's 1995 article on the completeness of non-Philonian Stoic logic.

For the corpus the paper matters in three ways. It is the standard reconstruction of the themata, and the one any formal encoding of Stoic logic has to answer to. It settles, against the older literature, that the Stoic system rejects weakening and so is not a fragment of classical logic. And it leaves open questions that are still live: the exact wording of the second and fourth themata, the Stoic view of arguments like "p, q, therefore p," the status of premiss doublets, and whether the irreducible forms were excluded on purpose. Bobzien notes that most of her structural results hold for any reconstruction in which the second to fourth themata have the deductive power of the synthetic theorem.
$sum$
where id = 'a867c219-78fd-475b-bfa2-774763afa7dc';

commit;
