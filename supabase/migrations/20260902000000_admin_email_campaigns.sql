-- Admin email campaigns
--
-- Audit log for the admin console's Email tab (academy/web /admin/email),
-- which sends announcements from the owner's Gmail account to selected
-- members. One row per campaign; the send route creates it on the first
-- chunk and accumulates sent/failed counts across later chunks.
--
-- Service-role only: RLS is enabled with no policies, so neither anon nor
-- authenticated clients can read the roster of who was emailed.

create table if not exists public.admin_email_campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  body            text not null,
  format          text not null default 'text' check (format in ('text', 'html')),
  footer          text,
  audience        jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  sent_count      integer not null default 0,
  failed_count    integer not null default 0,
  failures        jsonb not null default '[]'::jsonb,
  is_test         boolean not null default false,
  sent_by         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists admin_email_campaigns_created_at_idx
  on public.admin_email_campaigns (created_at desc);

alter table public.admin_email_campaigns enable row level security;

revoke all on public.admin_email_campaigns from anon, authenticated;

comment on table public.admin_email_campaigns is
  'Audit log of admin-sent member emails (Email tab). Service role only.';
