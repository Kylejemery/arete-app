import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/consolidation — the synthesis review queue: pending
// proposals from the Consolidation Agent, the full ledger (approved,
// rejected, model-rejected, deprecated — the complete record), recent
// morning reports, and the agent config. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const cols =
      'id, title, content, cluster_chunks, citations, cluster_stats, status, ' +
      'review_notes, reviewed_at, rag_corpus_id, model_used, generated_at'

    const [{ data: pending, error: pErr }, { data: ledger, error: lErr }, { data: reports }] = await Promise.all([
      admin.from('corpus_syntheses').select(cols)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false }),
      admin.from('corpus_syntheses').select(cols)
        .order('generated_at', { ascending: false })
        .limit(200),
      admin.from('consolidation_reports')
        .select('id, report_date, content, stats, created_at')
        .order('created_at', { ascending: false })
        .limit(7),
    ])
    if (pErr) throw new Error(pErr.message)
    if (lErr) throw new Error(lErr.message)

    const { data: cfg } = await admin
      .from('agent_config').select('config')
      .eq('agent_name', 'consolidation-agent')
      .maybeSingle()

    return NextResponse.json({
      pending: pending ?? [],
      ledger: ledger ?? [],
      reports: reports ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load consolidation data' },
      { status: 500 }
    )
  }
}
