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
