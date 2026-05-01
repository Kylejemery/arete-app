'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) { setError(authError.message); return; }
      setDone(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-academy-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">📜</p>
          <h2 className="font-serif text-3xl text-academy-gold mb-3">Application Received</h2>
          <p className="text-academy-muted text-sm leading-relaxed mb-6">
            Check your email to confirm your account. Once confirmed, you may begin your studies.
          </p>
          <Link href="/login" className="text-academy-gold font-semibold hover:opacity-80">
            Proceed to Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-academy-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-academy-muted text-xs tracking-[0.3em] uppercase mb-2">Arete</p>
          <h1 className="font-serif text-5xl text-academy-gold tracking-wide mb-3">Academy</h1>
          <p className="text-academy-muted text-sm">14-day free Auditor trial. No credit card required.</p>
        </div>

        <div className="bg-academy-card border border-academy-border rounded-xl p-8">
          <h2 className="font-serif text-2xl text-academy-text mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="scholar@example.com"
                className="w-full bg-academy-surface border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-academy-surface border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-academy-surface border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-academy-gold text-academy-bg font-semibold py-3.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Start Auditing Free'}
            </button>
          </form>

          <p className="text-center text-academy-muted text-sm mt-6">
            Already enrolled?{' '}
            <Link href="/login" className="text-academy-gold hover:opacity-80 font-semibold">Sign In</Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-academy-muted text-sm hover:text-academy-text transition-colors">
            ← Back to Academy
          </Link>
        </p>
      </div>
    </div>
  );
}
