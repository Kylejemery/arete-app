-- Tier consolidation + entitlement lockdown
--
-- Background: profiles carried three overlapping columns — tier, is_premium,
-- and subscription_tier. Mobile gating read subscription_tier; nothing ever
-- wrote it; its default was 'arete' (a paid tier). Every mobile user
-- therefore resolved to the paid tier and the paywall gated nothing.
--
-- Web (and the Stripe webhook) already use tier + is_premium. This migration
-- makes those two the single source of truth, grandfathers the users who have
-- been enjoying paid features under the old default, and closes the RLS hole
-- that let any authenticated client grant itself a tier.
--
-- The 2026-08-25 cutoff pins the grandfather clause to the 43 profiles that
-- existed when this was written. Anyone who signs up afterwards is gated.

begin;

-- ---------------------------------------------------------------------------
-- 1. Grandfather existing free users
-- ---------------------------------------------------------------------------
-- These users have had 50 messages/day and the full counselor library because
-- of the subscription_tier default. Rather than claw that back, record it as
-- an explicit manual grant. billing_source='manual' is the guard the Stripe
-- webhook already honours (see REVOKE_STATUSES handling) — it will never
-- downgrade a profile that has a manual or apple row.

insert into public.subscriptions (user_id, billing_source, tier, status)
select p.id, 'manual', 'premium', 'active'
from public.profiles p
where p.tier = 'free'
  and p.created_at < '2026-08-25T00:00:00Z'
  and not exists (
    select 1 from public.subscriptions s
    where s.user_id = p.id and s.billing_source = 'manual'
  );

update public.profiles p
set tier = 'premium',
    is_premium = true,
    updated_at = now()
where p.tier = 'free'
  and p.created_at < '2026-08-25T00:00:00Z'
  and exists (
    select 1 from public.subscriptions s
    where s.user_id = p.id and s.billing_source = 'manual'
  );

-- ---------------------------------------------------------------------------
-- 2. Reconcile the two entitlement columns
-- ---------------------------------------------------------------------------
-- Five rows carried tier='premium' with is_premium=false. Web's OR logic
-- unlocked them; mobile's is_premium-only read did not. Write both together
-- from here on, exactly as the Stripe webhook does.

update public.profiles
set is_premium = true,
    updated_at = now()
where tier in ('premium', 'pro', 'arete', 'scholar')
  and is_premium is distinct from true;

update public.profiles
set is_premium = false,
    updated_at = now()
where tier = 'free'
  and is_premium is distinct from false;

-- ---------------------------------------------------------------------------
-- 3. Deprecate subscription_tier
-- ---------------------------------------------------------------------------
-- No longer read by any code path. The paid default is what caused the open
-- gate, so neutralize it now; drop the column once this has been running
-- cleanly in production for a release or two.

alter table public.profiles alter column subscription_tier set default 'free';

update public.profiles
set subscription_tier = 'free'
where subscription_tier is distinct from 'free';

comment on column public.profiles.subscription_tier is
  'DEPRECATED 2026-08-25 — superseded by tier + is_premium. No longer read. Safe to drop.';

-- ---------------------------------------------------------------------------
-- 4. Lock entitlement columns to the service role
-- ---------------------------------------------------------------------------
-- anon and authenticated held UPDATE on every column of profiles, including
-- tier, is_premium and is_admin, under a policy with no WITH CHECK. Any signed
-- in user could hand themselves a paid tier — or admin. Postgres has no
-- column-level RLS, so the fix is column-level GRANTs: revoke the blanket
-- UPDATE and re-grant only the columns the clients legitimately write.
--
-- Kept client-writable (see lib/db.ts and web/src/lib/db.ts):
--   streak, streak_last_incremented_date  — incrementStreak()
--   daily_message_count, message_count_date — checkAndIncrementMessageCount()
--   know_thyself_complete                 — saveOnboardingProfile()
--   handle                                — courtyard profile edit
--   expo_push_token                       — push registration
--   updated_at                            — written alongside the above
--
-- Locked to service_role: id, email, created_at, tier, is_premium,
-- subscription_tier, is_admin.

revoke update on public.profiles from anon, authenticated;

grant update (
  expo_push_token,
  know_thyself_complete,
  handle,
  daily_message_count,
  message_count_date,
  streak,
  streak_last_incremented_date,
  updated_at
) on public.profiles to authenticated;

-- Add the missing WITH CHECK so a user cannot rewrite a row's id and
-- reassign it to somebody else.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

commit;
