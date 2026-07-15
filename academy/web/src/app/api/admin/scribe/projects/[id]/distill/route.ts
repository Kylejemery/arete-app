import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { distill } from '@/lib/scribe/pipeline/distill'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/projects/[id]/distill — Stage A. Distills the notes
// into an editable brief, saves it on the project, returns it.
export async function POST(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const admin = createAdminClient()
  const { data: notes, error } = await admin
    .from('scribe_notes')
    .select('*')
    .eq('project_id', id)
    .order('position')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!notes?.length) {
    return NextResponse.json({ error: 'No notes to distill — add some thoughts first.' }, { status: 400 })
  }

  try {
    const { brief, usage } = await distill(notes)
    await admin
      .from('scribe_projects')
      .update({ brief, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ brief, usage })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Distill failed'
    console.error('[scribe/distill]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
