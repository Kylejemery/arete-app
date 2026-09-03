import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/broadcasts/deliver — admin-only. Runs the broadcast delivery
// agent on the Railway server (which holds the Expo credentials) instead of
// waiting for the hourly cron, so "Send now" sends now. Pushes only: the
// Cabinet post is collected by each app on its next foreground either way.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return NextResponse.json({ error: 'No active session' }, { status: 401 })

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/admin/broadcasts/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin/broadcasts/deliver] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the broadcast agent.' }, { status: 502 })
  }
}
