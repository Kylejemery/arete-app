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
-- daily_checkins
-- ============================================================
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  morning_done boolean default false,
  morning_tasks jsonb,
  evening_done boolean default false,
  evening_tasks jsonb,
  reflection_answer text,
  stoic_answer text,
  streak integer default 0,
  reading_streak integer default 0,
  cabinet_morning_response text,
  cabinet_evening_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table daily_checkins enable row level security;
create policy "Users can manage own checkins" on daily_checkins for all using (auth.uid() = user_id);

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
-- cabinet_threads
-- ============================================================
create table cabinet_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  thread_id text not null,
  messages jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now(),
  unique(user_id, thread_id)
);

alter table cabinet_threads enable row level security;
create policy "Users can manage own threads" on cabinet_threads for all using (auth.uid() = user_id);

-- ============================================================
-- reading_data
-- ============================================================
create table reading_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  current_books jsonb default '[]'::jsonb,
  books_read jsonb default '[]'::jsonb,
  reading_sessions jsonb default '[]'::jsonb,
  today_reading_seconds integer default 0,
  today_reading_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reading_data enable row level security;
create policy "Users can manage own reading data" on reading_data for all using (auth.uid() = user_id);

-- ============================================================
-- calendar_data
-- ============================================================
create table calendar_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table calendar_data enable row level security;
create policy "Users can manage own calendar data" on calendar_data for all using (auth.uid() = user_id);

-- ============================================================
-- Enable real-time
-- ============================================================
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table daily_checkins;
alter publication supabase_realtime add table cabinet_threads;
alter publication supabase_realtime add table user_settings;
