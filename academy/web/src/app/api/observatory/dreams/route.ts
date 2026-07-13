import { NextRequest, NextResponse } from 'next/server'

// Proxies the public Observatory dreams feed to the Railway backend
// (GET /api/observatory/dreams). Returns the approved/starred,
// observatory_visible corpus dreams surfaced under "The Corpus Imagines".
// ?all=1 passes through to request the full dream ledger (complete text,
// starred first). Public — no auth.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get('all') === '1' ? '?all=1' : ''
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/dreams${all}`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory/dreams proxy] upstream error:', err)
    return NextResponse.json({ error: 'The dreams are unreachable.' }, { status: 502 })
  }
}
