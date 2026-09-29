-- ============================================================
-- Garden: "Who lived what they taught?" joins the Chrysippus Cylinder
-- under Ethics.
--
-- Built at academy/web/src/app/research/stoic-qca and shown in the
-- Playground at /playground/stoic-qca, released through
-- RELEASED_PLAYGROUND, so a web_embed row like the rest. The research route
-- stays canonical because sync_to_site.R writes the case data there; the
-- embed points at the Playground route for the back link to the app.
--
-- Branch is ethics: the outcome the paper scores is the one the ethics is
-- about, a life in agreement with what is taught, and the conditions it
-- tests (power, wealth, adversity, a court) are the indifferents that
-- ethics says should not decide it. It sits after the Cylinder at a higher
-- sort_order because the Cylinder is the doctrine of assent and character
-- and this is the record of who managed it.
--
-- The passage is verbatim from George Long's 1877 translation of Epictetus,
-- Discourses 2.19, which is public domain and in rag_corpus. It is the
-- challenge the paper takes up: Epictetus asks to be shown one Stoic
-- fashioned according to his doctrines, and the paper scores eighteen.
-- Ragin and Dusa, on the method, are cited on the page and never quoted.
-- ============================================================

insert into public.exhibits
  (slug, title, summary, branch, thinkers, concepts, source_citation, source_passage,
   agora_prompt, kind, embed_url, status, sort_order)
values
  (
    'stoic-qca',
    'Who Lived What They Taught?',
    $t$Eighteen Stoics, from Zeno to Marcus Aurelius, scored on power, wealth, adversity, lineage, vocation, and court service, to see which combinations of circumstance go with a life that matched the doctrine, and every score is yours to change.$t$,
    'ethics',
    array['Epictetus', 'Seneca', 'Cato the Younger', 'Rutilius Rufus', 'Marcus Aurelius', 'Persaeus'],
    array['living in agreement', 'moral progress', 'the sage', 'adversity', 'the indifferents'],
    'Epictetus, Discourses 2.19',
    $t$Who then is a Stoic? As we call a statue Phidiac, which is fashioned according to the art of Phidias; so show me a man who is fashioned according to the doctrines which he utters. Show me a man who is sick and happy, in danger and happy, dying and happy, in exile and happy, in disgrace and happy.$t$,
    $t$Seneca and Persaeus both served at a king's pleasure, and the sources judge them harshly. Was it the court that failed them, or would they have failed anywhere?$t$,
    'web_embed',
    'https://academy.pursuearete.com/playground/stoic-qca',
    'gallery',
    20
  )
on conflict (slug) do nothing;
