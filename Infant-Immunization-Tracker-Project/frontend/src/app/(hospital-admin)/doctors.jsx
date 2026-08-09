/**
 * File: frontend/src/app/(hospital-admin)/doctors.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/apiService';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';

export default function HospitalDoctors() {
  const { theme } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hospital-admin/doctors');
      setDoctors(response.data.data || []);
    } catch (error) { showError(error); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addDoctor = async () => {
    setSaving(true);
    try {
      await api.post('/hospital-admin/doctors', form);
      setForm({ name: '', email: '', phone: '', password: '' });
      showToast('Doctor added to your hospital.');
      await load();
    } catch (error) { showError(error); }
    finally { setSaving(false); }
  };

  const confirmRemoval = (doctor) => {
    const message = `Remove ${doctor.name} from this hospital? Existing appointments will remain in history.`;

    if (Platform.OS === 'web') {
      return Promise.resolve(globalThis.confirm(message));
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Remove doctor',
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Remove', style: 'destructive', onPress: () => resolve(true) }
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  };

  const removeDoctor = async (doctor) => {
    const confirmed = await confirmRemoval(doctor);
    if (!confirmed) return;

    setRemovingId(doctor.id);
    try {
      await api.delete(`/hospital-admin/doctors/${doctor.id}`);
      setDoctors((current) => current.filter((item) => item.id !== doctor.id));
      showToast(`${doctor.name} was removed from this hospital.`);
    } catch (error) {
      showError(error);
      await load();
    } finally {
      setRemovingId(null);
    }
  };

  return <Screen>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Manage Doctors</Text>
      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Add Doctor</Text>
        <Input label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })}/>
        <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })}/>
        <Input label="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })}/>
        <Input label="Temporary password" secureTextEntry value={form.password} onChangeText={(password) => setForm({ ...form, password })}/>
        <Btn title="Add Doctor" loading={saving} onPress={addDoctor}/>
      </Card>
      <Text style={[styles.heading, { color: theme.text }]}>Doctors ({doctors.length})</Text>
      {doctors.map((doctor) => <Card key={doctor.id}>
        <Text style={[styles.name, { color: theme.text }]}>{doctor.name}</Text>
        <Text style={{ color: theme.muted }}>{doctor.email}</Text>
        <Text style={{ color: theme.muted }}>{doctor.phone}</Text>
        <Text style={{ color: theme.muted }}>Appointments: {doctor.appointment_count || 0}</Text>
        <View style={styles.action}><Btn compact variant="danger" title="Remove" loading={removingId === doctor.id} disabled={removingId !== null} onPress={() => removeDoctor(doctor)}/></View>
      </Card>)}
      {!loading && doctors.length === 0 ? <Text style={{ color: theme.muted }}>No doctors assigned to this hospital.</Text> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ content:{paddingVertical:18,paddingBottom:40},title:{fontSize:28,fontWeight:'900',marginBottom:16},heading:{fontSize:19,fontWeight:'800',marginBottom:12},name:{fontSize:18,fontWeight:'800',marginBottom:5},action:{alignItems:'flex-end',marginTop:12} });
