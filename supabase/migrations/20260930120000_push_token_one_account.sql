-- A push token identifies a device, and a device pushes to exactly one
-- account: the one signed in on it. Five accounts sharing one phone's token
-- meant every dispatch and broadcast arrived once per account.
--
-- POST /api/user/push-token now releases the token from every other row
-- before saving it, and DELETE /api/user/push-token (called on sign-out)
-- clears it. This index makes the rule hold at the database as well.
--
-- Partial so the many rows with no token do not collide with each other.
-- Existing duplicates must be resolved before this applies (done by hand for
-- the test accounts that shared Kyle's phone; the index creation fails loudly
-- if any remain).

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_expo_push_token_unique
  ON user_settings (expo_push_token)
  WHERE expo_push_token IS NOT NULL;
