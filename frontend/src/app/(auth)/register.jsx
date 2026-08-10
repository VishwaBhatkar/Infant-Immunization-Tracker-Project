
/**
 * Register screen for Parent and Doctor accounts.
 *
 * Features:
 * - Parent and Doctor registration
 * - Required-field validation
 * - Password confirmation
 * - Password visibility
 * - API integration
 * - Toast messages
 * - Responsive layout
 */

import React, { useState } from 'react';

import {
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
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';

export default function Register() {
  // Application theme
  const { theme, isDark } = useApp();

  // Responsive screen width
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  // Selected account role
  const [role, setRole] = useState('PARENT');

  // Registration form values
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  // Validation messages
  const [errors, setErrors] = useState({});

  // API request loading state
  const [busy, setBusy] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /**
   * Updates one form field.
   * Also clears the existing error for that field.
   */
  const setField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    }
  };

  /**
   * Validates and submits the registration form.
   */
  const save = async () => {
    // Prevent multiple registration requests
    if (busy) {
      return;
    }

    const nextErrors = {};

    // Required-field validation
    if (!form.name.trim()) {
      nextErrors.name = 'Enter your full name.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Enter your email address.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Enter your mobile number.';
    }

    if (!form.password) {
      nextErrors.password = 'Create a password.';
    }

    if (!form.confirm_password) {
      nextErrors.confirm_password =
        'Confirm your password.';
    }

    // Stop when required fields are empty
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      showToast(
        'Please complete all registration fields.',
        'warning',
        'Required information'
      );

      return;
    }

    // Confirm that both passwords match
    if (form.password !== form.confirm_password) {
      setErrors((current) => ({
        ...current,
        confirm_password: 'Passwords do not match.',
      }));

      showToast(
        'Enter the same password in both password fields.',
        'warning',
        'Passwords do not match'
      );

      return;
    }

    try {
      setBusy(true);

      // Send account data to the backend
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        role,
      });

      showToast(
        `${
          role === 'DOCTOR' ? 'Doctor' : 'Parent'
        } account created successfully. Please log in.`
      );

      // Redirect to Login after successful registration
      router.replace('/(auth)/login');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
    /**
   * Reusable input field used for:
   * - Full name
   * - Email
   * - Mobile number
   * - Password
   * - Confirm password
   *
   * This version has:
   * - No onBlur
   * - No onFocus
   * - No custom focus state
   */
  const renderField = ({
    key,
    label,
    placeholder,
    symbol,
    secure = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    showSecure = false,
    toggleSecure,
    returnKeyType = 'next',
  }) => {
    return (
      <View style={styles.fieldGroup}>
        {/* Input label */}
        <Text
          style={[
            styles.label,
            {
              color: theme.text,
            },
          ]}
        >
          {label}
        </Text>

        {/* Input container */}
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: theme.card,
              borderColor: errors[key]
                ? theme.danger
                : theme.border,
            },
          ]}
        >
          {/* Input icon */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.primarySoft,
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
              {symbol}
            </Text>
          </View>

          {/* Main text input */}
          <TextInput
            accessibilityLabel={label}
            placeholder={placeholder}
            placeholderTextColor={theme.muted}
            value={form[key]}
            onChangeText={(value) =>
              setField(key, value)
            }
            secureTextEntry={secure && !showSecure}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            returnKeyType={returnKeyType}
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
          {secure && toggleSecure ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showSecure
                  ? `Hide ${label.toLowerCase()}`
                  : `Show ${label.toLowerCase()}`
              }
              hitSlop={8}
              onPress={toggleSecure}
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
                {showSecure ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Validation error */}
        {errors[key] ? (
          <Text
            style={[
              styles.errorText,
              {
                color: theme.danger,
              },
            ]}
          >
            {errors[key]}
          </Text>
        ) : null}
      </View>
    );
  };
    return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[
              styles.page,
              isWide && styles.pageWide,
            ]}
          >
            {/* Left branding section */}
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
              {/* Back to Login */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to login"
                onPress={() =>
                  router.replace('/(auth)/login')
                }
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text style={styles.backButtonText}>
                  ‹ Back to login
                </Text>
              </Pressable>

              <Image
                source={require('../../../assets/images/auth/registration-family.webp')}
                resizeMode="cover"
                accessibilityLabel="Pediatric healthcare"
                style={styles.healthcarePhoto}
              />

              {/* Application logo */}
              <View style={styles.logoBadge}>
                <Text style={styles.logoSymbol}>
                  ✚
                </Text>
              </View>

              {/* Application name */}
              <Text style={styles.brandName}>
                ChildCare
              </Text>

              {/* Main branding heading */}
              <Text style={styles.brandHeadline}>
                Join a healthier vaccination journey.
              </Text>

              {/* Branding description */}
              <Text style={styles.brandDescription}>
                Create a secure account for your family or
                clinical role and keep every important health
                milestone organised.
              </Text>

              {/* Application benefits */}
              <View style={styles.benefitList}>
                <Text style={styles.benefitItem}>
                  ✓ Vaccination schedule tracking
                </Text>

                <Text style={styles.benefitItem}>
                  ✓ Appointment management
                </Text>

                <Text style={styles.benefitItem}>
                  ✓ Growth and medical records
                </Text>

                <Text style={styles.benefitItem}>
                  ✓ Timely health notifications
                </Text>
              </View>
            </LinearGradient>

            {/* Registration form column */}
            <View
              style={[
                styles.formColumn,
                isWide && styles.formColumnWide,
              ]}
            >
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 35, 52, 0.90)'
                      : 'rgba(255, 255, 255, 0.92)',

                    borderColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(255,255,255,0.76)',
                  },
                ]}
              >
                {/* Registration header */}
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color: theme.primary,
                    },
                  ]}
                >
                  CREATE ACCOUNT
                </Text>

                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Start with ChildCare
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: theme.muted,
                    },
                  ]}
                >
                  Select your role and enter your account
                  details.
                </Text>

                {/* Role selection heading */}
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  I am registering as
                </Text>

                {/* Parent and Doctor role selection */}
                <View style={styles.roleRow}>
                  {['PARENT', 'DOCTOR'].map((item) => {
                    const selected = role === item;

                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected,
                        }}
                        onPress={() => setRole(item)}
                        style={({ pressed }) => [
                          styles.roleCard,
                          {
                            borderColor: selected
                              ? theme.primary
                              : theme.border,

                            backgroundColor: selected
                              ? theme.primarySoft
                              : theme.card,

                            opacity: pressed ? 0.82 : 1,

                            transform: [
                              {
                                scale: pressed
                                  ? 0.985
                                  : 1,
                              },
                            ],
                          },
                        ]}
                      >
                        {/* Role icon */}
                        <View
                          style={[
                            styles.roleIconCircle,
                            {
                              backgroundColor: selected
                                ? theme.primary
                                : theme.primarySoft,
                            },
                          ]}
                        >
                          <Text style={styles.roleIcon}>
                            {item === 'PARENT'
                              ? '👪'
                              : '🩺'}
                          </Text>
                        </View>

                        {/* Role title */}
                        <Text
                          style={[
                            styles.roleTitle,
                            {
                              color: selected
                                ? theme.primary
                                : theme.text,
                            },
                          ]}
                        >
                          {item === 'PARENT'
                            ? 'Parent'
                            : 'Doctor'}
                        </Text>

                        {/* Role description */}
                        <Text
                          style={[
                            styles.roleDescription,
                            {
                              color: theme.muted,
                            },
                          ]}
                        >
                          {item === 'PARENT'
                            ? 'Manage children and vaccines'
                            : 'Manage appointments and records'}
                        </Text>

                        {/* Selection indicator */}
                        <View
                          style={[
                            styles.radio,
                            {
                              borderColor: selected
                                ? theme.primary
                                : theme.border,
                            },
                            selected && {
                              backgroundColor:
                                theme.primary,
                            },
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Full name field */}
                {renderField({
                  key: 'name',
                  label: 'Full name',
                  placeholder: 'Enter your full name',
                  symbol: 'A',
                  autoCapitalize: 'words',
                  returnKeyType: 'next',
                })}

                {/* Email field */}
                {renderField({
                  key: 'email',
                  label: 'Email address',
                  placeholder: 'name@example.com',
                  symbol: '@',
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                  returnKeyType: 'next',
                })}

                {/* Mobile number field */}
                {renderField({
                  key: 'phone',
                  label: 'Mobile number',
                  placeholder: 'Enter your mobile number',
                  symbol: '☎',
                  keyboardType: 'phone-pad',
                  autoCapitalize: 'none',
                  returnKeyType: 'next',
                })}

                {/* Password field */}
                {renderField({
                  key: 'password',
                  label: 'Password',
                  placeholder: 'Create a strong password',
                  symbol: '●',
                  secure: true,
                  autoCapitalize: 'none',
                  showSecure: showPassword,
                  returnKeyType: 'next',
                  toggleSecure: () =>
                    setShowPassword(
                      (current) => !current
                    ),
                })}

                {/* Confirm password field */}
                {renderField({
                  key: 'confirm_password',
                  label: 'Confirm password',
                  placeholder: 'Re-enter your password',
                  symbol: '✓',
                  secure: true,
                  autoCapitalize: 'none',
                  showSecure: showConfirmPassword,
                  returnKeyType: 'done',
                  toggleSecure: () =>
                    setShowConfirmPassword(
                      (current) => !current
                    ),
                })}
                                {/* Password requirement hint */}
                <View
                  style={[
                    styles.passwordHint,
                    {
                      backgroundColor: theme.primarySoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.passwordHintText,
                      {
                        color: theme.muted,
                      },
                    ]}
                  >
                    Use at least 8 characters with uppercase,
                    lowercase, number and special character.
                  </Text>
                </View>

                {/* Create account button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: busy,
                    busy,
                  }}
                  disabled={busy}
                  onPress={() => void save()}
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
                        ? 'Creating account…'
                        : `Create ${
                            role === 'DOCTOR'
                              ? 'doctor'
                              : 'parent'
                          } account`}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Existing user login link */}
                <View style={styles.loginRow}>
                  <Text
                    style={[
                      styles.loginPrompt,
                      {
                        color: theme.muted,
                      },
                    ]}
                  >
                    Already have an account?
                  </Text>

                  <Pressable
                    onPress={() =>
                      router.replace('/(auth)/login')
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.loginLink,
                        {
                          color: theme.primary,
                        },
                      ]}
                    >
                      Sign in
                    </Text>
                  </Pressable>
                </View>

                {/* Legal information */}
                <Text
                  style={[
                    styles.legalText,
                    {
                      color: theme.muted,
                    },
                  ]}
                >
                  By registering, you agree to our Terms of
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
    maxWidth: 620,
    alignSelf: 'center',
    gap: 20,
  },

  pageWide: {
    maxWidth: 1180,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
  },

  healthcarePhoto: {
    width: '100%',
    maxWidth: 720,
    aspectRatio: 12 / 7,
    alignSelf: 'center',
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
    flex: 0.9,
    minHeight: 760,
    justifyContent: 'center',
    padding: 44,
  },

  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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

  benefitList: {
    marginTop: 30,
    gap: 13,
    padding: 20,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  benefitItem: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  formColumn: {
    width: '100%',
  },

  formColumnWide: {
    flex: 1.15,
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
    marginBottom: 22,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },

  roleCard: {
    flex: 1,
    minHeight: 146,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  roleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleIcon: {
    fontSize: 24,
  },

  roleTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 9,
  },

  roleDescription: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },

  radio: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 15,
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

  passwordHint: {
    borderRadius: 14,
    padding: 11,
    marginTop: 2,
  },

  passwordHintText: {
    fontSize: 12,
    lineHeight: 18,
  },

  buttonWrapper: {
    borderRadius: 18,
    marginTop: 16,
  },

  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,

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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },

  loginPrompt: {
    fontSize: 14,
  },

  loginLink: {
    fontSize: 14,
    fontWeight: '900',
  },

  legalText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
});