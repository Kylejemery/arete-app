import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET — the significance map joined with live rag_corpus chunk counts, so the
// admin table can colour-code coverage. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // Counts via the corpus_work_counts() RPC — a plain select('author, work')
    // is capped at 1000 rows by PostgREST and undercounts the ~7,000-row corpus.
    const [{ data: sigMap, error: mapErr }, { data: workCounts, error: corpusErr }] = await Promise.all([
      admin.from('corpus_significance_map')
        .select('author, work, tier, chunk_threshold, source_type, recommended_url, active')
        .eq('active', true)
        .order('tier', { ascending: true }),
      admin.rpc('corpus_work_counts'),
    ])
    if (mapErr) throw new Error(mapErr.message)
    if (corpusErr) throw new Error(corpusErr.message)

    const counts: Record<string, number> = {}
    for (const row of (workCounts as { author: string; work: string; cnt: number }[]) ?? []) {
      counts[`${row.author}|||${row.work}`] = Number(row.cnt)
    }

    const rows = (sigMap ?? []).map(s => {
      const actual = counts[`${s.author}|||${s.work}`] || 0
      const coverage = s.chunk_threshold > 0 ? Math.round((actual / s.chunk_threshold) * 100) : 0
      const state = actual >= s.chunk_threshold
        ? 'green'
        : actual >= s.chunk_threshold * 0.5 ? 'yellow' : 'red'
      return {
        author: s.author,
        work: s.work,
        tier: s.tier,
        threshold: s.chunk_threshold,
        actual,
        coverage,
        state,
        source_type: s.source_type,
      }
    })

    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load significance map' },
      { status: 500 }
    )
  }
}
