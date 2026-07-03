import { NextRequest, NextResponse } from 'next/server'

// Proxies the Observatory Living Sky endpoints to the Railway backend:
// GET  → /api/observatory/state, /api/observatory/greeting
// POST → /api/observatory/passage
// The specific sibling routes (inquiries, tensions, world, dreams) keep their
// own files and win over this catch-all; this covers everything newer.
// Public — no auth, same posture as the other Observatory endpoints.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const qs = request.nextUrl.search
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/${path.join('/')}${qs}`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory proxy GET] upstream error:', err)
    return NextResponse.json({ error: 'The Observatory is unreachable.' }, { status: 502 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  try {
    const body = await request.text()
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/${path.join('/')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The Railway rate limiter keys on x-forwarded-for; pass the real
        // client IP through so limits apply per visitor, not per Vercel node.
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      },
      body,
    })
    const responseBody = await upstream.text()
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory proxy POST] upstream error:', err)
    return NextResponse.json({ error: 'The Observatory is unreachable.' }, { status: 502 })
  }
}
