import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadJournal } from '@/lib/observatory'

export const dynamic = 'force-dynamic'

// The Comments tab: moderation for reader comments on Observatory pieces
// (observatory_comments). Admin-gated, same ADMIN_EMAIL pattern as the other
// admin routes. Reads and writes with the service role, which sees hidden
// rows and is the one writer the table's trigger lets change `hidden`
// (supabase/migrations/20261001165829_observatory_comments.sql).
//
// GET   ?filter=all|visible|hidden|removed  → { comments, counts }
// PATCH { id, hidden }                      → { comment }
//
// Nothing here deletes. Hiding takes a comment off the site and is undone by
// unhiding it.

type Filter = 'all' | 'visible' | 'hidden' | 'removed'
const FILTERS: Filter[] = ['all', 'visible', 'hidden', 'removed']
const COLUMNS = 'id, piece_kind, piece_id, parent_id, user_id, handle, body, removed_at, hidden, created_at, updated_at, is_corpus, sources'
const LIMIT = 200

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const raw = request.nextUrl.searchParams.get('filter') || 'all'
  const filter: Filter = (FILTERS as string[]).includes(raw) ? (raw as Filter) : 'all'

  try {
    const admin = createAdminClient()
    let q = admin.from('observatory_comments').select(COLUMNS).order('created_at', { ascending: false }).limit(LIMIT)
    if (filter === 'visible') q = q.eq('hidden', false).is('removed_at', null)
    if (filter === 'hidden') q = q.eq('hidden', true)
    if (filter === 'removed') q = q.not('removed_at', 'is', null)

    const head = () => admin.from('observatory_comments').select('id', { count: 'exact', head: true })
    const [{ data, error }, all, hidden, removed, journal] = await Promise.all([
      q,
      head(),
      head().eq('hidden', true),
      head().not('removed_at', 'is', null),
      loadJournal(),
    ])
    if (error) throw new Error(error.message)

    // Name each comment's piece. A piece missing from the journal has been
    // unpublished since the comment was written.
    const titles = new Map(journal.map(e => [`${e.kind}:${e.id}`, e.title]))
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    const comments = rows.map(r => ({
      ...r,
      piece_title: titles.get(`${r.piece_kind}:${r.piece_id}`) ?? null,
    }))

    return NextResponse.json({
      comments,
      limit: LIMIT,
      counts: {
        all: all.count ?? 0,
        hidden: hidden.count ?? 0,
        removed: removed.count ?? 0,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load comments' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { id?: unknown; hidden?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body.hidden !== 'boolean') {
    return NextResponse.json({ error: 'Send { id, hidden: true | false }' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('observatory_comments')
      .update({ hidden: body.hidden })
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'No such comment' }, { status: 404 })
    return NextResponse.json({ comment: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update the comment' },
      { status: 500 }
    )
  }
}
