import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/Feedback';
import { confirmAction } from '@/utils/confirmAction';
const blank = { record_type: 'ALLERGY', title: '', description: '', record_date: new Date().toISOString().slice(0, 10) };
export default function Medical() {
    const { theme } = useApp();
    const [children, setChildren] = useState([]);
    const [child, setChild] = useState('');
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const load = useCallback(async (id = child) => { if (!id)
        return setItems([]); try {
        const r = await api.get('/medical-history', { params: { child_id: id } });
        setItems(r.data.data || []);
    }
    catch (e) {
        showError(e);
    } }, [child]);
    useEffect(() => { api.get('/children').then(r => { const d = r.data.data || []; setChildren(d); if (d[0])
        setChild(String(d[0].id)); }).catch(showError); }, []);
    useEffect(() => { void load(); }, [load]);
    const reset = () => { setForm(blank); setEditingId(null); };
    const save = async () => { if (!child)
        return Alert.alert('Select child', 'Add or select a child first.'); try {
        const payload = { child_id: Number(child), ...form, description: form.description.trim() || null };
        editingId ? await api.patch(`/medical-history/${editingId}`, payload) : await api.post('/medical-history', payload);
        showToast(editingId ? 'Medical record updated' : 'Medical record added');
        reset();
        await load();
    }
    catch (e) {
        showError(e);
    } };
    const edit = (i) => { setEditingId(i.id); setForm({ record_type: i.record_type, title: i.title, description: i.description || '', record_date: String(i.record_date).slice(0, 10) }); };
    const remove = async (id) => {
        const confirmed = await confirmAction('Delete medical record?', 'This action cannot be undone.', 'Delete');
        if (!confirmed)
            return;
        try {
            await api.delete(`/medical-history/${id}`);
            if (editingId === id)
                reset();
            await load();
            showToast('Medical record deleted');
        }
        catch (e) {
            showError(e);
        }
    };
    return <Screen><ScrollView><Text style={{ fontSize: 25, fontWeight: '800', color: theme.text }}>Medical History</Text><View style={styles.childSelector}>{children.map(c => { const selected = child === String(c.id); return <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setChild(String(c.id)); reset(); }} style={({ pressed }) => [styles.childChip, { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.75 : 1 }]}><Text numberOfLines={1} style={[styles.childChipText, { color: selected ? '#fff' : theme.text }]}>{selected ? '✓ ' : ''}{c.name}</Text></Pressable>; })}</View><Card><Input placeholder="Type: ALLERGY / ILLNESS / MEDICINE" value={form.record_type} onChangeText={v => setForm({ ...form, record_type: v.toUpperCase() })}/><Input placeholder="Title" value={form.title} onChangeText={v => setForm({ ...form, title: v })}/><Input placeholder="Description" multiline value={form.description} onChangeText={v => setForm({ ...form, description: v })}/><Input placeholder="YYYY-MM-DD" value={form.record_date} onChangeText={v => setForm({ ...form, record_date: v })}/><Btn title={editingId ? 'Update medical record' : 'Add medical record'} onPress={save}/>{editingId ? <Btn title="Cancel editing" onPress={reset}/> : null}</Card>{items.map(i => <Card key={i.id}><Text style={{ fontWeight: '800', color: theme.text }}>{i.record_type}: {i.title}</Text><Text style={{ color: theme.muted }}>{String(i.record_date).slice(0, 10)}</Text>{i.description ? <Text style={{ color: theme.text }}>{i.description}</Text> : null}<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 12 }}><Pressable onPress={() => edit(i)}><Text style={{ color: theme.primary, fontWeight: '700' }}>Edit</Text></Pressable><Pressable onPress={() => remove(i.id)}><Text style={{ color: '#c62828', fontWeight: '700' }}>Delete</Text></Pressable></View></Card>)}</ScrollView></Screen>;
}
const styles = StyleSheet.create({
    childSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 14 },
    childChip: { minHeight: 42, maxWidth: 220, paddingHorizontal: 16, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    childChipText: { fontWeight: '800', fontSize: 15 }
});
