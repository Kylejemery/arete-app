import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const KINDS = new Set(['journal', 'thought', 'essay', 'clipping'])

// PATCH /api/admin/scribe/log/[id] — edit an item; re-embeds when the
// content changes so relatedness stays honest.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await params
    const body = await req.json()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.kind !== undefined) {
      if (!KINDS.has(body.kind)) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
      update.kind = body.kind
    }
    if (body.title !== undefined) update.title = body.title?.trim() || null
    if (body.source_url !== undefined) update.source_url = body.source_url?.trim() || null
    if (body.entry_date !== undefined) update.entry_date = body.entry_date
    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || !body.content.trim()) {
        return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
      }
      update.content = body.content
      update.embedding = await embedChunk(body.content)
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('scribe_log_items')
      .update(update)
      .eq('id', id)
      .select('id, kind, title, content, source_url, entry_date, created_at, updated_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed'
    console.error('[scribe/log PATCH]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/admin/scribe/log/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('scribe_log_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
