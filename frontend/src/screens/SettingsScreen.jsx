/**
 * File: frontend/src/screens/SettingsScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '@/services/apiService';
import { Btn, Card, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
const defaults = {
    accessibility_large_text: false,
    accessibility_high_contrast: false,
    biometric_enabled: false,
    promotional_notifications: false,
    email_notifications: false,
    sms_notifications: false,
    sound_enabled: true,
    vibration_enabled: true
};
export default function SettingsScreen() {
    const { theme, isDark, setTheme, settings: globalSettings, updateSettings } = useApp();
    const [settings, setSettings] = useState({ ...defaults, ...globalSettings });
    const [darkMode, setDarkMode] = useState(isDark);
    const [loading, setLoading] = useState(false);
    useEffect(() => setDarkMode(isDark), [isDark]);
    useEffect(() => {
        api.get('/settings')
            .then((response) => setSettings({ ...defaults, ...response.data.data }))
            .catch(showError);
    }, []);
    const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
    const changeDarkMode = async (value) => {
        setDarkMode(value);
        await setTheme(value);
        showToast(value ? 'Dark mode enabled' : 'Light mode enabled', 'info');
    };
    const save = async () => {
        try {
            setLoading(true);
            const saved = await updateSettings(settings);
            setSettings({ ...defaults, ...saved });
            showToast('Settings saved successfully');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
        }
    };
    const rows = [
        ['Large text', 'accessibility_large_text', 'Increase text size for easier reading'],
        ['High contrast', 'accessibility_high_contrast', 'Improve visibility between interface elements'],
        ['Biometric login', 'biometric_enabled', 'Use fingerprint or face authentication'],
        ['Promotional notifications', 'promotional_notifications', 'Receive health campaigns and useful updates'],
        ['Email notifications', 'email_notifications', 'Receive reminders by email'],
        ['SMS notifications', 'sms_notifications', 'Receive reminders by SMS'],
        ['Sound', 'sound_enabled', 'Play a sound for app notifications'],
        ['Vibration', 'vibration_enabled', 'Vibrate when notifications arrive']
    ];
    return (<Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.eyebrow, { color: theme.primary }]}>PREFERENCES</Text>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Manage appearance, accessibility and notification preferences.</Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <Card>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Dark mode</Text>
              <Text style={[styles.description, { color: theme.muted }]}>Switch between light and dark application themes.</Text>
            </View>
            <Switch value={darkMode} onValueChange={(value) => void changeDarkMode(value)} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={darkMode ? theme.card : '#ffffff'}/>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Accessibility</Text>
        {rows.slice(0, 3).map(([label, key, description]) => (<Card key={key}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.description, { color: theme.muted }]}>{description}</Text>
              </View>
              <Switch value={settings[key]} onValueChange={(value) => update(key, value)} trackColor={{ true: theme.primary }}/>
            </View>
          </Card>))}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
        {rows.slice(3).map(([label, key, description]) => (<Card key={key}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.description, { color: theme.muted }]}>{description}</Text>
              </View>
              <Switch value={settings[key]} onValueChange={(value) => update(key, value)} trackColor={{ true: theme.primary }}/>
            </View>
          </Card>))}

        <Btn title="Save settings" onPress={save} loading={loading}/>
      </ScrollView>
    </Screen>);
}
const styles = StyleSheet.create({
    container: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 18, paddingBottom: 48 },
    eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
    title: { fontSize: 30, fontWeight: '900', marginTop: 5 },
    subtitle: { fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '900', marginTop: 12, marginBottom: 9 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    copy: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '800' },
    description: { marginTop: 4, fontSize: 13, lineHeight: 19 }
});
