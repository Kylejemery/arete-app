create table if not exists public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  message text,
  name text,
  stack text,
  is_fatal boolean default false,
  at text,
  phase text,
  launch_id text,
  received_at timestamptz default now()
);

-- Server writes with the service role key (bypasses RLS). Lock out
-- anon/authenticated clients entirely.
alter table public.crash_reports enable row level security;
