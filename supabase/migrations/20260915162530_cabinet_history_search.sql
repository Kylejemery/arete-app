-- Cabinet chat history for the academy writing surfaces (Scribe, Scribe chat,
-- the Composer). cabinet_conversations keeps one jsonb thread per row, and the
-- mobile client has saved many snapshot rows of the same thread, so one message
-- can sit in dozens of rows. This function flattens a user's rows, dedupes each
-- message on (thread, timestamp, role, content), labels the speaker, and
-- returns the messages that match a full-text query (or the most recent ones
-- when the query is empty), each with the message before and after it in its
-- thread, so a hit reads as an exchange rather than a stray line.
--
-- Service-role only: the academy routes call it through the admin client with
-- an explicit user id. It is not exposed to authenticated users, and it never
-- writes; cabinet_conversations itself is untouched.

create or replace function public.cabinet_history_search(
  p_user_id uuid,
  p_query text default null,
  p_limit integer default 12,
  p_since timestamptz default null
)
returns table (
  thread text,
  sent_at timestamptz,
  role text,
  speaker text,
  content text,
  prev_speaker text,
  prev_content text,
  next_speaker text,
  next_content text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with flat as (
    select distinct on (x.thread, x.sent_at, x.role, md5(x.content))
      x.*
    from (
      select
        coalesce(array_to_string(c.counselor_slugs, '+'), 'cabinet') as thread,
        c.counselor_slugs[1] as slug,
        case
          when jsonb_typeof(m->'timestamp') = 'number'
            then to_timestamp((m->>'timestamp')::numeric / 1000.0)
          else c.updated_at
        end as sent_at,
        coalesce(m->>'role', 'user') as role,
        coalesce(m->>'content', m->>'text', '') as content,
        m->>'counselorName' as counselor_name,
        c.updated_at as row_updated_at
      from cabinet_conversations c
      cross join lateral jsonb_array_elements(c.messages) m
      where c.user_id = p_user_id
        and jsonb_typeof(c.messages) = 'array'
        and jsonb_typeof(m) = 'object'
    ) x
    where x.content <> ''
    order by x.thread, x.sent_at, x.role, md5(x.content), x.row_updated_at desc
  ),
  labelled as (
    select
      f.thread, f.sent_at, f.role, f.content,
      case
        when f.role = 'user' then 'user'
        else coalesce(
          f.counselor_name,
          (select k.name from counselors k where k.slug = f.slug),
          case when f.slug is null then 'The Cabinet' else initcap(replace(f.slug, '-', ' ')) end
        )
      end as speaker
    from flat f
  ),
  ordered as (
    select
      l.*,
      lag(l.speaker) over w as prev_speaker,
      lag(l.content) over w as prev_content,
      lead(l.speaker) over w as next_speaker,
      lead(l.content) over w as next_content
    from labelled l
    window w as (partition by l.thread order by l.sent_at, l.role desc)
  )
  select
    o.thread, o.sent_at, o.role, o.speaker, o.content,
    o.prev_speaker, o.prev_content, o.next_speaker, o.next_content,
    case
      when p_query is null or btrim(p_query) = '' then 0::real
      else ts_rank(to_tsvector('english', o.content), websearch_to_tsquery('english', p_query))
    end as rank
  from ordered o
  where (p_since is null or o.sent_at >= p_since)
    and (
      p_query is null or btrim(p_query) = ''
      or to_tsvector('english', o.content) @@ websearch_to_tsquery('english', p_query)
    )
  order by rank desc, o.sent_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 60));
$$;

revoke all on function public.cabinet_history_search(uuid, text, integer, timestamptz) from public;
revoke all on function public.cabinet_history_search(uuid, text, integer, timestamptz) from anon;
revoke all on function public.cabinet_history_search(uuid, text, integer, timestamptz) from authenticated;
grant execute on function public.cabinet_history_search(uuid, text, integer, timestamptz) to service_role;
