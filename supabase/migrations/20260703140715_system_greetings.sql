-- Observatory Living Sky — Part 5: daily greeting line
--
-- One row per UTC day: the composed present-tense greeting the Observatory
-- speaks. Durable so the line survives Railway redeploys; the server also
-- keeps it in memory. Service-role only.
create table if not exists system_greetings (
  id uuid primary key default gen_random_uuid(),
  greeting_date date not null unique,
  line text not null,
  created_at timestamptz not null default now()
);

alter table system_greetings enable row level security;
