import { NextResponse } from 'next/server'

// Proxies the public Observatory convergences feed to the Railway backend
// (GET /api/observatory/convergences). Returns the approved and starred
// convergences the Observatory surfaces under "The Corpus Concludes" — the
// conclusions the corpus assembled but never stated. Public — no auth.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/observatory/convergences`, { method: 'GET' })
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[api/observatory/convergences proxy] upstream error:', err)
    return NextResponse.json({ error: 'The convergences are unreachable.' }, { status: 502 })
  }
}
