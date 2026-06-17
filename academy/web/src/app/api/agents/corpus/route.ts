import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Read-only status for the nightly RAG corpus agent. Admin-gated; reads the
// backend-only run/queue tables with the service role (they have RLS on with
// no policies, so the anon/user client cannot see them).
export async function GET() {
  const supabase = await createUserClient()
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

  const [runsRes, queueRes] = await Promise.all([
    admin
      .from('corpus_ingestion_runs')
      .select(
        'id, run_started_at, run_completed_at, sources_processed, sources_succeeded, sources_failed, total_chunks_added, coverage_report, status'
      )
      .order('run_started_at', { ascending: false })
      .limit(10),
    admin
      .from('corpus_ingestion_queue')
      .select('author, work, language, status, priority, error_message, chunks_ingested, processed_at')
      .order('priority', { ascending: true }),
  ])

  if (runsRes.error) {
    return NextResponse.json({ error: `runs query: ${runsRes.error.message}` }, { status: 500 })
  }
  if (queueRes.error) {
    return NextResponse.json({ error: `queue query: ${queueRes.error.message}` }, { status: 500 })
  }

  const runs = runsRes.data ?? []
  const queue = queueRes.data ?? []

  const counts: Record<string, number> = { pending: 0, processing: 0, done: 0, failed: 0, skipped: 0 }
  for (const row of queue) {
    if (row.status in counts) counts[row.status]++
  }

  const nextPending = queue.filter(r => r.status === 'pending').slice(0, 8)
  const failed = queue.filter(r => r.status === 'failed').slice(0, 8)
  const lastRun = runs[0] ?? null

  return NextResponse.json({
    lastRun,
    runs,
    queue: { counts, total: queue.length, nextPending, failed },
    coverage: lastRun?.coverage_report ?? null,
  })
}
