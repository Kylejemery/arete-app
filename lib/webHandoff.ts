import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

const WEB_ORIGIN = 'https://app.pursuearete.com';

/**
 * Open a page on the web app already signed in as the current user.
 *
 * The app's Supabase session lives in device storage and the web app's in
 * browser cookies, so a plain link lands on /login. Instead we ask the web
 * app (authenticated with our JWT) for a one-time sign-in link that creates
 * the browser session and forwards to `path`. Any failure — offline, signed
 * out, server error — falls back to opening the plain URL, which is exactly
 * the old behaviour: the user can still log in by hand.
 *
 * Resolves when the in-app browser is dismissed, so callers can re-read
 * entitlement afterwards.
 */
export async function openWebSignedIn(path: string): Promise<void> {
  const fallback = `${WEB_ORIGIN}${path}`;
  let target = fallback;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`${WEB_ORIGIN}/api/auth/handoff`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ next: path }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data?.url === 'string' && data.url.startsWith(WEB_ORIGIN)) {
          target = data.url;
        }
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {
    // fall through to the plain URL
  }

  try {
    await WebBrowser.openBrowserAsync(target);
  } catch {
    // browser failed to open; nothing more to do
  }
}
