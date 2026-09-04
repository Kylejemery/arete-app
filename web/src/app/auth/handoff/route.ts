import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Mobile → web session handoff, step 2 of 2 (see /api/auth/handoff).
//
// The app opens this URL in the in-app browser. We verify the one-time
// magic-link token hash through the cookie-backed server client, which
// writes the session cookies the rest of the web app reads, then redirect
// to the requested page. A bad, reused, or expired hash falls back to the
// normal login screen with the destination preserved, so the worst case is
// exactly what happened before this route existed.

function safeNextPath(raw: string | null): string {
  if (!raw) return '/upgrade'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/upgrade'
  return raw
}

export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get('token_hash')
  const next = safeNextPath(req.nextUrl.searchParams.get('next'))

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirectTo', next)

  if (!tokenHash) {
    return NextResponse.redirect(loginUrl)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })
    if (error) {
      console.error('[/auth/handoff] verifyOtp failed:', error.message)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL(next, req.url))
  } catch (error) {
    console.error('[/auth/handoff]', error)
    return NextResponse.redirect(loginUrl)
  }
}
