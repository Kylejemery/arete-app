CREATE TABLE scrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  counselor TEXT NOT NULL CHECK (counselor IN ('marcus', 'epictetus', 'seneca')),
  goal_source TEXT,
  request_type TEXT NOT NULL DEFAULT 'auto' CHECK (request_type IN ('auto', 'requested')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scroll_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scroll_id UUID NOT NULL REFERENCES scrolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_count INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  first_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scroll_id, user_id)
);

ALTER TABLE scrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE scroll_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scrolls"
  ON scrolls FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own scroll reads"
  ON scroll_reads FOR ALL
  USING (auth.uid() = user_id);
