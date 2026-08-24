import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/convergence/:id  { status?, significance_note? }
// The human review gate. Approve, reject, or star a convergence, and attach the
// significance note — the one judgment the agent cannot make: whether a valid,
// novel conclusion is worth keeping. Approved and starred convergences become
// eligible as Synthesis seed material and Observatory cards; starred marks the
// ones good enough for a dispatch or a Fine Is Not Flourishing essay.
// Admin-gated.
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
    const { status, significance_note } = await req.json()

    const validStatuses = ['approved', 'rejected', 'starred']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (status) updates.status = status
    if (typeof significance_note === 'string') updates.significance_note = significance_note

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('convergences')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, convergence: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update convergence' },
      { status: 500 }
    )
  }
}
