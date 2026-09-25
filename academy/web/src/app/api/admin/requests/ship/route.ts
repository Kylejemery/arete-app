import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// Personalization run C, Part C4. Shipping lives on the Railway server,
// which owns the module registry, the Cabinet threads and push.
//   GET  — the registry modules a cluster can be marked shipped as.
//   POST { clusterId, moduleKey } — mark shipped and tell each person who
//        asked, once. The response carries counts only.
async function upstream(path: string, init: RequestInit) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return NextResponse.json({ error: 'No active session' }, { status: 401 })
  try {
    const r = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    })
    const body = await r.text()
    return new NextResponse(body, { status: r.status, headers: { 'Content-Type': 'application/json' } })
  } catch {
    return NextResponse.json({ error: 'Failed to reach the server.' }, { status: 502 })
  }
}

export async function GET() {
  return upstream('/api/admin/modules', { method: 'GET' })
}

export async function POST(req: NextRequest) {
  const { clusterId, moduleKey } = await req.json().catch(() => ({}))
  if (typeof clusterId !== 'string' || !clusterId || typeof moduleKey !== 'string' || !moduleKey) {
    return NextResponse.json({ error: 'clusterId and moduleKey are required' }, { status: 400 })
  }
  return upstream(`/api/admin/feature-clusters/${encodeURIComponent(clusterId)}/ship`, {
    method: 'POST',
    body: JSON.stringify({ module_key: moduleKey }),
  })
}
