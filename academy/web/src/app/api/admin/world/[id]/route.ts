import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/world/:id
//   { status?, dispatch_context?, observatory_visible? }
// Review actions for a world observation:
//   - status: 'approved' | 'rejected'  (approving lets the dispatch_context flow
//     into that week's Daily Dispatch generation)
//   - dispatch_context: edit the digest before it's used
//   - observatory_visible: surface (or hide) the observation on the public
//     Observatory sidebar
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
    const { status, dispatch_context, observatory_visible } = await req.json()

    const validStatuses = ['approved', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      updates.reviewed_at = new Date().toISOString()
    }
    if (typeof dispatch_context === 'string') {
      updates.dispatch_context = dispatch_context
    }
    if (typeof observatory_visible === 'boolean') {
      updates.observatory_visible = observatory_visible
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('world_observations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, observation: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update observation' },
      { status: 500 }
    )
  }
}
