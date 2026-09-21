'use client';

import { useEffect } from 'react';
import { logEvent } from '@/lib/events';

// Logs app_opened once per browser session (tab) for a signed in user.
// Carries the from= query value when present so an email or link campaign
// can be tied to the open (R9 sets from=email_<kind>).
const FLAG = 'arete:app_opened_logged';

export default function AppOpenedLogger() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, '1');
    } catch {
      // No sessionStorage (private mode, blocked storage): log anyway.
    }
    const from = new URLSearchParams(window.location.search).get('from');
    logEvent('app_opened', { via: 'load', from: from || undefined, path: window.location.pathname });
  }, []);
  return null;
}
