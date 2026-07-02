import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/tensions/:id
//   { status?, review_notes?, observatory_visible?, merged_into? }
// Approve / reject a tension during review, merge a duplicate into an existing
// tension, attach review notes, and toggle whether an approved tension is
// surfaced publicly in the Observatory. A tension that is not approved must
// never remain visible in the sky. Admin-gated.
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
    const { status, review_notes, observatory_visible, merged_into } = await req.json()

    const validStatuses = ['approved', 'rejected', 'merged']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (status === 'merged' && !merged_into) {
      return NextResponse.json({ error: 'merged status requires merged_into' }, { status: 400 })
    }
    if (merged_into === id) {
      return NextResponse.json({ error: 'A tension cannot merge into itself' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      updates.reviewed_at = new Date().toISOString()
    }
    if (typeof review_notes === 'string') updates.review_notes = review_notes
    if (typeof observatory_visible === 'boolean') updates.observatory_visible = observatory_visible
    if (typeof merged_into === 'string' && merged_into) updates.merged_into = merged_into
    // A tension that is not approved must never remain visible in the sky.
    if (status && status !== 'approved') updates.observatory_visible = false

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('philosophical_tensions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, tension: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update tension' },
      { status: 500 }
    )
  }
}
