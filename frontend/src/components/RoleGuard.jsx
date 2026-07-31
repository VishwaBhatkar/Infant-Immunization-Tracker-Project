import React from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { homeRouteForRole } from '@/utils/roles';
export function RoleGuard({ allowedRoles, children }) {
    const { user } = useApp();
    if (!user)
        return <Redirect href="/(auth)/login"/>;
    if (!allowedRoles.includes(user.role)) {
        return <Redirect href={homeRouteForRole(user.role)}/>;
    }
    return <>{children}</>;
}
