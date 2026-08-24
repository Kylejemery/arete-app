'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      // The recovery email (default {{ .ConfirmationURL }} template) routes
      // through Supabase's verify endpoint, which redirects to /auth/callback
      // with a one-time ?code=. That route exchanges it for a session and
      // forwards to /reset-password.
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (authError) { setError(authError.message); return; }
      // Always report success even if the address has no account, so the form
      // can't be used to probe which emails are registered.
      setSent(true);
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
          <h2 className="font-serif text-2xl text-academy-text mb-6">Reset your password</h2>

          {sent ? (
            <div className="space-y-5">
              <div className="bg-academy-surface border border-academy-border rounded-lg p-4">
                <p className="text-academy-text text-sm">
                  If an account exists for <span className="text-academy-gold">{email.trim()}</span>,
                  a password reset link is on its way. Check your inbox (and spam folder).
                </p>
              </div>
              <p className="text-academy-muted text-xs">
                The link expires after a short while. If it doesn&apos;t arrive, you can request another below.
              </p>
              <button
                onClick={() => { setSent(false); }}
                className="w-full bg-academy-surface border border-academy-border text-academy-text font-semibold py-3 rounded-lg hover:border-academy-gold transition-colors"
              >
                Send another link
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-academy-muted text-sm">
                Enter the email tied to your account and we&apos;ll send you a link to set a new password.
              </p>
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-center text-academy-muted text-sm mt-6">
            Remembered it?{' '}
            <Link href="/login" className="text-academy-gold hover:opacity-80 font-semibold">
              Back to sign in
            </Link>
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
