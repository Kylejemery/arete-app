import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/dreams/:id  { status?, review_notes?, observatory_visible? }
// The strictest gate in the system. Approve / star / reject a dream during
// review, attach review notes, and toggle whether an approved or starred dream
// is surfaced publicly in the Observatory. Starred is approved-plus — a dream
// Kyle considers genuinely good. A dream that is neither approved nor starred
// must never remain visible anywhere. Admin-gated.
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
    const { status, review_notes, observatory_visible } = await req.json()

    const validStatuses = ['approved', 'starred', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      updates.reviewed_at = new Date().toISOString()
    }
    if (typeof review_notes === 'string') updates.review_notes = review_notes
    if (typeof observatory_visible === 'boolean') updates.observatory_visible = observatory_visible
    // A dream that is neither approved nor starred must never remain visible.
    if (status && status !== 'approved' && status !== 'starred') updates.observatory_visible = false

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('corpus_dreams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, dream: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update dream' },
      { status: 500 }
    )
  }
}
