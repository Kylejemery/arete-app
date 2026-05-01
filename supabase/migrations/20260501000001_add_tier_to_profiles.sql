ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';
UPDATE profiles SET tier = 'free' WHERE tier IS NULL;
