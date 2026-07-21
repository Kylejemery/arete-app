-- Longitudinal portrait — user-facing read access.
--
-- 20260701000000_user_longitudinal_models.sql enabled RLS on both tables with no
-- policies (service-role only) and deferred self-read "when the user-facing
-- mobile view lands". It has landed (app/portrait.tsx), so grant it here.
--
-- SELECT only. The weekly agent writes with the service role, which bypasses
-- RLS; nothing else may write. A user can read their own row and their own
-- history snapshots, and no one else's.

DROP POLICY IF EXISTS "Users read own longitudinal model" ON user_longitudinal_models;
CREATE POLICY "Users read own longitudinal model"
  ON user_longitudinal_models
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own longitudinal history" ON longitudinal_model_history;
CREATE POLICY "Users read own longitudinal history"
  ON longitudinal_model_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
