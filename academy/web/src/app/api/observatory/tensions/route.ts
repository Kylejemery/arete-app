import { NextResponse } from 'next/server'

// Proxies the public Observatory open-tensions feed to the Railway backend
// (GET /api/observatory/tensions). Returns the approved, observatory_visible
// philosophical tensions the Observatory sidebar surfaces. Public — no auth.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/tensions`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory/tensions proxy] upstream error:', err)
    return NextResponse.json({ error: 'The open tensions are unreachable.' }, { status: 502 })
  }
}
