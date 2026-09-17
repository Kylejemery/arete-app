alter table public.scribe_entries
  add column if not exists gaps_mode boolean not null default false;

create table if not exists public.retype_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  piece_id uuid references public.writing_pieces(id) on delete set null,
  original text not null,
  retyped text not null,
  source text not null default 'draft' check (source in ('draft', 'suggestion', 'voice')),
  created_at timestamptz not null default now()
);

create index if not exists retype_pairs_user_idx
  on public.retype_pairs(user_id, created_at desc);

alter table public.retype_pairs enable row level security;

drop policy if exists "Users manage their own retype pairs" on public.retype_pairs;
create policy "Users manage their own retype pairs"
  on public.retype_pairs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);