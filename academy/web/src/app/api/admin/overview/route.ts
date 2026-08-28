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

  // --- Synthesis agent ---
  const synthesis = (async () => {
    try {
      const [{ count: pending }, { count: ingested }, { data: latest }] = await Promise.all([
        admin.from('synthesis_documents').select('id', { count: 'exact', head: true })
          .in('status', ['pending_review', 'edited']),
        admin.from('synthesis_documents').select('id', { count: 'exact', head: true }).eq('status', 'ingested'),
        admin.from('synthesis_documents').select('title, created_at, status')
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      return {
        pendingReview: pending ?? 0,
        totalIngested: ingested ?? 0,
        latestTitle: latest?.title ?? null,
        latestStatus: latest?.status ?? null,
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

  // --- Dispatch agent ---
  const dispatch = (async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: row } = await admin.from('daily_dispatches')
        .select('title, total_recipients, delivered_count, dispatch_date')
        .eq('dispatch_date', today).maybeSingle()
      return {
        todayTitle: row?.title ?? null,
        delivered: row?.delivered_count ?? 0,
        recipients: row?.total_recipients ?? 0,
        generatedToday: !!row,
      }
    } catch { return null }
  })()

  // --- Self-reflection agent (Layer 6 meta-agent) ---
  const reflection = (async () => {
    try {
      const { data: row } = await admin.from('system_reflections')
        .select('reflection_week, report_title, anomalies, agent_status, generated_at')
        .order('reflection_week', { ascending: false }).limit(1).maybeSingle()
      if (!row) return null
      const anomalies = Array.isArray(row.anomalies) ? row.anomalies : []
      const status = row.agent_status && typeof row.agent_status === 'object' ? row.agent_status : {}
      const fired = (Object.values(status) as Array<{ fired?: boolean }>)
      return {
        week: row.reflection_week,
        title: row.report_title,
        generatedAt: row.generated_at,
        anomalies: anomalies.length,
        criticalAnomalies: anomalies.filter((a: { severity?: string }) => a.severity === 'critical').length,
        agentsFired: fired.filter(a => a?.fired).length,
        agentsTotal: fired.length || 11,
      }
    } catch { return null }
  })()

  // --- Tension agent ---
  const tension = (async () => {
    try {
      const [{ count: pending }, { count: approved }, { count: visible }] = await Promise.all([
        admin.from('philosophical_tensions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        admin.from('philosophical_tensions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        admin.from('philosophical_tensions').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('observatory_visible', true),
      ])
      const { data: latest } = await admin.from('philosophical_tensions')
        .select('title, generated_at').order('generated_at', { ascending: false }).limit(1).maybeSingle()
      return {
        pending: pending ?? 0,
        approved: approved ?? 0,
        inObservatory: visible ?? 0,
        latestTitle: latest?.title ?? null,
        lastGeneratedAt: latest?.generated_at ?? null,
      }
    } catch { return null }
  })()

  // --- Inquiry agent ---
  const inquiry = (async () => {
    try {
      const [{ count: pending }, { count: approved }] = await Promise.all([
        admin.from('open_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        admin.from('open_inquiries').select('id', { count: 'exact', head: true }).in('status', ['approved', 'queued_for_corpus']),
      ])
      const { data: latest } = await admin.from('open_inquiries')
        .select('question, generated_at').order('generated_at', { ascending: false }).limit(1).maybeSingle()
      return {
        pending: pending ?? 0,
        approved: approved ?? 0,
        latestQuestion: latest?.question ?? null,
        lastGeneratedAt: latest?.generated_at ?? null,
      }
    } catch { return null }
  })()

  // --- Consolidation agent (learning system) ---
  const consolidation = (async () => {
    try {
      const [{ count: pending }, { count: approved }, { count: edges }] = await Promise.all([
        admin.from('corpus_syntheses').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        admin.from('corpus_syntheses').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        admin.from('concept_edges').select('chunk_a', { count: 'exact', head: true }),
      ])
      const { data: lastReport } = await admin.from('consolidation_reports')
        .select('report_date, content').order('created_at', { ascending: false }).limit(1).maybeSingle()
      return {
        pending: pending ?? 0,
        approved: approved ?? 0,
        edges: edges ?? 0,
        lastReportDate: lastReport?.report_date ?? null,
        lastReportExcerpt: lastReport?.content?.slice(0, 90) ?? null,
      }
    } catch { return null }
  })()

  // --- Dreaming agent ---
  const dreams = (async () => {
    try {
      const [{ count: pending }, { count: starred }, { count: total }] = await Promise.all([
        admin.from('corpus_dreams').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        admin.from('corpus_dreams').select('id', { count: 'exact', head: true }).eq('status', 'starred'),
        admin.from('corpus_dreams').select('id', { count: 'exact', head: true }),
      ])
      const { data: latest } = await admin.from('corpus_dreams')
        .select('generated_at').order('generated_at', { ascending: false }).limit(1).maybeSingle()
      return {
        pending: pending ?? 0,
        starred: starred ?? 0,
        total: total ?? 0,
        lastGeneratedAt: latest?.generated_at ?? null,
      }
    } catch { return null }
  })()

  // --- Longitudinal user model agent ---
  const longitudinal = (async () => {
    try {
      const { count: modeled } = await admin.from('user_longitudinal_models')
        .select('id', { count: 'exact', head: true })
      const { data: latest } = await admin.from('user_longitudinal_models')
        .select('last_analyzed_at').order('last_analyzed_at', { ascending: false }).limit(1).maybeSingle()
      return { usersModeled: modeled ?? 0, lastRunAt: latest?.last_analyzed_at ?? null }
    } catch { return null }
  })()

  // --- World agent ---
  const world = (async () => {
    try {
      const [{ count: pending }, { data: latest }] = await Promise.all([
        admin.from('world_observations').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        admin.from('world_observations')
          .select('observation_week, status, dominant_signal, generated_at')
          .order('observation_week', { ascending: false }).limit(1).maybeSingle(),
      ])
      return {
        pending: pending ?? 0,
        latestWeek: latest?.observation_week ?? null,
        latestStatus: latest?.status ?? null,
        latestSignal: latest?.dominant_signal ?? null,
        lastGeneratedAt: latest?.generated_at ?? null,
      }
    } catch { return null }
  })()

  // --- Stoic reply pipeline ---
  const stoicReplies = (async () => {
    try {
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)
      const [{ count: pending }, { count: promoted }, { count: approvedToday }] = await Promise.all([
        admin.from('reply_drafts').select('id', { count: 'exact', head: true }).in('status', ['pending', 'edited']),
        admin.from('reply_candidates').select('id', { count: 'exact', head: true }).eq('status', 'promoted'),
        admin.from('reply_drafts').select('id', { count: 'exact', head: true })
          .eq('status', 'approved').gte('posted_at', todayStart.toISOString()),
      ])
      const { data: latest } = await admin.from('reply_candidates')
        .select('fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle()
      return {
        pending: pending ?? 0,
        promoted: promoted ?? 0,
        approvedToday: approvedToday ?? 0,
        lastFetchedAt: latest?.fetched_at ?? null,
      }
    } catch { return null }
  })()

  const [
    corpusData, journalData, gapData, synthesisData, schedulerData, dispatchData, reflectionData,
    tensionData, inquiryData, dreamsData, longitudinalData, worldData, consolidationData,
    stoicRepliesData,
  ] = await Promise.all([
    corpus, journal, gap, synthesis, scheduler, dispatch, reflection,
    tension, inquiry, dreams, longitudinal, world, consolidation,
    stoicReplies,
  ])

  return NextResponse.json({
    week,
    corpus: corpusData,
    journal: journalData,
    gap: gapData,
    synthesis: synthesisData,
    scheduler: schedulerData,
    dispatch: dispatchData,
    reflection: reflectionData,
    tension: tensionData,
    inquiry: inquiryData,
    dreams: dreamsData,
    longitudinal: longitudinalData,
    world: worldData,
    consolidation: consolidationData,
    stoicReplies: stoicRepliesData,
  })
}
