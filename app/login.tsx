
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { signIn } from '@/lib/auth';

const PURPLE = {
  dark: '#452080',
  deep: '#5B21B6',
  primary: '#7545D6',
  light: '#A78BFA',
  pale: '#F1EAFF',
  background: '#F8F6FC',
  white: '#FFFFFF',
  text: '#29164D',
  secondary: '#8B7BA8',
  border: '#E9E1F5',
  danger: '#DC2626',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        router.replace('/(tabs)');
      } else {
        setError(
          'Login successful, but no session was returned. Please try again.'
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unexpected error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE.dark}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* PURPLE BRAND HEADER */}
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="qr-code-outline"
                size={43}
                color={PURPLE.white}
              />
            </View>

            <Text style={styles.brandTitle}>QRATT AA</Text>

            <Text style={styles.brandSubtitle}>
              QR ATTENDANCE MANAGEMENT SYSTEM
            </Text>

            <View style={styles.headerDecorationOne} />
            <View style={styles.headerDecorationTwo} />
          </View>

          {/* LOGIN CARD */}
          <View style={styles.loginCard}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome Back!</Text>

              <Text style={styles.subtitle}>
                Sign in to access your attendance dashboard.
              </Text>
            </View>

            {/* EMAIL */}
            <Text style={styles.label}>Email Address</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={PURPLE.secondary}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                placeholder="your.email@school.edu"
                placeholderTextColor={PURPLE.secondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
                selectTextOnFocus={false}
                underlineColorAndroid="transparent"
                returnKeyType="next"
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={PURPLE.secondary}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                placeholderTextColor={PURPLE.secondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                editable={!loading}
                selectTextOnFocus={false}
                underlineColorAndroid="transparent"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={21}
                  color={PURPLE.secondary}
                />
              </Pressable>
            </View>

            {/* ERROR MESSAGE */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={PURPLE.danger}
                />

                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {/* LOGIN BUTTON */}
            <View style={styles.buttonContainer}>
              {loading ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator
                    size="small"
                    color={PURPLE.white}
                  />
                  <Text style={styles.loadingText}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <AppButton
                  theme="primary"
                  title="Sign In"
                  icon="log-in-outline"
                  onPress={handleLogin}
                />
              )}
            </View>

            {/* SECURITY NOTE */}
            <View style={styles.securityNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={PURPLE.primary}
              />

              <Text style={styles.securityText}>
                Secure sign in powered by QRATT AA
              </Text>
            </View>
          </View>

          {/* REGISTRATION LINK */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>
              Don't have an account?
            </Text>

            <Link href="/register" asChild>
              <Pressable disabled={loading}>
                <Text style={styles.registerLink}>Create Account</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.footer}>
            QRATT AA • YOUR ATTENDANCE COMPANION
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 28,
    justifyContent: 'center',
  },

  // HEADER
  header: {
    backgroundColor: PURPLE.dark,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingTop: 27,
    paddingBottom: 34,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: -20,
  },

  brandIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF20',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  brandTitle: {
    color: PURPLE.white,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 3,
  },

  brandSubtitle: {
    color: '#D8C9F4',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 7,
  },

  headerDecorationOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: '#FFFFFF15',
    top: -90,
    right: -50,
  },

  headerDecorationTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#FFFFFF15',
    bottom: -85,
    left: -35,
  },

  // LOGIN CARD
  loginCard: {
    backgroundColor: PURPLE.white,
    borderRadius: 24,
    padding: 23,
    paddingTop: 42,
    borderWidth: 1,
    borderColor: PURPLE.border,
    shadowColor: PURPLE.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },

  welcomeSection: {
    marginBottom: 24,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: PURPLE.text,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: PURPLE.secondary,
    marginTop: 7,
  },

  // INPUTS
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: PURPLE.text,
    marginBottom: 9,
    marginTop: 13,
  },

  inputContainer: {
    width: '100%',
    minHeight: 53,
    backgroundColor: '#FAF9FE',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: PURPLE.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingVertical: 10,
    fontSize: 13,
    color: PURPLE.text,
    outlineStyle: 'none',
  },

  eyeButton: {
    padding: 5,
  },

  // ERROR
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
    gap: 8,
  },

  error: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: PURPLE.danger,
    fontWeight: '600',
  },

  // BUTTON
  buttonContainer: {
    marginTop: 25,
  },

  loadingButton: {
    minHeight: 49,
    backgroundColor: PURPLE.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: PURPLE.white,
    fontSize: 13,
    fontWeight: '800',
  },

  // SECURITY
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 21,
    gap: 7,
  },

  securityText: {
    fontSize: 10,
    color: PURPLE.secondary,
    fontWeight: '600',
  },

  // REGISTER
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    gap: 5,
    flexWrap: 'wrap',
  },

  registerText: {
    fontSize: 12,
    color: PURPLE.secondary,
  },

  registerLink: {
    fontSize: 12,
    color: PURPLE.primary,
    fontWeight: '900',
  },

  footer: {
    color: PURPLE.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 25,
  },
});
