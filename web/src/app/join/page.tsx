'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://arete-app-production.up.railway.app'
const APP_STORE_URL = 'https://apps.apple.com/us/app/arete-know-thyself/id6762371595'

type JoinState = 'joining' | 'joined' | 'error'

/**
 * Web landing page for shared-session invites (app.pursuearete.com/join?token=...).
 * Middleware redirects signed-out visitors to /login?redirectTo=/join?token=...,
 * so by the time this renders the user has an account and a session. We call
 * the Railway accept endpoint with their Supabase JWT, then point them at the
 * app, where the shared Cabinet conversation lives.
 */
function JoinPageInner() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<JoinState>('joining')
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    const token = searchParams.get('token') || ''
    if (attemptedRef.current) return
    attemptedRef.current = true

    ;(async () => {
      if (!token) {
        setError('This invite link is missing its token.')
        setState('error')
        return
      }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          // Middleware should have caught this; belt and suspenders.
          window.location.href = `/login?redirectTo=${encodeURIComponent(`/join?token=${token}`)}`
          return
        }

        let partnerDisplayName = session.user?.email || 'Partner'
        try {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('user_name')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (settings?.user_name) partnerDisplayName = settings.user_name
        } catch { /* fall back to email */ }

        const response = await fetch(`${API_BASE_URL}/api/sessions/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, partnerDisplayName }),
        })
        const data = await response.json().catch(() => ({}))

        if (response.ok && data?.success) {
          setState('joined')
        } else {
          setError(data?.error || 'This invite has expired or is invalid.')
          setState('error')
        }
      } catch (err) {
        console.error('[join] accept failed:', err)
        setError('Something went wrong joining the session. Please try again.')
        setState('error')
      }
    })()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-arete-gold tracking-widest mb-8">ARETE</h1>

        {state === 'joining' && (
          <>
            <p className="text-arete-text text-lg font-semibold mb-2">Joining your shared Cabinet session…</p>
            <p className="text-gray-500 text-sm">One moment.</p>
          </>
        )}

        {state === 'joined' && (
          <div className="space-y-5">
            <p className="text-arete-text text-lg font-semibold">You&apos;re in.</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              You&apos;ve joined the shared Cabinet session. Open your Cabinet to start the
              conversation together, here on the web or in the Arete app with this same
              account.
            </p>
            <a
              href="/cabinet"
              className="inline-block bg-arete-gold text-arete-bg font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
            >
              Open your Cabinet
            </a>
            <p className="text-gray-500 text-xs">
              Prefer your phone?{' '}
              <a href={APP_STORE_URL} className="underline hover:opacity-80" style={{ color: '#c9a84c' }}>
                Get Arete on the App Store
              </a>{' '}
              and sign in with this account.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-5">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-500 text-sm">
              Invites expire after 48 hours. Ask your partner to send a fresh one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-arete-bg" />}>
      <JoinPageInner />
    </Suspense>
  )
}
