-- measured_profiles was created before the age gate (run B, Part B5), and a
-- view's column list is fixed when it is created, so age_band, age_band_set_at,
-- locked_at and locked_reason were not visible through it. Recreated with the
-- same filter and the new columns appended.
CREATE OR REPLACE VIEW public.measured_profiles
WITH (security_invoker = true) AS
SELECT id, email, expo_push_token, created_at, updated_at, is_premium,
       know_thyself_complete, subscription_tier, daily_message_count,
       message_count_date, streak, streak_last_incremented_date, tier, handle,
       is_admin, email_opt_out, email_opt_out_at, is_internal,
       age_band, age_band_set_at, locked_at, locked_reason
  FROM public.profiles
 WHERE is_admin IS NOT TRUE AND is_internal IS NOT TRUE;
