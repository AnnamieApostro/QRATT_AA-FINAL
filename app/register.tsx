
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { signUp } from '@/lib/auth';

const PURPLE = '#6C4DFF';
const DARK_PURPLE = '#3F278F';
const LIGHT_PURPLE = '#F1EDFF';
const BACKGROUND = '#F8F7FC';
const TEXT = '#241B3D';
const MUTED = '#8A849B';
const BORDER = '#E8E3F2';
const WHITE = '#FFFFFF';
const DANGER = '#DC4545';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    Keyboard.dismiss();
    setError(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required.');
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
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    visible: boolean,
    toggleVisible: () => void,
    placeholder: string
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={19}
          color={MUTED}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#AAA4B8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          editable={!loading}
        />
        <Pressable
          onPress={toggleVisible}
          disabled={loading}
          hitSlop={10}
          style={styles.eyeButton}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={MUTED}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logo}>
                <Ionicons name="qr-code" size={30} color={WHITE} />
              </View>
              <View>
                <Text style={styles.brandName}>QRATT AA</Text>
                <Text style={styles.brandSubtitle}>QR ATTENDANCE SYSTEM</Text>
              </View>
            </View>

            {/* Welcome Section */}
            <View style={styles.headingContainer}>
              <Text style={styles.welcomeText}>GET STARTED</Text>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join QRATT AA and make attendance tracking easier.
              </Text>
            </View>

            {success ? (
              <View style={styles.successCard}>
                <View style={styles.successIcon}>
                  <Ionicons
                    name="mail-open-outline"
                    size={34}
                    color={PURPLE}
                  />
                </View>

                <Text style={styles.successTitle}>Check your email!</Text>
                <Text style={styles.successText}>
                  We sent a confirmation link to:
                </Text>
                <Text style={styles.successEmail}>{email}</Text>
                <Text style={styles.successText}>
                  Open the link to verify your account, then return here
                  and sign in.
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.replace('/login')}
                >
                  <Text style={styles.primaryButtonText}>
                    Back to Sign In
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={WHITE}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>Your Information</Text>
                  <Text style={styles.cardDescription}>
                    Fill in the details below to register.
                  </Text>
                </View>

                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={MUTED}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#AAA4B8"
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Role Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>I am a...</Text>

                  <View style={styles.roleRow}>
                    <Pressable
                      style={[
                        styles.roleCard,
                        role === 'student' && styles.roleCardActive,
                      ]}
                      onPress={() => setRole('student')}
                      disabled={loading}
                    >
                      <View
                        style={[
                          styles.roleIcon,
                          role === 'student' && styles.roleIconActive,
                        ]}
                      >
                        <Ionicons
                          name="school-outline"
                          size={23}
                          color={role === 'student' ? WHITE : PURPLE}
                        />
                      </View>

                      <Text
                        style={[
                          styles.roleTitle,
                          role === 'student' && styles.roleTitleActive,
                        ]}
                      >
                        Student
                      </Text>

                      <Text style={styles.roleDescription}>
                        Attend classes
                      </Text>

                      {role === 'student' && (
                        <View style={styles.selectedIcon}>
                          <Ionicons
                            name="checkmark-circle"
                            size={19}
                            color={PURPLE}
                          />
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      style={[
                        styles.roleCard,
                        role === 'teacher' && styles.roleCardActive,
                      ]}
                      onPress={() => setRole('teacher')}
                      disabled={loading}
                    >
                      <View
                        style={[
                          styles.roleIcon,
                          role === 'teacher' && styles.roleIconActive,
                        ]}
                      >
                        <Ionicons
                          name="person-circle-outline"
                          size={23}
                          color={role === 'teacher' ? WHITE : PURPLE}
                        />
                      </View>

                      <Text
                        style={[
                          styles.roleTitle,
                          role === 'teacher' && styles.roleTitleActive,
                        ]}
                      >
                        Teacher
                      </Text>

                      <Text style={styles.roleDescription}>
                        Manage attendance
                      </Text>

                      {role === 'teacher' && (
                        <View style={styles.selectedIcon}>
                          <Ionicons
                            name="checkmark-circle"
                            size={19}
                            color={PURPLE}
                          />
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={19}
                      color={MUTED}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email address"
                      placeholderTextColor="#AAA4B8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Password */}
                {renderPasswordField(
                  'Password',
                  password,
                  setPassword,
                  showPassword,
                  () => setShowPassword(!showPassword),
                  'At least 6 characters'
                )}

                {/* Confirm Password */}
                {renderPasswordField(
                  'Confirm Password',
                  confirmPassword,
                  setConfirmPassword,
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword),
                  'Re-enter your password'
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color={DANGER}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Register Button */}
                <Pressable
                  style={[
                    styles.primaryButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <>
                      <Ionicons
                        name="person-add-outline"
                        size={20}
                        color={WHITE}
                      />
                      <Text style={styles.primaryButtonText}>
                        Create My Account
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={19}
                        color={WHITE}
                      />
                    </>
                  )}
                </Pressable>

                <Text style={styles.termsText}>
                  By creating an account, you agree to use the
                  attendance system responsibly.
                </Text>
              </View>
            )}

            {/* Sign In Link */}
            {!success && (
              <View style={styles.loginRow}>
                <Text style={styles.loginText}>
                  Already have an account?
                </Text>
                <Link href="/login" style={styles.loginLink}>
                  Sign In
                </Link>
              </View>
            )}

            <Text style={styles.footerText}>
              QRATT AA • QR Attendance System
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },

  // Brand
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 35,
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DARK_PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  brandName: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: DARK_PURPLE,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: MUTED,
    marginTop: 3,
  },

  // Heading
  headingContainer: {
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: PURPLE,
    marginBottom: 8,
  },
  title: {
    fontSize: 31,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    marginTop: 8,
  },

  // Form Card
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 21,
    borderWidth: 1,
    borderColor: '#F0ECF7',
    shadowColor: DARK_PURPLE,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeading: {
    marginBottom: 13,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT,
  },
  cardDescription: {
    fontSize: 12,
    color: MUTED,
    marginTop: 5,
  },

  // Inputs
  fieldGroup: {
    marginTop: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBFAFE',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    fontSize: 14,
    color: TEXT,
  },
  eyeButton: {
    padding: 5,
    marginLeft: 5,
  },

  // Role Cards
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: '#FBFAFE',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roleCardActive: {
    backgroundColor: LIGHT_PURPLE,
    borderColor: PURPLE,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EEE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  roleIconActive: {
    backgroundColor: PURPLE,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  roleTitleActive: {
    color: DARK_PURPLE,
  },
  roleDescription: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedIcon: {
    position: 'absolute',
    top: 7,
    right: 7,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F1',
    borderRadius: 11,
    padding: 12,
    marginTop: 17,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: DANGER,
    lineHeight: 18,
  },

  // Button
  primaryButton: {
    minHeight: 54,
    backgroundColor: PURPLE,
    borderRadius: 14,
    marginTop: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  termsText: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 15,
    paddingHorizontal: 5,
  },

  // Success
  successCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK_PURPLE,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: LIGHT_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 10,
  },
  successText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
  },
  successEmail: {
    fontSize: 14,
    fontWeight: '800',
    color: PURPLE,
    marginVertical: 9,
    textAlign: 'center',
  },

  // Footer
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 25,
  },
  loginText: {
    fontSize: 13,
    color: MUTED,
  },
  loginLink: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: '800',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#AAA4B8',
    marginTop: 28,
    letterSpacing: 0.5,
  },
});
