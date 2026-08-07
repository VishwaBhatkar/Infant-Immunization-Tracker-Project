/**
 * File: frontend/src/constants/themeConstants.js
 * Purpose: Stores shared constant values used across the application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
const shared = {
    radiusSm: 10,
    radiusMd: 16,
    radiusLg: 24,
    spacing: 8
};

export const light = {
    ...shared,
    bg: '#F5F8FC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#142033',
    muted: '#667085',
    primary: '#079C98',
    primaryDark: '#057873',
    primarySoft: '#E6F8F6',
    secondary: '#2AA7C8',
    secondarySoft: '#E4F7F5',
    accent: '#F2A65A',
    accentSoft: '#FFF3E5',
    success: '#168B6A',
    successSoft: '#E8F7F1',
    warning: '#D97706',
    warningSoft: '#FFF4DF',
    danger: '#D64545',
    dangerSoft: '#FDECEC',
    border: '#DCE7EE',
    divider: '#E9EFF4',
    input: '#FBFDFE',
    sidebar: '#0B3C5D',
    sidebarText: '#F8FBFD',
    shadow: '#123047'
};

export const dark = {
    ...shared,
    bg: '#07131E',
    surface: '#0D1D2A',
    card: '#102534',
    text: '#F4F8FB',
    muted: '#9FB3C4',
    primary: '#57C2DA',
    primaryDark: '#9ADDEA',
    primarySoft: '#153A4A',
    secondary: '#62D2C8',
    secondarySoft: '#123C3B',
    accent: '#F6B26B',
    accentSoft: '#432D19',
    success: '#51C9A6',
    successSoft: '#133D34',
    warning: '#F7B955',
    warningSoft: '#403019',
    danger: '#FF7A7A',
    dangerSoft: '#442326',
    border: '#234156',
    divider: '#193244',
    input: '#0C1E2B',
    sidebar: '#061A28',
    sidebarText: '#F8FBFD',
    shadow: '#000000'
};

export const highContrastLight = {
    ...light,
    bg: '#FFFFFF', card: '#FFFFFF', surface: '#FFFFFF', input: '#FFFFFF',
    text: '#000000', muted: '#202020', primary: '#0047AB', primarySoft: '#DCEBFF',
    border: '#000000', divider: '#000000', sidebar: '#000000', sidebarText: '#FFFFFF'
};

export const highContrastDark = {
    ...dark,
    bg: '#000000', card: '#080808', surface: '#000000', input: '#000000',
    text: '#FFFFFF', muted: '#F0F0F0', primary: '#66D9FF', primarySoft: '#002B36',
    border: '#FFFFFF', divider: '#FFFFFF', sidebar: '#000000', sidebarText: '#FFFFFF'
};
