/**
 * File: frontend/src/app/_layout.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { GlobalLoadingOverlay, ToastHost } from '@/components/ui/Feedback';
function Routes() {
    const { user, loading, theme } = useApp();
    if (loading) {
        return (<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator />
      </View>);
    }
    return (<Stack screenOptions={{
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.text,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'fade_from_bottom'
        }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }}/>
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'PARENT'}>
        <Stack.Screen name="(parent)" options={{ headerShown: false }}/>
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'DOCTOR'}>
        <Stack.Screen name="(doctor)" options={{ headerShown: false }}/>
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'HOSPITAL_ADMIN'}>
        <Stack.Screen name="(hospital-admin)" options={{ headerShown: false }}/>
      </Stack.Protected>

      <Stack.Protected guard={user?.role === 'SYSTEM_ADMIN'}>
        <Stack.Screen name="(system-admin)" options={{ headerShown: false }}/>
      </Stack.Protected>
    </Stack>);
}
export default function RootLayout() {
    return (
    // SafeAreaProvider must wrap the complete navigation tree so every screen,
    // header, tab bar and overlay can read the same device inset values.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <View style={{ flex: 1, width: '100%', minWidth: 0, overflow: 'hidden', ...(Platform.OS === 'web' ? { maxWidth: '100vw' } : {}) }}>
          <StatusBar style="auto"/>
          <Routes />
          <GlobalLoadingOverlay />
          <ToastHost />
        </View>
      </AppProvider>
    </SafeAreaProvider>);
}
