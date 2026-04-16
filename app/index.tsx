import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/app/_layout';
import { supabase } from '@/lib/supabase';

export default function IndexRedirect() {
  const session = useSession();
  const [knowThyselfComplete, setKnowThyselfComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('know_thyself_complete')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setKnowThyselfComplete(data?.know_thyself_complete ?? false);
      })
      .catch(() => {
        // If the column doesn't exist yet, default to false so new users hit onboarding
        setKnowThyselfComplete(false);
      });
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
