import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/convergence — the Convergence review tab. Returns the
// pending_review queue sorted strongest-and-least-obvious first (entailment
// strength deductive > strong > suggestive, then mean_pairwise_distance
// descending), plus recently reviewed convergences, and the live agent config.
// Admin-gated. Convergences are system output, read via the service role.
const COLS =
  'id, run_id, created_at, title, conclusion_text, source_passage_ids, ' +
  'source_authors, source_traditions, entailment_strength, novelty, ' +
  'mean_pairwise_distance, pursuit_text, breakpoint_text, status, significance_note'

const ENTAILMENT_RANK: Record<string, number> = { deductive: 0, strong: 1, suggestive: 2 }

// The convergences table is not yet in the generated Supabase types, so the
// admin client returns loosely-typed rows. Minimal shape for the sort.
type ConvergenceRow = { entailment_strength: string | null; mean_pairwise_distance: number | null }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const [{ data: pending, error: pErr }, { data: reviewed, error: rErr }] = await Promise.all([
      admin.from('convergences').select(COLS).eq('status', 'pending_review'),
      admin
        .from('convergences')
        .select(COLS)
        .in('status', ['approved', 'starred', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (pErr) throw new Error(pErr.message)
    if (rErr) throw new Error(rErr.message)

    // Strongest and least obvious surface at the top of review.
    const sortedPending = ((pending ?? []) as unknown as ConvergenceRow[]).sort((a, b) => {
      const ra = ENTAILMENT_RANK[a.entailment_strength ?? ''] ?? 9
      const rb = ENTAILMENT_RANK[b.entailment_strength ?? ''] ?? 9
      if (ra !== rb) return ra - rb
      return (b.mean_pairwise_distance ?? 0) - (a.mean_pairwise_distance ?? 0)
    })

    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'convergence-agent')
      .maybeSingle()

    return NextResponse.json({
      pending: sortedPending,
      reviewed: reviewed ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load convergences' },
      { status: 500 }
    )
  }
}
