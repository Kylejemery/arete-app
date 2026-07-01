import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/inquiry — the Inquiry review tab. Returns the pending_review
// queue plus recently approved inquiries (approved / queued_for_corpus), newest
// first, and the live agent config. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const cols =
      'id, inquiry_week, question, question_origin, source_authors, ' +
      'pursuit_passages, pursuit_text, pursuit_word_count, confidence, ' +
      'where_corpus_runs_out, suggested_reading, status, review_notes, ' +
      'reviewed_at, observatory_visible, model_used, generated_at'

    const [{ data: pending, error: pErr }, { data: approved, error: aErr }] = await Promise.all([
      admin
        .from('open_inquiries')
        .select(cols)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false }),
      admin
        .from('open_inquiries')
        .select(cols)
        .in('status', ['approved', 'queued_for_corpus'])
        .order('reviewed_at', { ascending: false })
        .limit(50),
    ])
    if (pErr) throw new Error(pErr.message)
    if (aErr) throw new Error(aErr.message)

    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'inquiry-agent')
      .maybeSingle()

    return NextResponse.json({
      pending: pending ?? [],
      approved: approved ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load inquiries' },
      { status: 500 }
    )
  }
}
