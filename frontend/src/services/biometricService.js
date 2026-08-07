/**
 * File: frontend/src/services/biometricService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Platform } from 'react-native';
import { authStorage } from '@/storage/authSessionStorage';

export async function biometricAvailable() {
  if (Platform.OS === 'web') return { available: false, reason: 'Biometric login is available only on Android and iOS.' };
  try {
    const LocalAuthentication = await import('expo-local-authentication');
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return { available: hardware && enrolled, reason: !hardware ? 'This device has no biometric sensor.' : !enrolled ? 'No fingerprint or face is enrolled.' : null };
  } catch {
    return { available: false, reason: 'Install expo-local-authentication and rebuild the app.' };
  }
}

export async function authenticateBiometric() {
  const LocalAuthentication = await import('expo-local-authentication');
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to ChildCare',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
}

export async function saveBiometricSession(token) {
  await authStorage.setBiometricToken(token);
}
export async function removeBiometricSession() {
  await authStorage.removeBiometricToken();
}
export async function getBiometricSession() {
  return authStorage.getBiometricToken();
}
