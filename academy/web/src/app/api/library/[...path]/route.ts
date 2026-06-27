import { NextRequest, NextResponse } from 'next/server';

// Proxies the public Library of Arete endpoints to the Railway backend.
// GET  → /api/library/texts, /api/library/text   (read the shelves + texts)
// POST → /api/library/related, /api/library/debate (discuss + debate)
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const qs = request.nextUrl.search; // includes leading '?'
  const upstreamUrl = `${BACKEND_URL}/api/library/${path.join('/')}${qs}`;
  try {
    const upstream = await fetch(upstreamUrl, { method: 'GET' });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/library proxy GET] upstream error:', err);
    return NextResponse.json({ error: 'The Library is unreachable.' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const upstreamUrl = `${BACKEND_URL}/api/library/${path.join('/')}`;
  try {
    const body = await request.text();
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const responseBody = await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/library proxy POST] upstream error:', err);
    return NextResponse.json({ error: 'The Library is unreachable.' }, { status: 502 });
  }
}
