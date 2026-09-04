import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Mobile → web session handoff, step 1 of 2.
//
// The app keeps its Supabase session in device storage; the web app keeps
// its own in browser cookies. Opening the upgrade page from the app used to
// land on /login because the browser had never seen this user. This route
// lets the app trade its verified JWT for a one-time sign-in link: we mint a
// magic-link token hash for the caller's own email (generateLink sends no
// email) and return a URL to /auth/handoff, which verifies the hash, writes
// the cookie session, and redirects to `next`. The hash is single-use and
// expires on Supabase's OTP window, and the refresh token never leaves the
// server, so nothing long-lived travels through the URL.
//
// Identity is the Bearer JWT only, exactly like /api/delete-account — a
// caller can mint a link for itself and nothing else.

const FALLBACK_APP_URL = 'https://app.pursuearete.com'
// The Academy shares the Supabase project, so the same one-time hash signs
// the user in there through its /auth/confirm route (type=magiclink).
const ACADEMY_URL = 'https://academy.pursuearete.com'

// Only same-origin paths may be used as a landing target.
function safeNextPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/upgrade'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/upgrade'
  return raw
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const next = safeNextPath(body?.next)

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })
    if (error || !data?.properties?.hashed_token) {
      throw error ?? new Error('generateLink returned no token')
    }

    let url: URL
    if (body?.target === 'academy') {
      url = new URL('/auth/confirm', ACADEMY_URL)
      url.searchParams.set('token_hash', data.properties.hashed_token)
      url.searchParams.set('type', 'magiclink')
      url.searchParams.set('next', next)
    } else {
      const origin = req.headers.get('origin') ?? FALLBACK_APP_URL
      url = new URL('/auth/handoff', origin)
      url.searchParams.set('token_hash', data.properties.hashed_token)
      url.searchParams.set('next', next)
    }

    return NextResponse.json({ url: url.toString() })
  } catch (error) {
    console.error('[/api/auth/handoff]', error)
    return NextResponse.json({ error: 'Could not create sign-in link' }, { status: 500 })
  }
}
