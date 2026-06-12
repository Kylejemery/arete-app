import { Redirect } from 'expo-router';
import { useSession } from '@/app/_layout';

export default function IndexRedirect() {
  const session = useSession();

  if (session === undefined) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // New users land directly on the home tab. The Future Self onboarding is
  // offered via a dismissible banner there — never forced.
  return <Redirect href="/(tabs)/" />;
}
