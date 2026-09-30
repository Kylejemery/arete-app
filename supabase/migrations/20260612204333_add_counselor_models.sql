alter table public.user_settings
  add column if not exists counselor_models jsonb not null default '{}'::jsonb;
