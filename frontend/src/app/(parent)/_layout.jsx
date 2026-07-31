import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';
import { RoleTabs } from '@/components/RoleTabs';
export default function ParentLayout() {
    return (<RoleGuard allowedRoles={['PARENT']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="children" options={{ title: 'Children' }}/>
        <Tabs.Screen name="schedule" options={{ title: 'Vaccines' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
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
