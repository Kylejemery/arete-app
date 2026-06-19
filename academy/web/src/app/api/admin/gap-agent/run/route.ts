import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'

export const dynamic = 'force-dynamic'
// Demand detection embeds up to 20 themes; give the function room but keep a
// soft internal budget so the report is always written within the limit.
export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000
// Stop starting new demand-theme work after this; structural always completes.
const DEMAND_BUDGET_MS = 42_000

// Monday (UTC) of the current week — matches server/coverage-gap-agent.js.
function mondayUTC(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

type Admin = ReturnType<typeof createAdminClient>

// --- Structural gaps (mirror of the agent) ---------------------------------
async function detectStructuralGaps(admin: Admin) {
  const [{ data: sigMap }, { data: corpusRows }] = await Promise.all([
    admin.from('corpus_significance_map').select('*').eq('active', true).order('tier', { ascending: true }),
    admin.from('rag_corpus').select('author, work'),
  ])

  const countMap: Record<string, number> = {}
  for (const row of corpusRows ?? []) {
    countMap[`${row.author}|||${row.work}`] = (countMap[`${row.author}|||${row.work}`] || 0) + 1
  }

  const gaps = []
  for (const entry of sigMap ?? []) {
    const actual = countMap[`${entry.author}|||${entry.work}`] || 0
    const deficit = entry.chunk_threshold - actual
    if (deficit <= 0) continue
    gaps.push({
      author: entry.author,
      work: entry.work,
      tier: entry.tier,
      actual_chunks: actual,
      threshold: entry.chunk_threshold,
      deficit,
      source_type: entry.source_type,
      notes: entry.notes,
      recommended_url: entry.recommended_url || null,
      severity: actual === 0 ? 'absent' : deficit > entry.chunk_threshold * 0.5 ? 'critical' : 'low',
    })
  }

  return gaps.sort((a, b) => {
    if (a.severity === 'absent' && b.severity !== 'absent') return -1
    if (b.severity === 'absent' && a.severity !== 'absent') return 1
    if (a.tier !== b.tier) return a.tier - b.tier
    return b.deficit - a.deficit
  })
}

type CPM = { chunk_id: string; author: string; work: string; chunk_text: string; approved: boolean | null; similarity_score: number | null }

async function getConceptPassages(admin: Admin, concept: string): Promise<CPM[]> {
  const { data } = await admin
    .from('concept_passage_map')
    .select('chunk_id, author, work, chunk_text, approved, similarity_score')
    .eq('concept', concept)
    .not('approved', 'is', false)
  return (data as CPM[]) || []
}

// --- Demand gaps (mirror of the agent, with a soft time budget) ------------
async function detectDemandGaps(admin: Admin, startTime: number) {
  const since = new Date(Date.now() - 30 * DAY).toISOString()
  const { data: analyses } = await admin
    .from('journal_analysis')
    .select('themes, dominant_theme')
    .gte('created_at', since)

  if (!analyses || analyses.length === 0) return { gaps: [], truncated: false }
  if (!process.env.OPENAI_API_KEY) return { gaps: [], truncated: false }

  const themeCounts: Record<string, number> = {}
  for (const a of analyses) {
    const themes = Array.isArray(a.themes) ? a.themes : []
    for (const t of themes as { theme?: string; count?: number }[]) {
      const theme = (t.theme || '').toLowerCase().trim()
      if (!theme) continue
      themeCounts[theme] = (themeCounts[theme] || 0) + (t.count || 1)
    }
  }

  const topThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([theme, count]) => ({ theme, count }))

  const demandGaps = []
  let truncated = false

  for (const { theme, count } of topThemes) {
    if (Date.now() - startTime > DEMAND_BUDGET_MS) { truncated = true; break }

    let passages = await getConceptPassages(admin, theme)
    let searchedFresh = false

    if (passages.filter(p => p.approved === true).length < 3) {
      try {
        const embedding = await embedChunk(theme)
        const { data: retrieved } = await admin.rpc('match_rag_corpus_ids', {
          query_embedding: embedding,
          match_count: 8,
        })
        searchedFresh = true
        for (const chunk of (retrieved as { id: string; author: string; work: string; chunk_text: string; similarity: number }[]) || []) {
          if (!passages.find(p => p.chunk_id === chunk.id)) {
            await admin.from('concept_passage_map').upsert({
              concept: theme,
              chunk_id: chunk.id,
              author: chunk.author,
              work: chunk.work,
              chunk_text: chunk.chunk_text,
              similarity_score: chunk.similarity,
              approved: null,
            }, { onConflict: 'concept,chunk_id', ignoreDuplicates: true })
          }
        }
        passages = await getConceptPassages(admin, theme)
      } catch {
        // embedding/RPC failure for one theme shouldn't abort the whole run
      }
    }

    const approvedCount = passages.filter(p => p.approved === true).length
    const highSimilarity = passages.filter(p => (p.similarity_score || 0) > 0.78).length
    const coverageWeak = approvedCount < 2 || (searchedFresh && highSimilarity < 2)

    if (coverageWeak) {
      demandGaps.push({
        theme,
        user_frequency: count,
        approved_passages: approvedCount,
        total_retrieved: passages.length,
        passages_for_review: passages
          .slice()
          .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
          .slice(0, 6)
          .map(p => ({
            chunk_id: p.chunk_id,
            author: p.author,
            work: p.work,
            chunk_text: (p.chunk_text || '').substring(0, 200) + '...',
            similarity_score: p.similarity_score,
            approved: p.approved ?? null,
          })),
        coverage_verdict: approvedCount === 0 ? 'absent' : 'thin',
      })
    }

    await new Promise(r => setTimeout(r, 150))
  }

  demandGaps.sort((a, b) => b.user_frequency - a.user_frequency)
  return { gaps: demandGaps, truncated }
}

type SGap = Awaited<ReturnType<typeof detectStructuralGaps>>[number]
type DGap = Awaited<ReturnType<typeof detectDemandGaps>>['gaps'][number]

async function generateRecommendations(admin: Admin, structuralGaps: SGap[], demandGaps: DGap[]) {
  const { data: queued } = await admin
    .from('corpus_ingestion_queue')
    .select('author, work')
    .in('status', ['pending', 'processing', 'done'])
  const queuedKeys = new Set((queued || []).map(r => `${r.author}|||${r.work}`))

  const recommendations = []
  for (const gap of structuralGaps.slice(0, 8)) {
    if (queuedKeys.has(`${gap.author}|||${gap.work}`)) continue
    recommendations.push({
      author: gap.author,
      work: gap.work,
      reason: `Tier ${gap.tier} work — ${gap.severity === 'absent' ? 'completely absent from corpus' : `${gap.deficit} chunks below threshold`}`,
      source_type: gap.source_type,
      url: gap.recommended_url || null,
      priority: gap.tier * 10 + (gap.severity === 'absent' ? 0 : 5),
      can_auto_queue: gap.source_type === 'public_domain' && !!gap.recommended_url,
      approved: null,
      queued: false,
    })
  }
  for (const gap of demandGaps.slice(0, 5)) {
    recommendations.push({
      theme: gap.theme,
      reason: `User demand: "${gap.theme}" appeared ${gap.user_frequency} times in user sessions — corpus coverage ${gap.coverage_verdict}`,
      source_type: 'demand_driven',
      url: null,
      priority: 50,
      can_auto_queue: false,
      approved: null,
      queued: false,
      suggested_action: `Find and queue primary source texts covering "${gap.theme}"`,
    })
  }
  return recommendations
}

// POST — run the Coverage Gap Agent on demand and upsert this week's report.
// Same logic as server/coverage-gap-agent.js, time-bounded for serverless.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  try {
    const admin = createAdminClient()

    const structuralGaps = await detectStructuralGaps(admin)
    const { gaps: demandGaps, truncated } = await detectDemandGaps(admin, startTime)
    const recommendations = await generateRecommendations(admin, structuralGaps, demandGaps)

    const reportWeek = mondayUTC()
    const { error } = await admin.from('corpus_gap_reports').upsert({
      report_week: reportWeek,
      structural_gaps: structuralGaps,
      demand_gaps: demandGaps,
      recommended_additions: recommendations,
      status: 'pending_review',
      run_duration_ms: Date.now() - startTime,
    }, { onConflict: 'report_week' })
    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      reportWeek,
      structuralGaps: structuralGaps.length,
      demandGaps: demandGaps.length,
      recommendations: recommendations.length,
      demandTruncated: truncated,
      durationMs: Date.now() - startTime,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Run failed' },
      { status: 500 }
    )
  }
}
