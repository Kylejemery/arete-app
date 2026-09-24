import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logEvent } from '@/lib/events';
import { seedYesterdayLineIntoCabinet, type YesterdayCard as Card } from '@/lib/yesterday';

// Home, top position, when yesterday has a check-in (retention plan R8):
// the user's own intention in quotes, then a counselor's line holding them
// to it, then Answer, which opens the Cabinet with that line in the thread.
// Mobile twin of the web YesterdayCard.
export default function YesterdayCard({ card }: { card: Card }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logEvent('home_yesterday_card_viewed', { counselor: card.counselorId, has_intention: !!card.intention });
  }, [card.counselorId, card.intention]);

  const answer = async () => {
    if (busy) return;
    setBusy(true);
    await seedYesterdayLineIntoCabinet(card);
    // cabinetSeed folds the saved line into the view and focuses the input.
    router.push({ pathname: '/(tabs)/cabinet', params: { cabinetSeed: '1' } } as any);
    setBusy(false);
  };

  return (
    <View style={styles.card}>
      {card.intention ? (
        <>
          <Text style={styles.kicker}>Yesterday you wrote</Text>
          <Text style={styles.intention}>{'“'}{card.intention}{'”'}</Text>
        </>
      ) : (
        <Text style={styles.kicker}>Yesterday</Text>
      )}
      <Text style={styles.line}>{card.line}</Text>
      <View style={styles.footer}>
        <Text style={styles.counselor}>{card.counselorName}</Text>
        <TouchableOpacity style={styles.answer} onPress={answer} disabled={busy} activeOpacity={0.8}>
          <Text style={styles.answerText}>{busy ? 'Opening…' : 'Answer'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.33)',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    padding: 18,
    marginBottom: 20,
    gap: 8,
  },
  kicker: { color: '#c9a84c', fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '600' },
  intention: { color: '#e8e0d0', fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  line: { color: '#e0e0e0', fontSize: 15, lineHeight: 23, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  counselor: { color: 'rgba(201,168,76,0.75)', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  answer: { backgroundColor: '#c9a84c', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  answerText: { color: '#1a1a2e', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
});
