import { ScrollView, Text } from 'react-native';

export default function ErrorScreen({ error }: { error: Error }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 40 }}>
      <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        App Error
      </Text>
      <Text style={{ color: 'white', fontSize: 13 }}>
        {error?.message || 'Unknown error'}
      </Text>
      <Text style={{ color: '#aaa', fontSize: 11, marginTop: 12 }}>
        {error?.stack || ''}
      </Text>
    </ScrollView>
  );
}