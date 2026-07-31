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
