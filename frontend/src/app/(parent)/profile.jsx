/**
 * File: frontend/src/app/(parent)/profile.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/apiService';
import { showToast } from '@/components/ui/Feedback';
import { confirmAction } from '@/utils/confirmationUtils';
export default function ProfileScreen() {
    const { user, theme, logout, refreshProfile } = useApp();
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
    }, [user]);
    const saveProfile = async () => {
        try {
            setSaving(true);
            await api.patch('/profile', { name: name.trim(), phone: phone.trim() });
            await refreshProfile();
            showToast('Profile updated successfully');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSaving(false);
        }
    };
    const changePassword = async () => {
        try {
            setChangingPassword(true);
            await api.patch('/profile/password', {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showToast('Password changed successfully');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setChangingPassword(false);
        }
    };
    const confirmDelete = async () => {
        if (!deletePassword.trim()) {
            Alert.alert('Password required', 'Enter your current password before deleting the account.');
            return;
        }
        const confirmed = await confirmAction('Delete account?', 'Your account will be disabled and your login details will be removed. This action cannot be undone.', 'Delete account', 'Keep account');
        if (confirmed)
            await deleteAccount();
    };
    const deleteAccount = async () => {
        try {
            setDeleting(true);
            await api.delete('/profile', { data: { password: deletePassword } });
            await logout();
            showToast('Account deleted successfully');
            router.replace('/(auth)/login');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setDeleting(false);
        }
    };
    return (<Screen>
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Card>
        <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
        <Text style={{ color: theme.muted }}>{user?.email}</Text>
        <Text style={{ color: theme.muted }}>{user?.role}</Text>
      </Card>

      <Text style={[styles.heading, { color: theme.text }]}>Profile details</Text>
      <Input placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words"/>
      <Input placeholder="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
      <Btn title="Save profile" onPress={() => void saveProfile()} loading={saving}/>

      <Text style={[styles.heading, { color: theme.text }]}>Change password</Text>
      <Input placeholder="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}/>
      <Input placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword}/>
      <Input placeholder="Confirm new password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword}/>
      <Text style={{ color: theme.muted }}>Use at least 8 characters with uppercase, lowercase, number and special character.</Text>
      <Btn title="Change password" onPress={() => void changePassword()} loading={changingPassword} variant="secondary"/>

      <Text style={[styles.heading, { color: theme.text }]}>Account</Text>
      <Btn title="Logout" variant="outline" onPress={async () => { const confirmed = await confirmAction('Logout?', 'Are you sure you want to sign out?', 'Logout', 'Stay logged in'); if (!confirmed) return; await logout(); showToast('Logged out successfully', 'info'); router.replace('/(auth)/login'); }}/>

      <View style={styles.dangerSection}>
        <Text style={[styles.heading, { color: theme.text }]}>Delete account</Text>
        <Text style={{ color: theme.muted, marginBottom: 12 }}>Enter your password to confirm permanent loss of account access.</Text>
        <Input placeholder="Current password" secureTextEntry value={deletePassword} onChangeText={setDeletePassword}/>
        <Btn title="Delete account" variant="danger" onPress={() => void confirmDelete()} loading={deleting}/>
      </View>
      </ScrollView>
    </Screen>);
}
const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    name: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    heading: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 12 },
    dangerSection: { marginTop: 16 }
});
