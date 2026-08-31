'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)

  // PKCE recovery links land here as ?code=..., which the Supabase client
  // exchanges for a session on load. That exchange fires SIGNED_IN (not
  // PASSWORD_RECOVERY, which only the legacy hash flow emits) and may finish
  // before this effect runs, so check for an existing session too. If no
  // session appears, the link was expired or already used.
  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setReady(true)
    })
    const timer = setTimeout(() => {
      if (active) setLinkInvalid(true)
    }, 8000)
    return () => {
      active = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const handleUpdate = async () => {
    setError(null)
    if (!newPassword) {
      setError('Please enter a new password.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-arete-gold tracking-widest mb-2">ARETE</h1>
          <p className="text-gray-500 italic text-sm">Be who you want to be.</p>
        </div>

        <div className="text-center mb-8">
          <p
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            Set a New Password
          </p>
        </div>

        {success ? (
          <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-5 text-center">
            <p className="text-green-400 text-sm font-semibold">Password updated.</p>
            <p className="text-gray-500 text-xs mt-1">Returning home…</p>
          </div>
        ) : !ready && linkInvalid ? (
          <div className="text-center py-10 space-y-4">
            <p
              className="text-sm"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              This reset link is invalid or has expired.
            </p>
            <p className="text-gray-500 text-sm">
              <a href="/login" className="text-arete-gold font-semibold hover:opacity-80">
                Request a new one from the sign-in page
              </a>
            </p>
          </div>
        ) : !ready ? (
          <div className="text-center py-10">
            <p
              className="text-sm italic"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
            >
              Verifying your reset link…
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-arete-surface border border-arete-border rounded-xl px-4 py-3 text-arete-text caret-arete-text placeholder-arete-muted focus:outline-none focus:border-arete-gold transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-arete-surface border border-arete-border rounded-xl px-4 py-3 text-arete-text caret-arete-text placeholder-arete-muted focus:outline-none focus:border-arete-gold transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading}
              className="w-full bg-arete-gold text-arete-bg font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>

            <p className="text-center text-gray-500 text-sm">
              <a href="/login" className="text-arete-gold font-semibold hover:opacity-80">
                Back to Sign In
              </a>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
