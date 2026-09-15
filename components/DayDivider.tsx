import { StyleSheet, Text, View } from 'react-native';
import { dayLabel } from '@/lib/messageDates';

/** A thin rule with the day's label, placed above the first message of each day. */
export default function DayDivider({ timestamp }: { timestamp: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>{dayLabel(timestamp)}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#c9a84c22',
  },
  text: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
