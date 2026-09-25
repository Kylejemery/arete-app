import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getKnowThyselfComplete, getUserSettings, markKnowThyselfComplete, upsertUserSettings } from '@/lib/db';
import { countFilled, logEvent } from '@/lib/events';
import CounselorText from '../components/CounselorText';
import KnownFactsSection from '../components/KnownFactsSection';
import { KT_EXPLANATION, logFormFieldsFilled } from '@/lib/profileFields';

const FEEDBACK_OPTIONS: { value: string; label: string }[] = [
  { value: 'firm', label: 'Push me hard' },
  { value: 'compassionate', label: 'Care first' },
  { value: 'both', label: 'Both' },
];

export default function KnowThyselfScreen() {
  const router = useRouter();
  const startedAt = useRef(Date.now());

  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState('');
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  // Activation Part 3: the rest of the registry's top five, and off-limits.
  const [feedbackPreference, setFeedbackPreference] = useState('');
  const [arriveReason, setArriveReason] = useState('');
  const [lifeSituation, setLifeSituation] = useState('');
  const [offLimits, setOffLimits] = useState('');
  const [settingsSnapshot, setSettingsSnapshot] = useState<Record<string, unknown> | null>(null);
  const [factsReload, setFactsReload] = useState(0);
  // The chair's last reflection on this profile (R6), shown again here.
  const [reflection, setReflection] = useState<{ text: string; counselor: string | null } | null>(null);
  // R7: three questions first. The rest of the form opens with "Tell your
  // Cabinet more", or straight away for someone whose profile is already
  // complete and is here to edit.
  const [expanded, setExpanded] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);
  // kt_started fires on the first focus, kt_abandoned on leaving unsaved.
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const fieldsRef = useRef<Record<string, string>>({});
  fieldsRef.current = { background, identity, goals, strengths, weaknesses, patterns, majorEvents, futureSelfYears, futureSelfDescription };

  useEffect(() => {
    loadProfile();
    return () => {
      if (startedRef.current && !savedRef.current) {
        logEvent('kt_abandoned', { path: 'form', fields_filled: countFilled(fieldsRef.current) });
      }
    };
  }, []);

  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    logEvent('kt_started', { path: 'form', short: !expanded });
  };

  const loadProfile = async () => {
    const settings = await getUserSettings();
    if (!settings) return;
    setBackground(settings.kt_background || '');
    setIdentity(settings.kt_identity || '');
    setGoals(settings.kt_goals || '');
    setStrengths(settings.kt_strengths || '');
    setWeaknesses(settings.kt_weaknesses || '');
    setPatterns(settings.kt_patterns || '');
    setMajorEvents(settings.kt_major_events || '');
    setFutureSelfYears(settings.future_self_years ? String(settings.future_self_years) : '');
    setFutureSelfDescription(settings.future_self_description || '');
    setFeedbackPreference(settings.feedback_preference || '');
    setArriveReason(settings.app_usage_intent || '');
    setLifeSituation(settings.kt_life_situation || '');
    setOffLimits(settings.kt_off_limits || '');
    setSettingsSnapshot(settings as unknown as Record<string, unknown>);
    setReflection(settings.kt_reflection ? { text: settings.kt_reflection, counselor: settings.kt_reflection_counselor ?? null } : null);
    const complete = await getKnowThyselfComplete();
    setAlreadyComplete(complete);
    setExpanded(complete);
  };

  const saveProfile = async () => {
    try {
      const update = {
        kt_background: background.trim(),
        kt_identity: identity.trim(),
        kt_goals: goals.trim(),
        user_goals: goals.trim(),
        kt_strengths: strengths.trim(),
        kt_weaknesses: weaknesses.trim(),
        kt_patterns: patterns.trim(),
        kt_major_events: majorEvents.trim(),
        future_self_description: futureSelfDescription.trim(),
        feedback_preference: feedbackPreference || null,
        app_usage_intent: arriveReason.trim(),
        kt_life_situation: lifeSituation.trim(),
        kt_off_limits: offLimits.trim(),
        ...(futureSelfYears.trim() ? { future_self_years: parseInt(futureSelfYears.trim()) } : {}),
      };
      await upsertUserSettings(update);
      logFormFieldsFilled(settingsSnapshot, update);
      setSettingsSnapshot({ ...(settingsSnapshot || {}), ...update });
      setFactsReload(n => n + 1);
      // Saving the form completes Know Thyself once goals plus two other
      // answers are filled (the rule lives in markKnowThyselfComplete). That
      // clears the Home banner, the Scrolls empty state, and the "unprofiled"
      // note in the prompt, and starts the first Scroll.
      const complete = await markKnowThyselfComplete();
      savedRef.current = true;
      if (complete) {
        logEvent('kt_completed', {
          path: 'form',
          short: !expanded,
          fields_filled: countFilled({ background, identity, goals, strengths, weaknesses, patterns, majorEvents, futureSelfYears, futureSelfDescription }),
          duration_s: Math.round((Date.now() - startedAt.current) / 1000),
        });
      }
      if (complete) {
        // The payoff: the chair says what the Cabinet now sees (R6).
        router.push('/kt-reflection' as any);
      } else {
        Alert.alert('✅ Profile Saved', 'Saved. Your Cabinet will fill in the rest as you talk.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save profile.');
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Know Thyself</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.explanation}>{KT_EXPLANATION}</Text>

          <KnownFactsSection settings={settingsSnapshot} reloadKey={factsReload} />

          <Text style={styles.intro}>
            {alreadyComplete
              ? 'Your profile gives the Cabinet deep context about who you are. Update it any time. Your counselors use it from your very next message.'
              : 'Three questions, about two minutes. Your counselors will answer differently afterward.'}
          </Text>

          {reflection && (
            <View style={styles.reflectionCard}>
              <Text style={styles.reflectionKicker}>{reflection.counselor ? `${reflection.counselor} · What your Cabinet sees` : 'What your Cabinet sees'}</Text>
              <CounselorText text={reflection.text} style={styles.reflectionText} />
              <TouchableOpacity onPress={() => router.push('/kt-reflection' as any)} style={styles.reflectionLink}>
                <Text style={styles.reflectionLinkText}>Ask again after you save →</Text>
              </TouchableOpacity>
            </View>
          )}

          {!alreadyComplete && (
            <TouchableOpacity onPress={() => router.replace('/onboarding' as any)} style={styles.altLink}>
              <Text style={styles.altLinkText}>Prefer a conversation? Meet your Future Self →</Text>
            </TouchableOpacity>
          )}

          {renderSection('Goals', (
            <>
              <Text style={styles.label}>What are you working toward?</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Finish the book draft by December. Run a half marathon in the spring."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={goals}
                onChangeText={setGoals}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Where you consistently fall short', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="I say yes to everything and then resent the calendar."
              placeholderTextColor="#555"
                onFocus={markStarted}
              value={weaknesses}
              onChangeText={setWeaknesses}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          ))}

          {renderSection('What you do when things get hard', (
            <>
              <Text style={styles.label}>What patterns do you notice in yourself? What tends to derail you?</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="I go quiet, reread old messages, and start something new instead."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={patterns}
                onChangeText={setPatterns}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

          {expanded ? (
            <>
          {renderSection('How you want to be challenged', (
            <View style={styles.chipRow}>
              {FEEDBACK_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.chip, feedbackPreference === o.value && styles.chipActive]}
                  onPress={() => { markStarted(); setFeedbackPreference(feedbackPreference === o.value ? '' : o.value); }}
                >
                  <Text style={[styles.chipText, feedbackPreference === o.value && styles.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {renderSection('What brought you to Arete', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="I want to stop drifting through my days."
              placeholderTextColor="#555"
              onFocus={markStarted}
              value={arriveReason}
              onChangeText={setArriveReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Your life right now', (
            <>
              <Text style={styles.label}>Work, home, who depends on you. As much or as little as you like.</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Two kids, a new job, and not enough sleep."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={lifeSituation}
                onChangeText={setLifeSituation}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Anything your Cabinet should never bring up?', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Optional."
              placeholderTextColor="#555"
              onFocus={markStarted}
              value={offLimits}
              onChangeText={setOffLimits}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          ))}

          {renderSection('Background & Life Story', (
            <>
              <Text style={styles.label}>
                Where are you from, and how did you get to where you are today?
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="I grew up in..."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={background}
                onChangeText={setBackground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Professional Identity & Pursuits', (
            <>
              <Text style={styles.label}>
                What do you do professionally? What are you pursuing outside of work?
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Professionally, I..."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={identity}
                onChangeText={setIdentity}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Strengths', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="I am strong at..."
              placeholderTextColor="#555"
                onFocus={markStarted}
              value={strengths}
              onChangeText={setStrengths}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Major Life Events & Defining Moments', (
            <>
              <Text style={styles.label}>
                What crucible experiences shaped who you are?
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="The experiences that made me who I am..."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={majorEvents}
                onChangeText={setMajorEvents}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Future Self', (
            <>
              <Text style={styles.label}>Years from now</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={futureSelfYears}
                onChangeText={setFutureSelfYears}
                keyboardType="number-pad"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="In ten years, I have..."
                placeholderTextColor="#555"
                onFocus={markStarted}
                value={futureSelfDescription}
                onChangeText={setFutureSelfDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

            </>
          ) : (
            <TouchableOpacity style={styles.moreButton} onPress={() => setExpanded(true)} activeOpacity={0.8}>
              <Text style={styles.moreButtonText}>Tell your Cabinet more</Text>
              <Text style={styles.moreButtonSub}>How to challenge you, why you came, your life now, background, strengths, your future self.</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>{alreadyComplete || expanded ? 'Save Profile' : 'Save and meet your Cabinet'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    color: '#c9a84c',
    fontSize: 15,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  explanation: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 21,
    marginBottom: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#c9a84c55', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  chipText: { color: '#c9a84c', fontSize: 13 },
  chipTextActive: { color: '#1a1a2e', fontWeight: '700' },
  intro: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#c9a84c',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  label: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  saveButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reflectionCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.33)',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  reflectionKicker: { color: '#c9a84c', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  reflectionText: { color: '#e0e0e0', fontSize: 14, lineHeight: 22 },
  reflectionLink: { alignSelf: 'flex-start', marginTop: 2 },
  reflectionLinkText: { color: '#c9a84c', fontSize: 12, fontWeight: '600' },
  altLink: { alignSelf: 'flex-start', marginBottom: 16 },
  altLinkText: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  moreButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(201,168,76,0.27)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  moreButtonText: { color: '#c9a84c', fontSize: 15, fontWeight: '600' },
  moreButtonSub: { color: '#888', fontSize: 12, lineHeight: 17 },
});
