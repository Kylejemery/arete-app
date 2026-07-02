import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/tensions/run — admin-only. Runs the Tension Agent NOW on the
// Railway server instead of waiting for the Monday 05:30 UTC cron. The backend
// fires the run and returns 202 immediately (four candidate pairings, each one
// model call — a few minutes); new tensions appear in the pending queue.
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
    const upstream = await fetch(`${BACKEND_URL}/api/admin/tensions/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    const body = await upstream.text()
    try {
      JSON.parse(body)
    } catch {
      return NextResponse.json(
        { error: `The tension endpoint returned ${upstream.status} with a non-JSON body — the Railway server may be mid-deploy. Try again in a minute.` },
        { status: 502 }
      )
    }
    return new NextResponse(body, { status: upstream.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[admin/tensions/run] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the tension agent.' }, { status: 502 })
  }
}
