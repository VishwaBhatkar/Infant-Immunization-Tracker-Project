/**
 * File: frontend/src/components/navigation/RoleTabs.jsx
 * Purpose: Defines a reusable React Native component used by screens or layouts.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React from 'react';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import {
    Platform,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/ui/Feedback';

const icons = {
    index: ['grid-outline', 'grid'],
    children: ['people-outline', 'people'],
    schedule: ['calendar-outline', 'calendar'],
    schedules: ['calendar-number-outline', 'calendar-number'],
    vaccines: ['medical-outline', 'medical'],
    appointments: ['calendar-clear-outline', 'calendar-clear'],
    assistant: ['sparkles-outline', 'sparkles'],
    growth: ['trending-up-outline', 'trending-up'],
    immunizations: ['shield-checkmark-outline', 'shield-checkmark'],
    'completed-vaccinations': ['checkmark-done-circle-outline', 'checkmark-done-circle'],
    medical: ['heart-outline', 'heart'],
    users: ['person-circle-outline', 'person-circle'],
    parents: ['people-circle-outline', 'people-circle'],
    doctors: ['medkit-outline', 'medkit'],
    hospitals: ['business-outline', 'business'],
    reports: ['bar-chart-outline', 'bar-chart'],
    profile: ['person-outline', 'person'],
    settings: ['settings-outline', 'settings'],
    help: ['help-circle-outline', 'help-circle'],
    notifications: ['notifications-outline', 'notifications'],
    'admin-users': ['key-outline', 'key']
};

function routeLabel(route, options) {
    if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
    if (typeof options.title === 'string') return options.title;

    return route.name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Scrollable desktop sidebar.
 *
 * React Navigation's default left tab bar has a fixed height and clips menu
 * items on short laptop screens. Wrapping the routes in this ScrollView keeps
 * every item reachable without scrolling the page content on the right.
 */
function WideTabBar({ state, descriptors, navigation, theme, insets }) {
    return (
        <View
            style={{
                width: 252,
                height: '100%',
                minHeight: 0,
                backgroundColor: theme.sidebar,
                paddingTop: Math.max(12, insets.top)
            }}
        >
            <ScrollView
                style={{ flex: 1, minHeight: 0 }}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 8,
                    paddingTop: 8,
                    paddingBottom: Math.max(24, insets.bottom + 16)
                }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
            >
                {state.routes.map((route, index) => {
                    const descriptor = descriptors[route.key];
                    const options = descriptor.options;

                    // Expo Router uses href: null for screens that must not be
                    // displayed in navigation.
                    if (options.href === null || options.tabBarButton === null) {
                        return null;
                    }

                    const focused = state.index === index;
                    const names = icons[route.name] || ['ellipse-outline', 'ellipse'];
                    const label = routeLabel(route, options);

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true
                        });

                        if (!focused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({ type: 'tabLongPress', target: route.key });
                    };

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={focused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel || label}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={({ pressed }) => ({
                                minHeight: 50,
                                marginHorizontal: 8,
                                marginVertical: 3,
                                borderRadius: 14,
                                paddingHorizontal: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: focused
                                    ? 'rgba(255,255,255,0.13)'
                                    : pressed
                                        ? 'rgba(255,255,255,0.07)'
                                        : 'transparent',
                                opacity: pressed ? 0.78 : 1
                            })}
                        >
                            <View
                                style={{
                                    width: 36,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Ionicons
                                    name={focused ? names[1] : names[0]}
                                    size={21}
                                    color={focused ? theme.sidebarText : '#A9C1D2'}
                                />
                            </View>

                            <Text
                                numberOfLines={1}
                                style={{
                                    flex: 1,
                                    marginLeft: 4,
                                    fontSize: 15,
                                    fontWeight: '800',
                                    color: focused ? theme.sidebarText : '#A9C1D2'
                                }}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

/** Responsive role navigation: scrollable left rail on desktop and bottom tabs on phones. */
export function RoleTabs({ children }) {
    const { width } = useWindowDimensions();
    const { theme, user } = useApp();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const wide = width >= 900;

    const dashboardRoute = user?.role === 'PARENT'
        ? '/(parent)'
        : user?.role === 'DOCTOR'
            ? '/(doctor)'
            : user?.role === 'HOSPITAL_ADMIN'
                ? '/(hospital-admin)'
                : '/(system-admin)';

    return (
        <Tabs
            tabBar={(props) => wide
                ? <WideTabBar {...props} theme={theme} insets={insets} />
                : <BottomTabBar {...props} />}
            screenOptions={({ route }) => ({
                headerShown: true,
                animation: 'fade',
                lazy: true,
                freezeOnBlur: true,
                tabBarHideOnKeyboard: true,
                headerStyle: { backgroundColor: theme.card },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '900', fontSize: 18 },
                headerLeft: route.name === 'index' ? undefined : () => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Back to dashboard"
                        onPress={() => {
                            showToast('Returning to dashboard', 'info');
                            router.replace(dashboardRoute);
                        }}
                        style={({ pressed }) => ({
                            width: 42,
                            height: 42,
                            marginLeft: 10,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: theme.primarySoft,
                            opacity: pressed ? 0.65 : 1,
                            transform: [{ scale: pressed ? 0.96 : 1 }]
                        })}
                    >
                        <Ionicons name="arrow-back" size={21} color={theme.primary} />
                    </Pressable>
                ),
                tabBarPosition: wide ? 'left' : 'bottom',
                tabBarStyle: wide
                    ? {
                        width: 252,
                        height: '100%',
                        backgroundColor: theme.sidebar,
                        borderRightWidth: 0
                    }
                    : {
                        height: (Platform.OS === 'web' ? 70 : 68) + insets.bottom,
                        backgroundColor: theme.card,
                        borderTopColor: theme.border,
                        borderTopWidth: 1,
                        paddingTop: 7,
                        paddingBottom: Math.max(8, insets.bottom),
                        ...(Platform.OS === 'web'
                            ? { boxShadow: '0 -4px 14px rgba(15, 23, 42, 0.10)' }
                            : Platform.OS === 'ios'
                                ? { shadowColor: theme.shadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: -4 } }
                                : { elevation: 10 })
                    },
                tabBarActiveTintColor: wide ? theme.sidebarText : theme.primary,
                tabBarInactiveTintColor: wide ? '#A9C1D2' : theme.muted,
                tabBarActiveBackgroundColor: wide ? 'rgba(255,255,255,0.13)' : undefined,
                tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
                tabBarIcon: ({ color, focused }) => {
                    const names = icons[route.name] || ['ellipse-outline', 'ellipse'];
                    return (
                        <View style={{ width: wide ? 34 : 30, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={focused ? names[1] : names[0]} size={wide ? 21 : 20} color={color} />
                        </View>
                    );
                },
                tabBarLabelStyle: { fontSize: wide ? 15 : 10, fontWeight: '800' },
                tabBarItemStyle: wide
                    ? { minHeight: 50, marginHorizontal: 8, marginVertical: 3, borderRadius: 15, paddingHorizontal: 10 }
                    : { minWidth: 64 },
                sceneStyle: {
                    flex: 1,
                    minHeight: 0,
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: theme.bg
                }
            })}
        >
            {children}
        </Tabs>
    );
}
