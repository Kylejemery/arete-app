import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/scribe/drafts/[id] — full draft (content + citations +
// verification) for the draft viewer.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_drafts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ draft: data })
}
