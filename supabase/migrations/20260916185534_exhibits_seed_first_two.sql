-- ============================================================
-- Part 4: move the existing pieces into the Garden.
--
-- Zeno's Hand and the Scale of Happiness are both already built and
-- already released on the Academy (their slugs are in RELEASED_PLAYGROUND
-- in academy/web/src/middleware.ts), so both enter as web_embed rows
-- pointed at the pages that exist. Their internals are not rewritten; the
-- exhibit template wraps them.
--
-- They enter at different statuses, and the difference is the source:
--
--   zenos-hand          gallery. Cicero reports the gesture at Academica
--                       2.145, which Yonge numbers as Book 2 chapter 47,
--                       and that translation is in rag_corpus. Quoted
--                       below, so the row clears the gallery check.
--
--   scale-of-happiness  workshop. The piece is a synthesis across schools
--                       rather than a gloss on one passage, and no single
--                       citation has been chosen for it yet. The gallery
--                       check refuses a row with no source_citation, which
--                       is the rule working as intended: it is unlisted but
--                       reachable at /garden/scale-of-happiness until Kyle
--                       picks one. See docs/garden/discovery.md.
--
-- Idempotent on slug so a re-run cannot clobber edits made since.
-- ============================================================

insert into public.exhibits
  (slug, title, summary, branch, thinkers, concepts, source_citation, source_passage,
   kind, embed_url, status, sort_order)
values
  (
    'zenos-hand',
    $t$Zeno's Hand$t$,
    $t$Zeno taught the whole of Stoic epistemology with one gesture: the hand open, curled, closed, then gripped by the other hand.$t$,
    'logic',
    array['Zeno of Citium', 'Cicero'],
    array['impression', 'assent', 'katalepsis', 'knowledge'],
    'Cicero, Academica 2.145',
    -- Yonge's public-domain translation, as held in rag_corpus (Academica,
    -- ch. 2.47). Scanner damage in that copy has been repaired against the
    -- surrounding text; no wording is changed. The copy truncates
    -- mid-sentence at the fourth position (the left hand gripping the fist,
    -- which is knowledge), so the quotation stops at the third and the
    -- exhibit itself teaches the fourth.
    $t$And Zeno professed to illustrate this by a piece of action; for when he stretched out his fingers, and showed the palm of his hand, "Perception," said he, "is a thing like this." Then, when he had a little closed his fingers, "Assent is like this." Afterwards, when he had completely closed his hand, and held forth his fist, that, he said, was comprehension.$t$,
    'web_embed',
    'https://academy.pursuearete.com/playground/zenos-hand',
    'gallery',
    10
  ),
  (
    'scale-of-happiness',
    'The Scale of Happiness',
    $t$Where the schools put the good life, from ataraxia to slavery to want, and where you sit on it today.$t$,
    'ethics',
    array['Epicurus', 'Epictetus', 'Seneca', 'Marcus Aurelius', 'Diogenes of Sinope'],
    array['ataraxia', 'askesis', 'adiaphora', 'pleonexia', 'epithumia'],
    null,
    null,
    'web_embed',
    'https://academy.pursuearete.com/playground/happiness-scale',
    'workshop',
    10
  )
on conflict (slug) do nothing;
