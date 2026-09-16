'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/claudeService';

// The Enchiridion offer on the web Progress page, the twin of the card on the
// mobile Progress tab. The copy is deliberately identical: it is one product
// spoken about in one voice.
//
// The web version has one advantage over the app's. Payment is taken here, so
// requesting and paying are one movement: the request lands and the member
// goes straight to /enchiridion. The app has to hand off to a browser for the
// same thing.
//
// Renders nothing at all when the server says the Enchiridion is off, or when
// it cannot be reached. A card that cannot be acted on is worse than no card.

type Offer = {
  enabled: boolean;
  currency: string;
  price_cents: number;
  formats: Record<string, { label: string; price_cents: number }>;
  min_entries: number;
  written: number;
  eligible: boolean;
  request: { id: string; format: string; price_cents: number; currency: string; status: string; created_at: string } | null;
  document: { id: string; title: string; status: string; word_count: number } | null;
  checkout_path: string | null;
};

const FORMAT_ORDER = ['hardcover', 'softcover', 'journal'];

const REQUEST_STATUS_COPY: Record<string, string> = {
  requested: 'Your handbook is being compiled from what you have written.',
  generating: 'Your handbook is being compiled from what you have written.',
  proofing: 'Your manuscript is ready and being read over before it goes to print.',
  awaiting_payment: 'Your manuscript is ready. Complete your order to send it to print.',
  paid: 'Paid. Your book goes to print once the manuscript has been read over.',
  printing: 'At the printer.',
  shipped: 'On its way to you.',
  delivered: 'Delivered.',
};

// A request still worth reporting on. Once a copy has been delivered, or the
// request was cancelled, the offer comes back: a second copy is a reasonable
// thing to want, and the server allows it.
const PAYABLE_STATUSES = ['requested', 'generating', 'proofing', 'awaiting_payment'];
const FINISHED_STATUSES = ['cancelled', 'delivered'];

function formatPrice(cents: number, currency = 'usd'): string {
  const symbol = currency.toLowerCase() === 'usd' ? '$' : `${currency.toUpperCase()} `;
  return `${symbol}${cents % 100 === 0 ? (cents / 100).toFixed(0) : (cents / 100).toFixed(2)}`;
}

export default function EnchiridionCard() {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [format, setFormat] = useState('hardcover');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE_URL}/api/enchiridion/offer`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json: Offer = await res.json();
      setOffer(json);
      if (json.request?.format) setFormat(json.request.format);
    } catch {
      // The offer is an extra on this page; leave the card hidden if the
      // server is unreachable.
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const request = async () => {
    if (!offer || requesting) return;
    setRequesting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/login'); return; }
      const res = await fetch(`${API_BASE_URL}/api/enchiridion/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ format }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'The request could not be placed.');
        return;
      }
      // Payment and the shipping address are taken on the order page.
      router.push(json.checkout_path || '/enchiridion');
    } catch {
      setError('The request could not be placed. Try again in a moment.');
    } finally {
      setRequesting(false);
    }
  };

  if (!offer?.enabled) return null;

  const active = offer.request && !FINISHED_STATUSES.includes(offer.request.status) ? offer.request : null;
  const payable = active && PAYABLE_STATUSES.includes(active.status);
  const chosen = offer.formats[format] ?? { label: 'Hardcover', price_cents: offer.price_cents };

  return (
    <div className="bg-arete-surface rounded-lg border border-arete-gold/40 p-6 mt-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-arete-gold mb-2">
        Your Enchiridion
      </p>
      <h3 className="font-serif text-2xl text-arete-text leading-tight mb-3">
        Your own handbook, in print
      </h3>
      <p className="text-arete-muted text-sm leading-relaxed mb-5 max-w-xl">
        Compiled from your journal, your Cabinet conversations, your goals and your scrolls,
        set beside the texts your writing keeps returning to. Bound and sent to you.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {active ? (
        <>
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
            <p className="text-arete-text text-sm font-semibold">
              {offer.formats[active.format]?.label ?? active.format}
              {' · '}
              <span className="text-arete-gold">{formatPrice(active.price_cents, active.currency)}</span>
            </p>
            <span className="font-mono text-[10px] uppercase tracking-widest text-arete-gold border border-arete-gold/50 rounded-full px-3 py-1">
              {active.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-arete-muted text-sm mb-5">
            {REQUEST_STATUS_COPY[active.status] ?? ''}
          </p>
          {payable && (
            <button
              onClick={() => router.push(`/enchiridion?request=${active.id}`)}
              className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90"
            >
              Complete your order
            </button>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5 max-w-lg">
            {FORMAT_ORDER.filter(key => offer.formats[key]).map(key => {
              const f = offer.formats[key];
              const on = format === key;
              return (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                    on ? 'border-arete-gold bg-arete-gold/10' : 'border-arete-border hover:border-arete-gold/50'
                  }`}
                >
                  <span className={`block text-xs font-semibold mb-1 ${on ? 'text-arete-gold' : 'text-arete-muted'}`}>
                    {f.label}
                  </span>
                  <span className={`block text-lg font-bold ${on ? 'text-arete-gold' : 'text-arete-muted'}`}>
                    {formatPrice(f.price_cents, offer.currency)}
                  </span>
                </button>
              );
            })}
          </div>

          {offer.eligible ? (
            <button
              onClick={request}
              disabled={requesting}
              className="bg-arete-gold text-arete-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {requesting ? 'Placing your request…' : `Request your book · ${formatPrice(chosen.price_cents, offer.currency)}`}
            </button>
          ) : (
            <p className="text-arete-muted text-sm">
              Write a little more first: {offer.written} of {offer.min_entries} entries and conversations.
            </p>
          )}
          {/* Only worth saying once there is something to buy. */}
          {offer.eligible && (
            <p className="text-arete-muted text-xs mt-4">
              Billed once through Stripe. Your shipping address is collected at checkout.
            </p>
          )}
        </>
      )}
    </div>
  );
}
