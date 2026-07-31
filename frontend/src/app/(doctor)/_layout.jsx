import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';
import { RoleTabs } from '@/components/RoleTabs';
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
