create table if not exists calendar_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table calendar_data enable row level security;

create policy "Users can manage their own calendar data"
  on calendar_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
