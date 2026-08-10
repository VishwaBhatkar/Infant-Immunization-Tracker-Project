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
    Modal,
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


const parseCalendarDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatCalendarDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const DateInput = ({ label = 'Date', value, onChange, min, max, placeholder = 'Select date', helperText, containerStyle, allowClear = false }) => {
    const { theme } = useApp();
    const [open, setOpen] = React.useState(false);
    const selected = parseCalendarDate(value);
    const minDate = parseCalendarDate(min);
    const maxDate = parseCalendarDate(max);
    const fallback = selected || maxDate || minDate || new Date();
    const [month, setMonth] = React.useState(new Date(fallback.getFullYear(), fallback.getMonth(), 1));

    useEffect(() => {
        if (!open) return;
        const next = parseCalendarDate(value) || maxDate || minDate || new Date();
        setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }, [open, value, min, max]);

    const moveMonth = (offset) => {
        const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
        const minMonth = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), 1) : null;
        const maxMonth = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1) : null;
        if (minMonth && next < minMonth) return;
        if (maxMonth && next > maxMonth) return;
        setMonth(next);
    };

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, index) => index + 1));
    while (cells.length % 7) cells.push(null);

    return (
        <View style={containerStyle}>
            {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={label || placeholder}
                onPress={() => setOpen(true)}
                style={[styles.inputShell, { backgroundColor: theme.input, borderColor: theme.border }]}
            >
                <Ionicons name="calendar-outline" size={19} color={theme.muted} style={styles.inputIcon} />
                <Text style={[styles.dateInputText, { color: value ? theme.text : theme.muted }]}>{value || placeholder}</Text>
                <Ionicons name="chevron-down-outline" size={18} color={theme.muted} style={styles.dateChevron} />
            </Pressable>
            {helperText ? <Text style={[styles.dateHelper, { color: theme.muted }]}>{helperText}</Text> : null}
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.dateBackdrop} onPress={() => setOpen(false)}>
                    <Pressable style={[styles.dateCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => {}}>
                        <View style={styles.dateHeader}>
                            <Pressable onPress={() => moveMonth(-1)} style={[styles.dateArrow, { borderColor: theme.border }]}><Ionicons name="chevron-back" size={20} color={theme.text}/></Pressable>
                            <Text style={[styles.dateTitle, { color: theme.text }]}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
                            <Pressable onPress={() => moveMonth(1)} style={[styles.dateArrow, { borderColor: theme.border }]}><Ionicons name="chevron-forward" size={20} color={theme.text}/></Pressable>
                        </View>
                        <View style={styles.dateWeekRow}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <Text key={day} style={[styles.dateWeekDay, { color: theme.muted }]}>{day}</Text>)}</View>
                        <View style={styles.dateGrid}>
                            {cells.map((day, index) => {
                                if (!day) return <View key={`blank-${index}`} style={styles.dateCell}/>;
                                const candidate = new Date(year, monthIndex, day);
                                candidate.setHours(0,0,0,0);
                                const disabled = (minDate && candidate < minDate) || (maxDate && candidate > maxDate);
                                const dateValue = formatCalendarDate(candidate);
                                const isSelected = dateValue === value;
                                return <Pressable key={dateValue} disabled={disabled} onPress={() => { onChange?.(dateValue); setOpen(false); }} style={[styles.dateCell, styles.dateDay, isSelected && { backgroundColor: theme.primary }, disabled && { opacity: 0.3 }]}><Text style={{ color: isSelected ? '#fff' : theme.text }}>{day}</Text></Pressable>;
                            })}
                        </View>
                        {allowClear && value ? <Btn title="Clear date" variant="secondary" onPress={() => { onChange?.(''); setOpen(false); }}/> : null}
                        <Btn title="Cancel" variant="outline" onPress={() => setOpen(false)}/>
                    </Pressable>
                </Pressable>
            </Modal>
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
    dateInputText: { flex: 1, paddingHorizontal: 11, fontSize: 15 },
    dateChevron: { marginRight: 14 },
    dateHelper: { fontSize: 12, marginTop: -7, marginBottom: 12 },
    dateBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    dateCard: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 18, padding: 16 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    dateArrow: { width: 40, height: 40, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dateTitle: { fontSize: 18, fontWeight: '800' },
    dateWeekRow: { flexDirection: 'row', marginBottom: 5 },
    dateWeekDay: { width: '14.2857%', textAlign: 'center', fontSize: 12, fontWeight: '700' },
    dateGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dateCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dateDay: { borderRadius: 999 },
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
