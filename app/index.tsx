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

  return <Redirect href="/(tabs)/" />;
}
