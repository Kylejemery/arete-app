import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { setFindingStatus } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/scribe/findings/[id] — { status: 'open' | 'fixed' | 'dismissed' }.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  const { status } = await req.json().catch(() => ({}))
  if (!['open', 'fixed', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'status must be open, fixed or dismissed' }, { status: 400 })
  }
  try {
    const finding = await setFindingStatus(createAdminClient(), id, status)
    return NextResponse.json({ finding })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
