import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/synthesis/generate — admin-only. Triggers an on-demand run of
// the synthesis agent on Railway (default 3 documents). The run happens in the
// background on the server, so this returns as soon as it's started.
export async function POST(req: NextRequest) {
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

  let count = 3
  try {
    const body = await req.json()
    if (body && Number.isFinite(body.count)) count = body.count
  } catch {
    /* default count */
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/admin/synthesis/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ count }),
    })
    const respBody = await upstream.text()
    return new NextResponse(respBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin/synthesis/generate] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the synthesis agent.' }, { status: 502 })
  }
}
