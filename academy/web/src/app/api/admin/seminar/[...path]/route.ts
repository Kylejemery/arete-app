import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// /api/admin/seminar/* : admin only. The Seminar Builder's calls, forwarded
// to the Railway server's /api/admin/seminar/* routes (server/routes/seminar.js)
// with the admin's bearer token. Agent runs answer 202 at once and are polled
// through the jobs route, so nothing here waits on a model.
async function forward(req: NextRequest, path: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return NextResponse.json({ error: 'No active session' }, { status: 401 })

  const target = `${BACKEND_URL}/api/admin/seminar/${path.map(encodeURIComponent).join('/')}`
  const body = req.method === 'GET' ? undefined : await req.text()
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body || undefined,
      cache: 'no-store',
    })
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin/seminar] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the Seminar Builder server.' }, { status: 502 })
  }
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path) }
export async function POST(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path) }
export async function PATCH(req: NextRequest, ctx: Ctx) { return forward(req, (await ctx.params).path) }
