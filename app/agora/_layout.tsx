// The Agora is closed to teens (13-17) until there is a moderation plan (run
// B, Part B5). The database enforces it; this says so plainly instead of
// showing an empty room. Everyone else gets the same screens as before.
import { Slot, useRouter } from 'expo-router';
import { SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { useAgeStatus } from '../../hooks/useAgeStatus';

export default function AgoraLayout() {
  const { isTeen } = useAgeStatus();
  const router = useRouter();
  if (!isTeen) return <Slot />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 28, justifyContent: 'center' }}>
      <Text style={{ color: '#c9a84c', fontSize: 22, fontWeight: '700', marginBottom: 10 }}>The Agora is not open to you yet</Text>
      <Text style={{ color: '#ccc', fontSize: 15, lineHeight: 22 }}>It is for members 18 and older for now. Your Cabinet is here whenever you want it.</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: '#c9a84c', fontSize: 16, fontWeight: '600' }}>Go back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
