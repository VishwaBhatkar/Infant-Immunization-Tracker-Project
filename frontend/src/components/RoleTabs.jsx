import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/Feedback';
const icons = {
    index: '⌂', children: '♟', schedule: '✚', vaccines: '✚', appointments: '▣',
    growth: '↗', immunizations: '✓', medical: '♥', users: '♙', profile: '●',
    settings: '⚙', help: '?', notifications: '🔔'
};
/** Left vertical navigation on wide screens and compact bottom navigation on phones. */
export function RoleTabs({ children }) {
    const { width } = useWindowDimensions();
    const { theme, user } = useApp();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const wide = width >= 900;
    const dashboardRoute = user?.role === 'PARENT'
        ? '/(parent)'
        : user?.role === 'DOCTOR'
            ? '/(doctor)'
            : user?.role === 'HOSPITAL_ADMIN'
                ? '/(hospital-admin)'
                : '/(system-admin)';
    return (<Tabs screenOptions={({ route }) => ({
            headerShown: true,
            animation: 'none',
            lazy: true,
            freezeOnBlur: true,
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '800' },
            headerLeft: route.name === 'index' ? undefined : () => (<Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => {
                    showToast('Returning to dashboard', 'info');
                    router.replace(dashboardRoute);
                }} style={({ pressed }) => ({
                    minWidth: 42,
                    minHeight: 42,
                    marginLeft: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primarySoft,
                    opacity: pressed ? 0.65 : 1
                })}>
            <Text style={{ color: theme.primary, fontSize: 25, fontWeight: '800' }}>‹</Text>
          </Pressable>),
            tabBarPosition: wide ? 'left' : 'bottom',
            tabBarStyle: wide
                ? {
                    width: 244,
                    backgroundColor: theme.sidebar,
                    borderRightWidth: 0,
                    // Keep the vertical rail clear of browser/device safe areas.
                    paddingTop: Math.max(24, insets.top),
                    paddingBottom: Math.max(24, insets.bottom)
                }
                : {
                    // Add the home-indicator inset instead of relying on a fixed height.
                    height: (Platform.OS === 'web' ? 68 : 66) + insets.bottom,
                    backgroundColor: theme.card,
                    borderTopColor: theme.border,
                    paddingTop: 7,
                    paddingBottom: Math.max(8, insets.bottom)
                },
            tabBarActiveTintColor: wide ? theme.sidebarText : theme.primary,
            tabBarInactiveTintColor: wide ? '#A9C1D2' : theme.muted,
            tabBarActiveBackgroundColor: wide ? 'rgba(255,255,255,0.12)' : undefined,
            tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
            tabBarIcon: ({ color, focused }) => (<View style={{ width: wide ? 32 : 28, alignItems: 'center' }}>
            <Text style={{ color, fontSize: wide ? 20 : 18, fontWeight: focused ? '900' : '700' }}>
              {icons[route.name] || '•'}
            </Text>
          </View>),
            tabBarLabelStyle: { fontSize: wide ? 15 : 10, fontWeight: '700' },
            tabBarItemStyle: wide
                ? { minHeight: 52, marginHorizontal: 12, marginVertical: 3, borderRadius: 13, paddingHorizontal: 8 }
                : undefined,
            sceneStyle: { backgroundColor: theme.bg }
        })}>
      {children}
    </Tabs>);
}
