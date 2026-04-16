import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getUserSettings, upsertUserSettings } from '@/lib/db';
import { setKnowThyselfComplete } from '@/lib/onboardingAgent';
import { triggerScrollGeneration } from '@/lib/scrolls';

export default function OnboardingConfirmScreen() {
  const router = useRouter();

  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [lifeSituation, setLifeSituation] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [feedbackPreference, setFeedbackPreference] = useState('');
  const [appUsageIntent, setAppUsageIntent] = useState('');
  const [accountabilityStyle, setAccountabilityStyle] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const settings = await getUserSettings();
    if (!settings) return;
    setBackground(settings.kt_background || '');
    setIdentity(settings.kt_identity || '');
    setLifeSituation(settings.kt_life_situation || '');
    setGoals(settings.kt_goals || '');
    setStrengths(settings.kt_strengths || '');
    setWeaknesses(settings.kt_weaknesses || '');
    setPatterns(settings.kt_patterns || '');
    setFeedbackPreference(settings.feedback_preference || '');
    setAppUsageIntent(settings.app_usage_intent || '');
    setAccountabilityStyle(settings.accountability_style || '');
  };

  const handleConfirm = async () => {
    try {
      await upsertUserSettings({
        kt_background: background.trim(),
        kt_identity: identity.trim(),
        kt_life_situation: lifeSituation.trim(),
        kt_goals: goals.trim(),
        user_goals: goals.trim(),
        kt_strengths: strengths.trim(),
        kt_weaknesses: weaknesses.trim(),
        kt_patterns: patterns.trim(),
        feedback_preference: feedbackPreference.trim(),
        app_usage_intent: appUsageIntent.trim(),
        accountability_style: accountabilityStyle.trim(),
      });
      await setKnowThyselfComplete();
      // Fire-and-forget: generate scrolls in the background, don't block navigation
      const settings = await getUserSettings();
      if (settings && goals.trim()) {
        triggerScrollGeneration(
          settings.user_id,
          settings.user_name ?? null,
          goals.trim()
        ).catch(console.error);
      }
      router.replace('/(tabs)/' as any);
    } catch (e) {
      console.error('[OnboardingConfirm] Error:', e);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
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
        <Text style={styles.headerTitle}>Your Profile</Text>
        <Text style={styles.headerSubtitle}>Review what we captured — edit anything before entering</Text>
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
          {renderSection('Background & Life Story', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Your background..."
              placeholderTextColor="#555"
              value={background}
              onChangeText={setBackground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Professional Identity', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What you do professionally..."
              placeholderTextColor="#555"
              value={identity}
              onChangeText={setIdentity}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Current Life Situation', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Family, daily structure, relevant context..."
              placeholderTextColor="#555"
              value={lifeSituation}
              onChangeText={setLifeSituation}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Goals', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Your professional, personal, and big audacious goals..."
              placeholderTextColor="#555"
              value={goals}
              onChangeText={setGoals}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Strengths', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What is working for you..."
              placeholderTextColor="#555"
              value={strengths}
              onChangeText={setStrengths}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Weaknesses', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What you want to improve..."
              placeholderTextColor="#555"
              value={weaknesses}
              onChangeText={setWeaknesses}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Patterns & Failure Modes', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What tends to derail you..."
              placeholderTextColor="#555"
              value={patterns}
              onChangeText={setPatterns}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Feedback Preference', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="How you want to receive feedback..."
              placeholderTextColor="#555"
              value={feedbackPreference}
              onChangeText={setFeedbackPreference}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          ))}

          {renderSection('How You Want to Use Arete', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Check-ins, coaching, tracking..."
              placeholderTextColor="#555"
              value={appUsageIntent}
              onChangeText={setAppUsageIntent}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          ))}

          {renderSection('Accountability Style', (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="How the Cabinet should handle it when you fall short..."
              placeholderTextColor="#555"
              value={accountabilityStyle}
              onChangeText={setAccountabilityStyle}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          ))}

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>This looks right — enter Arete</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    lineHeight: 19,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
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
    minHeight: 90,
    paddingTop: 12,
  },
  confirmButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
