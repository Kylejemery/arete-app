-- The Log: Kyle's running commonplace book — journal entries, thoughts,
-- generated essays, clippings. Embedded on save so related items surface
-- over time and Scribe chat can search it as a tool. Same access model as
-- the other scribe_* tables: RLS with no policies, service-role only.

create table scribe_log_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('journal','thought','essay','clipping')),
  title text,
  content text not null,
  source_url text,          -- where a clipping/essay came from, if anywhere
  entry_date date not null default current_date, -- when it was written, not typed in
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scribe_log_items_date_idx on scribe_log_items(entry_date desc, created_at desc);

alter table scribe_log_items enable row level security;

create or replace function match_scribe_log_items(
  query_embedding vector(1536),
  match_count int default 8,
  exclude_id uuid default null
)
returns table (
  id uuid,
  kind text,
  title text,
  content text,
  entry_date date,
  similarity float
)
language sql stable
as $$
  select
    i.id, i.kind, i.title, i.content, i.entry_date,
    1 - (i.embedding <=> query_embedding) as similarity
  from scribe_log_items i
  where i.embedding is not null
    and (exclude_id is null or i.id <> exclude_id)
  order by i.embedding <=> query_embedding
  limit match_count;
$$;
