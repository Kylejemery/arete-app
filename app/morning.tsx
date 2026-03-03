import { StyleSheet, Text, View } from 'react-native';

export default function MorningScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Morning</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#c9a84c',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
