-- Observatory Living Sky — Part 7: touch-a-star passage retrieval rate limit
--
-- Same shape and pattern as oracle_rate_limits / upsert_oracle_rate_limit,
-- but its own table so a taste of the Observatory never consumes Oracle
-- quota. The server enforces 10/day per IP.
create table if not exists observatory_rate_limits (
  ip_address text primary key,
  query_count integer not null default 0,
  window_date date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table observatory_rate_limits enable row level security;

create or replace function upsert_observatory_rate_limit(p_ip text)
returns integer
language sql
as $$
  insert into observatory_rate_limits (ip_address, query_count, window_date)
  values (p_ip, 1, current_date)
  on conflict (ip_address) do update set
    query_count = case
      when observatory_rate_limits.window_date = current_date
        then observatory_rate_limits.query_count + 1
      else 1
    end,
    window_date = current_date,
    updated_at = now()
  returning observatory_rate_limits.query_count;
$$;
