/**
 * File: frontend/src/app/(hospital-admin)/children.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '@/services/apiService';
import { Card, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';

export default function HospitalChildren() {
  const { theme } = useApp();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/hospital-admin/children');
      setChildren(response.data.data || []);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <Screen>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/> }>
      <Text style={[styles.title, { color: theme.text }]}>Hospital Children</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Children who have an appointment or completed vaccination at your hospital.</Text>
      <Text style={[styles.count, { color: theme.muted }]}>{children.length} child record(s)</Text>
      {loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
      {!loading && children.map((child) => <Card key={child.id}>
        <Text style={[styles.name, { color: theme.text }]}>{child.name}</Text>
        <Text style={{ color: theme.muted }}>Parent: {child.parent_name}</Text>
        <Text style={{ color: theme.muted }}>{child.parent_email}{child.parent_phone ? ` · ${child.parent_phone}` : ''}</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>DOB: {String(child.dob).slice(0, 10)} · {child.gender}</Text>
        <Text style={{ color: theme.muted }}>Blood group: {child.blood_group || 'Not recorded'}</Text>
        <Text style={{ color: theme.muted }}>Appointments: {child.appointment_count || 0}</Text>
        <Text style={{ color: theme.muted }}>Completed vaccinations: {child.completed_vaccinations || 0}</Text>
      </Card>)}
      {!loading && children.length === 0 ? <Card><Text style={{ color: theme.muted }}>No children are linked to this hospital yet.</Text></Card> : null}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: 6, marginBottom: 12, lineHeight: 20 },
  count: { fontWeight: '700', marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '900', marginBottom: 5 }
});
