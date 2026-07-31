import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { confirmAction } from '@/utils/confirmAction';
import { useApp } from '@/context/AppContext';
const emptyForm = { name: '', address: '', phone: '', email: '', opening_hours: '' };
export default function HospitalsScreen() {
    const { theme } = useApp();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(true);
    const [workingId, setWorkingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const load = useCallback(async (page = 1) => { try {
        setLoading(true);
        const r = await api.get('/admin/hospitals', { params: { page, limit: 10, search: appliedSearch || undefined, status } });
        setItems(r.data.data);
        setPagination(r.data.pagination);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setLoading(false);
    } }, [appliedSearch, status]);
    useEffect(() => { void load(1); }, [load]);
    const save = async () => { try {
        setWorkingId(form.id ?? 0);
        const payload = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, opening_hours: form.opening_hours.trim() || null };
        if (form.id)
            await api.put(`/admin/hospitals/${form.id}`, payload);
        else
            await api.post('/admin/hospitals', payload);
        Alert.alert('Success', form.id ? 'Hospital updated successfully.' : 'Hospital created successfully.');
        setForm(emptyForm);
        await load(form.id ? pagination.page : 1);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorkingId(null);
    } };
    const edit = async (h) => { try {
        const r = await api.get(`/admin/hospitals/${h.id}`);
        const x = r.data.data;
        setForm({ id: x.id, name: x.name, address: x.address, phone: x.phone || '', email: x.email || '', opening_hours: x.opening_hours || '' });
    }
    catch (e) {
        showError(e);
    } };
    const toggle = async (h) => { const active = !h.is_active; if (!await confirmAction(active ? 'Activate hospital' : 'Deactivate hospital', `${active ? 'Activate' : 'Deactivate'} ${h.name}?`, active ? 'Activate' : 'Deactivate'))
        return; try {
        setWorkingId(h.id);
        await api.patch(`/admin/hospitals/${h.id}/status`, { is_active: active });
        await load(pagination.page);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorkingId(null);
    } };
    const remove = async (h) => { if (!await confirmAction('Delete hospital', `Delete ${h.name}? Hospitals with appointment history cannot be deleted and should be deactivated instead.`, 'Delete'))
        return; try {
        setWorkingId(h.id);
        await api.delete(`/admin/hospitals/${h.id}`, { data: { reason: 'Deleted from hospital management' } });
        await load(1);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorkingId(null);
    } };
    const restore = async (h) => { try {
        setWorkingId(h.id);
        await api.patch(`/admin/hospitals/${h.id}/restore`);
        await load(pagination.page);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorkingId(null);
    } };
    return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: theme.text }]}>Hospital Management</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Create hospitals, update contact information and control availability without removing medical history.</Text>
    <Card><Text style={[styles.section, { color: theme.text }]}>{form.id ? 'Edit hospital' : 'Add hospital'}</Text><Input label="Hospital name" value={form.name} onChangeText={v => setForm({ ...form, name: v })}/><Input label="Address" value={form.address} multiline onChangeText={v => setForm({ ...form, address: v })}/><Input label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={v => setForm({ ...form, phone: v })}/><Input label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={v => setForm({ ...form, email: v })}/><Input label="Opening hours" value={form.opening_hours} placeholder="Example: Mon–Sat, 9:00 AM–6:00 PM" onChangeText={v => setForm({ ...form, opening_hours: v })}/><View style={styles.row}><Btn title={form.id ? 'Update hospital' : 'Create hospital'} compact loading={workingId === (form.id ?? 0)} onPress={save}/>{form.id ? <Btn title="Cancel" compact variant="outline" onPress={() => setForm(emptyForm)}/> : null}</View></Card>
    <Card><Input label="Search" value={search} placeholder="Name, address, email or phone" onChangeText={setSearch} onSubmitEditing={() => setAppliedSearch(search.trim())}/><View style={styles.row}><Btn title="Search" compact onPress={() => setAppliedSearch(search.trim())}/><Btn title="Clear" compact variant="outline" onPress={() => { setSearch(''); setAppliedSearch(''); }}/></View><View style={styles.row}>{['active', 'inactive', 'deleted', 'all'].map(x => <Btn key={x} title={x[0].toUpperCase() + x.slice(1)} compact variant={status === x ? 'primary' : 'outline'} onPress={() => setStatus(x)}/>)}</View></Card>
    <Text style={{ color: theme.muted, fontWeight: '700', marginBottom: 10 }}>{pagination.totalItems} hospital(s) found</Text>{loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}{!loading && items.length === 0 ? <Card><Text style={{ color: theme.muted }}>No hospitals match the selected filters.</Text></Card> : null}
    {!loading && items.map(h => <Card key={h.id}><Text style={[styles.name, { color: theme.text }]}>{h.name}</Text><Text style={{ color: theme.muted }}>{h.address}</Text>{h.phone ? <Text style={{ color: theme.muted }}>Phone: {h.phone}</Text> : null}{h.email ? <Text style={{ color: theme.muted }}>Email: {h.email}</Text> : null}{h.opening_hours ? <Text style={{ color: theme.muted }}>Hours: {h.opening_hours}</Text> : null}<Text style={{ color: theme.muted, marginTop: 6 }}>Doctors: {h.doctor_count} · Appointments: {h.appointment_count}</Text><Text style={{ fontWeight: '800', marginTop: 8, color: h.deleted_at ? '#b42318' : h.is_active ? '#087443' : '#9a6700' }}>{h.deleted_at ? 'Deleted' : h.is_active ? 'Active' : 'Inactive'}</Text><View style={styles.row}>{h.deleted_at ? <Btn title="Restore" compact loading={workingId === h.id} onPress={() => restore(h)}/> : <><Btn title="Edit" compact variant="outline" onPress={() => edit(h)}/><Btn title={h.is_active ? 'Deactivate' : 'Activate'} compact variant="secondary" loading={workingId === h.id} onPress={() => toggle(h)}/><Btn title="Delete" compact variant="danger" onPress={() => remove(h)}/></>}</View></Card>)}
    <View style={[styles.row, { justifyContent: 'space-between' }]}><Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1 || loading} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text, fontWeight: '800' }}>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</Text><Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onPress={() => load(pagination.page + 1)}/></View>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 18, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 6, marginBottom: 16, lineHeight: 21 }, section: { fontSize: 20, fontWeight: '900', marginBottom: 14 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 8 }, name: { fontSize: 18, fontWeight: '900', marginBottom: 4 } });
