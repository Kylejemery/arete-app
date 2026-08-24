'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The /auth/confirm route establishes a recovery session before forwarding
  // here. If someone lands without one (stale link, opened directly), there's
  // nothing to update — send them back to request a fresh link.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) { setError(authError.message); return; }
      setDone(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-academy-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-academy-muted text-xs tracking-[0.3em] uppercase mb-2">Arete</p>
          <h1 className="font-serif text-5xl text-academy-gold tracking-wide mb-3">Academy</h1>
          <p className="text-academy-muted text-sm italic">Arete is not a feeling. It is a skill.</p>
        </div>

        <div className="bg-academy-card border border-academy-border rounded-xl p-8">
          <h2 className="font-serif text-2xl text-academy-text mb-6">Choose a new password</h2>

          {checkingSession ? (
            <p className="text-academy-muted text-sm">Verifying your reset link…</p>
          ) : done ? (
            <div className="space-y-5">
              <div className="bg-academy-surface border border-academy-border rounded-lg p-4">
                <p className="text-academy-text text-sm">Your password has been updated.</p>
              </div>
              <Link
                href="/login"
                className="block text-center w-full bg-academy-gold text-academy-bg font-semibold py-3.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          ) : !hasSession ? (
            <div className="space-y-5">
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  This reset link is invalid or has expired. Request a fresh one to continue.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block text-center w-full bg-academy-gold text-academy-bg font-semibold py-3.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">New password</label>
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
                <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Confirm new password</label>
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
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
