import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/log/[id]/related — items closest to this one in
// embedding space, using its stored embedding (no re-embed needed). Some
// entries relate and some don't: the similarity score is returned so the UI
// can show how strong each thread is.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const admin = createAdminClient()

  const { data: item, error: itemError } = await admin
    .from('scribe_log_items')
    .select('embedding')
    .eq('id', id)
    .maybeSingle()
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (!item.embedding) return NextResponse.json({ related: [] })

  const { data, error } = await admin.rpc('match_scribe_log_items', {
    query_embedding: item.embedding,
    match_count: 8,
    exclude_id: id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ related: data ?? [] })
}
