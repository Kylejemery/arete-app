'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { upsertUserSettings } from '@/lib/db'
import { Spinner } from '@/components/ui'

export default function SetupPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setChecking(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = userName.trim()
    if (!trimmed) {
      setError('Please enter your name.')
      return
    }
    setLoading(true)
    try {
      await upsertUserSettings({ user_name: trimmed })
      router.replace('/')
    } catch {
      setError('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-bold tracking-[0.2em] mb-2"
            style={{ color: '#c9a84c', fontFamily: 'var(--font-serif, Georgia, serif)' }}
          >
            ARETE
          </h1>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Copy matches the Home name prompt on mobile, verbatim. */}
          <p
            className="text-[10px] tracking-[1.8px] uppercase mb-2"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Welcome to Arete
          </p>
          <h2
            className="text-[26px] font-medium leading-tight mb-6"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            What should we call you?
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              autoCapitalize="words"
              autoCorrect="off"
              className="w-full rounded-xl px-4 py-3 text-[15px] caret-white outline-none transition-colors focus:border-[rgba(201,168,76,0.6)]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e6eef8',
              }}
              required
            />

            {error && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.4)' }}
              >
                <p className="text-sm" style={{ color: '#ff8080' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !userName.trim()}
              className="w-full font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
