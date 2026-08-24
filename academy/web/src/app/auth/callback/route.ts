import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// PKCE code-exchange landing point. Supabase's email verify endpoint validates
// the emailed token and redirects here with a one-time ?code=; we exchange it
// for a session cookie, then forward to `next`. The default @supabase/ssr
// browser client uses the PKCE flow, so recovery / confirmation emails must be
// completed through exchangeCodeForSession — verifyOtp rejects the pkce_ token.
//
// Only same-origin relative `next` paths are honored, so the parameter can't be
// used as an open redirect.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'This link is invalid or has expired. Please request a new one.')
  return NextResponse.redirect(loginUrl)
}
