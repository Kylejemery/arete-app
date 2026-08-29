-- Account deletion (App Review 5.1.1(v)) — make auth.admin.deleteUser()
-- actually succeed. Four FKs to auth.users were NO ACTION and would abort
-- the delete:
--   conversation_memory.user_id / distress_review_queue.user_id — the user's
--   own rows (the distress queue is the most sensitive data we hold; it MUST
--   go with the account) → CASCADE.
--   session_participants.invited_by / session_progress.graded_by — references
--   to ANOTHER user living in someone else's row; deleting the referenced
--   account must not destroy the other person's data → SET NULL.
-- Tables with user_id but no FK at all (cabinet_conversations, beliefs,
-- check_ins, ...) are deleted explicitly by /api/delete-account.

ALTER TABLE conversation_memory DROP CONSTRAINT conversation_memory_user_id_fkey;
ALTER TABLE conversation_memory ADD CONSTRAINT conversation_memory_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE distress_review_queue DROP CONSTRAINT distress_review_queue_user_id_fkey;
ALTER TABLE distress_review_queue ADD CONSTRAINT distress_review_queue_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE session_participants ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE session_participants DROP CONSTRAINT session_participants_invited_by_fkey;
ALTER TABLE session_participants ADD CONSTRAINT session_participants_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE session_progress ALTER COLUMN graded_by DROP NOT NULL;
ALTER TABLE session_progress DROP CONSTRAINT session_progress_graded_by_fkey;
ALTER TABLE session_progress ADD CONSTRAINT session_progress_graded_by_fkey
  FOREIGN KEY (graded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
