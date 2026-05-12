import { NextRequest, NextResponse } from 'next/server';

// Railway backend URL — server-side only (not exposed to the client bundle).
// Set RAILWAY_BACKEND_URL in Vercel project settings.
// Falls back to NEXT_PUBLIC_API_BASE_URL for local dev parity.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: 'Backend URL not configured. Set RAILWAY_BACKEND_URL.' },
      { status: 503 }
    );
  }

  const upstreamPath = `/api/academy/${params.path.join('/')}`;
  const upstreamUrl = `${BACKEND_URL}${upstreamPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward the Authorization header if present (Supabase JWT)
  const auth = request.headers.get('authorization');
  if (auth) headers['authorization'] = auth;

  try {
    const body = await request.text();

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body,
    });

    const responseBody = await upstream.text();

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[api/academy proxy] ${upstreamPath} failed:`, err);
    return NextResponse.json(
      { error: 'Failed to reach Railway backend.' },
      { status: 502 }
    );
  }
}
