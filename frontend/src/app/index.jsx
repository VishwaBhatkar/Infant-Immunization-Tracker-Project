import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { homeRouteForRole } from '@/utils/roles';
export default function Index() {
    const { user } = useApp();
    return <Redirect href={user ? homeRouteForRole(user.role) : '/(auth)/login'}/>;
}
