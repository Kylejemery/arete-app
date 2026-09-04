import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  // Set when the user arrived via a shared-session invite link while signed
  // out. After auth we bounce back to join-session so the invite completes
  // without re-tapping the email link. Invitees usually have no account yet,
  // so default them to sign-up.
  const params = useLocalSearchParams<{ inviteToken?: string }>();
  const inviteToken = params.inviteToken ? String(params.inviteToken) : null;
  const [mode, setMode] = useState<Mode>(inviteToken ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // One toggle covers both password fields so a typo in "confirm" is as
  // visible as one in the password itself.
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
      } else if (inviteToken) {
        router.replace({ pathname: '/join-session', params: { token: inviteToken } } as any);
      } else {
        router.replace('/' as any);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
      } else if (inviteToken) {
        // Joining the shared session comes first; onboarding is offered via
        // the home-tab banner later, never forced.
        router.replace({ pathname: '/join-session', params: { token: inviteToken } } as any);
      } else {
        router.replace('/setup' as any);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    console.log('API URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
    if (mode === 'signin') {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ARETE</Text>
          <Text style={styles.tagline}>Be who you want to be.</Text>
        </View>

        {inviteToken && (
          <View style={styles.inviteBanner}>
            <Text style={styles.inviteBannerText}>
              You've been invited to a shared Cabinet session. Sign in or create an account to join.
            </Text>
          </View>
        )}

        {/* Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'signin' && styles.toggleButtonActive]}
            onPress={() => { setMode('signin'); setError(null); }}
          >
            <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'signup' && styles.toggleButtonActive]}
            onPress={() => { setMode('signup'); setError(null); }}
          >
            <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(v => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A9BB0" />
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#555"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <Text
            style={styles.footerLink}
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 8,
  },
  tagline: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 6,
  },
  inviteBanner: {
    backgroundColor: '#c9a84c22',
    borderWidth: 1,
    borderColor: '#c9a84c66',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  inviteBannerText: {
    color: '#e0d5b5',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#c9a84c',
  },
  toggleText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleTextActive: {
    color: '#1a1a2e',
  },
  form: {
    gap: 6,
    marginBottom: 24,
  },
  label: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#ff444422',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ff444466',
    marginTop: 8,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
  },
  footerLink: {
    color: '#c9a84c',
    fontWeight: '600',
  },
});
