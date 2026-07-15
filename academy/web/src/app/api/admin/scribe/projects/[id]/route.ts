import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/scribe/projects/[id] — project + notes + draft metadata
// (draft content is fetched separately; the list stays light).
export async function GET(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const admin = createAdminClient()
  const [projectRes, notesRes, draftsRes] = await Promise.all([
    admin.from('scribe_projects').select('*').eq('id', id).single(),
    admin.from('scribe_notes').select('*').eq('project_id', id).order('position'),
    admin
      .from('scribe_drafts')
      .select('id, version, format, created_at, verification')
      .eq('project_id', id)
      .order('version', { ascending: false }),
  ])

  if (projectRes.error) {
    return NextResponse.json({ error: projectRes.error.message }, { status: 404 })
  }
  return NextResponse.json({
    project: projectRes.data,
    notes: notesRes.data ?? [],
    drafts: draftsRes.data ?? [],
  })
}

// PATCH /api/admin/scribe/projects/[id] — update title/status/format/brief.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of ['title', 'status', 'format', 'brief'] as const) {
    if (key in body) updates[key] = body[key]
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}

// DELETE /api/admin/scribe/projects/[id] — cascades to notes and drafts.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const admin = createAdminClient()
  const { error } = await admin.from('scribe_projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
