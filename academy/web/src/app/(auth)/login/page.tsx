'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) { setError(authError.message); return; }
      window.location.href = searchParams.get('redirectTo') || '/dashboard';
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
          <p className="text-academy-muted text-sm italic">&ldquo;Learn like a spy in the enemy camp.&rdquo;</p>
        </div>

        <div className="bg-academy-card border border-academy-border rounded-xl p-8">
          <h2 className="font-serif text-2xl text-academy-text mb-6">Sign In</h2>
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-academy-muted text-sm mt-6">
            No account?{' '}
            <Link href="/signup" className="text-academy-gold hover:opacity-80 font-semibold">
              Start auditing free
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-academy-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
