import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/tensions — the Tensions review tab. Returns the
// pending_review queue (tensions connected to live user themes sorted first)
// plus the approved living catalogue, and the agent config. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const cols =
      'id, tension_week, title, tension_statement, position_a, position_b, ' +
      'additional_positions, lived_stakes, user_theme_connections, ' +
      'tension_type, is_resolvable, resolution_note, source_authors, ' +
      'status, merged_into, review_notes, reviewed_at, observatory_visible, ' +
      'model_used, generated_at'

    const [{ data: pending, error: pErr }, { data: approved, error: aErr }] = await Promise.all([
      admin
        .from('philosophical_tensions')
        .select(cols)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false }),
      admin
        .from('philosophical_tensions')
        .select(cols)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(200),
    ])
    if (pErr) throw new Error(pErr.message)
    if (aErr) throw new Error(aErr.message)

    // Tensions that map to what users are actually wrestling with surface
    // first in the review queue. (Supabase can't infer row types from the
    // dynamic column string, so type the one field the sort reads.)
    type PendingRow = { user_theme_connections: string[] | null }
    const sortedPending = [...((pending ?? []) as unknown as PendingRow[])].sort((a, b) => {
      const at = (a.user_theme_connections?.length ?? 0) > 0 ? 0 : 1
      const bt = (b.user_theme_connections?.length ?? 0) > 0 ? 0 : 1
      return at - bt
    })

    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'tension-agent')
      .maybeSingle()

    return NextResponse.json({
      pending: sortedPending,
      approved: approved ?? [],
      config: cfg?.config ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load tensions' },
      { status: 500 }
    )
  }
}
