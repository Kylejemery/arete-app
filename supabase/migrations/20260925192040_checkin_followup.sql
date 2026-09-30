-- Retention plan R8: the Yesterday card on Home.
--
-- When the evening check-in completes (or at the first open the next day),
-- POST /api/checkin/followup asks a Cabinet member for one line about that
-- day's intention, at most 25 words, ending in a question, and stores it on
-- the day's check_ins row. Home shows it the next morning beside the user's
-- own intention, with an Answer button into the Cabinet.
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS followup_line text;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS followup_counselor text;
