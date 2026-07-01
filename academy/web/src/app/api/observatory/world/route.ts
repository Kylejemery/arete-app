import { NextResponse } from 'next/server'

// Proxies the public World Agent response to the Railway backend
// (GET /api/observatory/world). Returns the approved, observatory_visible world
// observation the Observatory sidebar surfaces ("The corpus is responding to").
// Public — no auth.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/world`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory/world proxy] upstream error:', err)
    return NextResponse.json({ error: 'The world response is unreachable.' }, { status: 502 })
  }
}
