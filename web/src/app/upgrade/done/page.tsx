'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Stripe's return page for checkouts started from the mobile app. The in-app
// browser that Stripe ran in has no web session, so this page is public (see
// middleware.ts) and does not read the user's account. The app re-reads the
// profile tier when it comes back to the foreground, so the only job here is
// to confirm what happened and send the person back.

function DoneContent() {
  const status = useSearchParams().get('status');
  const success = status === 'success';
  const managed = status === 'managed';

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-6">
      <div
        className={`w-full max-w-md rounded-xl border bg-arete-surface p-8 text-center ${
          success ? 'border-arete-gold/40' : 'border-arete-border'
        }`}
      >
        <h1 className="font-serif text-[28px] text-arete-text leading-none tracking-tight mb-4">
          Pursue <em className="text-arete-gold not-italic">Arete</em>
        </h1>
        {success ? (
          <>
            <p className="text-arete-gold font-semibold mb-2">Welcome to Arete Premium.</p>
            <p className="text-arete-muted text-sm mb-6">
              Your subscription is active. Return to the app and it will unlock within a few
              seconds. If it does not, close and reopen the app once.
            </p>
          </>
        ) : managed ? (
          <>
            <p className="text-arete-text font-semibold mb-2">Subscription updated.</p>
            <p className="text-arete-muted text-sm mb-6">
              Any changes you made will reach the app within a few seconds of returning to it.
            </p>
          </>
        ) : (
          <>
            <p className="text-arete-text font-semibold mb-2">Checkout cancelled.</p>
            <p className="text-arete-muted text-sm mb-6">
              No charge was made. You can return to the app and try again whenever you like.
            </p>
          </>
        )}
        <a
          href="arete://"
          className="inline-block rounded-lg bg-arete-gold px-6 py-3 font-semibold text-arete-bg"
        >
          Return to Arete
        </a>
        <p className="text-arete-muted text-xs mt-4">
          Or simply close this window.
        </p>
      </div>
    </div>
  );
}

export default function UpgradeDonePage() {
  return (
    <Suspense fallback={null}>
      <DoneContent />
    </Suspense>
  );
}
