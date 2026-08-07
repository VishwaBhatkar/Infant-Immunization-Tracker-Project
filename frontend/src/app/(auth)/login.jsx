/**
 * File: frontend/src/app/(auth)/login.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
/*

*
 * Login screen for the ChildCare application.
 *
 * Features:
 * - Email and password login
 * - Required-field validation
 * - Password visibility toggle
 * - Forgot-password alert
 * - Biometric login
 * - Responsive layout
 *
 * Custom onFocus and onBlur handlers have been removed.
 */

import React, { useState } from 'react';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';

export default function Login() {
  // Authentication functions and application theme
  const {
    login,
    biometricLogin,
    theme,
    isDark,
  } = useApp();

  // Screen width for responsive layout
  const { width } = useWindowDimensions();
  const isWide = width >= 820;

  // Login form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] =
    useState(false);

  // Prevent multiple login requests
  const [busy, setBusy] = useState(false);

  // Validation messages
  const [errors, setErrors] = useState({});

  /**
   * Validates the login form and authenticates the user.
   */
  const submit = async () => {
    // Ignore repeated button presses
    if (busy) {
      return;
    }

    const nextErrors = {};

    // Validate email
    if (!email.trim()) {
      nextErrors.email =
        'Enter your email address.';
    }

    // Validate password
    if (!password) {
      nextErrors.password =
        'Enter your password.';
    }

    setErrors(nextErrors);

    // Stop login when fields are empty
    if (Object.keys(nextErrors).length > 0) {
      showToast(
        'Please enter both your email address and password.',
        'warning',
        'Login details required'
      );

      return;
    }

    try {
      // Show loading state
      setBusy(true);

      // Authenticate using AppContext
      await login(email, password);

      // Show successful login message
      showToast(
        'Login successful. Welcome back!'
      );
    } catch (error) {
      // Display application error
      showError(error);
    } finally {
      // Restore the login button
      setBusy(false);
    }
  };

  /**
   * Shows the existing forgot-password message.
   */
  const showForgotPasswordMessage = () => {
    Alert.alert(
      'Forgot password',
      'Please contact your hospital administrator or support team to reset your password.'
    );
  };
    return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      {/* Keeps the form visible when the keyboard opens */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Makes the Login screen scrollable on small devices */}
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main responsive page container */}
          <View
            style={[
              styles.page,
              isWide && styles.pageWide,
            ]}
          >
            {/* Branding section */}
            <LinearGradient
              colors={
                isDark
                  ? ['#0B2854', '#0C6B68']
                  : ['#2563EB', '#10B981']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.brandPanel,
                isWide && styles.brandPanelWide,
              ]}
            >
              <Image
                source={require('../../../assets/images/auth/login-parent-baby.webp')}
                resizeMode="cover"
                accessibilityLabel="Pediatric healthcare"
                style={styles.healthcarePhoto}
              />

              {/* Application logo */}
              <View
                style={styles.logoBadge}
                accessibilityLabel="ChildCare logo"
              >
                <Text style={styles.logoSymbol}>
                  ✚
                </Text>
              </View>

              {/* Application name */}
              <Text style={styles.brandName}>
                ChildCare
              </Text>

              {/* Branding heading */}
              <Text style={styles.brandHeadline}>
                Healthy beginnings, protected futures.
              </Text>

              {/* Branding description */}
              <Text style={styles.brandDescription}>
                Keep vaccinations, appointments, growth
                records, and child health information together
                in one trusted place.
              </Text>

              {/* Healthcare information card */}
              <View style={styles.illustrationCard}>
                <View style={styles.illustrationCircle}>
                  <Text style={styles.illustrationEmoji}>
                    👨‍⚕️
                  </Text>
                </View>

                <View style={styles.illustrationCopy}>
                  <Text style={styles.illustrationTitle}>
                    Care that stays on schedule
                  </Text>

                  <Text style={styles.illustrationText}>
                    Timely reminders and connected healthcare
                    records for every child.
                  </Text>
                </View>
              </View>

              {/* Application trust indicators */}
              <View style={styles.trustRow}>
                <Text style={styles.trustItem}>
                  ✓ Secure
                </Text>

                <Text style={styles.trustItem}>
                  ✓ Reliable
                </Text>

                <Text style={styles.trustItem}>
                  ✓ Family focused
                </Text>
              </View>
            </LinearGradient>

            {/* Login form column */}
            <View
              style={[
                styles.formColumn,
                isWide && styles.formColumnWide,
              ]}
            >
              {/* Login form card */}
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 35, 52, 0.88)'
                      : 'rgba(255, 255, 255, 0.90)',

                    borderColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(255,255,255,0.75)',
                  },
                ]}
              >
                {/* Form header */}
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color: theme.primary,
                    },
                  ]}
                >
                  WELCOME BACK
                </Text>

                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Sign in to ChildCare
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: theme.muted,
                    },
                  ]}
                >
                  Manage your child&apos;s vaccination journey
                  with confidence.
                </Text>

                {/* Email input group */}
                <View style={styles.fieldGroup}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    Email address
                  </Text>

                  <View
                    style={[
                      styles.inputShell,
                      {
                        backgroundColor: theme.card,
                        borderColor: errors.email
                          ? theme.danger
                          : theme.border,
                      },
                    ]}
                  >
                    {/* Email icon */}
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor:
                            theme.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.iconText,
                          {
                            color: theme.primary,
                          },
                        ]}
                      >
                        @
                      </Text>
                    </View>

                    {/* Email input without onFocus or onBlur */}
                    <TextInput
                      accessibilityLabel="Email address"
                      placeholder="name@example.com"
                      placeholderTextColor={theme.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);

                        if (errors.email) {
                          setErrors((current) => ({
                            ...current,
                            email: undefined,
                          }));
                        }
                      }}
                      selectionColor={theme.primary}
                      cursorColor={theme.primary}
                      style={[
                        styles.input,
                        {
                          color: theme.text,
                        },
                      ]}
                    />
                  </View>

                  {/* Email validation message */}
                  {errors.email ? (
                    <Text
                      style={[
                        styles.errorText,
                        {
                          color: theme.danger,
                        },
                      ]}
                    >
                      {errors.email}
                    </Text>
                  ) : null}
                </View>

                {/* Password input group */}
                <View style={styles.fieldGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color: theme.text,
                        },
                      ]}
                    >
                      Password
                    </Text>

                    {/* Forgot-password button */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Forgot password"
                      hitSlop={8}
                      onPress={showForgotPasswordMessage}
                    >
                      <Text
                        style={[
                          styles.forgotText,
                          {
                            color: theme.primary,
                          },
                        ]}
                      >
                        Forgot password?
                      </Text>
                    </Pressable>
                  </View>

                  <View
                    style={[
                      styles.inputShell,
                      {
                        backgroundColor: theme.card,
                        borderColor: errors.password
                          ? theme.danger
                          : theme.border,
                      },
                    ]}
                  >
                    {/* Password icon */}
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor:
                            theme.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.iconText,
                          {
                            color: theme.primary,
                          },
                        ]}
                      >
                        ●
                      </Text>
                    </View>

                    {/* Password input without onFocus or onBlur */}
                    <TextInput
                      accessibilityLabel="Password"
                      placeholder="Enter your password"
                      placeholderTextColor={theme.muted}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);

                        if (errors.password) {
                          setErrors((current) => ({
                            ...current,
                            password: undefined,
                          }));
                        }
                      }}
                      onSubmitEditing={submit}
                      selectionColor={theme.primary}
                      cursorColor={theme.primary}
                      style={[
                        styles.input,
                        {
                          color: theme.text,
                        },
                      ]}
                    />

                    {/* Password visibility button */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      hitSlop={8}
                      onPress={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      style={styles.passwordToggle}
                    >
                      <Text
                        style={[
                          styles.passwordToggleText,
                          {
                            color: theme.primary,
                          },
                        ]}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Password validation message */}
                  {errors.password ? (
                    <Text
                      style={[
                        styles.errorText,
                        {
                          color: theme.danger,
                        },
                      ]}
                    >
                      {errors.password}
                    </Text>
                  ) : null}
                </View>
                                {/* Main sign-in button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: busy,
                    busy,
                  }}
                  disabled={busy}
                  onPress={() => void submit()}
                  style={({ pressed }) => [
                    styles.buttonWrapper,
                    {
                      opacity: busy
                        ? 0.65
                        : pressed
                        ? 0.9
                        : 1,

                      transform: [
                        {
                          scale: pressed ? 0.985 : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#2563EB', '#10B981']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy
                        ? 'Signing in…'
                        : 'Sign in securely'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Biometric login is available only on native devices */}
                {Platform.OS !== 'web' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={async () => {
                      try {
                        setBusy(true);

                        await biometricLogin();

                        showToast(
                          'Biometric login successful.'
                        );
                      } catch (error) {
                        showError(error);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        borderColor: theme.primary,
                        backgroundColor: theme.primarySoft,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        {
                          color: theme.primary,
                        },
                      ]}
                    >
                      Sign in with fingerprint / face
                    </Text>
                  </Pressable>
                ) : null}

                {/* Divider between Login and Registration */}
                <View style={styles.dividerRow}>
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor: theme.border,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.dividerText,
                      {
                        color: theme.muted,
                      },
                    ]}
                  >
                    New to ChildCare?
                  </Text>

                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor: theme.border,
                      },
                    ]}
                  />
                </View>

                {/* Navigate to Register screen */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push('/(auth)/register')
                  }
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      borderColor: theme.primary,
                      backgroundColor: theme.primarySoft,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color: theme.primary,
                      },
                    ]}
                  >
                    Create an account
                  </Text>
                </Pressable>

                {/* Legal information */}
                <Text
                  style={[
                    styles.legalText,
                    {
                      color: theme.muted,
                    },
                  ]}
                >
                  By continuing, you agree to our Terms of
                  Service and Privacy Policy.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },

  page: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 20,
  },

  pageWide: {
    maxWidth: 1120,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
  },

  healthcarePhoto: {
    width: '100%',
    maxWidth: '100%',
    height: 180,
    borderRadius: 18,
    marginBottom: 20,
  },

  brandPanel: {
    borderRadius: 28,
    padding: 28,
    overflow: 'hidden',

    ...Platform.select({
      web: {
        boxShadow:
          '0 10px 24px rgba(15, 23, 42, 0.18)',
      },

      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: {
          width: 0,
          height: 10,
        },
      },

      android: {
        elevation: 7,
      },
    }),
  },

  brandPanelWide: {
    flex: 1,
    minHeight: 650,
    justifyContent: 'center',
    padding: 44,
  },

  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  logoSymbol: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  brandHeadline: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    marginTop: 12,
  },

  brandDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 16,
    lineHeight: 25,
    marginTop: 14,
  },

  illustrationCard: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },

  illustrationCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationEmoji: {
    fontSize: 35,
  },

  illustrationCopy: {
    flex: 1,
  },

  illustrationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  illustrationText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },

  trustItem: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  formColumn: {
    width: '100%',
  },

  formColumnWide: {
    flex: 1,
    justifyContent: 'center',
  },

  glassCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',

    ...Platform.select({
      web: {
        boxShadow:
          '0 10px 24px rgba(15, 23, 42, 0.12)',
      },

      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: {
          width: 0,
          height: 10,
        },
      },

      android: {
        elevation: 6,
      },
    }),
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },

  fieldGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },

  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputShell: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    fontSize: 16,
    fontWeight: '900',
  },

  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    fontSize: 16,
  },

  passwordToggle: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passwordToggleText: {
    fontSize: 13,
    fontWeight: '800',
  },

  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },

  buttonWrapper: {
    borderRadius: 18,
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',

    ...Platform.select({
      web: {
        boxShadow:
          '0 5px 12px rgba(37, 99, 235, 0.22)',
      },

      ios: {
        shadowColor: '#2563EB',
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: {
          width: 0,
          height: 5,
        },
      },

      android: {
        elevation: 4,
      },
    }),
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },

  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },

  legalText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
  },
});




