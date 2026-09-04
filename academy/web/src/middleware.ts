import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// /api/cron/post-due authenticates itself with CRON_SECRET (called by Railway,
// no user session), so it must bypass the session-redirect middleware.
//
// The Library of Arete is a public surface: the immersive page, its data
// proxies (/api/library/*), and the Oracle are reachable without a session.
// The Observatory proxies (/api/observatory/*) and the share pages
// (/observatory/<kind>/<id>) are public for the same
// reason — they surface only approved, observatory_visible data and the
// Railway backend rate-limits the one interactive route (passage).
//
// Perspectives (/perspectives/*) is a public essay surface, like the Library.
// The Playground (/playground/*) is public for the same reason — an open
// workshop of essays and the situations game — and its discussion API
// (/api/playground/*) writes only via the service role, server-side.
// Password-reset surfaces are public: /forgot-password requests the email,
// /auth/callback exchanges the emailed ?code= for a recovery session (PKCE),
// /auth/confirm covers the token_hash variant, and /reset-password lets the
// user set a new password (guarded by that session).
const PUBLIC_ROUTES = ['/', '/waitlist', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/auth/confirm', '/library', '/api/oracle', '/api/linkedin-callback', '/api/cron/post-due']
const PUBLIC_PREFIXES = ['/api/library/', '/api/observatory/', '/observatory/', '/perspectives/', '/playground', '/api/playground/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
