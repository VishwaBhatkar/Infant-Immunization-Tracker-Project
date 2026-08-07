/**
 * File: frontend/src/app/(hospital-admin)/parents.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/apiService';
import { Card, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';

export default function HospitalParents() {
  const { theme } = useApp();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/hospital-admin/parents'); setParents(r.data.data || []); }
    catch (error) { showError(error); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <Screen>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Booking Parents</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Parents who booked a doctor appointment at your hospital.</Text>
      {parents.map((parent) => <Card key={parent.id}>
        <Text style={[styles.name, { color: theme.text }]}>{parent.name}</Text>
        <Text style={{ color: theme.muted }}>{parent.email}</Text>
        <Text style={{ color: theme.muted }}>{parent.phone}</Text>
        <Text style={{ color: theme.muted }}>Appointments: {parent.appointment_count}</Text>
        <Text style={{ color: theme.muted }}>Children: {parent.children_count}</Text>
      </Card>)}
      {!loading && parents.length === 0 ? <Text style={{ color: theme.muted }}>No parent has booked an appointment at this hospital.</Text> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({content:{paddingVertical:18,paddingBottom:40},title:{fontSize:28,fontWeight:'900'},subtitle:{marginTop:5,marginBottom:16},name:{fontSize:18,fontWeight:'800',marginBottom:5}});
