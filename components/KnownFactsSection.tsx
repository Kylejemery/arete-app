// Know Thyself: what the Cabinet knows, field by field, with where each value
// came from. Values the Cabinet inferred can be confirmed, edited or removed
// (activation plan, Part 3f). Values the user wrote are edited in the form
// below this section.
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  confirmFact, editFact, fieldViews, getProfileFacts, markFactsSeen, removeFact,
  SOURCE_LABELS, type FieldView, type ProfileFact,
} from '@/lib/profileFields';

export default function KnownFactsSection({ settings, reloadKey = 0 }: { settings: Record<string, unknown> | null; reloadKey?: number }) {
  const [facts, setFacts] = useState<ProfileFact[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setFacts(await getProfileFacts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProfileFacts().then(f => { if (!cancelled) setFacts(f); });
    void markFactsSeen();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const views = fieldViews(facts, settings).filter(v => v.field.key !== 'off_limits');
  if (views.length === 0) return null;

  const act = async (fn: () => Promise<boolean>) => {
    const ok = await fn();
    if (!ok) Alert.alert('Could not save', 'Please try again.');
    setEditing(null);
    await load();
  };

  const renderRow = (v: FieldView) => {
    const inferred = v.source === 'cabinet_inferred' && v.fact;
    const isEditing = editing === v.field.key;
    return (
      <View key={v.field.key} style={styles.row}>
        <Text style={styles.question}>{v.field.question}</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            maxLength={500}
          />
        ) : (
          <Text style={styles.value}>{v.value}</Text>
        )}
        <Text style={[styles.source, inferred ? styles.sourceInferred : null]}>{SOURCE_LABELS[v.source]}</Text>
        {inferred && v.fact && (
          <View style={styles.actions}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={() => act(() => editFact(v.fact!, draft))}><Text style={styles.action}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(null)}><Text style={styles.actionMuted}>Cancel</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => act(() => confirmFact(v.fact!))}><Text style={styles.action}>Confirm</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setDraft(v.value); setEditing(v.field.key); }}><Text style={styles.action}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => act(() => removeFact(v.fact!))}><Text style={styles.actionMuted}>Remove</Text></TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>What your Cabinet knows</Text>
      {views.map(renderRow)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    gap: 14,
  },
  kicker: { color: '#c9a84c', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  row: { gap: 4 },
  question: { color: '#888', fontSize: 12 },
  value: { color: '#e0e0e0', fontSize: 14, lineHeight: 21 },
  source: { color: '#777', fontSize: 11, fontStyle: 'italic' },
  sourceInferred: { color: '#b39ddb' },
  actions: { flexDirection: 'row', gap: 18, marginTop: 4 },
  action: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  actionMuted: { color: '#888', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#1a1a2e', color: '#e0e0e0', borderRadius: 10, padding: 10,
    fontSize: 14, borderWidth: 1, borderColor: '#c9a84c33', minHeight: 60,
  },
});
