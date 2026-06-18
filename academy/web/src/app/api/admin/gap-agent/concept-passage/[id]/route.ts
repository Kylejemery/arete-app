import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/gap-agent/concept-passage/:id  { approved: true | false }
// Approve or reject a retrieved passage in the concept_passage_map learning
// layer — this trains future demand-gap verdicts. Admin-gated.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { approved } = await req.json()
    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'approved must be a boolean' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('concept_passage_map')
      .update({ approved, approved_at: new Date().toISOString(), approved_by: 'kyle' })
      .eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update passage' },
      { status: 500 }
    )
  }
}
