CREATE TABLE IF NOT EXISTS oracle_rate_limits (
  ip_address text PRIMARY KEY,
  query_count int DEFAULT 1,
  window_date date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION upsert_oracle_rate_limit(p_ip text)
RETURNS int
LANGUAGE sql
AS $$
  INSERT INTO oracle_rate_limits (ip_address, query_count, window_date)
  VALUES (p_ip, 1, CURRENT_DATE)
  ON CONFLICT (ip_address) DO UPDATE SET
    query_count = CASE
      WHEN oracle_rate_limits.window_date = CURRENT_DATE
        THEN oracle_rate_limits.query_count + 1
      ELSE 1
    END,
    window_date = CURRENT_DATE,
    updated_at = now()
  RETURNING oracle_rate_limits.query_count;
$$;
