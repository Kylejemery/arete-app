-- Conversation with the Interlocutor, after the critique.
--
-- A critique is the opening move, not the whole exchange: the spec anticipates
-- the student pushing back and asking again ("Do this every time, including
-- when they insist"), which only happens across turns. Those turns are part of
-- the teaching record and belong in the history the profile is derived from.
--
-- A separate append-only table rather than a `conversation` column on
-- critique_history, because critique_history deliberately has no UPDATE policy:
-- a critique is a record of what was said, not a document. Rewriting the row to
-- append a turn would have meant handing back the update path that rule exists
-- to close. Here every turn is its own insert.

create table if not exists public.critique_messages (
  id          uuid primary key default gen_random_uuid(),
  critique_id uuid not null references public.critique_history(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.critique_messages enable row level security;

create policy "critique_messages_select_own" on public.critique_messages
  for select using (auth.uid() = user_id);

create policy "critique_messages_insert_own" on public.critique_messages
  for insert with check (auth.uid() = user_id);

create policy "critique_messages_delete_own" on public.critique_messages
  for delete using (auth.uid() = user_id);

-- No update policy, for the same reason critique_history has none.

create policy "critique_messages_admin_select" on public.critique_messages
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create index if not exists critique_messages_critique_idx
  on public.critique_messages (critique_id, created_at);
