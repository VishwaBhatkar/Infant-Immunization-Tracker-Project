/**
 * File: frontend/src/app/(auth)/_layout.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Stack } from 'expo-router';
/** Authentication navigator. Keeping this group explicit prevents route remount loops. */
export default function AuthLayout() {
    return (<Stack screenOptions={{
            headerShown: false,
            animation: 'none'
        }}>
      <Stack.Screen name="login"/>
      <Stack.Screen name="register"/>
    </Stack>);
}
