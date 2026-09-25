import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

// GET — list distress review items (newest first), with the analysis week joined in.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('distress_review_queue')
      .select('id, user_id, distress_notes, status, created_at, analysis:journal_analysis(analysis_week)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

const STATUS_RANK: Record<string, number> = { pending: 1, dismissed: 2, reviewed: 3, escalated: 4 }

// POST { id, status } — update a review item's status.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id, status } = await req.json()
    const allowed = ['pending', 'reviewed', 'escalated', 'dismissed']
    if (!id || !allowed.includes(status)) {
      return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
    }
    const admin = createAdminClient()
    // A status only moves forward (pending < dismissed < reviewed < escalated),
    // never back to pending. A trigger enforces the same rule in the database.
    const { data: current, error: readError } = await admin
      .from('distress_review_queue')
      .select('status')
      .eq('id', id)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (STATUS_RANK[status] < STATUS_RANK[current.status]) {
      return NextResponse.json(
        { error: `A ${current.status} case cannot move back to ${status}` },
        { status: 409 }
      )
    }
    if (status === current.status) return NextResponse.json({ success: true })
    const { error } = await admin
      .from('distress_review_queue')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
