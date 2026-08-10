/**
 * File: frontend/src/app/(parent)/children.jsx
 * Purpose: Parent child-profile management screen with validated DOB, gender and blood-group selection.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, DateInput, Input, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const emptyForm = {
    name: '', dob: '', gender: 'MALE', blood_group: '', birth_weight_kg: '',
    current_weight_kg: '', allergies: '', medical_notes: '', profile_image_url: ''
};

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const getDobBounds = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minimum = new Date(today);
    minimum.setFullYear(minimum.getFullYear() - 5);
    return { minimum, maximum: today };
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

function SelectionModal({ visible, title, options, value, onSelect, onClose, theme }) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => { onSelect(option); onClose(); }}
                style={[styles.modalOption, { borderColor: theme.border }, value === option && { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: value === option ? 'white' : theme.text, fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
            <Btn title="Cancel" variant="outline" onPress={onClose}/>
          </Pressable>
        </Pressable>
      </Modal>
    );
}


export default function Children() {
    const { theme } = useApp();
    const [list, setList] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [bloodGroupOpen, setBloodGroupOpen] = useState(false);
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
        const parsedDob = parseDate(dob);
        const { minimum, maximum } = getDobBounds();

        if (!name || !parsedDob) {
            Alert.alert('Check child details', 'Enter the child name and select a valid date of birth.');
            return;
        }
        if (parsedDob > maximum) {
            Alert.alert('Invalid date of birth', 'A future date of birth is not allowed.');
            return;
        }
        if (parsedDob < minimum) {
            Alert.alert('Age limit exceeded', 'Only children up to 5 years old can be added.');
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
            if (payload.birth_weight_kg !== null && (!Number.isFinite(payload.birth_weight_kg) || payload.birth_weight_kg < 1 || payload.birth_weight_kg > 5)) {
                Alert.alert('Invalid birth weight', 'Birth weight must be between 1 kg and 5 kg.');
                return;
            }
            if (payload.current_weight_kg !== null && (!Number.isFinite(payload.current_weight_kg) || payload.current_weight_kg <= 0)) {
                Alert.alert('Invalid current weight', 'Current weight must be a positive number.');
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
        if (deletingId !== null) return;
        try {
            setDeletingId(child.id);
            await api.delete(`/children/${child.id}`);
            if (editing?.id === child.id) reset();
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
        if (Platform.OS === 'web') {
            const confirmed = typeof window !== 'undefined' && window.confirm(`Delete child profile?\n\n${message}`);
            if (confirmed) void deleteChild(child);
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

      <DateInput
        label="Date of birth"
        value={form.dob}
        onChange={(value) => setField('dob', value)}
        min={formatDate(getDobBounds().minimum)}
        max={formatDate(getDobBounds().maximum)}
        helperText="Child age must be 5 years or less. Future dates are disabled."
      />

      <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
      <View style={styles.choiceRow}>
        {['MALE', 'FEMALE', 'OTHER'].map((gender) => (<Pressable key={gender} onPress={() => selectGender(gender)} style={[styles.choice, { borderColor: theme.border, backgroundColor: form.gender === gender ? theme.primary : theme.card }]}>
            <Text style={{ color: form.gender === gender ? 'white' : theme.text }}>{gender}</Text>
          </Pressable>))}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Blood group</Text>
      <Pressable onPress={() => setBloodGroupOpen(true)} style={[styles.selectBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={{ color: form.blood_group ? theme.text : theme.muted }}>{form.blood_group || 'Select blood group'}</Text>
        <Text style={{ color: theme.primary, fontSize: 18 }}>⌄</Text>
      </Pressable>

      <Input value={form.birth_weight_kg} placeholder="Birth weight (1–5 kg)" keyboardType="decimal-pad" onChangeText={(v) => setField('birth_weight_kg', v)}/>
      <Input value={form.current_weight_kg} placeholder="Current weight in kg" keyboardType="decimal-pad" onChangeText={(v) => setField('current_weight_kg', v)}/>
      <Input value={form.allergies} placeholder="Allergies" multiline onChangeText={(v) => setField('allergies', v)}/>
      <Input value={form.medical_notes} placeholder="Medical notes" multiline onChangeText={(v) => setField('medical_notes', v)}/>
      <Input value={form.profile_image_url} placeholder="Profile image URL (https://...)" autoCapitalize="none" keyboardType="url" onChangeText={(v) => setField('profile_image_url', v)}/>
      <Btn title={editing ? 'Update child' : 'Add child'} onPress={save} loading={saving}/>
      {editing ? <Pressable onPress={reset}><Text style={[styles.cancel, { color: theme.primary }]}>Cancel editing</Text></Pressable> : null}

      <SelectionModal
        visible={bloodGroupOpen}
        title="Select blood group"
        options={BLOOD_GROUPS}
        value={form.blood_group}
        onSelect={(value) => setField('blood_group', value)}
        onClose={() => setBloodGroupOpen(false)}
        theme={theme}
      />
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
    helperText: { fontSize: 12, marginBottom: 12 },
    choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    choice: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
    selectBox: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cancel: { textAlign: 'center', marginTop: 14, fontWeight: '700' },
    childRow: { flexDirection: 'row', alignItems: 'center' },
    childInfo: { flex: 1, marginLeft: 12 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 18, fontWeight: '800' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 16 },
    delete: { color: '#c62828', fontWeight: '700' },
    disabled: { opacity: 0.5 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    modalCard: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 16, padding: 18 },
    calendarCard: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 16, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
    modalOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    arrowButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekDay: { width: '14.2857%', textAlign: 'center', fontSize: 12, fontWeight: '700' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayButton: { borderRadius: 999 },
    disabledDay: { opacity: 0.45 }
});
