import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/app/_layout';
import { supabase } from '@/lib/supabase';

export default function IndexRedirect() {
  const session = useSession();
  const [knowThyselfComplete, setKnowThyselfComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => setKnowThyselfComplete(false), 5000);
    supabase
      .from('profiles')
      .select('know_thyself_complete')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        clearTimeout(timeout);
        setKnowThyselfComplete(data?.know_thyself_complete ?? false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setKnowThyselfComplete(false);
      });
    return () => clearTimeout(timeout);
  }, [session]);

  if (session === undefined) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (knowThyselfComplete === undefined) {
    return null;
  }

  if (!knowThyselfComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/" />;
}
