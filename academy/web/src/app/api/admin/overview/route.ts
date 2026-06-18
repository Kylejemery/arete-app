import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Monday (UTC) of the current week — matches the agents' week keys.
function mondayUTC(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// Unified status feed for the admin Overview cards. Admin-gated; every block is
// guarded so one missing table can't blank the whole dashboard.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Admin client unavailable' },
      { status: 500 }
    )
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const week = mondayUTC()

  // --- Corpus agent ---
  const corpus = (async () => {
    try {
      const [{ data: run }, { count: pending }] = await Promise.all([
        admin.from('corpus_ingestion_runs')
          .select('run_started_at, run_completed_at, status, total_chunks_added, sources_succeeded, sources_failed')
          .order('run_started_at', { ascending: false }).limit(1).maybeSingle(),
        admin.from('corpus_ingestion_queue')
          .select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      return {
        lastRunAt: run?.run_completed_at ?? run?.run_started_at ?? null,
        status: run?.status ?? null,
        chunksAdded: run?.total_chunks_added ?? 0,
        sourcesSucceeded: run?.sources_succeeded ?? 0,
        sourcesFailed: run?.sources_failed ?? 0,
        queuePending: pending ?? 0,
      }
    } catch { return null }
  })()

  // --- Journal agent ---
  const journal = (async () => {
    try {
      const [{ count: analyzed }, { count: delivered }, { count: distress }] = await Promise.all([
        admin.from('journal_analysis').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        admin.from('journal_analysis').select('id', { count: 'exact', head: true }).eq('delivered', true).gte('created_at', sevenDaysAgo),
        admin.from('distress_review_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      return { analyzed: analyzed ?? 0, delivered: delivered ?? 0, distressPending: distress ?? 0 }
    } catch { return null }
  })()

  // --- Gap agent ---
  const gap = (async () => {
    try {
      const { data: report } = await admin.from('corpus_gap_reports')
        .select('report_week, structural_gaps, demand_gaps, recommended_additions, status')
        .order('report_week', { ascending: false }).limit(1).maybeSingle()
      if (!report) return { reportWeek: null, structuralGaps: 0, demandGaps: 0, pendingApprovals: 0, status: null }
      const recs = Array.isArray(report.recommended_additions) ? report.recommended_additions : []
      return {
        reportWeek: report.report_week,
        structuralGaps: Array.isArray(report.structural_gaps) ? report.structural_gaps.length : 0,
        demandGaps: Array.isArray(report.demand_gaps) ? report.demand_gaps.length : 0,
        pendingApprovals: recs.filter((r: { approved?: boolean | null }) => r.approved == null).length,
        status: report.status,
      }
    } catch { return null }
  })()

  // --- Content scheduler (post_queue is the live table) ---
  const scheduler = (async () => {
    try {
      const [{ count: scheduled }, { data: lastSent }] = await Promise.all([
        admin.from('post_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('post_queue').select('sent_at').eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      return {
        scheduled: scheduled ?? 0,
        lastPublished: lastSent?.sent_at ?? null,
        platforms: { x: true, bluesky: true, linkedin: false },
      }
    } catch { return null }
  })()

  const [corpusData, journalData, gapData, schedulerData] = await Promise.all([corpus, journal, gap, scheduler])

  return NextResponse.json({
    week,
    corpus: corpusData,
    journal: journalData,
    gap: gapData,
    scheduler: schedulerData,
  })
}
