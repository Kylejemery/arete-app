-- Correct the Q05 position registered for Bréhier's Chrysippe (French text)
-- at its promotion on 2026-09-28. It read "The passion as a sickness of the
-- soul: a judgment of reason gone excessive, …". On a full reading
-- (pp. 248-262, see docs/corpus/summaries/brehier-chrysippe-1910.md)
-- Bréhier argues that for Chrysippus sickness of the soul is the effect of
-- lasting passion, not its nature, and that the passion-judgment is not the
-- value opinion but the judgment that agitation is fitting. Same wording as
-- the English summary's registration. Only the position text changes.

update public.corpus_question_registrations
set position = 'For Chrysippus the passion is a judgment, but not the opinion that something is good or evil: it is the further judgment that it is fitting to be agitated by it, a weak supposition that shows the soul''s failure to resist rather than ignorance. The soul is one reason with no irrational part, so the passion is in our power and is cured by correcting that judgment.',
    note = coalesce(note, '') || ' Position corrected 2026-09-28 after a full reading of pp. 248-262.'
where question_id = 'Q05'
  and author = 'Émile Bréhier'
  and work = 'Chrysippe';
