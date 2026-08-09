/**
 * File: frontend/src/app/(parent)/growth.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/apiService';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { HealthcareBanner, HealthcareThumbnail } from '@/components/ui/HealthcareImage';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
import { confirmAction } from '@/utils/confirmationUtils';
const blank = { height_cm: '', weight_kg: '', head_circumference_cm: '', measured_on: new Date().toISOString().slice(0, 10), notes: '' };
export default function Growth() {
    const { theme } = useApp();
    const [children, setChildren] = useState([]);
    const [childId, setChildId] = useState('');
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const loadRecords = useCallback(async (id = childId) => {
        if (!id)
            return setItems([]);
        try {
            const r = await api.get('/growth-records', { params: { child_id: id } });
            setItems(r.data.data || []);
        }
        catch (e) {
            showError(e);
        }
    }, [childId]);
    useEffect(() => { api.get('/children').then(r => { const data = r.data.data || []; setChildren(data); if (data[0])
        setChildId(String(data[0].id)); }).catch(showError); }, []);
    useEffect(() => { void loadRecords(); }, [loadRecords]);
    const reset = () => { setForm(blank); setEditingId(null); };
    const save = async () => {
        if (!childId)
            return Alert.alert('Select child', 'Add or select a child first.');
        const payload = { child_id: Number(childId), height_cm: Number(form.height_cm), weight_kg: Number(form.weight_kg), head_circumference_cm: form.head_circumference_cm ? Number(form.head_circumference_cm) : null, measured_on: form.measured_on, notes: form.notes.trim() || null };
        if (!Number.isFinite(payload.height_cm) || !Number.isFinite(payload.weight_kg))
            return Alert.alert('Invalid values', 'Enter valid height and weight.');
        try {
            setSaving(true);
            editingId ? await api.patch(`/growth-records/${editingId}`, payload) : await api.post('/growth-records', payload);
            showToast(editingId ? 'Growth record updated' : 'Growth record added');
            reset();
            await loadRecords();
        }
        catch (e) {
            showError(e);
        }
        finally {
            setSaving(false);
        }
    };
    const edit = (item) => { setEditingId(item.id); setForm({ height_cm: String(item.height_cm), weight_kg: String(item.weight_kg), head_circumference_cm: item.head_circumference_cm == null ? '' : String(item.head_circumference_cm), measured_on: String(item.measured_on).slice(0, 10), notes: item.notes || '' }); };
    const remove = async (id) => {
        const confirmed = await confirmAction('Delete growth record?', 'This action cannot be undone.', 'Delete');
        if (!confirmed)
            return;
        try {
            await api.delete(`/growth-records/${id}`);
            if (editingId === id)
                reset();
            await loadRecords();
            showToast('Growth record deleted');
        }
        catch (e) {
            showError(e);
        }
    };
    return <Screen><FlatList data={items} keyExtractor={i => String(i.id)} ListHeaderComponent={<>
    <Text style={{ fontSize: 25, fontWeight: '800', color: theme.text, marginBottom: 12 }}>Growth Tracking</Text>
    <HealthcareBanner source={require('../../../assets/images/real-life/growth-secondary.webp')} eyebrow="CHILD HEALTH" title="Track healthy growth over time" subtitle="Record height, weight and head circumference to keep your child’s growth history organized." accessibilityLabel="Healthcare professional measuring a child's height" />
    <View style={styles.childSelector}>{children.map(c => { const selected = childId === String(c.id); return <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setChildId(String(c.id)); reset(); }} style={({ pressed }) => [styles.childChip, { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.75 : 1 }]}><Text numberOfLines={1} style={[styles.childChipText, { color: selected ? '#fff' : theme.text }]}>{selected ? '✓ ' : ''}{c.name}</Text></Pressable>; })}</View>
    <Card><Text style={{ color: theme.text, fontWeight: '800', marginBottom: 10 }}>{editingId ? 'Edit record' : 'Add record'}</Text>
      <Input placeholder="Height (cm)" keyboardType="decimal-pad" value={form.height_cm} onChangeText={v => setForm({ ...form, height_cm: v })}/>
      <Input placeholder="Weight (kg)" keyboardType="decimal-pad" value={form.weight_kg} onChangeText={v => setForm({ ...form, weight_kg: v })}/>
      <Input placeholder="Head circumference (cm, optional)" keyboardType="decimal-pad" value={form.head_circumference_cm} onChangeText={v => setForm({ ...form, head_circumference_cm: v })}/>
      <Input placeholder="Date YYYY-MM-DD" value={form.measured_on} onChangeText={v => setForm({ ...form, measured_on: v })}/>
      <Input placeholder="Notes" multiline value={form.notes} onChangeText={v => setForm({ ...form, notes: v })}/>
      <Btn title={editingId ? 'Update record' : 'Add record'} onPress={save} loading={saving}/>{editingId ? <Btn title="Cancel editing" onPress={reset}/> : null}
    </Card></>} renderItem={({ item }) => <Card><Text style={{ color: theme.text, fontWeight: '800' }}>{String(item.measured_on).slice(0, 10)}</Text><Text style={{ color: theme.muted }}>{item.height_cm} cm • {item.weight_kg} kg</Text>{item.notes ? <Text style={{ color: theme.text }}>{item.notes}</Text> : null}<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 12 }}><Pressable onPress={() => edit(item)}><Text style={{ color: theme.primary, fontWeight: '700' }}>Edit</Text></Pressable><Pressable onPress={() => remove(item.id)}><Text style={{ color: '#c62828', fontWeight: '700' }}>Delete</Text></Pressable></View></Card>} ListEmptyComponent={<View style={styles.emptyWrap}><HealthcareThumbnail source={require('../../../assets/images/real-life/growth-primary.webp')} accessibilityLabel="Child growth measurement" style={styles.emptyImage}/><Text style={{ color: theme.muted, textAlign: 'center' }}>No growth records found.</Text></View>}/></Screen>;
}
const styles = StyleSheet.create({
    childSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    childChip: { minHeight: 42, maxWidth: 220, paddingHorizontal: 16, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    childChipText: { fontWeight: '800', fontSize: 15 },
    emptyWrap: { width: '100%', alignItems: 'center', marginTop: 12, paddingBottom: 20 },
    emptyImage: { maxWidth: 520 }
});
