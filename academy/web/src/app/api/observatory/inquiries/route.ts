import { NextResponse } from 'next/server'

// Proxies the public Observatory open-inquiries feed to the Railway backend
// (GET /api/observatory/inquiries). Returns the approved, observatory_visible
// inquiries the Observatory sidebar surfaces. Public — no auth.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/inquiries`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory/inquiries proxy] upstream error:', err)
    return NextResponse.json({ error: 'The open inquiries are unreachable.' }, { status: 502 })
  }
}
