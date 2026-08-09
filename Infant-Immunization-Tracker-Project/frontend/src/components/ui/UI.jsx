/**
 * File: frontend/src/components/ui/UI.jsx
 * Purpose: Defines a reusable React Native component used by screens or layouts.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    Image,
    Alert,
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/services/apiService';
import { getErrorMessage, toast } from '@/utils/toastUtils';

const buttonIcons = [
    [/delete|remove/i, 'trash-outline'],
    [/cancel/i, 'close-circle-outline'],
    [/save|update|submit|confirm/i, 'checkmark-circle-outline'],
    [/add|create|new|book/i, 'add-circle-outline'],
    [/edit/i, 'create-outline'],
    [/view|details/i, 'eye-outline'],
    [/retry|refresh/i, 'refresh-outline'],
    [/login|sign in/i, 'log-in-outline'],
    [/logout|sign out/i, 'log-out-outline'],
    [/search/i, 'search-outline'],
    [/back/i, 'arrow-back-outline']
];

const inputIcons = [
    [/email/i, 'mail-outline'],
    [/phone|mobile/i, 'call-outline'],
    [/password/i, 'lock-closed-outline'],
    [/date/i, 'calendar-outline'],
    [/time/i, 'time-outline'],
    [/name/i, 'person-outline'],
    [/address/i, 'location-outline'],
    [/weight/i, 'scale-outline'],
    [/height/i, 'resize-outline']
];

function inferIcon(value, rules, fallback) {
    return rules.find(([pattern]) => pattern.test(value || ''))?.[1] || fallback;
}

export const Screen = ({ children, edges = ['left', 'right', 'bottom'], style }) => {
    const { theme } = useApp();
    const { width } = useWindowDimensions();
    const responsivePadding = width < 360 ? 10 : width < 600 ? 14 : 20;
    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg, paddingHorizontal: responsivePadding }, style]} edges={edges}>
            {children}
        </SafeAreaView>
    );
};

export const Card = ({ children, style, animated = true, accessibilityLabel }) => {
    const { theme } = useApp();
    const progress = useRef(new Animated.Value(animated ? 0 : 1)).current;

    useEffect(() => {
        if (!animated) return;
        Animated.timing(progress, {
            toValue: 1,
            duration: 280,
            useNativeDriver: Platform.OS !== 'web'
        }).start();
    }, [animated, progress]);

    const animationStyle = animated ? {
        opacity: progress,
        transform: [{
            translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
        }]
    } : null;

    return (
        <Animated.View
            accessibilityLabel={accessibilityLabel}
            style={[
                styles.card,
                {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    ...(Platform.OS === 'web'
                        ? { boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)' }
                        : Platform.OS === 'ios'
                            ? { shadowColor: theme.shadow }
                            : {})
                },
                animationStyle,
                style
            ]}
        >
            {children}
        </Animated.View>
    );
};

export const Btn = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    compact = false,
    style,
    icon,
    accessibilityLabel
}) => {
    const { theme } = useApp();
    const scale = useRef(new Animated.Value(1)).current;
    const unavailable = loading || disabled;
    const palette = useMemo(() => ({
        primary: { backgroundColor: theme.primary, borderColor: theme.primary, textColor: '#FFFFFF' },
        secondary: { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft, textColor: theme.primary },
        outline: { backgroundColor: 'transparent', borderColor: theme.border, textColor: theme.text },
        danger: { backgroundColor: theme.danger, borderColor: theme.danger, textColor: '#FFFFFF' }
    }[variant] || {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
        textColor: '#FFFFFF'
    }), [theme, variant]);
    const iconName = icon || inferIcon(title, buttonIcons, 'arrow-forward-circle-outline');

    const animateScale = (toValue) => Animated.spring(scale, {
        toValue,
        speed: 40,
        bounciness: 2,
        useNativeDriver: Platform.OS !== 'web'
    }).start();

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <Pressable
                onPress={() => void onPress?.()}
                onPressIn={() => animateScale(0.975)}
                onPressOut={() => animateScale(1)}
                disabled={unavailable}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel || title}
                accessibilityState={{ disabled: unavailable, busy: loading }}
                style={({ pressed }) => [
                    styles.btn,
                    compact && styles.btnCompact,
                    {
                        backgroundColor: palette.backgroundColor,
                        borderColor: palette.borderColor,
                        opacity: unavailable ? 0.48 : pressed ? 0.9 : 1,
                        ...(Platform.OS === 'web'
                            ? { boxShadow: '0 4px 10px rgba(15, 23, 42, 0.12)' }
                            : Platform.OS === 'ios'
                                ? { shadowColor: theme.shadow }
                                : {})
                    }
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={palette.textColor} />
                ) : (
                    <View style={styles.buttonContent}>
                        <Ionicons name={iconName} size={compact ? 17 : 19} color={palette.textColor} />
                        <Text numberOfLines={1} style={[styles.buttonText, compact && styles.buttonTextCompact, { color: palette.textColor }]}>
                            {title}
                        </Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

export const Input = ({ label, style, containerStyle, icon, ...props }) => {
    const { theme } = useApp();
    const iconName = icon || inferIcon(label || props.placeholder, inputIcons, 'document-text-outline');
    return (
        <View style={containerStyle}>
            {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
            <View style={[styles.inputShell, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Ionicons name={iconName} size={19} color={theme.muted} style={styles.inputIcon} />
                <TextInput
                    placeholderTextColor={theme.muted}
                    accessibilityLabel={props.accessibilityLabel || label || props.placeholder}
                    {...props}
                    style={[styles.input, { color: theme.text }, style]}
                />
            </View>
        </View>
    );
};

export const SectionHeader = ({ title, subtitle, icon = 'sparkles-outline', action }) => {
    const { theme } = useApp();
    return (
        <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name={icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.sectionText}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
                {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
            </View>
            {action}
        </View>
    );
};

export const EmptyState = ({ title = 'No data available', message = 'New information will appear here.', icon = 'file-tray-outline', imageSource, imageLabel }) => {
    const { theme } = useApp();
    return (
        <Card style={styles.emptyCard}>
            {imageSource ? <Image source={imageSource} resizeMode="contain" accessibilityLabel={imageLabel || title} style={styles.emptyImage} /> : null}
            <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name={icon} size={30} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.emptyMessage, { color: theme.muted }]}>{message}</Text>
        </Card>
    );
};

export const showError = (error) => {
    const message = getErrorMessage(error);
    if (error instanceof ApiError) {
        if (error.status === 401) return toast.error('Your session has expired. Please sign in again.', 'Session expired');
        if (error.status === 403) return toast.error(message, 'Access denied');
        if (error.status === 408) return toast.warning(message, 'Request timeout');
        if (error.status >= 500) return toast.error(message, 'Server error');
        if (error.errors?.length) return toast.warning(message, 'Check your information');
    }
    toast.error(message, 'Unable to continue');
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: 1600,
        alignSelf: 'center',
        paddingHorizontal: 20,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? { boxSizing: 'border-box', overflowX: 'hidden' } : {})
    },
    card: {
        width: '100%',
        minWidth: 0,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
        ...Platform.select({
            ios: { shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 3 },
            default: {}
        })
    },
    btn: {
        minHeight: 52,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingHorizontal: 18,
        ...Platform.select({
            ios: { shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 3 },
            default: {}
        })
    },
    btnCompact: { minHeight: 42, marginTop: 0, borderRadius: 13, paddingHorizontal: 14 },
    buttonContent: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    buttonText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.1 },
    buttonTextCompact: { fontSize: 14 },
    label: { fontWeight: '700', marginBottom: 7, fontSize: 14 },
    inputShell: {
        width: '100%',
        minWidth: 0,
        minHeight: 52,
        borderWidth: 1,
        borderRadius: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center'
    },
    inputIcon: { marginLeft: 14 },
    input: { flex: 1, minHeight: 50, paddingHorizontal: 11, paddingVertical: 10, fontSize: 15 },
    sectionHeader: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 },
    sectionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sectionText: { flex: 1, marginLeft: 11 },
    sectionTitle: { fontSize: 20, fontWeight: '900' },
    sectionSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 18 },
    emptyCard: { alignItems: 'center', paddingVertical: 28 },
    emptyImage: { width: '100%', maxWidth: 560, aspectRatio: 16 / 9, alignSelf: 'center', borderRadius: 14, marginBottom: 14 },
    emptyIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
    emptyMessage: { marginTop: 5, textAlign: 'center', lineHeight: 20, maxWidth: 360 }
});
