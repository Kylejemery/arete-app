'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { upsertUserSettings } from '@/lib/db'
import { logEvent } from '@/lib/events'

export default function SetupPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  // Activation Part 3b: the one optional Know Thyself question at signup.
  const [offLimits, setOffLimits] = useState('')
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
      setError('Please enter a username.')
      return
    }
    setLoading(true)
    try {
      const off = offLimits.trim()
      await upsertUserSettings(off ? { user_name: trimmed, kt_off_limits: off } : { user_name: trimmed })
      if (off) logEvent('kt_field_filled', { field_key: 'off_limits', source: 'form' })
      // Straight into the first Cabinet conversation; Know Thyself is filled
      // over time by the Cabinet and stays available from Settings.
      router.replace('/cabinet')
    } catch {
      setError('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <div className="text-arete-muted">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-arete-gold tracking-widest mb-2">ARETE</h1>
          <p className="text-gray-500 italic text-sm">Set up your profile to get started.</p>
        </div>

        <div className="bg-arete-card rounded-xl p-8">
          <h2 className="text-white text-xl font-bold mb-2">Welcome!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Choose a username to personalize your experience.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="e.g. Marcus"
                className="w-full bg-arete-bg border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors autofill:bg-arete-bg autofill:[color:white] autofill:shadow-[inset_0_0_0px_1000px_#1a1a2e]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Anything your Cabinet should never bring up?
              </label>
              <textarea
                value={offLimits}
                onChange={e => setOffLimits(e.target.value)}
                placeholder="Optional. You can change this any time in Know Thyself."
                rows={3}
                maxLength={500}
                className="w-full bg-arete-bg border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-arete-gold text-arete-bg font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
            >
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
