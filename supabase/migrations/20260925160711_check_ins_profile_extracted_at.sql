-- Activation plan, Part 3: the hourly conversation cycle reads that day's
-- check-in text once, alongside the conversation, for Know Thyself
-- extraction. This marks when it last did, so an unchanged check-in is not
-- read twice.
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS profile_extracted_at timestamptz;
COMMENT ON COLUMN check_ins.profile_extracted_at IS
  'When the conversation cycle last read this check-in for Know Thyself extraction (server/lib/profile-extraction.js).';
