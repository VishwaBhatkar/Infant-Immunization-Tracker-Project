/**
 * File: frontend/src/app/(parent)/_layout.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/navigation/RoleGuard';
import { RoleTabs } from '@/components/navigation/RoleTabs';
export default function ParentLayout() {
    return (<RoleGuard allowedRoles={['PARENT']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="children" options={{ title: 'Children' }}/>
        <Tabs.Screen name="schedule" options={{ title: 'Vaccines' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
        <Tabs.Screen name="assistant" options={{ title: 'AI Assistant' }}/>
        <Tabs.Screen name="growth" options={{ title: 'Growth' }}/>
        <Tabs.Screen name="immunizations" options={{ title: 'Records' }}/>
        <Tabs.Screen name="medical" options={{ title: 'Medical' }}/>
        <Tabs.Screen name="profile" options={{ title: 'Profile' }}/>
        <Tabs.Screen name="settings" options={{ title: 'Settings' }}/>
        <Tabs.Screen name="help" options={{ title: 'Help' }}/>
        <Tabs.Screen name="notifications" options={{ title: 'Notifications', href: null }}/>
      </RoleTabs>
    </RoleGuard>);
}
