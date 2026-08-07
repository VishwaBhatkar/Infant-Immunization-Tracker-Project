/**
 * File: frontend/src/app/(parent)/children.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
const emptyForm = {
    name: '', dob: '', gender: 'MALE', blood_group: '', birth_weight_kg: '',
    current_weight_kg: '', allergies: '', medical_notes: '', profile_image_url: ''
};
const toForm = (child) => ({
    name: child.name,
    dob: String(child.dob).slice(0, 10),
    gender: child.gender,
    blood_group: child.blood_group || '',
    birth_weight_kg: child.birth_weight_kg == null ? '' : String(child.birth_weight_kg),
    current_weight_kg: child.current_weight_kg == null ? '' : String(child.current_weight_kg),
    allergies: child.allergies || '',
    medical_notes: child.medical_notes || '',
    profile_image_url: child.profile_image_url || ''
});
export default function Children() {
    const { theme } = useApp();
    const [list, setList] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const title = useMemo(() => editing ? `Edit ${editing.name}` : 'Add child', [editing]);
    const load = async () => {
        try {
            setLoading(true);
            const response = await api.get('/children');
            const data = response.data?.data;
            setList(Array.isArray(data) ? data : Array.isArray(data?.children) ? data.children : []);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { void load(); }, []);
    const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const selectGender = (gender) => setForm((current) => ({ ...current, gender }));
    const reset = () => {
        setEditing(null);
        setForm(emptyForm);
    };
    const save = async () => {
        const name = form.name.trim();
        const dob = form.dob.trim();
        if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
            Alert.alert('Check child details', 'Enter the child name and date of birth in YYYY-MM-DD format.');
            return;
        }
        if (Number.isNaN(Date.parse(`${dob}T00:00:00`)) || new Date(`${dob}T00:00:00`) > new Date()) {
            Alert.alert('Invalid date of birth', 'Enter a valid date that is not in the future.');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                name,
                dob,
                gender: form.gender,
                birth_weight_kg: form.birth_weight_kg ? Number(form.birth_weight_kg) : null,
                current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
                blood_group: form.blood_group || null,
                allergies: form.allergies || null,
                medical_notes: form.medical_notes || null,
                profile_image_url: form.profile_image_url.trim() || null
            };
            if ([payload.birth_weight_kg, payload.current_weight_kg].some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) {
                Alert.alert('Invalid weight', 'Weight must be a positive number.');
                return;
            }
            if (editing)
                await api.patch(`/children/${editing.id}`, payload);
            else
                await api.post('/children', payload);
            showToast(editing ? 'Child profile updated successfully' : 'Child added successfully');
            reset();
            await load();
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSaving(false);
        }
    };
    const edit = (child) => {
        setEditing(child);
        setForm(toForm(child));
    };
    const deleteChild = async (child) => {
        if (deletingId !== null)
            return;
        try {
            setDeletingId(child.id);
            await api.delete(`/children/${child.id}`);
            if (editing?.id === child.id)
                reset();
            setList((current) => current.filter((item) => item.id !== child.id));
            showToast('Child profile and related records deleted successfully');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setDeletingId(null);
        }
    };
    const remove = (child) => {
        const message = `This will permanently delete ${child.name}'s profile and all related appointments, schedules, immunisation, growth and medical records.`;
        // React Native's multi-button Alert callback is not reliable on web.
        if (Platform.OS === 'web') {
            const confirmed = typeof window !== 'undefined' && window.confirm(`Delete child profile?\n\n${message}`);
            if (confirmed)
                void deleteChild(child);
            return;
        }
        Alert.alert('Delete child profile?', message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void deleteChild(child) }
        ]);
    };
    const formContent = (<Card>
      <Text style={[styles.heading, { color: theme.text }]}>{title}</Text>
      <Input value={form.name} placeholder="Full name" onChangeText={(v) => setField('name', v)}/>
      <Input value={form.dob} placeholder="Date of birth: YYYY-MM-DD" autoCapitalize="none" onChangeText={(v) => setField('dob', v)}/>
      <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
      <View style={styles.choiceRow}>
        {['MALE', 'FEMALE', 'OTHER'].map((gender) => (<Pressable key={gender} onPress={() => selectGender(gender)} style={[styles.choice, { borderColor: theme.border, backgroundColor: form.gender === gender ? theme.primary : theme.card }]}>
            <Text style={{ color: form.gender === gender ? 'white' : theme.text }}>{gender}</Text>
          </Pressable>))}
      </View>
      <Input value={form.blood_group} placeholder="Blood group, e.g. O+" autoCapitalize="characters" onChangeText={(v) => setField('blood_group', v.toUpperCase())}/>
      <Input value={form.birth_weight_kg} placeholder="Birth weight in kg" keyboardType="decimal-pad" onChangeText={(v) => setField('birth_weight_kg', v)}/>
      <Input value={form.current_weight_kg} placeholder="Current weight in kg" keyboardType="decimal-pad" onChangeText={(v) => setField('current_weight_kg', v)}/>
      <Input value={form.allergies} placeholder="Allergies" multiline onChangeText={(v) => setField('allergies', v)}/>
      <Input value={form.medical_notes} placeholder="Medical notes" multiline onChangeText={(v) => setField('medical_notes', v)}/>
      <Input value={form.profile_image_url} placeholder="Profile image URL (https://...)" autoCapitalize="none" keyboardType="url" onChangeText={(v) => setField('profile_image_url', v)}/>
      <Btn title={editing ? 'Update child' : 'Add child'} onPress={save} loading={saving}/>
      {editing ? <Pressable onPress={reset}><Text style={[styles.cancel, { color: theme.primary }]}>Cancel editing</Text></Pressable> : null}
    </Card>);
    return (<Screen>
      <FlatList data={list} keyExtractor={(item) => String(item.id)} refreshing={loading} onRefresh={load} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent} ListHeaderComponent={formContent} ListEmptyComponent={!loading ? <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 20 }}>No child profiles yet.</Text> : null} renderItem={({ item }) => (<Card>
            <View style={styles.childRow}>
              {item.profile_image_url ? <Image source={{ uri: item.profile_image_url }} style={styles.avatar}/> : <View style={[styles.avatar, styles.placeholder, { backgroundColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '700' }}>{item.name.charAt(0).toUpperCase()}</Text></View>}
              <View style={styles.childInfo}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                <Text style={{ color: theme.muted }}>{String(item.dob).slice(0, 10)} • {item.gender}</Text>
                <Text style={{ color: theme.muted }}>{item.blood_group || 'Blood group not set'} • {item.current_weight_kg ? `${item.current_weight_kg} kg` : 'Weight not set'}</Text>
              </View>
            </View>
            {item.allergies ? <Text style={{ color: theme.text, marginTop: 8 }}>Allergies: {item.allergies}</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={() => edit(item)}><Text style={{ color: theme.primary, fontWeight: '700' }}>Edit</Text></Pressable>
              <Pressable disabled={deletingId !== null} onPress={() => remove(item)}><Text style={[styles.delete, deletingId !== null && styles.disabled]}>{deletingId === item.id ? 'Deleting…' : 'Delete'}</Text></Pressable>
            </View>
          </Card>)}/>
    </Screen>);
}
const styles = StyleSheet.create({
    listContent: { paddingBottom: 48, width: '100%', maxWidth: 900, alignSelf: 'center' },
    heading: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
    label: { fontWeight: '700', marginBottom: 8 },
    choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    choice: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
    cancel: { textAlign: 'center', marginTop: 14, fontWeight: '700' },
    childRow: { flexDirection: 'row', alignItems: 'center' },
    childInfo: { flex: 1, marginLeft: 12 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 18, fontWeight: '800' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 16 },
    delete: { color: '#c62828', fontWeight: '700' },
    disabled: { opacity: 0.5 }
});
