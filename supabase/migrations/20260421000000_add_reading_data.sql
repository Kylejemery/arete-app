create table reading_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_books jsonb default '[]',
  books_read jsonb default '[]',
  reading_sessions jsonb default '[]',
  today_reading_seconds integer default 0,
  today_reading_date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reading_data enable row level security;

create policy "Users can manage their own reading data"
  on reading_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
