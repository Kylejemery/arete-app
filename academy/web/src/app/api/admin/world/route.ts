import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/world — the World Agent tab. Returns the most recent world
// observation ("current") plus the last 8 weeks for the history table.
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
      .from('world_observations')
      .select(
        'id, observation_week, world_signals, dominant_signal, corpus_response, ' +
        'relevant_passages, relevant_authors, world_corpus_tension, dispatch_context, ' +
        'status, reviewed_at, observatory_visible, model_used, generated_at, ' +
        'generation_duration_ms'
      )
      .order('observation_week', { ascending: false })
      .limit(8)
    if (error) throw new Error(error.message)

    const rows = data ?? []
    return NextResponse.json({ current: rows[0] ?? null, history: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load world observations' },
      { status: 500 }
    )
  }
}
