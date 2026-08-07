/**
 * File: frontend/src/screens/ImmunizationRecordsScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
export default function ImmunizationRecordsScreen({ canManage = false, title = 'Immunization Records', subtitle = 'Official completed vaccination history.' }) {
    const { theme, user } = useApp();
    const [records, setRecords] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [scheduleId, setScheduleId] = useState('');
    const [hospitalId, setHospitalId] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [batch, setBatch] = useState('');
    const [expiry, setExpiry] = useState('');
    const [site, setSite] = useState('');
    const [notes, setNotes] = useState('');
    const [proof, setProof] = useState('');
    const load = useCallback(async () => {
        try {
            const requests = [api.get('/immunization-records')];
            if (canManage)
                requests.push(api.get('/vaccine-schedules'), api.get('/my-hospitals'));
            const responses = await Promise.all(requests);
            setRecords(responses[0].data.data || []);
            if (canManage) {
                setSchedules((responses[1].data.data || []).filter((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'));
                setHospitals(responses[2].data.data || []);
            }
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [canManage]);
    useEffect(() => { void load(); }, [load]);
    const loadDoctors = async (selectedHospitalId) => {
        setHospitalId(String(selectedHospitalId));
        setDoctorId('');
        setDoctors([]);
        if (user?.role === 'DOCTOR')
            return;
        try {
            const response = await api.get('/doctors', { params: { hospital_id: selectedHospitalId } });
            setDoctors(response.data.data || []);
        }
        catch (error) {
            showError(error);
        }
    };
    const clearForm = () => {
        setEditingId(null);
        setScheduleId('');
        setHospitalId('');
        setDoctorId('');
        setDoctors([]);
        setBatch('');
        setExpiry('');
        setSite('');
        setNotes('');
        setProof('');
    };
    const submit = async () => {
        setSaving(true);
        try {
            const payload = {
                hospital_id: Number(hospitalId),
                doctor_id: user?.role === 'DOCTOR' ? undefined : Number(doctorId),
                vaccination_date: date,
                batch_number: batch || null,
                expiry_date: expiry || null,
                injection_site: site || null,
                notes: notes || null,
                proof_image_url: proof || null
            };
            if (editingId)
                await api.patch(`/immunization-records/${editingId}`, payload);
            else
                await api.post('/immunization-records', { ...payload, schedule_id: Number(scheduleId) });
            clearForm();
            await load();
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSaving(false);
        }
    };
    const edit = (item) => {
        setEditingId(item.id);
        setScheduleId(String(item.schedule_id));
        setHospitalId(String(item.hospital_id));
        setDoctorId(String(item.doctor_id));
        setDate(item.vaccination_date);
        setBatch(item.batch_number || '');
        setExpiry(item.expiry_date || '');
        setSite(item.injection_site || '');
        setNotes(item.notes || '');
        setProof(item.proof_image_url || '');
        if (user?.role !== 'DOCTOR') {
            void api.get('/doctors', { params: { hospital_id: item.hospital_id } })
                .then((response) => setDoctors(response.data.data || []))
                .catch(showError);
        }
    };
    const remove = (id) => Alert.alert('Delete record', 'This restores the vaccine schedule so it can be recorded again.', [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Delete', style: 'destructive',
            onPress: () => void api.delete(`/immunization-records/${id}`).then(load).catch(showError)
        }
    ]);
    if (loading)
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    const needsDoctor = user?.role !== 'DOCTOR';
    return (<Screen>
      <FlatList data={records} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}/>} ListHeaderComponent={<View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={{ color: theme.muted, marginBottom: 14 }}>{subtitle}</Text>
          {canManage && <Card>
            <Text style={[styles.heading, { color: theme.text }]}>
              {editingId ? 'Edit immunization record' : 'Mark vaccine completed'}
            </Text>
            {!editingId && <>
              <Text style={[styles.label, { color: theme.text }]}>Schedule item</Text>
              <View style={styles.chips}>{schedules.map((item) => <Choice key={item.id} selected={scheduleId === String(item.id)} label={`${item.child_name}: ${item.vaccine_name} D${item.dose_number}`} onPress={() => setScheduleId(String(item.id))} theme={theme}/>)}</View>
            </>}
            <Text style={[styles.label, { color: theme.text }]}>Hospital</Text>
            <View style={styles.chips}>{hospitals.map((item) => <Choice key={item.id} selected={hospitalId === String(item.id)} label={item.name} onPress={() => void loadDoctors(item.id)} theme={theme}/>)}</View>
            {needsDoctor && <>
              <Text style={[styles.label, { color: theme.text }]}>Doctor</Text>
              <View style={styles.chips}>{doctors.map((item) => <Choice key={item.id} selected={doctorId === String(item.id)} label={`Dr. ${item.name}`} onPress={() => setDoctorId(String(item.id))} theme={theme}/>)}</View>
            </>}
            <Input label="Vaccination date" value={date} onChangeText={setDate}/>
            <Input label="Batch number" value={batch} onChangeText={setBatch}/>
            <Input label="Expiry date (optional)" value={expiry} onChangeText={setExpiry}/>
            <Input label="Injection site" value={site} onChangeText={setSite}/>
            <Input label="Notes" value={notes} onChangeText={setNotes} multiline/>
            <Input label="Proof image URL" value={proof} onChangeText={setProof} autoCapitalize="none"/>
            <Btn title={editingId ? 'Update Immunization Record' : 'Save Immunization Record'} onPress={submit} loading={saving} disabled={(!editingId && !scheduleId) || !hospitalId || (needsDoctor && !doctorId)}/>
            {editingId && <Btn title="Cancel editing" onPress={clearForm}/>}
          </Card>}
          <View style={{ height: 8 }}/>
        </View>} renderItem={({ item }) => <Card>
          <Text style={[styles.heading, { color: theme.text }]}>{item.child_name} · {item.vaccine_name} Dose {item.dose_number}</Text>
          <Text style={{ color: theme.muted }}>Vaccinated: {item.vaccination_date}</Text>
          <Text style={{ color: theme.text, marginTop: 5 }}>{item.hospital_name}{item.doctor_name ? ` · Dr. ${item.doctor_name}` : ''}</Text>
          {item.batch_number && <Text style={{ color: theme.muted }}>Batch: {item.batch_number}</Text>}
          {item.expiry_date && <Text style={{ color: theme.muted }}>Expiry: {item.expiry_date}</Text>}
          {item.injection_site && <Text style={{ color: theme.muted }}>Site: {item.injection_site}</Text>}
          {item.next_dose_date && <Text style={{ color: theme.text, marginTop: 5 }}>Next dose: {item.next_dose_date}</Text>}
          {item.notes && <Text style={{ color: theme.muted, marginTop: 5 }}>{item.notes}</Text>}
          {item.proof_image_url && <Text style={{ color: theme.primary, marginTop: 5 }}>Proof: {item.proof_image_url}</Text>}
          {canManage && <View style={styles.actions}>
            <Btn title="Edit" onPress={() => edit(item)}/>
            <Btn title="Delete" onPress={() => remove(item.id)}/>
          </View>}
        </Card>} ListEmptyComponent={<Card><Text style={{ color: theme.muted }}>No immunization records are available.</Text></Card>} contentContainerStyle={{ paddingBottom: 24 }}/>
    </Screen>);
}
function Choice({ selected, label, onPress, theme }) {
    return <Pressable onPress={onPress} style={[styles.chip, {
                borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.card
            }]}><Text style={{ color: selected ? '#fff' : theme.text }}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800' },
    heading: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
    label: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
    chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 10 }
});
