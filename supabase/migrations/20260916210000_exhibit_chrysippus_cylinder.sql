-- ============================================================
-- Garden: Chrysippus's Cylinder enters the gallery.
--
-- Built at academy/web/src/app/playground/chrysippus-cylinder and released
-- through RELEASED_PLAYGROUND in academy/web/src/middleware.ts, so this is
-- a web_embed row pointed at it, following the pattern of the first two.
--
-- Branch is ethics rather than physics, and the choice is deliberate: the
-- argument is about fate, which is physics, but Chrysippus deploys it to
-- save responsibility, which is why it is worth having. The playbook's rule
-- is that a piece sitting across two branches belongs to the one it is
-- taught from.
--
-- Straight into the gallery, unlike the Scale, because it has a real
-- citation and a real passage: Cicero's De Fato is in rag_corpus in C.D.
-- Yonge's public-domain translation (Bohn 1853), and the quotation below is
-- verbatim from the chunk labelled ch. 18 to ch. 19. Yonge's chapter numbers
-- differ from the canonical sections; the citation gives the canonical ones.
-- ============================================================

insert into public.exhibits
  (slug, title, summary, branch, thinkers, concepts, source_citation, source_passage,
   agora_prompt, kind, embed_url, status, sort_order)
values
  (
    'chrysippus-cylinder',
    $t$Chrysippus's Cylinder$t$,
    $t$A push starts the cylinder rolling, but it rolls the way it does because of its own shape, which is how an act can be wholly caused and still be yours.$t$,
    'ethics',
    array['Chrysippus', 'Cicero'],
    array['fate', 'assent', 'principal cause', 'auxiliary cause', 'responsibility'],
    'Cicero, On Fate 42 to 43',
    $t$As then, says he, a man who pushes a cylinder gives it a principle of motion, but not immediately that of revolution; so an object strikes our sense and conveys its image to our soul, yet leaves us free to form our specific sentiment concerning it; and, as has been said in the case of the cylinder which is set in motion from without, it will continue for the future to move according to its own proper force and nature.$t$,
    $t$Does Chrysippus's cylinder save responsibility, or only rename the problem?$t$,
    'web_embed',
    'https://academy.pursuearete.com/playground/chrysippus-cylinder',
    'gallery',
    10
  )
on conflict (slug) do nothing;
