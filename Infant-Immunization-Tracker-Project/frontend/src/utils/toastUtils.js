/**
 * File: frontend/src/utils/toastUtils.js
 * Purpose: Provides reusable helper functions shared across multiple modules.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import Toast from 'react-native-toast-message';

const DEFAULT_VISIBILITY_TIME = 3000;

export const toast = {
  success: (message, title = 'Success') => Toast.show({ type: 'success', text1: title, text2: message, position: 'top', visibilityTime: DEFAULT_VISIBILITY_TIME, topOffset: 12 }),
  error: (message, title = 'Error') => Toast.show({ type: 'error', text1: title, text2: message, position: 'top', visibilityTime: DEFAULT_VISIBILITY_TIME, topOffset: 12 }),
  warning: (message, title = 'Warning') => Toast.show({ type: 'warning', text1: title, text2: message, position: 'top', visibilityTime: DEFAULT_VISIBILITY_TIME, topOffset: 12 }),
  info: (message, title = 'Information') => Toast.show({ type: 'info', text1: title, text2: message, position: 'top', visibilityTime: DEFAULT_VISIBILITY_TIME, topOffset: 12 }),
  hide: () => Toast.hide(),
};

export function showToast(message, kind = 'success', title) {
  const method = toast[kind] || toast.info;
  method(message, title);
}

export function getErrorMessage(error) {
  if (error?.errors?.length) return error.errors.map(({ field, message }) => field ? `${field}: ${message}` : message).join('\n');
  return error?.message || 'Something went wrong. Please try again.';
}
