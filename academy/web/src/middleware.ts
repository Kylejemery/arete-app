import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RELEASED_PLAYGROUND, SHARE_PARAM, shareCookieName, verifyShareToken } from '@/lib/playground-share'

// /api/cron/post-due authenticates itself with CRON_SECRET (called by Railway,
// no user session), so it must bypass the session-redirect middleware.
//
// The Library of Arete is a public surface: the immersive page, its data
// proxies (/api/library/*), and the Oracle are reachable without a session.
// The Observatory proxies (/api/observatory/*), the journal (/observatory)
// and its piece pages (/observatory/<kind>/<id>) are public for the same
// reason — they surface only approved, observatory_visible data and the
// Railway backend rate-limits the one interactive route (passage).
//
// Perspectives (/perspectives/*) is a public essay surface, like the Library.
// The Playground (/playground/*) is public for the same reason — an open
// workshop of essays and the situations game — and its discussion API
// (/api/playground/*) writes only via the service role, server-side.
// Research (/research/*) is public working papers: the page and its
// downloadable data files under public/research/, which the matcher below
// would otherwise send to /login.
// Password-reset surfaces are public: /forgot-password requests the email,
// /auth/callback exchanges the emailed ?code= for a recovery session (PKCE),
// /auth/confirm covers the token_hash variant, and /reset-password lets the
// user set a new password (guarded by that session).
const PUBLIC_ROUTES = ['/', '/waitlist', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/auth/confirm', '/library', '/observatory', '/api/oracle', '/api/linkedin-callback', '/api/cron/post-due']
const PUBLIC_PREFIXES = ['/api/library/', '/api/observatory/', '/observatory/', '/perspectives/', '/api/playground/', '/research/']

// The Playground opens one piece at a time. Only the slugs in
// RELEASED_PLAYGROUND (lib/playground-share.ts) are reachable; every other
// /playground path — the index included — 404s, so an unreleased piece cannot
// be reached by guessing a URL or by a stray link. Releasing a piece is adding
// its slug to that list, and nothing else.
//
// The owner is the exception. Gating the index locked the author out of their
// own workshop, which is not the point: what is gated is users reaching it,
// not the Playground existing. ADMIN_EMAIL sees everything, as with /admin.
//
// A share link is the other exception: the owner signs a link for one piece
// (admin → Share Links) and whoever holds it can open that piece, and only
// that piece, until it expires. See lib/playground-share.ts.
/**
 * Is this request the owner's? Read only to answer that question: no refreshed
 * cookies are propagated, because the only outcomes here are 404 or straight
 * through. Any missing piece of configuration answers no, so a misconfigured
 * deploy fails closed rather than opening the Playground to everyone.
 */
async function isOwner(request: NextRequest): Promise<boolean> {
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const adminEmail      = process.env.ADMIN_EMAIL
  if (!supabaseUrl || !supabaseAnonKey || !adminEmail) return false

  try {
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { user } } = await client.auth.getUser()
    return !!user?.email && user.email === adminEmail
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Playground gating comes first: /playground is no longer a public prefix,
  // and this decides both halves of it — a released piece is public, anything
  // else is not found. '/playground' and '/playground/' both slice to '',
  // which is never in the list, so the index is gated with the rest.
  if (pathname === '/playground' || pathname.startsWith('/playground/')) {
    const piece = pathname.slice('/playground/'.length)
    if (RELEASED_PLAYGROUND.includes(piece)) {
      return NextResponse.next()
    }

    // First visit through a share link: remember it in a cookie scoped to this
    // piece's path, then redirect to the clean URL so the token leaves the
    // address bar (and the Referer of anything the page loads).
    const token = request.nextUrl.searchParams.get(SHARE_PARAM)
    if (token) {
      const expires = await verifyShareToken(piece, token)
      if (expires) {
        const clean = request.nextUrl.clone()
        clean.searchParams.delete(SHARE_PARAM)
        const response = NextResponse.redirect(clean)
        response.cookies.set(shareCookieName(piece), token, {
          path: pathname,
          expires: new Date(expires * 1000),
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
        })
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        return response
      }
    }
    // Later visits: the cookie carries the same token, checked the same way.
    if (await verifyShareToken(piece, request.cookies.get(shareCookieName(piece))?.value)) {
      const response = NextResponse.next()
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }

    // The session is read only for gated paths, so a released piece stays
    // public and costs no auth round-trip.
    if (await isOwner(request)) return NextResponse.next()
    return new NextResponse(null, { status: 404 })
  }

  if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next()

  let response = NextResponse.next({ request })

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await client.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // The admin console (and its agent fleet) is single-tenant: only the owner
  // may load it. Every /api/admin/* route already enforces this server-side
  // (returning 401 JSON), so we gate only the /admin page shell here — a
  // signed-in non-owner is bounced to the home page instead of seeing it.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
