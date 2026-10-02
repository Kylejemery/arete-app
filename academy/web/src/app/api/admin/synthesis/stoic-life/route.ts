import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/stoic-life'

export const dynamic = 'force-dynamic'

// GET /api/admin/synthesis/stoic-life — everything the Stoic Life review page
// shows: the topic backlog, the drafts, the mode's config, and the world
// observation a draft would use (only one Kyle approved counts).
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const admin = createAdminClient()
    const [topics, drafts, cfg, world] = await Promise.all([
      admin
        .from('synthesis_topics')
        .select('id, title, original_title, status, source, rationale, evidence, world_context, review_notes, last_error, approved_at, reviewed_at, drafted_at, created_at')
        .eq('mode', 'stoic_life')
        .order('created_at', { ascending: false }),
      admin
        .from('synthesis_drafts')
        .select('id, topic_id, doc_key, version, title, markdown, word_count, status, checks, follow_ons, world_observation_id, review_notes, reviewed_at, exported_at, export_file_path, ingested_at, created_at, updated_at')
        .eq('mode', 'stoic_life')
        .order('created_at', { ascending: false }),
      admin.from('agent_config').select('config').eq('agent_name', 'synthesis_stoic_life').maybeSingle(),
      admin
        .from('world_observations')
        .select('id, observation_week, dominant_signal, status')
        .in('status', ['approved', 'pending_review'])
        .order('observation_week', { ascending: false })
        .limit(10),
    ])
    for (const r of [topics, drafts]) if (r.error) throw new Error(r.error.message)

    const observations = world.data ?? []
    return NextResponse.json({
      topics: topics.data ?? [],
      drafts: drafts.data ?? [],
      config: cfg.data?.config ?? null,
      world: {
        latestApproved: observations.find(o => o.status === 'approved') ?? null,
        pendingReview: observations.filter(o => o.status === 'pending_review').length,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load the Stoic Life queue' },
      { status: 500 }
    )
  }
}
