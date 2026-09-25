// The card under a Cabinet reply when a counselor proposes a practice
// (personalization run C, Part C2). Yes turns it on and pins it to Home,
// with an Undo that puts things back exactly; Not now declines it, and the
// Cabinet will not suggest that practice again for 30 days.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { respondToFeatureRequest, respondToProposal, undoProposal, type CabinetProposal } from '@/lib/practices';
import { paywallRoute } from '@/lib/paywall';
import { logEvent } from '@/lib/events';

type State = 'open' | 'saving' | 'done' | 'undone' | 'unavailable' | 'error' | 'limit';
// Part C6: a free account at its practice limit chooses a swap, or Premium
// (never offered to teens).
type LimitInfo = { limit: number; active: { key: string; label: string }[]; canUpgrade: boolean };

export default function ProposalCard({ proposal, onClose }: { proposal: CabinetProposal; onClose: () => void }) {
  const [state, setState] = useState<State>('open');
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const router = useRouter();

  const isRequest = proposal.kind === 'feature_request';
  const answer = async (accept: boolean) => {
    if (!accept) {
      void (isRequest ? respondToFeatureRequest(proposal.id, false) : respondToProposal(proposal.id, false));
      onClose();
      return;
    }
    setState('saving');
    const r = isRequest ? await respondToFeatureRequest(proposal.id, true) : await respondToProposal(proposal.id, true);
    settle(r);
  };

  const settle = (r: { ok: boolean; data: Record<string, unknown> }) => {
    if (r.ok) setState('done');
    else if (r.data?.error === 'no_longer_available') setState('unavailable');
    else if (r.data?.error === 'module_limit') {
      setLimitInfo({
        limit: Number(r.data.limit) || 1,
        active: Array.isArray(r.data.active) ? (r.data.active as LimitInfo['active']) : [],
        canUpgrade: r.data.canUpgrade === true,
      });
      setState('limit');
    } else setState('error');
  };

  const swap = async (key: string) => {
    setState('saving');
    settle(await respondToProposal(proposal.id, true, key));
  };

  const seePremium = () => {
    logEvent('module_limit_upgrade_click', { module_key: proposal.moduleKey ?? null });
    router.push(paywallRoute('module_limit'));
  };

  const undo = async () => {
    setState('saving');
    const r = await undoProposal(proposal.id);
    setState(r.ok ? 'undone' : 'done');
  };

  if (state === 'done' || state === 'undone' || state === 'unavailable') {
    return (
      <View style={styles.card}>
        <Text style={styles.body}>
          {state === 'done'
            ? (isRequest ? 'Passed along. Thank you for the idea.' : `${proposal.label} is on. You'll find it under Your practices on Home.`)
            : state === 'undone'
              ? 'Undone. Everything is as it was.'
              : 'That practice is not available on your account right now.'}
        </Text>
        <View style={styles.row}>
          {state === 'done' && !isRequest && (
            <TouchableOpacity onPress={undo}><Text style={styles.link}>Undo</Text></TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}><Text style={styles.linkMuted}>Close</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if ((state === 'limit' || (state === 'saving' && limitInfo)) && limitInfo) {
    const names = limitInfo.active.map(a => a.label).join(' and ');
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>{proposal.label}</Text>
        <Text style={styles.body}>
          {`Your account keeps ${limitInfo.limit === 1 ? 'one practice' : `${limitInfo.limit} practices`} on Home at a time${names ? `, and ${names} ${limitInfo.active.length === 1 ? 'is' : 'are'} on now` : ''}.`}
        </Text>
        <View style={styles.choices}>
          {limitInfo.active.map(a => (
            <TouchableOpacity key={a.key} style={[styles.yes, state === 'saving' && styles.disabled]} disabled={state === 'saving'} onPress={() => swap(a.key)}>
              <Text style={styles.yesText}>Swap out {a.label}</Text>
            </TouchableOpacity>
          ))}
          {limitInfo.canUpgrade && (
            <TouchableOpacity onPress={seePremium} disabled={state === 'saving'}>
              <Text style={styles.link}>See Premium</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => answer(false)} disabled={state === 'saving'}>
            <Text style={styles.linkMuted}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {isRequest ? (
        <>
          <Text style={styles.kicker}>An idea for Arete</Text>
          <Text style={styles.body}>Want me to pass this idea along to the person who builds Arete?</Text>
        </>
      ) : (
        <>
          <Text style={styles.kicker}>{proposal.source === 'feature_shipped' ? 'You asked for this' : 'A practice for Home'}</Text>
          <Text style={styles.title}>{proposal.label}</Text>
          {!!proposal.description && <Text style={styles.body}>{proposal.description}</Text>}
          {!!proposal.note && <Text style={styles.note}>For: {proposal.note}</Text>}
        </>
      )}
      {state === 'error' && <Text style={styles.error}>That did not go through. Try again.</Text>}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.yes, state === 'saving' && styles.disabled]} disabled={state === 'saving'} onPress={() => answer(true)}>
          <Text style={styles.yesText}>{isRequest ? 'Yes, pass it along' : 'Yes, add it'}</Text>
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
    backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c44', gap: 8,
  },
  kicker: { color: '#c9a84c', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  title: { color: '#e0e0e0', fontSize: 16, fontWeight: '700' },
  body: { color: '#cfcfcf', fontSize: 14, lineHeight: 20 },
  note: { color: '#e0e0e0', fontSize: 14, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 4 },
  yes: { backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  yesText: { color: '#1a1a2e', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
  link: { color: '#c9a84c', fontSize: 14, fontWeight: '600' },
  linkMuted: { color: '#888', fontSize: 14, fontWeight: '600' },
  error: { color: '#e57373', fontSize: 13 },
});
