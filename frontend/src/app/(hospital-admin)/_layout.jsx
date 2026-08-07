/**
 * File: frontend/src/app/(hospital-admin)/_layout.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/navigation/RoleGuard';
import { RoleTabs } from '@/components/navigation/RoleTabs';
export default function HospitalAdminLayout() {
    return (<RoleGuard allowedRoles={['HOSPITAL_ADMIN']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="vaccines" options={{ title: 'Vaccines' }}/>
        <Tabs.Screen name="immunizations" options={{ title: 'Records' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
        <Tabs.Screen name="doctors" options={{ title: 'Doctors' }}/>
        <Tabs.Screen name="parents" options={{ title: 'Parents' }}/>
        <Tabs.Screen name="users" options={{ title: 'Users', href: null }}/>
        <Tabs.Screen name="children" options={{ title: 'Children', href: null }}/>
        <Tabs.Screen name="completed-vaccinations" options={{ title: 'Completed', href: null }}/>
        <Tabs.Screen name="profile" options={{ title: 'Profile' }}/>
        <Tabs.Screen name="settings" options={{ title: 'Settings' }}/>
        <Tabs.Screen name="help" options={{ title: 'Help' }}/>
      </RoleTabs>
    </RoleGuard>);
}
