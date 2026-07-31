import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/services/api';
export const Screen = ({ children, edges = ['left', 'right', 'bottom'] }) => {
    const { theme } = useApp();
    return (<SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={edges}>
      {children}
    </SafeAreaView>);
};
export const Card = ({ children }) => {
    const { theme } = useApp();
    return (<View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {children}
    </View>);
};
export const Btn = ({ title, onPress, loading = false, disabled = false, variant = 'primary', compact = false, style }) => {
    const { theme } = useApp();
    const unavailable = loading || disabled;
    const palette = {
        primary: { backgroundColor: theme.primary, borderColor: theme.primary, textColor: '#ffffff' },
        secondary: { backgroundColor: theme.card, borderColor: theme.primary, textColor: theme.primary },
        outline: { backgroundColor: 'transparent', borderColor: theme.border, textColor: theme.text },
        danger: { backgroundColor: '#b42318', borderColor: '#b42318', textColor: '#ffffff' }
    }[variant];
    return (<Pressable onPress={() => void onPress()} disabled={unavailable} accessibilityRole="button" accessibilityState={{ disabled: unavailable, busy: loading }} style={({ pressed }) => [
            styles.btn,
            compact && styles.btnCompact,
            {
                backgroundColor: palette.backgroundColor,
                borderColor: palette.borderColor,
                opacity: unavailable ? 0.45 : pressed ? 0.78 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }]
            },
            style
        ]}>
      {loading ? (<ActivityIndicator color={palette.textColor}/>) : (<Text style={[styles.buttonText, { color: palette.textColor }]}>{title}</Text>)}
    </Pressable>);
};
export const Input = ({ label, style, ...props }) => {
    const { theme } = useApp();
    return (<View>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
      <TextInput placeholderTextColor={theme.muted} {...props} style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
            style
        ]}/>
    </View>);
};
export const showError = (error) => {
    if (error instanceof ApiError && error.errors?.length) {
        Alert.alert(error.message, error.errors.map((item) => `${item.field}: ${item.message}`).join('\n'));
        return;
    }
    const message = error instanceof Error ? error.message : 'Please try again';
    Alert.alert('Unable to continue', message);
};
const styles = StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: 20, width: '100%', maxWidth: 1600, alignSelf: 'center' },
    card: { padding: 17, borderRadius: 18, borderWidth: 1, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    btn: {
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingHorizontal: 18,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2
    },
    btnCompact: { minHeight: 40, marginTop: 0, borderRadius: 12, paddingHorizontal: 14 },
    buttonText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.1 },
    label: { fontWeight: '700', marginBottom: 6 },
    input: {
        minHeight: 50,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 15,
        marginBottom: 12
    }
});
