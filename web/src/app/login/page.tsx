'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(authError.message)
      } else {
        const redirectTo = searchParams.get('redirectTo') || '/'
        router.replace(redirectTo)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(authError.message)
      } else {
        setMessage('Account created! Check your email to confirm your account, then sign in.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signin') handleSignIn()
    else handleSignUp()
  }

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-arete-gold tracking-widest mb-2">ARETE</h1>
          <p className="text-gray-500 italic text-sm">Be who you want to be.</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-arete-card rounded-xl p-1 mb-8">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
              mode === 'signin'
                ? 'bg-arete-gold text-arete-bg'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setMessage(null) }}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
              mode === 'signup'
                ? 'bg-arete-gold text-arete-bg'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-arete-card border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors autofill:bg-arete-card autofill:[color:white] autofill:shadow-[inset_0_0_0px_1000px_#16213e]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-arete-card border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors autofill:bg-arete-card autofill:[color:white] autofill:shadow-[inset_0_0_0px_1000px_#16213e]"
              required
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-arete-card border border-arete-gold/20 rounded-xl px-4 py-3 text-white caret-white placeholder-gray-600 focus:outline-none focus:border-arete-gold/60 transition-colors autofill:bg-arete-card autofill:[color:white] autofill:shadow-[inset_0_0_0px_1000px_#16213e]"
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-arete-gold text-arete-bg font-bold py-4 rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="text-arete-gold font-semibold hover:opacity-80"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null) }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-arete-bg" />}>
      <LoginForm />
    </Suspense>
  )
}
