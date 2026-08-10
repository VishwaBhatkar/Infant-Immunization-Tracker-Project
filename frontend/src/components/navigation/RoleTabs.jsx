/**
 * File: frontend/src/components/navigation/RoleTabs.jsx
 * Purpose:
 * Provides responsive navigation for Parent, Doctor,
 * Hospital Admin and System Admin layouts.
 *
 * Desktop:
 * - Fixed 252px left sidebar.
 * - Sidebar can scroll vertically.
 * - Main page uses all remaining screen width.
 *
 * Mobile / Tablet:
 * - Bottom navigation.
 * - Navigation items can scroll horizontally.
 *
 * Important:
 * - No API logic is changed.
 * - No authentication logic is changed.
 * - No business logic is changed.
 * - No existing routes are removed.
 */

import React, { useRef } from 'react';

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

import {
    useSafeAreaInsets
} from 'react-native-safe-area-context';

import {
    showToast
} from '@/components/ui/Feedback';


/* ============================================================
   TAB ICONS
   ============================================================ */

const icons = {
    index: [
        'grid-outline',
        'grid'
    ],

    children: [
        'people-outline',
        'people'
    ],

    schedule: [
        'calendar-outline',
        'calendar'
    ],

    schedules: [
        'calendar-number-outline',
        'calendar-number'
    ],

    vaccines: [
        'medical-outline',
        'medical'
    ],

    appointments: [
        'calendar-clear-outline',
        'calendar-clear'
    ],

    assistant: [
        'sparkles-outline',
        'sparkles'
    ],

    growth: [
        'trending-up-outline',
        'trending-up'
    ],

    immunizations: [
        'shield-checkmark-outline',
        'shield-checkmark'
    ],

    'completed-vaccinations': [
        'checkmark-done-circle-outline',
        'checkmark-done-circle'
    ],

    medical: [
        'heart-outline',
        'heart'
    ],

    users: [
        'person-circle-outline',
        'person-circle'
    ],

    parents: [
        'people-circle-outline',
        'people-circle'
    ],

    doctors: [
        'medkit-outline',
        'medkit'
    ],

    hospitals: [
        'business-outline',
        'business'
    ],

    reports: [
        'bar-chart-outline',
        'bar-chart'
    ],

    profile: [
        'person-outline',
        'person'
    ],

    settings: [
        'settings-outline',
        'settings'
    ],

    help: [
        'help-circle-outline',
        'help-circle'
    ],

    notifications: [
        'notifications-outline',
        'notifications'
    ],

    'admin-users': [
        'key-outline',
        'key'
    ]
};


/* ============================================================
   ROUTE LABEL
   ============================================================ */

/**
 * Gets the title displayed inside the navigation.
 */
function routeLabel(route, options) {

    if (typeof options.tabBarLabel === 'string') {
        return options.tabBarLabel;
    }

    if (typeof options.title === 'string') {
        return options.title;
    }

    return route.name
        .split('-')
        .map(
            part =>
                part.charAt(0).toUpperCase() +
                part.slice(1)
        )
        .join(' ');
}


/* ============================================================
   DESKTOP SIDEBAR
   ============================================================ */

/**
 * Desktop sidebar.
 *
 * Important:
 * flexBasis, width, minWidth and maxWidth are all set
 * to 252 so React Navigation / React Native Web cannot
 * stretch the sidebar to half of the browser width.
 */
function WideTabBar({
    state,
    descriptors,
    navigation,
    theme,
    insets
}) {

    return (

        <View
            style={{
                width: 252,
                minWidth: 252,
                maxWidth: 252,
                flexBasis: 252,

                flexGrow: 0,
                flexShrink: 0,

                height: '100%',
                minHeight: 0,

                backgroundColor:
                    theme.sidebar,

                paddingTop:
                    Math.max(
                        12,
                        insets.top
                    )
            }}
        >

            <ScrollView
                style={{
                    flex: 1,
                    minHeight: 0
                }}

                contentContainerStyle={{
                    paddingHorizontal: 8,
                    paddingTop: 8,

                    paddingBottom:
                        Math.max(
                            24,
                            insets.bottom + 16
                        )
                }}

                showsVerticalScrollIndicator={true}

                nestedScrollEnabled={true}

                keyboardShouldPersistTaps="handled"
            >

                {state.routes.map(
                    (route, index) => {

                        const descriptor =
                            descriptors[
                                route.key
                            ];

                        const options =
                            descriptor.options;


                        /*
                         * Routes with href:null
                         * should exist but should
                         * not be visible as tabs.
                         */
                        if (
                            options.href === null ||
                            options.tabBarButton === null
                        ) {
                            return null;
                        }


                        const focused =
                            state.index === index;


                        const names =
                            icons[route.name] || [
                                'ellipse-outline',
                                'ellipse'
                            ];


                        const label =
                            routeLabel(
                                route,
                                options
                            );


                        /* ------------------------
                           TAB PRESS
                           ------------------------ */

                        const onPress = () => {

                            const event =
                                navigation.emit({
                                    type: 'tabPress',

                                    target:
                                        route.key,

                                    canPreventDefault:
                                        true
                                });


                            if (
                                !focused &&
                                !event.defaultPrevented
                            ) {

                                navigation.navigate(
                                    route.name,
                                    route.params
                                );
                            }
                        };


                        /* ------------------------
                           LONG PRESS
                           ------------------------ */

                        const onLongPress = () => {

                            navigation.emit({
                                type: 'tabLongPress',

                                target:
                                    route.key
                            });
                        };


                        return (

                            <Pressable
                                key={route.key}

                                accessibilityRole="button"

                                accessibilityState={
                                    focused
                                        ? {
                                            selected:
                                                true
                                        }
                                        : {}
                                }

                                accessibilityLabel={
                                    options
                                        .tabBarAccessibilityLabel ||
                                    label
                                }

                                onPress={onPress}

                                onLongPress={
                                    onLongPress
                                }

                                style={({
                                    pressed
                                }) => ({

                                    minHeight: 50,

                                    marginHorizontal:
                                        8,

                                    marginVertical:
                                        3,

                                    borderRadius:
                                        14,

                                    paddingHorizontal:
                                        12,

                                    flexDirection:
                                        'row',

                                    alignItems:
                                        'center',

                                    backgroundColor:
                                        focused
                                            ? 'rgba(255,255,255,0.13)'
                                            : pressed
                                                ? 'rgba(255,255,255,0.07)'
                                                : 'transparent',

                                    opacity:
                                        pressed
                                            ? 0.78
                                            : 1
                                })}
                            >

                                {/* ICON */}

                                <View
                                    style={{
                                        width: 36,

                                        alignItems:
                                            'center',

                                        justifyContent:
                                            'center'
                                    }}
                                >

                                    <Ionicons
                                        name={
                                            focused
                                                ? names[1]
                                                : names[0]
                                        }

                                        size={21}

                                        color={
                                            focused
                                                ? theme.sidebarText
                                                : '#A9C1D2'
                                        }
                                    />

                                </View>


                                {/* LABEL */}

                                <Text
                                    numberOfLines={1}

                                    style={{
                                        flex: 1,

                                        marginLeft:
                                            4,

                                        fontSize:
                                            15,

                                        fontWeight:
                                            '800',

                                        color:
                                            focused
                                                ? theme.sidebarText
                                                : '#A9C1D2'
                                    }}
                                >

                                    {label}

                                </Text>

                            </Pressable>
                        );
                    }
                )}

            </ScrollView>

        </View>
    );
}


/* ============================================================
   MOBILE HORIZONTAL TAB BAR
   ============================================================ */

/**
 * Mobile navigation.
 *
 * This replaces React Navigation's default BottomTabBar
 * because the application contains more tabs than can fit
 * on a normal phone screen.
 *
 * All routes remain available and the user can swipe
 * horizontally through navigation items.
 */
function MobileTabBar({
    state,
    descriptors,
    navigation,
    theme,
    insets
}) {

    const scrollRef =
        useRef(null);


    return (

        <View
            style={{
                width: '100%',

                flexGrow: 0,
                flexShrink: 0,

                backgroundColor:
                    theme.card,

                borderTopWidth:
                    1,

                borderTopColor:
                    theme.border,

                paddingBottom:
                    Math.max(
                        4,
                        insets.bottom
                    ),

                ...(Platform.OS === 'web'
                    ? {
                        boxShadow:
                            '0 -4px 14px rgba(15, 23, 42, 0.10)'
                    }

                    : Platform.OS === 'ios'

                        ? {
                            shadowColor:
                                theme.shadow,

                            shadowOpacity:
                                0.1,

                            shadowRadius:
                                14,

                            shadowOffset: {
                                width: 0,
                                height: -4
                            }
                        }

                        : {
                            elevation:
                                10
                        })
            }}
        >

            <ScrollView
                ref={scrollRef}

                horizontal={true}

                showsHorizontalScrollIndicator={
                    false
                }

                nestedScrollEnabled={true}

                keyboardShouldPersistTaps="handled"

                contentContainerStyle={{
                    flexGrow: 0,

                    alignItems:
                        'center',

                    paddingHorizontal:
                        6,

                    paddingTop:
                        5
                }}
            >

                {state.routes.map(
                    (route, index) => {

                        const descriptor =
                            descriptors[
                                route.key
                            ];

                        const options =
                            descriptor.options;


                        /*
                         * Hidden screens remain available
                         * through navigation but do not
                         * appear inside the tab bar.
                         */
                        if (
                            options.href === null ||
                            options.tabBarButton === null
                        ) {
                            return null;
                        }


                        const focused =
                            state.index === index;


                        const names =
                            icons[route.name] || [
                                'ellipse-outline',
                                'ellipse'
                            ];


                        const label =
                            routeLabel(
                                route,
                                options
                            );


                        const onPress = () => {

                            const event =
                                navigation.emit({
                                    type:
                                        'tabPress',

                                    target:
                                        route.key,

                                    canPreventDefault:
                                        true
                                });


                            if (
                                !focused &&
                                !event
                                    .defaultPrevented
                            ) {

                                navigation.navigate(
                                    route.name,
                                    route.params
                                );
                            }
                        };


                        const onLongPress =
                            () => {

                                navigation.emit({
                                    type:
                                        'tabLongPress',

                                    target:
                                        route.key
                                });
                            };


                        return (

                            <Pressable
                                key={route.key}

                                accessibilityRole="button"

                                accessibilityState={
                                    focused
                                        ? {
                                            selected:
                                                true
                                        }
                                        : {}
                                }

                                accessibilityLabel={
                                    options
                                        .tabBarAccessibilityLabel ||
                                    label
                                }

                                onPress={
                                    onPress
                                }

                                onLongPress={
                                    onLongPress
                                }

                                style={({
                                    pressed
                                }) => ({

                                    width:
                                        82,

                                    minWidth:
                                        82,

                                    maxWidth:
                                        82,

                                    height:
                                        60,

                                    flexGrow:
                                        0,

                                    flexShrink:
                                        0,

                                    paddingHorizontal:
                                        4,

                                    justifyContent:
                                        'center',

                                    alignItems:
                                        'center',

                                    opacity:
                                        pressed
                                            ? 0.65
                                            : 1
                                })}
                            >

                                {/* ICON */}

                                <Ionicons
                                    name={
                                        focused
                                            ? names[1]
                                            : names[0]
                                    }

                                    size={21}

                                    color={
                                        focused
                                            ? theme.primary
                                            : theme.muted
                                    }
                                />


                                {/* LABEL */}

                                <Text
                                    numberOfLines={1}

                                    ellipsizeMode="tail"

                                    style={{
                                        width:
                                            '100%',

                                        marginTop:
                                            3,

                                        paddingHorizontal:
                                            2,

                                        textAlign:
                                            'center',

                                        fontSize:
                                            10,

                                        fontWeight:
                                            '800',

                                        color:
                                            focused
                                                ? theme.primary
                                                : theme.muted
                                    }}
                                >

                                    {label}

                                </Text>

                            </Pressable>
                        );
                    }
                )}

            </ScrollView>

        </View>
    );
}


/* ============================================================
   MAIN ROLE TABS
   ============================================================ */

export function RoleTabs({
    children
}) {

    const { width } =
        useWindowDimensions();


    const {
        theme,
        user
    } = useApp();


    const insets =
        useSafeAreaInsets();


    const router =
        useRouter();


    /*
     * Desktop starts at 900px.
     *
     * >= 900:
     * left sidebar
     *
     * < 900:
     * horizontal bottom navigation
     */
    const wide =
        width >= 900;


    /* ========================================================
       ROLE DASHBOARD ROUTE
       ======================================================== */

    const dashboardRoute =
        user?.role === 'PARENT'

            ? '/(parent)'

            : user?.role === 'DOCTOR'

                ? '/(doctor)'

                : user?.role ===
                    'HOSPITAL_ADMIN'

                    ? '/(hospital-admin)'

                    : '/(system-admin)';


    return (

        <Tabs

            /* =================================================
               CUSTOM RESPONSIVE TAB BAR
               ================================================= */

            tabBar={(props) =>

                wide ? (

                    <WideTabBar
                        {...props}

                        theme={
                            theme
                        }

                        insets={
                            insets
                        }
                    />

                ) : (

                    <MobileTabBar
                        {...props}

                        theme={
                            theme
                        }

                        insets={
                            insets
                        }
                    />
                )
            }


            /* =================================================
               SCREEN OPTIONS
               ================================================= */

            screenOptions={({
                route
            }) => ({

                /* -----------------------------
                   HEADER
                   ----------------------------- */

                headerShown:
                    true,

                headerStyle: {
                    backgroundColor:
                        theme.card
                },

                headerTintColor:
                    theme.text,

                headerShadowVisible:
                    false,

                headerTitleStyle: {
                    fontWeight:
                        '900',

                    fontSize:
                        18
                },


                /* -----------------------------
                   NAVIGATION ANIMATION
                   ----------------------------- */

                animation:
                    'fade',

                lazy:
                    true,

                freezeOnBlur:
                    true,

                tabBarHideOnKeyboard:
                    true,


                /* =================================================
                   IMPORTANT DESKTOP FIX
                   =================================================

                   Keep React Navigation in "left" mode on desktop.

                   The explicit width/minWidth/maxWidth/flexBasis below
                   prevents React Navigation Web from allowing the tab
                   area to grow to approximately 50% of the screen.
                */

                tabBarPosition:
                    wide
                        ? 'left'
                        : 'bottom',


                tabBarStyle:
                    wide
                        ? {
                            width:
                                252,

                            minWidth:
                                252,

                            maxWidth:
                                252,

                            flexBasis:
                                252,

                            flexGrow:
                                0,

                            flexShrink:
                                0,

                            height:
                                '100%',

                            backgroundColor:
                                theme.sidebar,

                            borderRightWidth:
                                0,

                            borderTopWidth:
                                0
                        }

                        : {
                            width:
                                '100%',

                            backgroundColor:
                                theme.card,

                            borderTopColor:
                                theme.border,

                            borderTopWidth:
                                1
                        },


                /* -----------------------------
                   TAB COLORS
                   ----------------------------- */

                tabBarActiveTintColor:
                    wide
                        ? theme.sidebarText
                        : theme.primary,


                tabBarInactiveTintColor:
                    wide
                        ? '#A9C1D2'
                        : theme.muted,


                tabBarActiveBackgroundColor:
                    wide
                        ? 'rgba(255,255,255,0.13)'
                        : undefined,


                tabBarLabelPosition:
                    wide
                        ? 'beside-icon'
                        : 'below-icon',


                /* =================================================
                   HEADER BACK BUTTON
                   ================================================= */

                headerLeft:
                    route.name === 'index'

                        ? undefined

                        : () => (

                            <Pressable

                                accessibilityRole="button"

                                accessibilityLabel="Back to dashboard"

                                onPress={() => {

                                    showToast(
                                        'Returning to dashboard',
                                        'info'
                                    );

                                    router.replace(
                                        dashboardRoute
                                    );
                                }}

                                style={({
                                    pressed
                                }) => ({

                                    width:
                                        42,

                                    height:
                                        42,

                                    marginLeft:
                                        10,

                                    borderRadius:
                                        14,

                                    alignItems:
                                        'center',

                                    justifyContent:
                                        'center',

                                    backgroundColor:
                                        theme.primarySoft,

                                    opacity:
                                        pressed
                                            ? 0.65
                                            : 1,

                                    transform: [
                                        {
                                            scale:
                                                pressed
                                                    ? 0.96
                                                    : 1
                                        }
                                    ]
                                })}
                            >

                                <Ionicons
                                    name="arrow-back"

                                    size={21}

                                    color={
                                        theme.primary
                                    }
                                />

                            </Pressable>
                        ),


                /* =================================================
                   SCENE / PAGE CONTENT
                   =================================================

                   minWidth: 0 is especially important on web.

                   Do NOT use:
                       height: '100%'
                       overflow: 'hidden'

                   here because it can constrain or clip responsive
                   pages and nested ScrollViews.
                */

                sceneStyle: {
                    flex:
                        1,

                    minWidth:
                        0,

                    minHeight:
                        0,

                    backgroundColor:
                        theme.bg
                }
            })}
        >

            {children}

        </Tabs>
    );
}