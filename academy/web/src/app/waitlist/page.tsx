'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function WaitlistPage() {
  const [name,   setName]   = useState('')
  const [email,  setEmail]  = useState('')
  const [reason, setReason] = useState('')
  const [state,  setState]  = useState<State>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg('')
    if (!name.trim() || !email.trim() || !reason.trim()) {
      setErrMsg('Please complete all fields.')
      return
    }
    setState('loading')
    const { error } = await supabase
      .from('academy_waitlist')
      .insert({ name: name.trim(), email: email.trim().toLowerCase(), reason: reason.trim() })
    if (error) {
      setErrMsg(error.message.includes('duplicate') ? 'That email has already applied.' : error.message)
      setState('error')
    } else {
      setState('success')
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">

      {/* Nav */}
      <nav className="border-b border-navy-border px-8 py-5">
        <Link href="/" className="font-serif text-gold text-xl tracking-[0.2em] uppercase hover:opacity-80 transition-opacity">
          Arete Academy
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg">

          {state === 'success' ? (
            <div className="text-center">
              <div className="gold-rule mb-10" />
              <h1 className="font-serif text-3xl text-cream mb-6">
                Your application has been received.
              </h1>
              <p className="text-cream/50 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
                We review each application personally. If your cohort has a place for you,
                you will hear from us.
              </p>
              <Link href="/" className="btn-ghost text-xs">
                Return Home
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <div className="gold-rule mb-8" />
                <h1 className="font-serif text-3xl md:text-4xl text-cream mb-3">
                  Apply for Early Access
                </h1>
                <p className="text-cream/40 text-sm leading-relaxed">
                  The first cohort is forming. Applications are reviewed manually.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label-academic">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marcus Aurelius"
                    className="input-academic"
                    required
                  />
                </div>

                <div>
                  <label className="label-academic">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-academic"
                    required
                  />
                </div>

                <div>
                  <label className="label-academic">Why do you want to study Stoicism?</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Tell us what brings you here. There is no correct answer."
                    rows={5}
                    className="input-academic resize-none"
                    required
                  />
                </div>

                {(state === 'error' || errMsg) && (
                  <div className="border border-red-800 bg-red-950/40 px-4 py-3">
                    <p className="text-red-400 text-sm">{errMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {state === 'loading' ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>

    </div>
  )
}
