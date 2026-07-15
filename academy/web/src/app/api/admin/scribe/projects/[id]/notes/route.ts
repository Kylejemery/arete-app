import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/projects/[id]/notes — append a note ({ content }).
// Position defaults to the end of the list.
export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: last } = await admin
    .from('scribe_notes')
    .select('position')
    .eq('project_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('scribe_notes')
    .insert({
      project_id: id,
      content: content.trim(),
      position: (last?.position ?? -1) + 1,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notes changed → the cached Stage B retrievals (keyed off notes) are stale.
  await admin
    .from('scribe_projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ note: data })
}
