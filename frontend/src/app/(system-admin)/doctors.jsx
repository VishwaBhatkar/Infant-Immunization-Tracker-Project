import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { confirmAction } from '@/utils/confirmAction';
import { useApp } from '@/context/AppContext';
const emptyForm = { name: '', email: '', phone: '', password: '', hospitalIds: '' };
export default function DoctorsScreen() {
    const { theme } = useApp();
    const [doctors, setDoctors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(true);
    const [workingId, setWorkingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const load = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const [doctorRes, hospitalRes] = await Promise.all([
                api.get('/admin/doctors', { params: { page, limit: 10, search: appliedSearch || undefined, status } }),
                api.get('/admin/hospitals/options')
            ]);
            setDoctors(doctorRes.data.data);
            setPagination(doctorRes.data.pagination);
            setHospitals(hospitalRes.data.data);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setLoading(false);
        }
    }, [appliedSearch, status]);
    useEffect(() => { void load(1); }, [load]);
    const hospitalIds = () => form.hospitalIds.split(',').map(v => Number(v.trim())).filter(v => Number.isInteger(v) && v > 0);
    const save = async () => {
        try {
            setWorkingId(form.id ?? 0);
            const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), hospital_ids: hospitalIds(), ...(form.id ? {} : { password: form.password }) };
            if (form.id)
                await api.put(`/admin/doctors/${form.id}`, payload);
            else
                await api.post('/admin/doctors', payload);
            Alert.alert('Success', form.id ? 'Doctor updated successfully.' : 'Doctor created successfully.');
            setForm(emptyForm);
            await load(form.id ? pagination.page : 1);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const edit = async (doctor) => {
        try {
            const res = await api.get(`/admin/doctors/${doctor.id}`);
            const item = res.data.data;
            setForm({ id: item.id, name: item.name, email: item.email, phone: item.phone, password: '', hospitalIds: (item.hospital_ids || []).join(',') });
        }
        catch (e) {
            showError(e);
        }
    };
    const toggle = async (doctor) => {
        const active = !doctor.is_active;
        if (!await confirmAction(active ? 'Activate doctor' : 'Deactivate doctor', `${active ? 'Activate' : 'Deactivate'} ${doctor.name}?`, active ? 'Activate' : 'Deactivate'))
            return;
        try {
            setWorkingId(doctor.id);
            await api.patch(`/admin/doctors/${doctor.id}/status`, { is_active: active });
            await load(pagination.page);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const remove = async (doctor) => {
        if (!await confirmAction('Delete doctor', `Soft-delete ${doctor.name}? Existing medical and appointment history will be preserved.`, 'Delete'))
            return;
        try {
            setWorkingId(doctor.id);
            await api.delete(`/admin/doctors/${doctor.id}`, { data: { reason: 'Deleted from doctor management' } });
            await load(1);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const restore = async (doctor) => {
        try {
            setWorkingId(doctor.id);
            await api.patch(`/admin/doctors/${doctor.id}/restore`);
            await load(pagination.page);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: theme.text }]}>Doctor Management</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Create doctors, update contact information, assign hospitals and control account access.</Text>

    <Card>
      <Text style={[styles.section, { color: theme.text }]}>{form.id ? 'Edit doctor' : 'Add doctor'}</Text>
      <Input label="Name" value={form.name} onChangeText={v => setForm({ ...form, name: v })}/>
      <Input label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={v => setForm({ ...form, email: v })}/>
      <Input label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={v => setForm({ ...form, phone: v })}/>
      {!form.id ? <Input label="Temporary password" value={form.password} secureTextEntry onChangeText={v => setForm({ ...form, password: v })}/> : null}
      <Input label="Hospital IDs (comma separated)" value={form.hospitalIds} placeholder="Example: 1, 2" onChangeText={v => setForm({ ...form, hospitalIds: v })}/>
      <Text style={{ color: theme.muted, marginBottom: 8 }}>Available: {hospitals.map(h => `${h.id} – ${h.name}`).join(' | ') || 'No active hospitals'}</Text>
      <View style={styles.row}><Btn title={form.id ? 'Update doctor' : 'Create doctor'} compact loading={workingId === (form.id ?? 0)} onPress={save}/>{form.id ? <Btn title="Cancel" compact variant="outline" onPress={() => setForm(emptyForm)}/> : null}</View>
    </Card>

    <Card>
      <Input label="Search" value={search} placeholder="Name, email or phone" onChangeText={setSearch} onSubmitEditing={() => setAppliedSearch(search.trim())}/>
      <View style={styles.row}><Btn title="Search" compact onPress={() => setAppliedSearch(search.trim())}/><Btn title="Clear" compact variant="outline" onPress={() => { setSearch(''); setAppliedSearch(''); }}/></View>
      <View style={styles.row}>{['active', 'inactive', 'deleted', 'all'].map(x => <Btn key={x} title={x[0].toUpperCase() + x.slice(1)} compact variant={status === x ? 'primary' : 'outline'} onPress={() => setStatus(x)}/>)}</View>
    </Card>

    <Text style={{ color: theme.muted, fontWeight: '700', marginBottom: 10 }}>{pagination.totalItems} doctor(s) found</Text>
    {loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
    {!loading && doctors.length === 0 ? <Card><Text style={{ color: theme.muted }}>No doctors match the selected filters.</Text></Card> : null}
    {!loading && doctors.map(d => <Card key={d.id}>
      <Text style={[styles.name, { color: theme.text }]}>{d.name}</Text><Text style={{ color: theme.muted }}>{d.email}</Text><Text style={{ color: theme.muted }}>{d.phone}</Text>
      <Text style={{ color: theme.muted, marginTop: 6 }}>Hospitals: {d.hospitals || 'Not assigned'}</Text>
      <Text style={{ fontWeight: '800', marginTop: 8, color: d.deleted_at ? '#b42318' : d.is_active ? '#087443' : '#9a6700' }}>{d.deleted_at ? 'Deleted' : d.is_active ? 'Active' : 'Inactive'}</Text>
      <View style={styles.row}>{d.deleted_at ? <Btn title="Restore" compact loading={workingId === d.id} onPress={() => restore(d)}/> : <><Btn title="Edit" compact variant="outline" onPress={() => edit(d)}/><Btn title={d.is_active ? 'Deactivate' : 'Activate'} compact variant="secondary" loading={workingId === d.id} onPress={() => toggle(d)}/><Btn title="Delete" compact variant="danger" onPress={() => remove(d)}/></>}</View>
    </Card>)}
    <View style={[styles.row, { justifyContent: 'space-between' }]}><Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1 || loading} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text, fontWeight: '800' }}>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</Text><Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onPress={() => load(pagination.page + 1)}/></View>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 18, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 6, marginBottom: 16, lineHeight: 21 }, section: { fontSize: 20, fontWeight: '900', marginBottom: 14 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 8 }, name: { fontSize: 18, fontWeight: '900', marginBottom: 4 } });
