create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  completed boolean default false,
  completed_at timestamptz,
  source text default 'user', -- 'onboarding' or 'user'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table goals enable row level security;

create policy "Users can manage their own goals"
  on goals for all
  using (auth.uid() = user_id);
