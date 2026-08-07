/**
 * File: frontend/src/app/(doctor)/_layout.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/navigation/RoleGuard';
import { RoleTabs } from '@/components/navigation/RoleTabs';
export default function DoctorLayout() {
    return (<RoleGuard allowedRoles={['DOCTOR']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
        <Tabs.Screen name="immunizations" options={{ title: 'Vaccinations' }}/>
        <Tabs.Screen name="profile" options={{ title: 'Profile' }}/>
        <Tabs.Screen name="settings" options={{ title: 'Settings' }}/>
        <Tabs.Screen name="help" options={{ title: 'Help' }}/>
      </RoleTabs>
    </RoleGuard>);
}
