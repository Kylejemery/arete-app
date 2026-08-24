import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Landing point for the links in Supabase auth emails (password recovery,
// email change, magic link). The email template points here with a
// {{ .TokenHash }}; we exchange it for a session cookie via verifyOtp, then
// forward to `next`. This server-side flow works cross-device — unlike the
// PKCE `?code=` flow, it needs no code-verifier stored in the same browser.
//
// Only same-origin relative `next` paths are honored, so the parameter can't
// be used as an open redirect.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'This link is invalid or has expired. Please request a new one.')
  return NextResponse.redirect(loginUrl)
}
