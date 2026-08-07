/**
 * File: frontend/src/app/(hospital-admin)/users.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/apiService';
import { Btn, Card, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';

export default function HospitalUsers() {
  const { theme } = useApp();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/hospital-admin/users');
      setUsers(response.data.data || []);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => filter === 'ALL' ? users : users.filter((user) => user.role === filter), [filter, users]);

  return <Screen>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/> }>
      <Text style={[styles.title, { color: theme.text }]}>Hospital Users</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Parents who booked appointments and doctors assigned to your hospital.</Text>
      <View style={styles.row}>
        {['ALL', 'PARENT', 'DOCTOR'].map((role) => <Btn key={role} title={role === 'ALL' ? 'All users' : role === 'PARENT' ? 'Parents' : 'Doctors'} compact variant={filter === role ? 'primary' : 'outline'} onPress={() => setFilter(role)}/>)}
      </View>
      <Text style={[styles.count, { color: theme.muted }]}>{visible.length} user(s)</Text>
      {loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
      {!loading && visible.map((user) => <Card key={`${user.role}-${user.id}`}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]}>{user.role === 'DOCTOR' ? `Dr. ${user.name}` : user.name}</Text>
            <Text style={{ color: theme.muted }}>{user.email}</Text>
            <Text style={{ color: theme.muted }}>{user.phone || 'Phone not available'}</Text>
          </View>
          <Text style={[styles.badge, { color: theme.primary, borderColor: theme.border }]}>{user.role}</Text>
        </View>
        <Text style={{ color: theme.muted, marginTop: 8 }}>Appointments: {user.appointment_count || 0}</Text>
        <Text style={{ color: theme.muted }}>Children: {user.children_count || 0}</Text>
        <Text style={{ color: user.is_active ? '#087443' : '#9a6700', fontWeight: '800', marginTop: 5 }}>{user.is_active ? 'Active' : 'Inactive'}</Text>
      </Card>)}
      {!loading && visible.length === 0 ? <Card><Text style={{ color: theme.muted }}>No users found for this hospital.</Text></Card> : null}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: 6, marginBottom: 14, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  count: { fontWeight: '700', marginBottom: 10 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  name: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '800' }
});
