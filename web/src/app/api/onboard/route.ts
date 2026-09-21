import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Forward the caller's Supabase JWT; the backend rejects anonymous turns.
    const authorization = req.headers.get('authorization');
    const response = await fetch(`${API_BASE_URL}/api/onboard-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[/api/onboard proxy]', error);
    return NextResponse.json({ error: 'Failed to reach onboarding service' }, { status: 502 });
  }
}
