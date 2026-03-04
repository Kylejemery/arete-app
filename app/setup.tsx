import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

const TOTAL_STEPS = 11;
const OPTIONAL_STEPS = [3, 4, 6, 7, 8];

const YEAR_OPTIONS = [5, 10, 15, 20];

interface CabinetMember {
  id: string;
  name: string;
  role: string;
  description: string;
  locked: boolean;
}

const CABINET_MEMBERS: CabinetMember[] = [
  {
    id: 'marcus',
    name: 'Marcus Aurelius',
    role: 'Chair — always present',
    description: 'Emperor, philosopher, Stoic. The anchor of the Cabinet.',
    locked: true,
  },
  {
    id: 'epictetus',
    name: 'Epictetus',
    role: 'Counselor',
    description: 'Slave turned philosopher. Master of what is and is not in your control.',
    locked: false,
  },
  {
    id: 'goggins',
    name: 'David Goggins',
    role: 'Counselor',
    description: 'Navy SEAL, ultramarathon runner. The voice that refuses your excuses.',
    locked: false,
  },
  {
    id: 'roosevelt',
    name: 'Theodore Roosevelt',
    role: 'Counselor',
    description: 'Statesman, naturalist, boxer. The man who chose the strenuous life.',
    locked: false,
  },
  {
    id: 'futureSelf',
    name: 'Future Self',
    role: 'Your future self — always present',
    description: 'You, as you intend to become. The counselor only you can define.',
    locked: true,
  },
];

export default function SetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 2
  const [name, setName] = useState('');
  // Step 3
  const [background, setBackground] = useState('');
  // Step 4
  const [identity, setIdentity] = useState('');
  // Step 5
  const [goals, setGoals] = useState('');
  // Step 6
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  // Step 7
  const [patterns, setPatterns] = useState('');
  // Step 8
  const [majorEvents, setMajorEvents] = useState('');
  // Step 9
  const [futureSelfYears, setFutureSelfYears] = useState(10);
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  // Step 10
  const [activeMembers, setActiveMembers] = useState<string[]>([
    'marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf',
  ]);

  const isOptionalStep = (): boolean => OPTIONAL_STEPS.includes(step);

  const canContinue = (): boolean => {
    if (step === 2) return name.trim().length > 0;
    if (step === 5) return goals.trim().length > 0;
    if (step === 9) return futureSelfDescription.trim().length > 0;
    if (step === 10) {
      const optionals = activeMembers.filter(
        (id) => id !== 'marcus' && id !== 'futureSelf'
      );
      return optionals.length > 0;
    }
    return true;
  };

  const toggleMember = (id: string) => {
    if (id === 'marcus' || id === 'futureSelf') return;
    const isActive = activeMembers.includes(id);
    if (isActive) {
      const optionals = activeMembers.filter(
        (m) => m !== 'marcus' && m !== 'futureSelf'
      );
      if (optionals.length <= 1) return; // must keep at least one optional
      setActiveMembers(activeMembers.filter((m) => m !== id));
    } else {
      setActiveMembers([...activeMembers, id]);
    }
  };

  const handleCommit = async () => {
    await AsyncStorage.setItem('userName', name.trim());
    await AsyncStorage.setItem('userGoals', goals.trim());
    await AsyncStorage.setItem('kt_background', background.trim());
    await AsyncStorage.setItem('kt_identity', identity.trim());
    await AsyncStorage.setItem('kt_goals', goals.trim());
    await AsyncStorage.setItem('kt_strengths', strengths.trim());
    await AsyncStorage.setItem('kt_weaknesses', weaknesses.trim());
    await AsyncStorage.setItem('kt_patterns', patterns.trim());
    await AsyncStorage.setItem('kt_major_events', majorEvents.trim());
    await AsyncStorage.setItem('futureSelfYears', String(futureSelfYears));
    await AsyncStorage.setItem('futureSelfDescription', futureSelfDescription.trim());
    await AsyncStorage.setItem('cabinetMembers', JSON.stringify(activeMembers));
    router.replace('/');
  };

  const renderProgressDots = () => (
    <View style={styles.progressDots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i + 1 === step && styles.dotActive,
            i + 1 < step && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>ARETE</Text>
      <Text style={styles.tagline}>Be who you want to be.</Text>
      <View style={styles.divider} />
      <Text style={styles.bodyText}>
        The Cabinet of Invisible Counselors is an ancient practice, revived for this moment.
        Within this app, you will assemble a council of history&apos;s most tested minds — figures
        who endured war, slavery, failure, and doubt — and ask them to accompany you through
        your own trials.
      </Text>
      <Text style={styles.bodyText}>
        They will not flatter you. They will not accept your excuses. They will hold you
        to the standard you claim to want — and remind you, on the days you forget, why
        you started.
      </Text>
      <Text style={styles.bodyText}>
        This is not a productivity app. This is a commitment to excellence — the pursuit of virtue, the fullest expression of what you are capable of becoming.
      </Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>What shall we call you?</Text>
      <Text style={styles.stepSubtext}>
        The Cabinet will address you by name. Choose carefully — this is how you will be known
        here.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your first name..."
        placeholderTextColor="#555"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Your Background & Life Story</Text>
      <Text style={styles.stepSubtext}>
        Where are you from, and how did you get to where you are today? Describe your career path,
        major life moments, how your path unfolded.
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="I grew up in..."
        placeholderTextColor="#555"
        value={background}
        onChangeText={setBackground}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Who You Are Today</Text>
      <Text style={styles.stepSubtext}>
        What do you do professionally? What are you pursuing outside of work? What does your
        daily life look like?
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Professionally, I..."
        placeholderTextColor="#555"
        value={identity}
        onChangeText={setIdentity}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>What are you here to build?</Text>
      <Text style={styles.stepSubtext}>
        Describe what you are working toward. Be specific. Vague goals produce vague results.
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="I am here to..."
        placeholderTextColor="#555"
        value={goals}
        onChangeText={setGoals}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Strengths & Weaknesses</Text>
      <Text style={styles.stepSubtext}>
        Knowing yourself is the beginning of all wisdom. What are your greatest strengths?
        What do you struggle with?
      </Text>
      <Text style={styles.inputLabel}>Your Strengths</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="I am strong at..."
        placeholderTextColor="#555"
        value={strengths}
        onChangeText={setStrengths}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      <Text style={styles.inputLabel}>Your Weaknesses</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="I struggle with..."
        placeholderTextColor="#555"
        value={weaknesses}
        onChangeText={setWeaknesses}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Patterns & Failure Modes</Text>
      <Text style={styles.stepSubtext}>
        What patterns do you notice in yourself? What tends to derail you?
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="When under pressure, I tend to..."
        placeholderTextColor="#555"
        value={patterns}
        onChangeText={setPatterns}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep8 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Major Life Events</Text>
      <Text style={styles.stepSubtext}>
        What are the defining moments, turning points, or crucible experiences that shaped who
        you are? Loss, failure, triumph, change.
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="The experiences that made me who I am..."
        placeholderTextColor="#555"
        value={majorEvents}
        onChangeText={setMajorEvents}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep9 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Meet your Future Self</Text>
      <Text style={styles.stepSubtext}>
        Every Cabinet includes one member that no historical figure can replace — you. Not you
        as you are today, but you as you intend to become. Your Future Self has lived through
        this decade with intention and courage. They speak from experience — because they are
        you.
      </Text>
      <Text style={styles.inputLabel}>
        How many years from now is your Future Self?
      </Text>
      <View style={styles.yearRow}>
        {YEAR_OPTIONS.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearOption, futureSelfYears === y && styles.yearOptionActive]}
            onPress={() => setFutureSelfYears(y)}
          >
            <Text style={[styles.yearOptionText, futureSelfYears === y && styles.yearOptionTextActive]}>
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.inputLabel}>Describe your Future Self.</Text>
      <Text style={styles.inputHint}>
        Who are they? What have they built? What kind of person have they become? What does
        their daily life look like? Write as if you are describing a real person — because
        you are.
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="In ten years, I have..."
        placeholderTextColor="#555"
        value={futureSelfDescription}
        onChangeText={setFutureSelfDescription}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep10 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeading}>Your Cabinet</Text>
      <Text style={styles.stepSubtext}>
        These are your counselors. Marcus Aurelius chairs every session. Your Future Self
        is always present. Toggle the others to suit your council.
      </Text>
      <View style={styles.memberList}>
        {CABINET_MEMBERS.map((member) => {
          const isActive = activeMembers.includes(member.id);
          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.memberCard, isActive && styles.memberCardActive]}
              onPress={() => toggleMember(member.id)}
              activeOpacity={member.locked ? 1 : 0.8}
            >
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, isActive && styles.memberNameActive]}>
                  {member.name}
                </Text>
                <Text style={styles.memberRole}>{member.role}</Text>
                <Text style={styles.memberDesc}>{member.description}</Text>
              </View>
              <View style={styles.memberToggle}>
                {member.locked ? (
                  <Ionicons name="lock-closed" size={18} color="#c9a84c" />
                ) : (
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={isActive ? '#c9a84c' : '#555'}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep11 = () => {
    const activeMemberNames = CABINET_MEMBERS.filter((m) =>
      activeMembers.includes(m.id)
    ).map((m) => m.name);
    const goalsPreview =
      goals.length > 120 ? goals.slice(0, 120) + '…' : goals;
    const fsPreview =
      futureSelfDescription.length > 100
        ? futureSelfDescription.slice(0, 100) + '…'
        : futureSelfDescription;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeading}>Your Commitment</Text>
        <Text style={styles.stepSubtext}>
          Review what you have declared. The Cabinet has heard it. Now honor it.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Goals</Text>
          <Text style={styles.summaryValue}>{goalsPreview}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Future Self</Text>
          <Text style={styles.summaryValue}>
            {futureSelfYears} years from now — {fsPreview}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Cabinet</Text>
          <Text style={styles.summaryValue}>{activeMemberNames.join(', ')}</Text>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      case 10: return renderStep10();
      case 11: return renderStep11();
      default: return null;
    }
  };

  const buttonLabel = () => {
    if (step === 1) return 'Begin';
    if (step === TOTAL_STEPS) return 'I commit to Arete';
    return 'Continue';
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressDots()}
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
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isLastStep && styles.commitButton,
              !canContinue() && styles.buttonDisabled,
            ]}
            onPress={() => {
              if (!canContinue()) return;
              if (isLastStep) {
                handleCommit();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={!canContinue()}
          >
            <Text style={[styles.continueButtonText, isLastStep && styles.commitButtonText]}>
              {buttonLabel()}
            </Text>
          </TouchableOpacity>

          {isOptionalStep() && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setStep(step + 1)}
            >
              <Text style={styles.skipButtonText}>Skip for now →</Text>
            </TouchableOpacity>
          )}

          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
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
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  dotActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
    width: 24,
  },
  dotDone: {
    backgroundColor: '#c9a84c55',
    borderColor: '#c9a84c55',
  },
  scrollContent: {
    padding: 28,
    paddingBottom: 16,
  },
  stepContainer: {
    flex: 1,
  },
  // Step 1
  mainTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#c9a84c',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 12,
    marginTop: 20,
  },
  tagline: {
    fontSize: 18,
    color: '#e0e0e0',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#c9a84c33',
    marginBottom: 28,
  },
  bodyText: {
    fontSize: 15,
    color: '#e0e0e0',
    lineHeight: 26,
    marginBottom: 18,
  },
  goldText: {
    color: '#c9a84c',
    fontStyle: 'italic',
  },
  // Shared step styles
  stepHeading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c9a84c',
    marginBottom: 12,
    marginTop: 8,
  },
  stepSubtext: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    color: '#e0e0e0',
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  inputHint: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#16213e',
    color: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    marginBottom: 8,
  },
  multilineInput: {
    minHeight: 130,
    paddingTop: 14,
  },
  // Year picker
  yearRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  yearOption: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  yearOptionActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  yearOptionText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  yearOptionTextActive: {
    color: '#1a1a2e',
  },
  // Cabinet members
  memberList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c22',
    gap: 12,
  },
  memberCardActive: {
    borderColor: '#c9a84c55',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#888',
  },
  memberNameActive: {
    color: '#e0e0e0',
  },
  memberRole: {
    fontSize: 12,
    color: '#c9a84c',
    marginBottom: 2,
  },
  memberDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  memberToggle: {
    width: 28,
    alignItems: 'center',
  },
  // Summary cards
  summaryCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#c9a84c',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 22,
  },
  // Footer / buttons
  footer: {
    padding: 20,
    paddingBottom: 28,
    gap: 10,
  },
  continueButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  commitButton: {
    paddingVertical: 18,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: 'bold',
  },
  commitButtonText: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  skipButton: {
    alignItems: 'center',
    padding: 10,
  },
  skipButtonText: {
    color: '#c9a84c',
    fontSize: 14,
    opacity: 0.7,
  },
});