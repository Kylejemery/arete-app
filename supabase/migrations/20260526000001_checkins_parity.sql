-- ============================================================
-- check_ins parity — 2026-05-26
--
-- Aligns the check_ins table with the mobile app's upsert model:
-- one row per (user_id, check_in_date) containing task state in
-- JSONB columns so morning/evening checklist completion syncs
-- across mobile and web in real time.
--
-- Migration strategy:
--   1. Make the legacy event-log columns (type, user_input,
--      cabinet_response) nullable so new state rows don't need them.
--   2. Add task-state columns.
--   3. Consolidate legacy event rows: for each (user_id, check_in_date)
--      pair, fold the evening row into the morning row then delete it,
--      producing one canonical row per day.
--   4. Add the UNIQUE constraint required by ON CONFLICT upsert.
-- ============================================================

-- 1. Make legacy columns nullable
ALTER TABLE check_ins
  ALTER COLUMN type             DROP NOT NULL,
  ALTER COLUMN user_input       DROP NOT NULL,
  ALTER COLUMN cabinet_response DROP NOT NULL;

-- 2. Add task-state columns
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS morning_done              boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS morning_tasks             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evening_done              boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evening_tasks             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cabinet_morning_response  text,
  ADD COLUMN IF NOT EXISTS cabinet_evening_response  text,
  ADD COLUMN IF NOT EXISTS updated_at               timestamptz DEFAULT now();

-- 3a. Fold evening rows into their paired morning row
UPDATE check_ins m
SET
  evening_done              = true,
  cabinet_evening_response  = e.cabinet_response
FROM check_ins e
WHERE m.user_id       = e.user_id
  AND m.check_in_date = e.check_in_date
  AND m.type          = 'morning'
  AND e.type          = 'evening';

-- 3b. Mark morning rows as done and copy cabinet response
UPDATE check_ins
SET
  morning_done             = true,
  cabinet_morning_response = cabinet_response
WHERE type = 'morning';

-- 3c. Delete evening rows that were merged into a morning row
DELETE FROM check_ins ev
WHERE ev.type = 'evening'
  AND EXISTS (
    SELECT 1 FROM check_ins m
    WHERE m.user_id       = ev.user_id
      AND m.check_in_date = ev.check_in_date
      AND m.type          = 'morning'
  );

-- 3d. Convert remaining standalone evening rows (no morning pair)
UPDATE check_ins
SET
  evening_done              = true,
  cabinet_evening_response  = cabinet_response,
  type                      = NULL
WHERE type = 'evening';

-- 3e. Clear type discriminator on all remaining (formerly morning) rows
UPDATE check_ins SET type = NULL WHERE type = 'morning';

-- 4. Add unique constraint (enables ON CONFLICT upsert by both apps)
ALTER TABLE check_ins
  ADD CONSTRAINT check_ins_user_date_unique UNIQUE (user_id, check_in_date);
