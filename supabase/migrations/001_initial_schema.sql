-- Arete App — Initial Database Schema
-- Run this in the Supabase SQL editor

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  expo_push_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on sign up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- user_settings
-- ============================================================
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  user_name text,
  user_goals text,
  kt_background text,
  kt_identity text,
  kt_goals text,
  kt_strengths text,
  kt_weaknesses text,
  kt_patterns text,
  kt_major_events text,
  future_self_years integer default 10,
  future_self_description text,
  cabinet_members jsonb default '["marcus","epictetus","goggins","roosevelt","futureSelf"]'::jsonb,
  morning_tasks jsonb default '[]'::jsonb,
  evening_tasks jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "Users can view own settings" on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on user_settings for update using (auth.uid() = user_id);

-- ============================================================
-- check_ins
-- ============================================================
create table check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('morning', 'evening')),
  user_input text not null,
  cabinet_response text not null,
  check_in_date date not null default current_date,
  created_at timestamptz default now()
);

alter table check_ins enable row level security;
create policy "Users can manage their own data" on check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- journal_entries
-- ============================================================
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('reflection', 'quote', 'idea', 'belief')),
  content text not null default '',
  book_title text,
  author text,
  raw_input text,
  dialogue_history jsonb,
  encoded_belief text,
  refined_statement text,
  virtue_check jsonb,
  belief_stage text,
  topic text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table journal_entries enable row level security;
create policy "Users can manage own journal entries" on journal_entries for all using (auth.uid() = user_id);

-- ============================================================
-- books
-- ============================================================
create table books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  author text,
  status text not null check (status in ('reading', 'finished', 'want_to_read')),
  started_at date,
  finished_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table books enable row level security;
create policy "Users can manage their own data" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- habits
-- ============================================================
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table habits enable row level security;
create policy "Users can manage their own data" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- habit_logs
-- ============================================================
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  logged_date date not null default current_date,
  created_at timestamptz default now(),
  unique(habit_id, logged_date)
);

alter table habit_logs enable row level security;
create policy "Users can manage their own data" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- milestones
-- ============================================================
create table milestones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  achieved_at date,
  is_achieved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table milestones enable row level security;
create policy "Users can manage their own data" on milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- weekly_reviews
-- ============================================================
create table weekly_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  generated_review text not null,
  created_at timestamptz default now()
);

alter table weekly_reviews enable row level security;
create policy "Users can manage their own data" on weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- sessions (app screen time tracking)
-- ============================================================
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer
);

alter table sessions enable row level security;
create policy "Users can manage their own data" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- beliefs
-- ============================================================
create table beliefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  raw_input text not null,
  dialogue_history jsonb not null default '[]',
  encoded_belief text not null,
  has_virtue_concern boolean default false,
  virtue_concern text,
  encoded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table beliefs enable row level security;
create policy "Users can manage their own data" on beliefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Enable real-time
-- ============================================================
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table check_ins;
alter publication supabase_realtime add table user_settings;
alter publication supabase_realtime add table habit_logs;
alter publication supabase_realtime add table milestones;
