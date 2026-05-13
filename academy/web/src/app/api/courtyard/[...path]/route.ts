import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL || 'https://arete-app-production.up.railway.app';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const upstreamUrl = `${BACKEND_URL}/api/courtyard/${path.join('/')}`;
  const body = await request.text();
  const authHeader = request.headers.get('authorization') ?? '';

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[courtyard proxy] upstream error:', err);
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 502 });
  }
}
