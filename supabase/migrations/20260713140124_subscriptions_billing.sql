-- Subscriptions: one row per user per billing source.
-- billing_source is the source-of-truth guard: the Stripe webhook must never
-- overwrite or downgrade rows whose billing_source is 'apple' or 'manual'.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  price_id text,
  tier text,
  billing_source text not null default 'stripe'
    check (billing_source in ('stripe', 'apple', 'manual')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One Stripe subscription row per user
create unique index subscriptions_user_stripe_unique
  on public.subscriptions (user_id)
  where billing_source = 'stripe';

-- Webhook lookups by Stripe ids
create index subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

create unique index subscriptions_stripe_subscription_unique
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;

-- Users can read their own subscription rows. All writes go through the
-- service role (which bypasses RLS) — deliberately no insert/update/delete
-- policies for authenticated users.
create policy "Users can read own subscriptions"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);
