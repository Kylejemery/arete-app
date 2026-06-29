import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/reflection — the Weekly Self-Reflection tab. Returns the most
// recent reflection ("current") plus the last 8 weeks for the history table.
// Admin-gated, same ADMIN_EMAIL pattern as the other admin routes.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('system_reflections')
      .select(
        'id, reflection_week, corpus_total_chunks, corpus_chunks_added_this_week, ' +
        'corpus_authors_covered, corpus_tier1_gaps, corpus_tier2_gaps, ' +
        'ingestion_runs_this_week, ingestion_failures_this_week, agent_status, ' +
        'synthesis_docs_generated, synthesis_docs_approved, synthesis_docs_pending, ' +
        'gap_reports_generated, gap_recommendations_actioned, active_users_this_week, ' +
        'dispatches_sent, dispatch_delivery_rate, insights_delivered, ' +
        'distress_flags_this_week, distress_flags_resolved, anomalies, ' +
        'recommended_actions, report_title, report_body, model_used, ' +
        'generated_at, generation_duration_ms'
      )
      .order('reflection_week', { ascending: false })
      .limit(8)
    if (error) throw new Error(error.message)

    const rows = data ?? []
    return NextResponse.json({ current: rows[0] ?? null, history: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load reflections' },
      { status: 500 }
    )
  }
}
