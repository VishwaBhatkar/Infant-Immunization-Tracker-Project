import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';
import { RoleTabs } from '@/components/RoleTabs';
export default function HospitalAdminLayout() {
    return (<RoleGuard allowedRoles={['HOSPITAL_ADMIN']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="vaccines" options={{ title: 'Vaccines' }}/>
        <Tabs.Screen name="immunizations" options={{ title: 'Records' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
        <Tabs.Screen name="profile" options={{ title: 'Profile' }}/>
        <Tabs.Screen name="settings" options={{ title: 'Settings' }}/>
        <Tabs.Screen name="help" options={{ title: 'Help' }}/>
      </RoleTabs>
    </RoleGuard>);
}
