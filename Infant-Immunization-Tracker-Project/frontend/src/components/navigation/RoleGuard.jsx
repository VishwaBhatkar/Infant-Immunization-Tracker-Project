/**
 * File: frontend/src/components/navigation/RoleGuard.jsx
 * Purpose: Defines a reusable React Native component used by screens or layouts.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { homeRouteForRole } from '@/utils/roleUtils';
export function RoleGuard({ allowedRoles, children }) {
    const { user } = useApp();
    if (!user)
        return <Redirect href="/(auth)/login"/>;
    if (!allowedRoles.includes(user.role)) {
        return <Redirect href={homeRouteForRole(user.role)}/>;
    }
    return <>{children}</>;
}
