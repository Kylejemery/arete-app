-- Run this in your Supabase SQL editor or as a migration
-- Stores a history of all posts scheduled through the admin dashboard

create table if not exists scheduled_posts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  text         text not null,
  scheduled_at timestamptz,
  schedule_type text,
  created_at   timestamptz default now()
);

-- Only the service role / admin can read/write
alter table scheduled_posts enable row level security;

create policy "Admin only" on scheduled_posts
  for all
  using (auth.email() = current_setting('app.admin_email', true));
