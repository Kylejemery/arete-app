'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserSettings } from '@/lib/db';
import type { UserSettings } from '@/lib/types';

export interface RequireUserState {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * The auth preamble every page repeated by hand: no session → /login, no
 * user_name → /setup. `requireName` defaults to true; pages that are
 * reachable before setup (e.g. /settings) pass false.
 *
 * While `loading` is true, or when `user` is null after loading, the page is
 * mid-redirect and should render its loading state rather than its content.
 */
export function useRequireUser({ requireName = true }: { requireName?: boolean } = {}): RequireUserState {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    const currentSettings = await getUserSettings();
    if (requireName && !currentSettings?.user_name) {
      router.replace('/setup');
      return;
    }

    setUser(currentUser);
    setSettings(currentSettings);
    setLoading(false);
  }, [router, requireName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const reload = useCallback(async () => {
    const currentSettings = await getUserSettings();
    setSettings(currentSettings);
  }, []);

  return { user, settings, loading, reload };
}
