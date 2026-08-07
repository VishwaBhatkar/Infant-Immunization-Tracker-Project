/**
 * File: frontend/src/utils/roleUtils.js
 * Purpose: Provides reusable helper functions shared across multiple modules.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
export const homeRouteForRole = (role) => {
    switch (role) {
        case 'PARENT':
            return '/(parent)';
        case 'DOCTOR':
            return '/(doctor)';
        case 'HOSPITAL_ADMIN':
            return '/(hospital-admin)';
        case 'SYSTEM_ADMIN':
            return '/(system-admin)';
    }
};
