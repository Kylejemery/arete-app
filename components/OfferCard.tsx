// The card under a Cabinet reply that carries an offer (activation Parts 6
// and 9). A goal offer shows the goal the counselor suggested, with the
// category and target date editable; a scroll offer asks "Would you like a
// scroll on this?". Nothing is created until the person taps Yes.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { respondToCabinetOffer, type CabinetOffer } from '../services/claudeService';

const CATEGORIES = ['GENERAL', 'PHYSICAL', 'BEHAVIORAL', 'HEALTH', 'FINANCIAL', 'MENTAL', 'CAREER', 'RELATIONSHIPS'];

export default function OfferCard({ offer, onClose }: { offer: CabinetOffer; onClose: () => void }) {
  const [title, setTitle] = useState(offer.title ?? '');
  const [category, setCategory] = useState(offer.category ?? 'GENERAL');
  const [targetDate, setTargetDate] = useState(offer.target_date ?? '');
  const [state, setState] = useState<'open' | 'saving' | 'done' | 'error'>('open');

  const answer = async (accept: boolean) => {
    if (!accept) {
      void respondToCabinetOffer(offer.id, { accept: false });
      onClose();
      return;
    }
    setState('saving');
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim());
    const r = await respondToCabinetOffer(offer.id, offer.kind === 'goal'
      ? { accept: true, title: title.trim(), category, target_date: dateOk ? targetDate.trim() : null }
      : offer.kind === 'task'
        ? { accept: true, title: title.trim(), routine: offer.routine }
        : { accept: true });
    setState(r.ok ? 'done' : 'error');
  };

  if (state === 'done') {
    return (
      <View style={styles.card}>
        <Text style={styles.body}>
          {offer.kind === 'goal'
            ? 'Saved to your goals.'
            : offer.kind === 'task'
              ? `Added to your ${offer.routine === 'evening' ? 'evening' : 'morning'} check-in.`
              : 'Your scroll is being written. It will appear in Scrolls.'}
        </Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.linkMuted}>Close</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {offer.kind === 'goal' ? (
        <>
          <Text style={styles.kicker}>Save as a goal</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120} />
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
                <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c.charAt(0) + c.slice(1).toLowerCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Target date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate} maxLength={10} placeholder="Optional" placeholderTextColor="#555" />
        </>
      ) : offer.kind === 'task' ? (
        <>
          <Text style={styles.kicker}>Add to your {offer.routine === 'evening' ? 'evening' : 'morning'} check-in</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={60} />
        </>
      ) : (
        <Text style={styles.body}>Would you like a scroll on this?</Text>
      )}
      {state === 'error' && <Text style={styles.error}>That did not go through. Try again.</Text>}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.yes, (state === 'saving' || (offer.kind !== 'scroll' && !title.trim())) && styles.disabled]}
          disabled={state === 'saving' || (offer.kind !== 'scroll' && !title.trim())}
          onPress={() => answer(true)}
        >
          <Text style={styles.yesText}>{offer.kind === 'goal' ? 'Save goal' : offer.kind === 'task' ? 'Add it' : 'Yes'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => answer(false)} disabled={state === 'saving'}>
          <Text style={styles.linkMuted}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14,
    backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c44', gap: 10,
  },
  kicker: { color: '#c9a84c', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  body: { color: '#e0e0e0', fontSize: 15, lineHeight: 21 },
  label: { color: '#888', fontSize: 12 },
  input: {
    backgroundColor: '#1a1a2e', color: '#e0e0e0', borderRadius: 10, padding: 10,
    fontSize: 14, borderWidth: 1, borderColor: '#c9a84c33',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#c9a84c44', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 9 },
  chipOn: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  chipText: { color: '#c9a84c', fontSize: 12 },
  chipTextOn: { color: '#1a1a2e', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  yes: { backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  yesText: { color: '#1a1a2e', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
  linkMuted: { color: '#888', fontSize: 14, fontWeight: '600' },
  error: { color: '#e57373', fontSize: 13 },
});
