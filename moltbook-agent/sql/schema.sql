-- Kill switch and budget. Flip enabled to false from the Supabase dashboard
-- to stop the agent within one tick, no redeploy needed.
create table if not exists agent_config (
  id              int primary key default 1,
  enabled         boolean not null default false,
  paused_reason   text,
  max_actions_day int not null default 12,
  updated_at      timestamptz not null default now(),
  constraint singleton check (id = 1)
);
insert into agent_config (id, enabled) values (1, false) on conflict do nothing;

-- Append-only action log. Never updated, only inserted.
create table if not exists agent_actions (
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
create index if not exists agent_actions_created_idx on agent_actions (created_at desc);
create index if not exists agent_actions_hash_idx on agent_actions (body_hash);

-- Everything the agent has already looked at, so it does not re-litigate.
create table if not exists seen_posts (
  post_id     text primary key,
  first_seen  timestamptz not null default now(),
  decision    text,
  submolt     text
);
