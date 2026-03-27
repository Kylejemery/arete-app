-- Add onboarding completion flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS know_thyself_complete boolean DEFAULT false;

-- Add onboarding output fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS kt_life_situation text,
ADD COLUMN IF NOT EXISTS feedback_preference text,
ADD COLUMN IF NOT EXISTS app_usage_intent text,
ADD COLUMN IF NOT EXISTS accountability_style text,
ADD COLUMN IF NOT EXISTS recommended_readings jsonb,
ADD COLUMN IF NOT EXISTS archetype text;
