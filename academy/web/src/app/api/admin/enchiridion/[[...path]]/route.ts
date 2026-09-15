import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
// Generation is fired in the background on Railway (202), so nothing here
// waits on a model call; 60s covers a slow roster query.
export const maxDuration = 60

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// Admin Enchiridion tab → Railway. Every path under /api/admin/enchiridion is
// forwarded verbatim (roster, documents, generate, requests, config) with the
// admin's own Supabase JWT, which the Railway side checks against
// profiles.is_admin. The manuscript logic lives in one place
// (server/enchiridion-agent.js) so the app and the admin tab can never drift.
async function forward(request: NextRequest, path: string[] | undefined, method: string) {
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

  const suffix = path && path.length ? `/${path.join('/')}` : ''
  const qs = request.nextUrl.search
  try {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
    if (method !== 'GET') init.body = await request.text()
    const upstream = await fetch(`${BACKEND_URL}/api/admin/enchiridion${suffix}${qs}`, init)
    const body = await upstream.text()
    // Never pass an HTML error page through as JSON — wrap it readably.
    try {
      JSON.parse(body)
    } catch {
      return NextResponse.json(
        {
          error:
            `The enchiridion endpoint returned ${upstream.status} with a non-JSON body — ` +
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
    console.error('[admin/enchiridion proxy] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the enchiridion agent.' }, { status: 502 })
  }
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, context: Ctx) {
  const { path } = await context.params
  return forward(request, path, 'GET')
}
export async function POST(request: NextRequest, context: Ctx) {
  const { path } = await context.params
  return forward(request, path, 'POST')
}
export async function PATCH(request: NextRequest, context: Ctx) {
  const { path } = await context.params
  return forward(request, path, 'PATCH')
}
