import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// /api/seminar/* : the Seminar Track classroom's reads (SeminarTrackCourse),
// forwarded to the Railway server's /api/seminar/* routes
// (server/routes/seminar.js) with the member's bearer token. The server
// decides who may see what (published course, standing, admin); this route
// only carries the request, the same way /api/academy/* does.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ''

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'Backend URL not configured. Set RAILWAY_BACKEND_URL.' }, { status: 503 })
  }
  const { path } = await context.params
  const headers: Record<string, string> = {}
  const auth = request.headers.get('authorization')
  if (auth) headers.authorization = auth
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/seminar/${path.map(encodeURIComponent).join('/')}`, { headers, cache: 'no-store' })
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[seminar] upstream error:', e)
    return NextResponse.json({ error: 'The seminar room could not be reached.' }, { status: 502 })
  }
}
