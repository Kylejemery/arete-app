// Optional pronoun setting (activation run B, Part B4). System-generated text
// about the person uses they/them/their unless they choose he/him or she/her.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserSettings, upsertUserSettings } from '@/lib/db';
import { PRONOUN_OPTIONS, type PronounSetting as Value } from '@/lib/pronouns';

export default function PronounSetting() {
  const [value, setValue] = useState<Value | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserSettings().then(s => {
      if (!cancelled) setValue(((s as { pronouns?: Value | null } | null)?.pronouns) ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const choose = async (v: Value) => {
    const next = value === v ? null : v;
    setValue(next);
    await upsertUserSettings({ pronouns: next });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pronouns</Text>
      <Text style={styles.subtitle}>Optional. How the app and your Cabinet refer to you. Without a choice, they/them.</Text>
      <View style={styles.row}>
        {PRONOUN_OPTIONS.map(o => (
          <TouchableOpacity key={o.value} onPress={() => choose(o.value)} style={[styles.chip, value === o.value && styles.chipOn]}>
            <Text style={[styles.chipText, value === o.value && styles.chipTextOn]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#16213e', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#c9a84c22', gap: 8 },
  title: { color: '#c9a84c', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#c9a84c55', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  chipText: { color: '#c9a84c', fontSize: 13 },
  chipTextOn: { color: '#1a1a2e', fontWeight: '700' },
});
