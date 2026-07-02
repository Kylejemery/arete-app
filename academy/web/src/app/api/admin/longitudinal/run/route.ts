import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/longitudinal/run — admin-only. Runs the Longitudinal User
// Model agent NOW on the Railway server (POST /api/admin/longitudinal/run
// there) instead of waiting for the Monday 04:30 UTC cron. One Claude call per
// eligible user (4+ weeks of history), so this can run long — up to 300s.
// Returns the run summary { eligible, skipped, updated, failures }.
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
    const upstream = await fetch(`${BACKEND_URL}/api/admin/longitudinal/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const body = await upstream.text()
    // Never pass an HTML error page through as JSON — wrap it readably.
    try {
      JSON.parse(body)
    } catch {
      return NextResponse.json(
        {
          error:
            `The longitudinal endpoint returned ${upstream.status} with a non-JSON body — ` +
            'the Railway server may be mid-deploy. Try again in a minute.',
        },
        { status: 502 }
      )
    }
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin/longitudinal/run] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the longitudinal agent.' }, { status: 502 })
  }
}
