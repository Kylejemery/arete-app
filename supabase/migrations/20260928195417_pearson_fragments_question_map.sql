-- ============================================================
-- Question map: register Pearson's Fragments of Zeno and Cleanthes (1891).
--
-- The work had no registrations, which ACQUISITION_PLAN Part 5, rule 4
-- requires. Added at Kyle's request of 2026-09-28. Each position is the one
-- Pearson argues in his Introduction (chunks 0-55), read before writing:
--
--   Q03  pp. 8-9: against Hirzel, the phantasia kataleptike as criterion
--        is Zeno's own, not an innovation of Chrysippus.
--   Q05  pp. 19, 39-40: for Zeno the pathe supervene on judgments
--        (frag. 139) rather than being judgments; Cleanthes explains them
--        as slackened tonos; the wise man is free of passion yet keeps the
--        scars of his former impulses. Registered as complicates, since it
--        qualifies the plain "emotions are mistaken judgments" thesis.
--   Q01  pp. 41-44: Cleanthes' Hymn and his five proofs of God, with his
--        refusal to make God the author of evil and his distinction of
--        fate from providence.
--
-- The rows are labelled scholarship since
-- 20260928194836_pearson_fragments_scholarship_and_back_matter.
-- Idempotent on (question_id, author, work).
-- ============================================================

insert into public.corpus_question_registrations (question_id, author, work, position, role, note, source)
values
  ('Q03', 'A.C. Pearson', 'Fragments of Zeno and Cleanthes',
   'Argues against Hirzel that the apprehensive impression (phantasia kataleptike) as the criterion of truth is Zeno''s own doctrine, not an innovation of Chrysippus; collects the fragments on impression, assent and apprehension.',
   'states', 'Registered 2026-09-28 at Kyle''s request; Introduction pp. 8-9.', 'manual'),
  ('Q05', 'A.C. Pearson', 'Fragments of Zeno and Cleanthes',
   'For Zeno the passions supervene on judgments (frag. 139) rather than being judgments, and Cleanthes traces them physically to a slackening of the soul''s tension; the wise man is free of passion yet still bears the scars of his former impulses.',
   'complicates', 'Registered 2026-09-28 at Kyle''s request; Introduction pp. 19, 39-40.', 'manual'),
  ('Q01', 'A.C. Pearson', 'Fragments of Zeno and Cleanthes',
   'Cleanthes on providence: the Hymn to Zeus and five proofs of God from the order of nature, with his refusal to make God the author of evil and his distinction of fate from providence (against Chrysippus, who identified them).',
   'states', 'Registered 2026-09-28 at Kyle''s request; Introduction pp. 41-44.', 'manual')
on conflict (question_id, author, work) do nothing;
