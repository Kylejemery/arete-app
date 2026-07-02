import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/corpus-agent/run — admin-only. Runs corpus ingestion NOW on
// the always-on Railway server (POST /api/admin/corpus/run there), which
// drains the pending queue and logs a corpus_ingestion_runs row the panel
// displays. The backend fires the run and returns 202 immediately, so there is
// no serverless timeout risk here.
//
// (The previous implementation asked Railway to redeploy the nightly cron
// service via environmentTriggersDeploy — but Railway cron services don't
// execute on deploy, so that only rebuilt the service without ingesting.)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/admin/corpus/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin/corpus-agent/run] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the corpus agent.' }, { status: 502 })
  }
}
