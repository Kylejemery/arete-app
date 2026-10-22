-- Bobzien, "Chrysippus' Modal Logic and its Relation to Philo and Diodorus":
-- summary superseded.
--
-- The paper (Döring and Ebert (eds.), Dialektiker und Stoiker, Stuttgart
-- 1993, pp. 63-84) was read in full on 2026-10-22 from Kyle's scan
-- (BOBCML.1.pdf, an image-only PDF; the earlier ingest summarised it without
-- page numbers). The Mode 2 summary was wrong where it matters:
--
--   * Chunk 4 says Philonian necessity and impossibility are broader than
--     the Chrysippean and Diodorean ones. Scheme 2 (p. 83) shows the reverse:
--     Philonian necessity is the narrowest (column 1 only); propositions
--     externally hindered from being false from now on are necessary for
--     Chrysippus and Diodorus but not for Philo.
--   * Chunk 1 says all three treat the modalities as temporalised
--     properties. Bobzien says only that this "could be true" of Philo and
--     Diodorus (p. 66) and that the sources do not show it for Philo (n. 11).
--   * Chunks 3 and 5 attribute to the paper a "compatibilist account of
--     freedom", deliberation and responsibility, Stoic ethics and assent, and
--     a claim to be "the most formally rigorous reconstruction available".
--     None is in the paper; it calls Chrysippus a soft determinist (p. 75).
--   * Chunk 3 glosses the Proto-Chrysippean definition as "without
--     quantification over time"; it keeps OK∃t (p. 77).
--   * The Master Argument is mentioned once (p. 75) and not reconstructed.
--
-- Same procedure as 20261022120126: deprecate the six live chunks and move
-- them to chunk_index 1000+ (ids, text and embeddings untouched); withdraw
-- approval from the concept plantings on the old first chunk; correct the
-- submission (year, venue, summary rewritten in our own words, the Q07
-- registration reworded to what the paper says) and clear rag_chunk_ids.
-- The replacement chunks are then written by
--   node academy/corpus-ingestion/reingest-papers.js --id a1c40662-f437-4b56-9941-abf0bf3b0088
-- which also re-creates the Q07 registration from the submission.

begin;

do $$
declare n_live int; n_sub int;
begin
  select count(*) into n_live from rag_corpus
  where author = 'Susanne Bobzien'
    and work = 'Chrysippus'' Modal Logic and its Relation to Philo and Diodorus'
    and program_id = 'stoicism-phd'
    and coalesce(deprecated, false) = false
    and chunk_index between 0 and 5;
  if n_live <> 6 then raise exception 'expected 6 live chunks, found %', n_live; end if;

  select count(*) into n_sub from paper_submissions
  where id = 'a1c40662-f437-4b56-9941-abf0bf3b0088'
    and status = 'ingested' and array_length(rag_chunk_ids, 1) = 6;
  if n_sub <> 1 then raise exception 'expected the ingested submission with 6 chunk ids'; end if;
end $$;

update rag_corpus
set deprecated = true,
    chunk_index = chunk_index + 1000
where id in (
  'e96afce2-7506-4f34-97b6-4f88baf14e08', 'ad1e07ec-fada-4c8e-88dc-24bd06cc9600',
  '21f8024f-93de-40ce-bc88-4f1ed280c9ab', '94716139-e600-4cd0-8ead-e7ea60f99d39',
  '23af97dc-7b7d-48d9-b354-cf4b9f31079b', 'da126322-f2fb-4da5-afcd-53435a20d453'
);

update concept_passage_map
set approved = false,
    triage_note = coalesce(triage_note || ' ', '')
      || 'Superseded 2026-10-22: the summary chunk this points at was wrong and is deprecated; see migration 20261022174350.'
where chunk_id in (
  'e96afce2-7506-4f34-97b6-4f88baf14e08', 'ad1e07ec-fada-4c8e-88dc-24bd06cc9600',
  '21f8024f-93de-40ce-bc88-4f1ed280c9ab', '94716139-e600-4cd0-8ead-e7ea60f99d39',
  '23af97dc-7b7d-48d9-b354-cf4b9f31079b', 'da126322-f2fb-4da5-afcd-53435a20d453'
);

update paper_submissions
set year = '1993',
    venue = 'K. Döring and Th. Ebert (eds.), Dialektiker und Stoiker (Stuttgart: Steiner), pp. 63-84',
    rag_chunk_ids = null,
    question_registrations = '[{"question_id": "Q07", "role": "states", "position": "Chrysippus modified Diodorus minimally, replacing truth at some time from now on with not being externally hindered from truth at some time from now on, so that things that never happen can still be possible; a soft determinist needs this counterfactual possibility, and contingency so defined is a necessary but not sufficient condition for something being up to us.", "note": "Reworded 2026-10-22 from a full reading of the paper (pp. 74-75, 80-82)."}]'::jsonb,
    review_notes = 'Summary rewritten 2026-10-22 from a full reading of the paper (Kyle''s scan, BOBCML.1.pdf, image only). The previous summary inverted Scheme 2 on Philonian necessity and attributed claims the paper does not make. Previous chunks deprecated by migration 20261022174350.',
    updated_at = now(),
    summary_text = $sum$
Susanne Bobzien's "Chrysippus' Modal Logic and its Relation to Philo and Diodorus" (in K. Döring and Th. Ebert, eds., Dialektiker und Stoiker, 1993, pages 63 to 84) sets out to make exact the relations among the modal systems of Philo, Diodorus Cronus and Chrysippus, and to explain why Chrysippus modified his predecessors' notions as he did. Her thesis is that Chrysippus combined Philo's and Diodorus' notions, making only a minimal change to Diodorus' concept of possibility, and that the result suits Stoic philosophy. She frames the Hellenistic debate as a search for the "right" modal system, the one that fits the world and so fixes how far the world is determined.

Bobzien first states what the three systems share. All distinguish possibility, impossibility, necessity and non-necessity; all treat them primarily as properties of simple propositions (assertibles); and all meet four requirements of a normal modal logic: the contradictory pairs, interdefinability, necessity entailing truth and truth entailing possibility, and the division of every proposition into the necessary, the impossible and the contingent. Truth itself is temporalised: a proposition is true or false at a time and many change their truth value, so she writes T_t[p] for "p is true at t" and marks the time of assertion "now". She says it could be true of Philo and Diodorus, as of the Stoics, that the modalities are temporalised properties of propositions, but notes that the sources do not show this for Philo.

For Philo (pages 67 to 69) a proposition is possible if it is internally capable of being true at some time; Bobzien leaves this internal "consistency" uninterpreted because the evidence is too thin to say more. Philonian possibility is fixed by the proposition alone, so chaff at the bottom of the ocean is possibly burning (Alexander, in An. Pr. 184), and a possible proposition can be false at every time. For Diodorus (pages 69 to 75) a proposition is possible now if it is true at some time from now on and necessary if it is true at every time from now on. She contrasts this with a "Proto-Diodorean" notion, possible only when true, which collapses into a non-modal system, and argues that the real Diodorean system avoids the collapse but is no less deterministic about individual, dated events. What the ancient critics feared, she argues, was not universal determinism but the loss of counterfactual possibility: on Diodorus' view whatever never happens was never possible.

Chrysippus' definitions (pages 76 to 80) have two parts. A proposition is possible now if it is internally capable of being true (a Philonian clause) and is not hindered by external things from being true at some time from now on; impossibility, necessity and non-necessity are defined to match, so that impossibility and necessity are disjunctions. In giving the Greek of Diogenes Laertius 7.75 Bobzien follows Frede in supplying a hindrance clause for the impossible that the transmitted text lacks. She rejects a "Proto-Chrysippean" reading tied to the present, because it would make the necessary fail to be always true and because Alexander's report (in An. Pr. 177 to 178) has "Dion is dead" possible now in virtue of its being true at some later time. Her formalisation writes the hindrance as a primitive operator and leaves open when a hindrance must be present, noting that earlier circumstances may hinder later truths, which matters for the Stoic doctrine of fate. Chrysippean contingency requires a time when truth is not hindered and a time when falsehood is not hindered, not necessarily the same time.

The comparison is the core of the paper. The only significant formal difference between Diodorus and Chrysippus is that Diodorus requires truth, Chrysippus only the absence of hindrance to truth; that minimal change preserves counterfactual possibility. The Philonian clause is added because some propositions, such as "this circle is square", are not externally hindered either way and would otherwise count as contingent. Bobzien argues that Chrysippean contingency is a necessary but not a sufficient condition for something being up to us, since "it is night" is contingent but never in our power, and that Chrysippus did not secure freedom by making all future propositions contingent. A closing scheme (Scheme 2, page 83) sorts propositions into eight columns, from true by nature to false by nature: Philonian necessity is the narrowest, Diodorean the widest, and Chrysippus falls in the middle, treating as necessary what is externally hindered from being false from now on, which Philo does not.

The paper's limits are explicit. Bobzien does not argue for the attribution of the definitions in Diogenes Laertius to Chrysippus, following Frede's reconstruction instead; she does not reconstruct the Master Argument, which she mentions only as the argument by which Diodorus established his notion and which Chrysippus had to refute; and she notes that Chrysippus' improvement costs the easy formalisation that Philo's and Diodorus' systems allow. For the corpus the paper is the reference reconstruction of the three Hellenistic modal systems in temporal terms, and the place to check any claim about what Chrysippus' notion of possibility does and does not secure for human freedom.
$sum$
where id = 'a1c40662-f437-4b56-9941-abf0bf3b0088';

commit;
