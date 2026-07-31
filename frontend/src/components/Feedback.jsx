import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
let listener = null;
let hideTimer = null;
/** Show a lightweight cross-platform toast from any screen or service callback. */
export function showToast(message, kind = 'success') {
    listener?.({ message, kind });
}
export function ToastHost() {
    const { theme } = useApp();
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-12)).current;
    useEffect(() => {
        listener = (payload) => {
            if (hideTimer)
                clearTimeout(hideTimer);
            setToast(payload);
            opacity.setValue(0);
            translateY.setValue(-12);
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true })
            ]).start();
            hideTimer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true })
                ]).start(() => setToast(null));
            }, 2600);
        };
        return () => {
            listener = null;
            if (hideTimer)
                clearTimeout(hideTimer);
        };
    }, [opacity, translateY]);
    if (!toast)
        return null;
    const backgroundColor = toast.kind === 'error'
        ? theme.danger
        : toast.kind === 'info'
            ? theme.primary
            : theme.success;
    const symbol = toast.kind === 'error' ? '!' : toast.kind === 'info' ? 'i' : '✓';
    return (<View pointerEvents="none" style={[styles.host, { top: Math.max(insets.top, Platform.OS === 'web' ? 16 : 8) + 8 }]}> 
      <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor, opacity, transform: [{ translateY }] }]}>
        <View style={styles.symbol}><Text style={styles.symbolText}>{symbol}</Text></View>
        <Text style={styles.message}>{toast.message}</Text>
      </Animated.View>
    </View>);
}
const styles = StyleSheet.create({
    host: { position: 'absolute', left: 16, right: 16, zIndex: 9999, alignItems: 'center' },
    toast: {
        width: '100%',
        maxWidth: 480,
        minHeight: 52,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8
    },
    symbol: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    symbolText: { color: '#FFFFFF', fontWeight: '900' },
    message: { color: '#FFFFFF', fontWeight: '700', flex: 1, lineHeight: 20 }
});
