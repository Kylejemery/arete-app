-- Mates's Outlines of Pyrrhonism (The Skeptic Way, OUP 1996) in
-- research_sources: deprecated (Kyle, 2026-10-05). The copy is a Word-derived
-- OCR transcription from an openlms.elearningmedia.es course page, of unknown
-- origin and with no page images; its provenance cannot be documented. No
-- ledger entry or proposal cites it: Bury's Loeb (research_sources 937d0561)
-- replaced it for the PH II quotations. Deprecated, not deleted, so the change
-- stays reversible and auditable.
UPDATE public.research_sources
SET deprecated = true,
    notes = coalesce(notes || ' ', '') || 'Deprecated 2026-10-05 (Kyle): provenance cannot be documented; superseded for PH II by Bury, research_sources 937d0561-1290-422a-a887-81a8678dbfcc.'
WHERE id = 'f18c0230-bc6e-44be-865e-04e61e22de55'
  AND translator = 'Benson Mates'
  AND deprecated = false;
