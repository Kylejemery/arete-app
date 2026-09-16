-- ============================================================
-- The Garden: the exhibit registry.
--
-- An exhibit is one interactive piece. Every piece in the Garden is a row
-- here, and the Garden index is generated entirely from this table — no
-- exhibit is ever hardcoded into a list. Adding a piece to the Garden is
-- inserting a row; releasing it is one field.
--
-- The organizing principle is the Stoics' own: they likened philosophy to
-- a fertile field, "in which logic is the fence which goes round it,
-- ethics are the fruit, and natural philosophy the soil, or the
-- fruit-trees" (Diogenes Laertius, Lives of Eminent Philosophers, Life of
-- Zeno XXXIII, tr. C.D. Yonge 1853 — in rag_corpus). Hence `branch`, and
-- hence exactly three of them.
--
-- Status is the gate:
--   workshop  not listed anywhere. Reachable only by exhibit_by_slug()
--             below, so a piece can be tested at a known URL while it is
--             still being filled in.
--   gallery   listed in the Garden index and publicly readable.
--
-- PRIVACY: exhibits are a public surface, and no exhibit may display
-- user-derived content. That rule is structural here — this table has no
-- user_id, no author, no free-text column a reader can reach, and no
-- INSERT/UPDATE/DELETE policy for anon or authenticated. Writes happen
-- only through the service role, which bypasses RLS. There is deliberately
-- no user-facing write path to add one later without a migration.
--
-- Kinds:
--   native      rendered in-app from a component looked up by
--               component_key in exhibits/registry.ts
--   web_embed   embed_url in a WebView (mobile) or an iframe (web)
--   external    embed_url opened in the in-app browser
-- ============================================================

create table if not exists public.exhibits (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,                 -- one line: the idea in plain English
  branch text not null check (branch in ('logic','physics','ethics')),
  thinkers text[] not null default '{}',
  concepts text[] not null default '{}',
  source_citation text,                  -- e.g. Cicero, On Fate 42 to 43
  source_passage text,                   -- short passage shown on the exhibit page
  academy_path text,                     -- optional deep link to a related Academy session
  agora_prompt text,                     -- optional prompt that opens the Agora composer
  kind text not null check (kind in ('native','web_embed','external')),
  component_key text,                    -- for kind = native
  embed_url text,                        -- for kind = web_embed or external
  status text not null default 'workshop' check (status in ('workshop','gallery')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A row must carry what its kind needs to render at all. Metadata
-- completeness (branch, summary, source) is the gallery bar and is checked
-- below; this is only the can-it-render bar.
alter table public.exhibits drop constraint if exists exhibits_kind_target_check;
alter table public.exhibits add constraint exhibits_kind_target_check check (
  case kind
    when 'native' then component_key is not null
    else embed_url is not null
  end
);

-- The standing rule from the playbook, enforced rather than remembered:
-- no exhibit enters the gallery without its branch, summary, and source.
-- (branch and summary are already NOT NULL; this adds the source and
-- rejects whitespace-only values.)
alter table public.exhibits drop constraint if exists exhibits_gallery_complete_check;
alter table public.exhibits add constraint exhibits_gallery_complete_check check (
  status <> 'gallery' or (
    btrim(summary) <> ''
    and source_citation is not null and btrim(source_citation) <> ''
  )
);

-- The index's one query: gallery rows, in sort order.
create index if not exists exhibits_gallery_order_idx
  on public.exhibits (status, sort_order, title);

create or replace function public.exhibits_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exhibits_touch_updated_at on public.exhibits;
create trigger exhibits_touch_updated_at
  before update on public.exhibits
  for each row execute function public.exhibits_touch_updated_at();

alter table public.exhibits enable row level security;

-- The only policy. Gallery rows are world-readable; workshop rows are not
-- readable through the table at all, by anyone but the service role.
drop policy if exists "public reads gallery exhibits" on public.exhibits;
create policy "public reads gallery exhibits"
  on public.exhibits for select
  using (status = 'gallery');

-- Unlisted but reachable: fetching one exhibit by an exact slug returns it
-- whatever its status, which is what makes a workshop exhibit testable at a
-- known link without ever appearing in a list. SECURITY DEFINER so it sees
-- past the policy above; it takes an exact slug and returns at most one row,
-- so the workshop set cannot be enumerated or pattern-matched through it.
-- search_path is pinned to avoid search_path games.
create or replace function public.exhibit_by_slug(p_slug text)
returns setof public.exhibits
language sql
stable
security definer
set search_path = public
as $$
  select * from public.exhibits where slug = p_slug limit 1;
$$;

revoke all on function public.exhibit_by_slug(text) from public;
grant execute on function public.exhibit_by_slug(text) to anon, authenticated;

comment on table public.exhibits is
  'The Garden: one row per interactive exhibit. Service-role writes only; no user-derived content by construction. Branch follows the Stoic division of philosophy (Diogenes Laertius 7.40).';
comment on column public.exhibits.status is
  'workshop = unlisted, reachable only via exhibit_by_slug(); gallery = listed in the Garden index and world-readable.';
