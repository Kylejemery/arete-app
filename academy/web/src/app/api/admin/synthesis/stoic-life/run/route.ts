import { NextResponse } from 'next/server'
import { requireAdmin, startStoicLifeCycle } from '@/lib/stoic-life'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/admin/synthesis/stoic-life/run — start a Stoic Life cycle by hand
// (top up the backlog, draft if a topic is waiting). The page's Run now
// button, for when an automatic start did not reach the server.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cycle = await startStoicLifeCycle(session.token)
  return NextResponse.json(cycle, { status: cycle.started ? 202 : cycle.status })
}
