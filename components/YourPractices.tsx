// "Your practices" on Home (personalization run C, Part C1). Shows the
// practices a person has said yes to, below everything Home already has.
// With none on, it renders nothing, so Home is exactly as it was.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { moduleInfo, visiblePractices, weekDays, type PracticeRow } from '@/lib/modules';
import { fetchPractices, fetchTicks, savePracticeSettings, setTick, turnOffPractice } from '@/lib/practices';

export default function YourPractices() {
  const [rows, setRows] = useState<PracticeRow[]>([]);

  const load = useCallback(() => {
    let cancelled = false;
    fetchPractices().then(r => { if (!cancelled) setRows(visiblePractices(r)); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useFocusEffect(load);

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>YOUR PRACTICES</Text>
      {rows.map(row => (
        <PracticeCard key={row.module_key} row={row} onChanged={load} />
      ))}
    </View>
  );
}

function PracticeCard({ row, onChanged }: { row: PracticeRow; onChanged: () => void }) {
  const router = useRouter();
  const info = moduleInfo(row.module_key);
  const s = row.settings as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  if (!info) return null;
  const freeText = String(s?.[info.freeTextField] ?? '').trim();

  const save = async () => {
    setBusy(true);
    const r = await savePracticeSettings(row.module_key, { [info.freeTextField]: draft.trim() });
    setBusy(false);
    if (r.ok) { setEditing(false); onChanged(); }
  };
  const off = async () => {
    setBusy(true);
    await turnOffPractice(row.module_key);
    setBusy(false);
    onChanged();
  };

  let body: React.ReactNode = null;
  let action: { label: string; onPress: () => void } | null = null;
  if (row.module_key === 'focus_timer') {
    body = <Text style={styles.text}>{Number(s?.minutes) || 25} minutes{freeText ? ` · ${freeText}` : ''}</Text>;
    action = { label: 'Start', onPress: () => router.push('/timer' as any) };
  } else if (row.module_key === 'evening_review') {
    body = <Text style={styles.text}>{freeText || 'Close the day with your evening review.'}</Text>;
    action = { label: 'Open', onPress: () => router.push('/evening' as any) };
  } else if (row.module_key === 'premeditatio') {
    body = <Text style={styles.text}>{freeText ? `Prepare for: ${freeText}` : 'Rehearse one hard thing the day might bring, and how you would meet it.'}</Text>;
    const opener = freeText
      ? `Premeditatio. Help me rehearse this calmly: ${freeText}. What could go wrong, and how would I meet it well?`
      : 'Premeditatio. Help me rehearse, calmly, one hard thing today might bring and how I would meet it.';
    action = { label: 'Rehearse', onPress: () => router.push({ pathname: '/counselor-chat', params: { id: 'seneca', initialMessage: opener } } as any) };
  } else if (row.module_key === 'habit_tracker') {
    body = <HabitBody habit={freeText} target={Number(s?.target_per_week) || 7} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.title}>{info.label}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.action}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      {body}
      {editing ? (
        <View style={styles.editRow}>
          <Text style={styles.label}>{info.freeTextLabel}</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            maxLength={280}
            placeholder={info.freeTextPlaceholder}
            placeholderTextColor="#555"
          />
          <View style={styles.links}>
            <TouchableOpacity onPress={save} disabled={busy}><Text style={styles.link}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(false)} disabled={busy}><Text style={styles.linkMuted}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.links}>
          <TouchableOpacity onPress={() => { setDraft(freeText); setEditing(true); }}><Text style={styles.linkMuted}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={off} disabled={busy}><Text style={styles.linkMuted}>Turn off</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function HabitBody({ habit, target }: { habit: string; target: number }) {
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  const days = weekDays();
  const today = days.find(d => d === localToday()) ?? days[0];
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    fetchTicks('habit_tracker', weekDays()).then(t => { if (!cancelled) setTicks(t); }).catch(() => {});
    return () => { cancelled = true; };
  }, []));
  const done = ticks.has(today);
  const toggle = async () => {
    const next = new Set(ticks);
    if (done) next.delete(today); else next.add(today);
    setTicks(next);
    const ok = await setTick('habit_tracker', today, !done);
    if (!ok) setTicks(ticks);
  };
  return (
    <View style={styles.habitRow}>
      <TouchableOpacity onPress={toggle} style={[styles.tick, done && styles.tickOn]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
        <Text style={[styles.tickText, done && styles.tickTextOn]}>{done ? '✓' : ''}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{habit || 'Your habit for today'}</Text>
        <Text style={styles.sub}>{ticks.size} of {target} this week</Text>
      </View>
    </View>
  );
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  section: { marginTop: 8, gap: 10 },
  heading: { color: '#c9a84c', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  card: { backgroundColor: '#16213e', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#c9a84c33', gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#e0e0e0', fontSize: 15, fontWeight: '700' },
  text: { color: '#cfcfcf', fontSize: 14, lineHeight: 20 },
  sub: { color: '#888', fontSize: 12, marginTop: 2 },
  action: { backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
  actionText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  links: { flexDirection: 'row', gap: 18 },
  link: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  linkMuted: { color: '#888', fontSize: 13, fontWeight: '600' },
  editRow: { gap: 6 },
  label: { color: '#888', fontSize: 12 },
  input: { backgroundColor: '#1a1a2e', color: '#e0e0e0', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#c9a84c33' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: '#c9a84c' },
  tickText: { color: '#c9a84c', fontSize: 16, fontWeight: '700' },
  tickTextOn: { color: '#1a1a2e' },
});
