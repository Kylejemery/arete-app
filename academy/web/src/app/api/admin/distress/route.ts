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
