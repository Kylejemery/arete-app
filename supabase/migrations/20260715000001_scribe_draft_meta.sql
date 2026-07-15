-- Scribe drafts: structured per-format extras (subject lines, preview text,
-- pull-quote suggestions, social post variants) live in meta rather than
-- being stuffed into model_notes.
ALTER TABLE scribe_drafts ADD COLUMN IF NOT EXISTS meta JSONB;
