import { Tabs } from 'expo-router';
import { RoleGuard } from '@/components/RoleGuard';
import { RoleTabs } from '@/components/RoleTabs';
export default function SystemAdminLayout() {
    return (<RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
      <RoleTabs>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }}/>
        <Tabs.Screen name="users" options={{ title: 'Users' }}/>
        <Tabs.Screen name="doctors" options={{ title: 'Doctors' }}/>
        <Tabs.Screen name="hospitals" options={{ title: 'Hospitals' }}/>
        <Tabs.Screen name="children" options={{ title: 'Children' }}/>
        <Tabs.Screen name="vaccines" options={{ title: 'Vaccines' }}/>
        <Tabs.Screen name="immunizations" options={{ title: 'Records' }}/>
        <Tabs.Screen name="appointments" options={{ title: 'Appointments' }}/>
        <Tabs.Screen name="notifications" options={{ title: 'Notifications' }}/>
        <Tabs.Screen name="reports" options={{ title: 'Reports' }}/>
        <Tabs.Screen name="admin-users" options={{ title: 'Admin Users' }}/>
        <Tabs.Screen name="profile" options={{ title: 'Profile' }}/>
        <Tabs.Screen name="settings" options={{ title: 'Settings' }}/>
        <Tabs.Screen name="help" options={{ title: 'Help' }}/>
      </RoleTabs>
    </RoleGuard>);
}
