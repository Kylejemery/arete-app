'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { upsertUserSettings, getCounselors, DEFAULT_WEB_CABINET, CABINET_CHAIR_SLUG, FUTURE_SELF_SLUG } from '@/lib/db'
import { logEvent, logEventNow } from '@/lib/events'
import type { Counselor } from '@/lib/types'
import SetupCabinetPicker from '@/components/SetupCabinetPicker'

// Web setup (retention plan R10): three short steps on one page. A signup
// leaves here with a name, one goal the Cabinet can work from, and the
// counselors the member chose, so the first Cabinet reply already has more
// than one voice and something to say about the member's own aim.
type SetupStep = 'name' | 'goal' | 'cabinet'

export default function SetupPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [goal, setGoal] = useState('')
  // Activation Part 3b: the one optional Know Thyself question at signup.
  // Kept, but folded under the goal so the page still reads as three steps.
  const [offLimits, setOffLimits] = useState('')
  const [showOffLimits, setShowOffLimits] = useState(false)
  const [cabinet, setCabinet] = useState<string[]>(() => DEFAULT_WEB_CABINET.filter(s => s !== FUTURE_SELF_SLUG))
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // onboarding_step_viewed fires once per step: name on mount, goal and
  // cabinet the first time the member reaches them.
  const viewedSteps = useRef<Set<SetupStep>>(new Set())
  const startedAt = useRef(Date.now())
  const stepViewed = (step: SetupStep) => {
    if (viewedSteps.current.has(step)) return
    viewedSteps.current.add(step)
    logEvent('onboarding_step_viewed', { step, path: 'web_setup' })
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setChecking(false)
      stepViewed('name')
      getCounselors().then(setCounselors).catch(() => setCounselors([]))
    }
    checkAuth()
  }, [router])

  const toggleCounselor = (slug: string) => {
    if (slug === CABINET_CHAIR_SLUG) return
    setCabinet(prev => {
      if (prev.includes(slug)) {
        const optionals = prev.filter(s => s !== CABINET_CHAIR_SLUG)
        if (optionals.length <= 1) return prev
        return prev.filter(s => s !== slug)
      }
      return [...prev, slug]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedName = userName.trim()
    const trimmedGoal = goal.trim()
    if (!trimmedName) {
      setError('Please enter a name.')
      return
    }
    if (!trimmedGoal) {
      setError('Tell your Cabinet one thing you are here to build.')
      return
    }
    setLoading(true)
    try {
      const off = offLimits.trim()
      const members = [...cabinet.filter(s => s !== FUTURE_SELF_SLUG), FUTURE_SELF_SLUG]
      await upsertUserSettings({
        user_name: trimmedName,
        user_goals: trimmedGoal,
        kt_goals: trimmedGoal,
        cabinet_members: members,
        ...(off ? { kt_off_limits: off } : {}),
      })
      logEvent('kt_field_filled', { field_key: 'goals', source: 'setup' })
      if (off) logEvent('kt_field_filled', { field_key: 'off_limits', source: 'setup' })
      await logEventNow('onboarding_committed', {
        path: 'web_setup',
        fields_filled: 2 + (off ? 1 : 0),
        cabinet_size: members.length,
        duration_s: Math.round((Date.now() - startedAt.current) / 1000),
      })
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

  const inputClass = 'w-full bg-arete-bg border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors'

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-arete-gold tracking-widest mb-2">ARETE</h1>
          <p className="text-gray-500 italic text-sm">Three quick things, then your Cabinet is waiting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: name */}
          <section className="bg-arete-card rounded-xl p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-wider text-arete-gold mb-1">Step 1 of 3</p>
            <h2 className="text-white text-lg font-bold mb-3">What should your Cabinet call you?</h2>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onFocus={() => stepViewed('name')}
              placeholder="Your first name"
              autoComplete="given-name"
              className={`${inputClass} autofill:bg-arete-bg autofill:[color:white] autofill:shadow-[inset_0_0_0px_1000px_#1a1a2e]`}
              required
              autoFocus
            />
          </section>

          {/* Step 2: goal */}
          <section className="bg-arete-card rounded-xl p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-wider text-arete-gold mb-1">Step 2 of 3</p>
            <h2 className="text-white text-lg font-bold mb-1">What are you here to build?</h2>
            <p className="text-gray-400 text-sm mb-3">
              One sentence is enough. Your counselors will hold you to it.
            </p>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onFocus={() => stepViewed('goal')}
              placeholder="e.g. A calmer temper at home, and a business that runs without me by next summer."
              rows={2}
              maxLength={500}
              className={`${inputClass} resize-none`}
              required
            />
            {showOffLimits ? (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                  Anything your Cabinet should never bring up?
                </label>
                <textarea
                  value={offLimits}
                  onChange={e => setOffLimits(e.target.value)}
                  placeholder="Optional. You can change this any time in Know Thyself."
                  rows={2}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowOffLimits(true)}
                className="mt-3 text-xs text-arete-muted hover:text-arete-text underline underline-offset-2"
              >
                Anything your Cabinet should never bring up?
              </button>
            )}
          </section>

          {/* Step 3: cabinet */}
          <section
            className="bg-arete-card rounded-xl p-6 md:p-8"
            onFocus={() => stepViewed('cabinet')}
            onPointerEnter={() => stepViewed('cabinet')}
          >
            <p className="text-[11px] uppercase tracking-wider text-arete-gold mb-1">Step 3 of 3</p>
            <h2 className="text-white text-lg font-bold mb-1">Choose who sits on your Cabinet</h2>
            <p className="text-gray-400 text-sm mb-4">
              Three counselors are yours from the start. Marcus Aurelius chairs the table.
            </p>
            {counselors.length > 0 ? (
              <SetupCabinetPicker counselors={counselors} selected={cabinet} onToggle={toggleCounselor} />
            ) : (
              <p className="text-arete-muted text-sm">Loading counselors…</p>
            )}
          </section>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-arete-gold text-arete-bg font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Meet your Cabinet'}
          </button>
        </form>
      </div>
    </div>
  )
}
