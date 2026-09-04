import { NextRequest, NextResponse } from 'next/server';

// Proxies the public Stoic Oracle to the Railway backend. Used by the
// Symposium "sit & converse" mode. Returns { answer, sources, remaining }.
const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    // The reader's session travels as a bearer token so the backend can
    // apply the tiered quota (free 5/day, Premium 50, Pro unlimited) per
    // user rather than per IP; anonymous readers still get the free quota.
    const auth = request.headers.get('authorization');
    const upstream = await fetch(`${BACKEND_URL}/oracle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    });
    const responseBody = await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api/oracle proxy] upstream error:', err);
    return NextResponse.json({ error: 'The Oracle is silent. Please try again.' }, { status: 502 });
  }
}
