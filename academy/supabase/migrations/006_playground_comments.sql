-- Playground: the corpus discussion board.
--
-- One table backs every discussion thread across the AI playground — the
-- perspective essays and the situations game — keyed by `thread_key`
-- (e.g. 'perspective:the-notebook-and-the-tapes' or 'situation:the-slow-line').
--
-- A visitor posts a comment (optionally taking a stance), and the corpus
-- answers it; the corpus reply is a second row with author_role='corpus' and
-- parent_id pointing back at the visitor's comment.
--
-- RLS: anyone may READ the board (it is a public surface, like Perspectives and
-- the Library). Writes are performed only by the server via the service-role
-- key (which bypasses RLS), so there is no anon INSERT policy — the browser can
-- never write directly, which keeps the corpus reply and the rate limit under
-- server control.

create table if not exists public.playground_comments (
  id          uuid primary key default gen_random_uuid(),
  thread_key  text not null,
  author_role text not null default 'visitor'
              check (author_role in ('visitor', 'corpus')),
  author_name text,
  stance      text check (stance in ('agree', 'disagree', 'unsure')),
  body        text not null check (char_length(body) between 1 and 4000),
  parent_id   uuid references public.playground_comments(id) on delete cascade,
  sources     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists playground_comments_thread_idx
  on public.playground_comments (thread_key, created_at);

alter table public.playground_comments enable row level security;

drop policy if exists "playground_comments public read" on public.playground_comments;
create policy "playground_comments public read"
  on public.playground_comments
  for select
  using (true);
