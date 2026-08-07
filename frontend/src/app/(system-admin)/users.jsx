/**
 * File: frontend/src/app/(system-admin)/users.jsx
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
const statuses = ['active', 'inactive', 'deleted', 'all'];
const roles = ['', 'PARENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'];
export default function UsersScreen() {
    const { theme } = useApp();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [workingId, setWorkingId] = useState(null);
    const loadUsers = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users', {
                params: { page, limit: 10, search: appliedSearch || undefined, status, role: role || undefined }
            });
            setUsers(response.data.data);
            setPagination(response.data.pagination);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
        }
    }, [appliedSearch, role, status]);
    useEffect(() => { void loadUsers(1); }, [loadUsers]);
    const changeStatus = async (user) => {
        const activating = !user.is_active;
        const confirmed = await confirmAction(activating ? 'Activate user' : 'Deactivate user', `${activating ? 'Activate' : 'Deactivate'} ${user.name}?`, activating ? 'Activate' : 'Deactivate');
        if (!confirmed)
            return;
        try {
            setWorkingId(user.id);
            await api.patch(`/admin/users/${user.id}/status`, { is_active: activating });
            showToast(`User ${activating ? 'activated' : 'deactivated'} successfully.`);
            await loadUsers(pagination.page);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setWorkingId(null);
        }
    };
    const deleteUser = async (user) => {
        const confirmed = await confirmAction('Delete user', `Soft-delete ${user.name}? Their historical records will be preserved.`, 'Delete');
        if (!confirmed)
            return;
        try {
            setWorkingId(user.id);
            await api.delete(`/admin/users/${user.id}`, { data: { reason: 'Deleted from System Admin user management' } });
            showToast('User deleted successfully.');
            await loadUsers(1);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setWorkingId(null);
        }
    };
    const restoreUser = async (user) => {
        const confirmed = await confirmAction('Restore user', `Restore ${user.name} and reactivate the account?`, 'Restore');
        if (!confirmed)
            return;
        try {
            setWorkingId(user.id);
            await api.patch(`/admin/users/${user.id}/restore`);
            showToast('User restored successfully.');
            await loadUsers(pagination.page);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setWorkingId(null);
        }
    };
    return (<Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>User Management</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Search, filter, activate, deactivate, delete and restore user accounts.</Text>

        <Card>
          <Input label="Search" value={search} onChangeText={setSearch} placeholder="Name, email or phone" returnKeyType="search" onSubmitEditing={() => setAppliedSearch(search.trim())}/>
          <View style={styles.actionsRow}>
            <Btn title="Search" compact onPress={() => setAppliedSearch(search.trim())}/>
            <Btn title="Clear" compact variant="outline" onPress={() => { setSearch(''); setAppliedSearch(''); }}/>
          </View>

          <Text style={[styles.filterLabel, { color: theme.text }]}>Status</Text>
          <View style={styles.chips}>
            {statuses.map((item) => <Btn key={item} title={item[0].toUpperCase() + item.slice(1)} compact variant={status === item ? 'primary' : 'outline'} onPress={() => setStatus(item)}/>)}
          </View>

          <Text style={[styles.filterLabel, { color: theme.text }]}>Role</Text>
          <View style={styles.chips}>
            {roles.map((item) => <Btn key={item || 'ALL'} title={item || 'All roles'} compact variant={role === item ? 'primary' : 'outline'} onPress={() => setRole(item)}/>)}
          </View>
        </Card>

        <Text style={[styles.resultText, { color: theme.muted }]}>{pagination.totalItems} user(s) found</Text>

        {loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
        {!loading && users.length === 0 ? <Card><Text style={{ color: theme.muted }}>No users match the selected filters.</Text></Card> : null}

        {!loading && users.map((user) => (<Card key={user.id}>
            <View style={styles.userHeader}>
              <View style={styles.flexOne}>
                <Text style={[styles.name, { color: theme.text }]}>{user.name}</Text>
                <Text style={{ color: theme.muted }}>{user.email}</Text>
                <Text style={{ color: theme.muted }}>{user.phone}</Text>
              </View>
              <View style={[styles.badge, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{user.role}</Text>
              </View>
            </View>
            <Text style={[styles.status, { color: user.deleted_at ? '#b42318' : user.is_active ? '#087443' : '#9a6700' }]}>
              {user.deleted_at ? 'Deleted' : user.is_active ? 'Active' : 'Inactive'}
            </Text>
            <Text style={{ color: theme.muted }}>Created: {new Date(user.created_at).toLocaleDateString()}</Text>

            <View style={styles.actionsRow}>
              {user.deleted_at ? (<Btn title="Restore" compact loading={workingId === user.id} onPress={() => restoreUser(user)}/>) : (<>
                  <Btn title={user.is_active ? 'Deactivate' : 'Activate'} compact variant={user.is_active ? 'secondary' : 'primary'} loading={workingId === user.id} onPress={() => changeStatus(user)}/>
                  <Btn title="Delete" compact variant="danger" disabled={workingId === user.id} onPress={() => deleteUser(user)}/>
                </>)}
            </View>
          </Card>))}

        <View style={styles.paginationRow}>
          <Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1 || loading} onPress={() => loadUsers(pagination.page - 1)}/>
          <Text style={[styles.pageText, { color: theme.text }]}>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</Text>
          <Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onPress={() => loadUsers(pagination.page + 1)}/>
        </View>
      </ScrollView>
    </Screen>);
}
const styles = StyleSheet.create({
    content: { paddingTop: 18, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: '900' },
    subtitle: { marginTop: 6, marginBottom: 16, lineHeight: 21 },
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    filterLabel: { fontWeight: '800', marginTop: 14, marginBottom: 8 },
    resultText: { marginBottom: 12, fontWeight: '700' },
    userHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    flexOne: { flex: 1 },
    name: { fontSize: 18, fontWeight: '900', marginBottom: 3 },
    badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    status: { fontWeight: '900', marginTop: 12, marginBottom: 4 },
    paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
    pageText: { fontWeight: '800' }
});
