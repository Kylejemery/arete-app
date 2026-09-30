-- ============================================================
-- Garden: The Impression enters the gallery, and physics stops being empty.
--
-- Built at academy/web/src/app/playground/the-impression and released
-- through RELEASED_PLAYGROUND, so a web_embed row like the others.
--
-- Branch is physics, and the call is worth recording because the subject
-- looks like logic. For the Stoics epistemology sits in the logical
-- division, and Zeno's Hand already holds that ground: impression, assent,
-- grasp, knowledge. This exhibit asks a different question, what happens to
-- the soul when something appears to it, and its answer is a doctrine about
-- what a soul is made of: pneuma, a body under tension, altered rather than
-- dented. That is physics, and it is what the piece is taught from. The
-- exhibit hands off to Zeno's Hand at the point where assent begins, which
-- is what keeps the two from overlapping.
--
-- Both halves of the argument are verbatim from the corpus, so nothing is
-- paraphrased: Diogenes Laertius 7.45 for Zeno's seal-in-wax definition and
-- 7.50 for Chrysippus's refusal of the literal reading, both in R.D. Hicks's
-- 1925 translation (the edition_year recorded one migration ago).
-- ============================================================

insert into public.exhibits
  (slug, title, summary, branch, thinkers, concepts, source_citation, source_passage,
   agora_prompt, kind, embed_url, status, sort_order)
values
  (
    'the-impression',
    'The Impression',
    $t$Zeno said an impression is a seal pressed into the soul. Chrysippus answered that seals cannot share a spot and a soul holds many at once, so it must be a change of tension instead.$t$,
    'physics',
    array['Zeno of Citium', 'Cleanthes', 'Chrysippus'],
    array['impression', 'pneuma', 'tonos', 'assent', 'the criterion'],
    'Diogenes Laertius, Lives 7.45 and 7.50',
    $t$For, says he, we must not take "impression" in the literal sense of the stamp of a seal, because it is impossible to suppose that a number of such impressions should be in one and the same spot at one and the same time.$t$,
    $t$Is Chrysippus's tension a real answer, or the same picture with a softer word?$t$,
    'web_embed',
    'https://academy.pursuearete.com/playground/the-impression',
    'gallery',
    10
  )
on conflict (slug) do nothing;
