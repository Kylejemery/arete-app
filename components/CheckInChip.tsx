import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { checkInChipText, type CheckInSummary } from '@/lib/checkinMessage';

// What the thread shows in place of the synthetic check-in prompt: a small
// centered chip saying a check-in was sent and what it carried. Mirror of the
// web CheckInChip.
export default function CheckInChip({ summary, time }: { summary: CheckInSummary; time?: string | null }) {
  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.text}>{summary.kind === 'morning' ? '☀ ' : '☾ '}{checkInChipText(summary)}</Text>
      </View>
      {time ? <Text style={styles.time}>{time}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginBottom: 12, gap: 3 },
  chip: {
    maxWidth: '90%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  text: { color: 'rgba(201,168,76,0.85)', fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },
  time: { color: '#555', fontSize: 10 },
});
