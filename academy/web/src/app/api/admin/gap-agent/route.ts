import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Latest gap report + the live concept_passage_map rows for its demand-gap
// themes (so the approval UI has the concept_passage_map PK ids it needs to
// PATCH, and reflects approvals made since the agent last ran). Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const { data: report, error } = await admin
      .from('corpus_gap_reports')
      .select('report_week, structural_gaps, demand_gaps, recommended_additions, status, created_at, run_duration_ms')
      .order('report_week', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)

    const passagesByConcept: Record<string, unknown[]> = {}
    if (report) {
      const demandGaps = Array.isArray(report.demand_gaps) ? report.demand_gaps : []
      const concepts = demandGaps
        .map((g: { theme?: string }) => g.theme)
        .filter((t: unknown): t is string => typeof t === 'string')

      if (concepts.length > 0) {
        const { data: passages } = await admin
          .from('concept_passage_map')
          .select('id, concept, chunk_id, author, work, chunk_text, similarity_score, approved, triage_verdict, triage_note')
          .in('concept', concepts)
          .order('similarity_score', { ascending: false })

        for (const p of passages ?? []) {
          if (!passagesByConcept[p.concept]) passagesByConcept[p.concept] = []
          passagesByConcept[p.concept].push(p)
        }
      }
    }

    return NextResponse.json({ report: report ?? null, passagesByConcept })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load gap report' },
      { status: 500 }
    )
  }
}
