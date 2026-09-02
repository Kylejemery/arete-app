'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 2500;

export interface ToastApi {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** The bare presentational toast, in case a page needs to place its own. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-24 md:bottom-10 z-[100] -translate-x-1/2 px-5 py-3 rounded-full text-sm pointer-events-none"
      style={{
        background: 'rgba(16,26,48,0.96)',
        border: '1px solid rgba(201,168,76,0.35)',
        color: '#c9a84c',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        maxWidth: 'min(90vw, 420px)',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}

/** Mounted once in the root layout. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), AUTO_DISMISS_MS);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message && <Toast message={message} />}
    </ToastContext.Provider>
  );
}

/**
 * `const toast = useToast(); toast.show('Saved')`. Safe to call outside the
 * provider — it degrades to a no-op rather than throwing during SSR.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {} };
}

export default Toast;
