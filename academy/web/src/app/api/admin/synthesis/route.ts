import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/synthesis — all synthesis documents, newest first, for the
// admin review tab (pending/edited queue, ingested archive, rejected list).
// Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('synthesis_documents')
      .select(
        'id, title, synthesis_type, concept, authors_covered, works_covered, ' +
        'content, word_count, user_theme_frequency, demand_rank, status, ' +
        'review_notes, reviewed_at, ingested_at, rag_chunk_ids, generation_week, ' +
        'created_at, updated_at'
      )
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    // Live config so the panel can render current values.
    const { data: cfg } = await admin
      .from('agent_config')
      .select('config')
      .eq('agent_name', 'synthesis_agent')
      .maybeSingle()

    return NextResponse.json({ documents: data ?? [], config: cfg?.config ?? null })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load synthesis documents' },
      { status: 500 }
    )
  }
}
