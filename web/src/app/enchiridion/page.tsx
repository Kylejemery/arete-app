'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// The Enchiridion order page. The app (or the web app's own Progress page)
// sends a member here with ?request=<id> after the Railway server has
// created their request; this page shows what they asked for at the price
// that was quoted and takes payment through Stripe Checkout, which also
// collects the shipping address. Everything else about the book (writing
// it, proofing it, printing it) happens on the admin side.

type RequestRow = {
  id: string;
  format: string;
  price_cents: number;
  currency: string;
  status: string;
  created_at: string;
  shipping_name: string | null;
};

const FORMAT_LABELS: Record<string, string> = {
  hardcover: 'Hardcover',
  softcover: 'Softcover',
  journal: 'Journal edition',
};

const STATUS_COPY: Record<string, string> = {
  requested: 'Your handbook is being compiled from what you have written. You can pay now; it goes to print once it has been read over.',
  generating: 'Your handbook is being compiled from what you have written. You can pay now; it goes to print once it has been read over.',
  proofing: 'Your manuscript is ready and being read over before it goes to print.',
  awaiting_payment: 'Your manuscript is ready. Complete your order to send it to print.',
  paid: 'Paid. Your book goes to print once the manuscript has been read over.',
  printing: 'At the printer.',
  shipped: 'On its way to you.',
  delivered: 'Delivered.',
  cancelled: 'This request was cancelled.',
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function EnchiridionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request');
  const status = searchParams.get('status');
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/enchiridion${requestId ? `?request=${requestId}` : ''}`)}`);
        return;
      }
      let query = supabase
        .from('enchiridion_requests')
        .select('id, format, price_cents, currency, status, created_at, shipping_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (requestId) query = supabase
        .from('enchiridion_requests')
        .select('id, format, price_cents, currency, status, created_at, shipping_name')
        .eq('user_id', user.id)
        .eq('id', requestId)
        .limit(1);
      const { data } = await query;
      if (cancelled) return;
      setRequest(data?.[0] ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [requestId, router, status]);

  const pay = async () => {
    if (!request) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/enchiridion-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
      setBusy(false);
    }
  };

  const payable = request && ['requested', 'generating', 'proofing', 'awaiting_payment'].includes(request.status);

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="text-arete-muted hover:text-arete-text">
            ← Back
          </button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-arete-gold">Your Enchiridion</p>
            <h1 className="font-serif text-[28px] text-arete-text leading-none tracking-tight mt-1">
              Your own handbook, in print
            </h1>
          </div>
        </div>

        {status === 'success' && (
          <div className="mb-8 rounded-xl border border-arete-gold/40 bg-arete-surface p-6">
            <p className="text-arete-gold font-semibold mb-1">Thank you.</p>
            <p className="text-arete-muted text-sm">
              Your order is in. The manuscript is read over before it goes to print, and you will hear from us when it ships.
            </p>
          </div>
        )}
        {status === 'cancelled' && (
          <div className="mb-8 rounded-xl border border-arete-border bg-arete-surface p-6">
            <p className="text-arete-text font-semibold mb-1">Checkout cancelled.</p>
            <p className="text-arete-muted text-sm">No charge was made. Your request is kept; pay whenever you are ready.</p>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {loading ? (
          <p className="text-arete-muted">Loading…</p>
        ) : !request ? (
          <div className="rounded-xl border border-arete-border bg-arete-surface p-8">
            <p className="text-arete-text font-serif text-2xl mb-3">No request yet.</p>
            <p className="text-arete-muted text-sm">
              Ask for your Enchiridion from the Progress screen in the app. It is compiled from your journal,
              your Cabinet conversations, your goals and your scrolls, and set beside the texts.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-arete-border bg-arete-surface p-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-arete-muted mb-2">
              {FORMAT_LABELS[request.format] ?? request.format} · requested {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="mb-4">
              <span className="text-arete-gold font-serif text-4xl">{money(request.price_cents, request.currency)}</span>
              <span className="text-arete-muted text-sm"> including shipping</span>
            </p>
            <p className="text-arete-text text-sm mb-6 leading-relaxed">
              A book compiled from your own writing in Arete: the journal, the Cabinet, your goals and intentions,
              your scrolls, and the passages from the tradition your writing keeps returning to. Every word of yours is printed as you wrote it.
            </p>
            <p className="text-arete-muted text-sm mb-6">{STATUS_COPY[request.status] ?? ''}</p>
            {payable ? (
              <button
                onClick={pay}
                disabled={busy}
                className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Redirecting…' : `Pay ${money(request.price_cents, request.currency)}`}
              </button>
            ) : (
              <p className="text-arete-gold font-semibold capitalize">{request.status.replace('_', ' ')}</p>
            )}
            <p className="text-arete-muted text-xs mt-4">
              Billed once through Stripe. Your shipping address is collected at checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EnchiridionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-arete-bg flex items-center justify-center">
          <p className="text-arete-muted">Loading...</p>
        </div>
      }
    >
      <EnchiridionContent />
    </Suspense>
  );
}
