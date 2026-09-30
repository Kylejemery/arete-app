-- Scribe chat mode: conversational essay development alongside the pipeline.
-- Same access model as the other scribe_* tables: RLS enabled with NO policies,
-- so anon/authenticated are denied and all access flows through the
-- service-role client behind requireAdmin().

create table scribe_entries (
  id uuid primary key default gen_random_uuid(),
  title text,
  raw_text text not null, -- Kyle's journal fragment, verbatim, never altered
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scribe_messages (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references scribe_entries(id) on delete cascade,
  role text not null check (role in ('user','scribe')),
  content text not null,
  -- for scribe turns: [{author, work, chunk_id, section_label, translator, mode: 'quote'|'paraphrase'}]
  sources_used jsonb,
  created_at timestamptz not null default now()
);
create index scribe_messages_entry_idx on scribe_messages(entry_id, created_at);

-- Snapshots of the working essay ("scribe_drafts" is taken by the pipeline).
create table scribe_entry_drafts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references scribe_entries(id) on delete cascade,
  stage text not null check (stage in ('middle','full')),
  draft_text text not null,
  sources_used jsonb,
  created_at timestamptz not null default now()
);
create index scribe_entry_drafts_entry_idx on scribe_entry_drafts(entry_id, created_at);

alter table scribe_entries enable row level security;
alter table scribe_messages enable row level security;
alter table scribe_entry_drafts enable row level security;
