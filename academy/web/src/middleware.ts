import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// /api/cron/post-due authenticates itself with CRON_SECRET (called by Railway,
// no user session), so it must bypass the session-redirect middleware.
//
// The Library of Arete is a public surface: the immersive page, its data
// proxies (/api/library/*), and the Oracle are reachable without a session.
// The Observatory proxies (/api/observatory/*) are public for the same
// reason — they surface only approved, observatory_visible data and the
// Railway backend rate-limits the one interactive route (passage).
const PUBLIC_ROUTES = ['/', '/waitlist', '/login', '/signup', '/library', '/api/oracle', '/api/linkedin-callback', '/api/cron/post-due']
const PUBLIC_PREFIXES = ['/api/library/', '/api/observatory/']

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

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
