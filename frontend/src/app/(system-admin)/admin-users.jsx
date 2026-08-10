/**
 * File: frontend/src/app/(system-admin)/admin-users.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/apiService';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { confirmAction } from '@/utils/confirmationUtils';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
const blankForm = { name: '', email: '', phone: '', password: '', role: 'HOSPITAL_ADMIN', hospital_id: '' };
export default function AdminUsersScreen() {
    const { theme } = useApp();
    const [rows, setRows] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [role, setRole] = useState('');
    const [form, setForm] = useState(blankForm);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workingId, setWorkingId] = useState(null);
    const load = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/admin/admin-users', { params: { page, limit: 10, search: appliedSearch || undefined, status, role: role || undefined } });
            setRows(response.data.data);
            setPagination(response.data.pagination);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setLoading(false);
        }
    }, [appliedSearch, status, role]);
    useEffect(() => { void load(1); }, [load]);
    useEffect(() => { api.get('/admin/hospitals/options').then(r => setHospitals(r.data.data)).catch(showError); }, []);
    const selectHospital = (id) => setForm(v => ({ ...v, hospital_id: String(id) }));
    const startEdit = (row) => { setEditing(row); setForm({ name: row.name, email: row.email, phone: row.phone, password: '', role: row.role, hospital_id: row.hospital_id ? String(row.hospital_id) : '' }); };
    const clearForm = () => { setEditing(null); setForm(blankForm); };
    const save = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.phone.trim())
            return Alert.alert('Validation', 'Name, email and phone are required.');
        if (!editing && form.password.length < 8)
            return Alert.alert('Validation', 'Password must contain at least 8 characters.');
        if (form.role === 'HOSPITAL_ADMIN' && !form.hospital_id)
            return Alert.alert('Validation', 'Select a hospital for the Hospital Admin.');
        const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role, hospital_id: form.role === 'HOSPITAL_ADMIN' ? Number(form.hospital_id) : null, ...(!editing ? { password: form.password } : { reason: 'Updated from Admin User Management' }) };
        try {
            setSaving(true);
            if (editing)
                await api.put(`/admin/admin-users/${editing.id}`, payload);
            else
                await api.post('/admin/admin-users', payload);
            showToast(editing ? 'Admin updated successfully.' : 'Admin created successfully.');
            clearForm();
            await load(1);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setSaving(false);
        }
    };
    const changeStatus = async (row) => {
        const activate = !row.is_active;
        if (!(await confirmAction(`${activate ? 'Activate' : 'Deactivate'} Admin`, `${activate ? 'Activate' : 'Deactivate'} ${row.name}?`, activate ? 'Activate' : 'Deactivate')))
            return;
        try {
            setWorkingId(row.id);
            await api.patch(`/admin/admin-users/${row.id}/status`, { is_active: activate, reason: 'Changed from Admin User Management' });
            await load(pagination.page);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const remove = async (row) => {
        if (!(await confirmAction('Delete Admin', `Soft-delete ${row.name}?`, 'Delete')))
            return;
        try {
            setWorkingId(row.id);
            await api.delete(`/admin/admin-users/${row.id}`, { data: { reason: 'Deleted from Admin User Management' } });
            await load(1);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const restore = async (row) => {
        try {
            setWorkingId(row.id);
            await api.patch(`/admin/admin-users/${row.id}/restore`);
            await load(pagination.page);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    const resetPassword = async (row) => {
        const password = `Admin@${new Date().getFullYear()}!`;
        if (!(await confirmAction('Reset password', `Reset ${row.name}'s password to the temporary password shown after completion?`, 'Reset')))
            return;
        try {
            setWorkingId(row.id);
            await api.post(`/admin/admin-users/${row.id}/reset-password`, { new_password: password, reason: 'System Admin initiated reset' });
            Alert.alert('Temporary password', password);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setWorkingId(null);
        }
    };
    return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: theme.text }]}>Admin User Management</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Create and manage System Admin and Hospital Admin accounts.</Text>

    <Card>
      <Text style={[styles.section, { color: theme.text }]}>{editing ? 'Edit Admin' : 'Create Admin'}</Text>
      <Input label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}/>
      <Input label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={v => setForm(f => ({ ...f, email: v }))}/>
      <Input label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={v => setForm(f => ({ ...f, phone: v }))}/>
      {!editing ? <Input label="Initial password" value={form.password} secureTextEntry onChangeText={v => setForm(f => ({ ...f, password: v }))}/> : null}
      <Text style={[styles.label, { color: theme.text }]}>Role</Text>
      <View style={styles.row}><Btn compact title="Hospital Admin" variant={form.role === 'HOSPITAL_ADMIN' ? 'primary' : 'outline'} onPress={() => setForm(f => ({ ...f, role: 'HOSPITAL_ADMIN' }))}/><Btn compact title="System Admin" variant={form.role === 'SYSTEM_ADMIN' ? 'primary' : 'outline'} onPress={() => setForm(f => ({ ...f, role: 'SYSTEM_ADMIN', hospital_id: '' }))}/></View>
      {form.role === 'HOSPITAL_ADMIN' ? <><Text style={[styles.label, { color: theme.text }]}>Assigned hospital</Text><View style={styles.row}>{hospitals.map(h => <Btn key={h.id} compact title={h.name} variant={form.hospital_id === String(h.id) ? 'primary' : 'outline'} onPress={() => selectHospital(h.id)}/>)}</View></> : null}
      <View style={styles.row}><Btn title={editing ? 'Update Admin' : 'Create Admin'} loading={saving} onPress={save}/>{editing ? <Btn title="Cancel" variant="outline" onPress={clearForm}/> : null}</View>
    </Card>

    <Card><Input label="Search" value={search} onChangeText={setSearch} placeholder="Name, email, phone or hospital"/><View style={styles.row}><Btn compact title="Search" onPress={() => setAppliedSearch(search.trim())}/><Btn compact title="Clear" variant="outline" onPress={() => { setSearch(''); setAppliedSearch(''); }}/></View>
      <Text style={[styles.label, { color: theme.text }]}>Status</Text><View style={styles.row}>{['active', 'inactive', 'deleted', 'all'].map(v => <Btn key={v} compact title={v} variant={status === v ? 'primary' : 'outline'} onPress={() => setStatus(v)}/>)}</View>
      <Text style={[styles.label, { color: theme.text }]}>Role</Text><View style={styles.row}><Btn compact title="All" variant={role === '' ? 'primary' : 'outline'} onPress={() => setRole('')}/><Btn compact title="System" variant={role === 'SYSTEM_ADMIN' ? 'primary' : 'outline'} onPress={() => setRole('SYSTEM_ADMIN')}/><Btn compact title="Hospital" variant={role === 'HOSPITAL_ADMIN' ? 'primary' : 'outline'} onPress={() => setRole('HOSPITAL_ADMIN')}/></View>
    </Card>

    <Text style={{ color: theme.muted, fontWeight: '700' }}>{pagination.totalItems} Admin account(s)</Text>
    {loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
    {!loading && rows.map(row => <Card key={row.id}><Text style={[styles.name, { color: theme.text }]}>{row.name}</Text><Text style={{ color: theme.muted }}>{row.email} · {row.phone}</Text><Text style={{ color: theme.text, fontWeight: '800', marginTop: 8 }}>{row.role}{row.hospital_name ? ` · ${row.hospital_name}` : ''}</Text><Text style={{ color: row.deleted_at ? '#b42318' : row.is_active ? '#087443' : '#9a6700', fontWeight: '900', marginTop: 5 }}>{row.deleted_at ? 'Deleted' : row.is_active ? 'Active' : 'Inactive'}</Text><View style={styles.row}>{row.deleted_at ? <Btn compact title="Restore" loading={workingId === row.id} onPress={() => restore(row)}/> : <><Btn compact title="Edit" variant="outline" onPress={() => startEdit(row)}/><Btn compact title={row.is_active ? 'Deactivate' : 'Activate'} variant="secondary" loading={workingId === row.id} onPress={() => changeStatus(row)}/><Btn compact title="Reset Password" variant="outline" onPress={() => resetPassword(row)}/><Btn compact title="Delete" variant="danger" onPress={() => remove(row)}/></>}</View></Card>)}
    <View style={styles.pagination}><Btn compact title="Previous" variant="outline" disabled={pagination.page <= 1 || loading} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text, fontWeight: '800' }}>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</Text><Btn compact title="Next" variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onPress={() => load(pagination.page + 1)}/></View>
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { paddingTop: 18, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 6, marginBottom: 16 }, section: { fontSize: 20, fontWeight: '900', marginBottom: 10 }, label: { fontWeight: '800', marginTop: 12, marginBottom: 7 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, name: { fontSize: 18, fontWeight: '900' }, pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 } });
