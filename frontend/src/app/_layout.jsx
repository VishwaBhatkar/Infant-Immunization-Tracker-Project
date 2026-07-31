import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastHost } from '@/components/Feedback';
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
            animation: 'none'
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
        <StatusBar style="auto"/>
        <Routes />
        <ToastHost />
      </AppProvider>
    </SafeAreaProvider>);
}
