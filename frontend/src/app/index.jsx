/**
 * File: frontend/src/app/index.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { homeRouteForRole } from '@/utils/roleUtils';
export default function Index() {
    const { user } = useApp();
    return <Redirect href={user ? homeRouteForRole(user.role) : '/(auth)/login'}/>;
}
