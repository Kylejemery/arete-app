import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/dreams — the Dreams review tab. Returns the pending_review
// queue plus the full dream journal (every dream ever generated, failures
// included — the complete record of what the corpus imagined), and the agent
// config. Filtering by type / status / self-assessment happens client-side.
// Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const cols =
      'id, dream_week, dream_type, content, title, seed_authors, seed_summary, ' +
      'tension_id, inquiry_id, self_assessment, fidelity_note, status, ' +
      'review_notes, reviewed_at, observatory_visible, model_used, generated_at'

    const [{ data: pending, error: pErr }, { data: journal, error: jErr }] = await Promise.all([
      admin
        .from('corpus_dreams')
        .select(cols)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false }),
      admin
        .from('corpus_dreams')
        .select(cols)
        .order('generated_at', { ascending: false })
        .limit(500),
    ])
    if (pErr) throw new Error(pErr.message)
    if (jErr) throw new Error(jErr.message)

    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'dreaming-agent')
      .maybeSingle()

    return NextResponse.json({
      pending: pending ?? [],
      journal: journal ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load dreams' },
      { status: 500 }
    )
  }
}
