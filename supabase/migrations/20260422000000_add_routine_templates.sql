create table routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('morning', 'evening')),
  title text not null,
  emoji text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table routine_templates enable row level security;

create policy "Users manage their own templates"
  on routine_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
