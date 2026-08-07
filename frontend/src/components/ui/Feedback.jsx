/**
 * File: frontend/src/components/ui/Feedback.jsx
 * Purpose: Defines a reusable React Native component used by screens or layouts.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { subscribeToRequestActivity } from '@/services/requestActivityService';
export { showToast } from '@/utils/toastUtils';

export function ToastHost() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const common = { text1NumberOfLines: 2, text2NumberOfLines: 4, text1Style: { fontSize: 15, fontWeight: '800', color: theme.text }, text2Style: { fontSize: 13, lineHeight: 18, color: theme.muted }, contentContainerStyle: { paddingHorizontal: 14 }, style: { minHeight: 64, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border } };
  const config = {
    success: (props) => <BaseToast {...props} {...common} style={[common.style, { borderLeftWidth: 6, borderLeftColor: '#16A34A' }]} />,
    error: (props) => <ErrorToast {...props} {...common} style={[common.style, { borderLeftWidth: 6, borderLeftColor: '#DC2626' }]} />,
    warning: (props) => <BaseToast {...props} {...common} style={[common.style, { borderLeftWidth: 6, borderLeftColor: '#F59E0B' }]} />,
    info: (props) => <BaseToast {...props} {...common} style={[common.style, { borderLeftWidth: 6, borderLeftColor: '#2563EB' }]} />,
  };
  return <Toast config={config} topOffset={Math.max(insets.top, 8) + 8} />;
}

export function GlobalLoadingOverlay() {
  const { theme } = useApp();
  const [visible, setVisible] = useState(false);
  useEffect(() => subscribeToRequestActivity(setVisible), []);
  if (!visible) return null;
  return <View style={styles.loadingHost}><View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.text }}>Please wait…</Text></View></View>;
}
const styles = StyleSheet.create({
  loadingHost: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
    pointerEvents: 'none',
  },
  loadingCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)' },
      android: { elevation: 8 },
      default: {},
    }),
  },
});
