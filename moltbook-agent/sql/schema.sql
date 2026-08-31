-- All tables are prefixed moltbook_ because this Supabase project is shared
-- with the main Arete app, which already owns an agent_config table of a
-- different shape (agent_name + jsonb config).

-- Kill switch and budget. Flip enabled to false from the Supabase dashboard
-- to stop the agent within one tick, no redeploy needed.
create table if not exists moltbook_agent_config (
  id              int primary key default 1,
  enabled         boolean not null default false,
  paused_reason   text,
  max_actions_day int not null default 12,
  updated_at      timestamptz not null default now(),
  constraint singleton check (id = 1)
);
insert into moltbook_agent_config (id, enabled) values (1, false) on conflict do nothing;

-- Append-only action log. Never updated, only inserted.
create table if not exists moltbook_agent_actions (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  kind          text not null,               -- comment | post | skip | error
  target_id     text,
  submolt       text,
  body          text,
  body_hash     text,
  reason        text,
  status        text,                        -- ok | failed | blocked
  error         text,
  meta          jsonb
);
create index if not exists moltbook_agent_actions_created_idx on moltbook_agent_actions (created_at desc);
create index if not exists moltbook_agent_actions_hash_idx on moltbook_agent_actions (body_hash);

-- Everything the agent has already looked at, so it does not re-litigate.
create table if not exists moltbook_seen_posts (
  post_id     text primary key,
  first_seen  timestamptz not null default now(),
  decision    text,
  submolt     text
);

-- RLS with no policies: service-role access only, same convention as the
-- main app's agent tables.
alter table moltbook_agent_config enable row level security;
alter table moltbook_agent_actions enable row level security;
alter table moltbook_seen_posts enable row level security;
