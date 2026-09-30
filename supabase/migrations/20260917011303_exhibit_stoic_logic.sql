-- ============================================================
-- Garden: The Five Indemonstrables joins Zeno's Hand under Logic.
--
-- Built at academy/web/src/app/playground/stoic-logic and released through
-- RELEASED_PLAYGROUND, so a web_embed row like the rest.
--
-- Branch is logic without argument for once: this is the logical division
-- itself, not a piece that borrows from it. It sits after Zeno's Hand at a
-- higher sort_order because the Hand is the criterion, which is where the
-- Stoics start, and this is the inference that runs on top of it.
--
-- Everything quoted in the exhibit is verbatim from R.D. Hicks's 1925
-- translation of Diogenes Laertius Book 7, which is public domain and in
-- rag_corpus: 7.66 to 7.68 on what can bear a truth value, 7.72 to 7.74 on
-- the connectives, 7.76 to 7.79 on moods and on arguments that only look
-- valid, and 7.79 to 7.81 on the five themselves. The modern names and the
-- contrast with Aristotle follow Benson Mates, Stoic Logic, which is in the
-- corpus as a summary rather than as his words, so it is cited and never
-- quoted.
-- ============================================================

insert into public.exhibits
  (slug, title, summary, branch, thinkers, concepts, source_citation, source_passage,
   agora_prompt, kind, embed_url, status, sort_order)
values
  (
    'stoic-logic',
    'The Five Indemonstrables',
    $t$The Stoics built the first logic of propositions in the West and ran it on five argument forms they held to be complete, then had it forgotten for two thousand years while Aristotle was taught in its place.$t$,
    'logic',
    array['Chrysippus', 'Philo the Megarian', 'Diodorus Cronus'],
    array['proposition', 'the indemonstrables', 'the conditional', 'disjunction', 'validity'],
    'Diogenes Laertius, Lives 7.80 to 7.81',
    $t$The first kind of indemonstrable statement is that in which the whole argument is constructed of a hypothetical proposition and the clause with which the hypothetical proposition begins, while the final clause is the conclusion; as e.g. "If the first, then the second; but the first is, therefore the second is."$t$,
    $t$Chrysippus claimed the five indemonstrables were complete. Was he right, and how would anyone now tell?$t$,
    'web_embed',
    'https://academy.pursuearete.com/playground/stoic-logic',
    'gallery',
    20
  )
on conflict (slug) do nothing;
