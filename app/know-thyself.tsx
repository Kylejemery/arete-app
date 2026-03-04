import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function KnowThyselfScreen() {
  const router = useRouter();

  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState('');
  const [futureSelfDescription, setFutureSelfDescription] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const [
      bg,
      id,
      g,
      str,
      weak,
      pat,
      me,
      fsy,
      fsd,
    ] = await Promise.all([
      AsyncStorage.getItem('kt_background'),
      AsyncStorage.getItem('kt_identity'),
      AsyncStorage.getItem('kt_goals'),
      AsyncStorage.getItem('kt_strengths'),
      AsyncStorage.getItem('kt_weaknesses'),
      AsyncStorage.getItem('kt_patterns'),
      AsyncStorage.getItem('kt_major_events'),
      AsyncStorage.getItem('futureSelfYears'),
      AsyncStorage.getItem('futureSelfDescription'),
    ]);
    setBackground(bg || '');
    setIdentity(id || '');
    setGoals(g || '');
    setStrengths(str || '');
    setWeaknesses(weak || '');
    setPatterns(pat || '');
    setMajorEvents(me || '');
    setFutureSelfYears(fsy || '');
    setFutureSelfDescription(fsd || '');
  };

  const saveProfile = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('kt_background', background.trim()),
        AsyncStorage.setItem('kt_identity', identity.trim()),
        AsyncStorage.setItem('kt_goals', goals.trim()),
        AsyncStorage.setItem('userGoals', goals.trim()),
        AsyncStorage.setItem('kt_strengths', strengths.trim()),
        AsyncStorage.setItem('kt_weaknesses', weaknesses.trim()),
        AsyncStorage.setItem('kt_patterns', patterns.trim()),
        AsyncStorage.setItem('kt_major_events', majorEvents.trim()),
        AsyncStorage.setItem('futureSelfDescription', futureSelfDescription.trim()),
        ...(futureSelfYears.trim()
          ? [AsyncStorage.setItem('futureSelfYears', futureSelfYears.trim())]
          : []),
      ]);
      Alert.alert('✅ Profile Saved', 'Your Know Thyself profile has been updated. Changes take effect on your next session.');
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
          <Text style={styles.intro}>
            Your profile gives the Cabinet deep context about who you are. Update it any time —
            changes take effect on your next session.
          </Text>

          {renderSection('Background & Life Story', (
            <>
              <Text style={styles.label}>
                Where are you from, and how did you get to where you are today?
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
                value={identity}
                onChangeText={setIdentity}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </>
          ))}

          {renderSection('Goals', (
            <>
              <Text style={styles.label}>What are you working toward?</Text>
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
            </>
          ))}

          {renderSection('Strengths', (
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
          ))}

          {renderSection('Weaknesses', (
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
          ))}

          {renderSection('Patterns & Failure Modes', (
            <>
              <Text style={styles.label}>What patterns do you notice in yourself? What tends to derail you?</Text>
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
            </>
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
                value={futureSelfYears}
                onChangeText={setFutureSelfYears}
                keyboardType="number-pad"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
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
            </>
          ))}

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>Save Profile</Text>
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
});
