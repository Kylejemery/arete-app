-- ----------------------------------------------------------------
-- 20260427000000_subscription_tiers.sql
-- Three-tier subscription system: free, arete, pro
-- All existing users default to 'arete' for beta testing
-- ----------------------------------------------------------------

-- Add subscription fields to profiles
alter table profiles
  add column if not exists subscription_tier text not null default 'arete'
    check (subscription_tier in ('free', 'arete', 'pro')),
  add column if not exists daily_message_count integer not null default 0,
  add column if not exists message_count_date date;

-- Backfill: set all existing users to arete tier for beta
update profiles set subscription_tier = 'arete' where true;
