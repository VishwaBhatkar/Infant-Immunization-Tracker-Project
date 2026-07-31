import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/Feedback';
const emptyForm = {
    name: '',
    description: '',
    disease_prevented: '',
    recommended_age_days: '',
    dose_number: '1',
    gap_between_doses_days: '',
    administration_route: 'INTRAMUSCULAR'
};
export default function VaccineManagement() {
    const { theme } = useApp();
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const load = useCallback(async (showRefresh = false) => {
        showRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const response = await api.get('/vaccines', { params: { search, status, limit: 100 } });
            setItems(response.data.data.items);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, status]);
    useEffect(() => { void load(); }, [load]);
    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };
    const reset = () => {
        setForm(emptyForm);
        setEditingId(null);
    };
    const submit = async () => {
        if (submitting)
            return;
        setSubmitting(true);
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            disease_prevented: form.disease_prevented.trim() || null,
            recommended_age_days: Number(form.recommended_age_days),
            dose_number: Number(form.dose_number),
            gap_between_doses_days: form.gap_between_doses_days ? Number(form.gap_between_doses_days) : null,
            administration_route: form.administration_route
        };
        try {
            if (editingId)
                await api.patch(`/vaccines/${editingId}`, payload);
            else
                await api.post('/vaccines', payload);
            reset();
            await load();
            showToast(editingId ? 'Vaccine updated successfully' : 'Vaccine created successfully');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSubmitting(false);
        }
    };
    const edit = (item) => {
        setEditingId(item.id);
        setForm({
            name: item.name,
            description: item.description || '',
            disease_prevented: item.disease_prevented || '',
            recommended_age_days: String(item.recommended_age_days),
            dose_number: String(item.dose_number),
            gap_between_doses_days: item.gap_between_doses_days == null ? '' : String(item.gap_between_doses_days),
            administration_route: item.administration_route || 'INTRAMUSCULAR'
        });
    };
    const toggle = async (item) => {
        try {
            await api.patch(`/vaccines/${item.id}/status`);
            await load();
        }
        catch (error) {
            showError(error);
        }
    };
    const remove = (item) => {
        Alert.alert('Delete vaccine?', `${item.name} dose ${item.dose_number} will be permanently deleted only if it is unused.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/vaccines/${item.id}`);
                        await load();
                    }
                    catch (error) {
                        showError(error);
                    }
                } }
        ]);
    };
    const Filter = ({ value }) => (<Pressable onPress={() => setStatus(value)} style={[styles.chip, { borderColor: theme.border, backgroundColor: status === value ? theme.primary : theme.card }]}>
      <Text style={{ color: status === value ? 'white' : theme.text }}>{value}</Text>
    </Pressable>);
    return (<Screen>
      <FlatList data={items} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)}/>} ListHeaderComponent={<>
          <Text style={[styles.title, { color: theme.text }]}>Vaccine Management</Text>
          <Card>
            <Text style={[styles.heading, { color: theme.text }]}>{editingId ? 'Edit vaccine' : 'Add vaccine'}</Text>
            <Input placeholder="Vaccine name" value={form.name} onChangeText={(v) => setField('name', v)}/>
            <Input placeholder="Disease prevented" value={form.disease_prevented} onChangeText={(v) => setField('disease_prevented', v)}/>
            <Input placeholder="Description" value={form.description} onChangeText={(v) => setField('description', v)} multiline/>
            <Input placeholder="Recommended age in days" value={form.recommended_age_days} onChangeText={(v) => setField('recommended_age_days', v)} keyboardType="numeric"/>
            <Input placeholder="Dose number" value={form.dose_number} onChangeText={(v) => setField('dose_number', v)} keyboardType="numeric"/>
            <Input placeholder="Gap between doses in days" value={form.gap_between_doses_days} onChangeText={(v) => setField('gap_between_doses_days', v)} keyboardType="numeric"/>
            <Text style={{ color: theme.muted, marginBottom: 8 }}>Administration route</Text>
            <View style={styles.row}>
              {['ORAL', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INTRADERMAL', 'OTHER'].map((route) => (<Pressable key={route} onPress={() => setField('administration_route', route)} style={[styles.chip, { borderColor: theme.border, backgroundColor: form.administration_route === route ? theme.primary : theme.card }]}>
                  <Text style={{ color: form.administration_route === route ? 'white' : theme.text, fontSize: 12 }}>{route}</Text>
                </Pressable>))}
            </View>
            <Btn title={editingId ? 'Update Vaccine' : 'Add Vaccine'} onPress={() => void submit()} loading={submitting}/>
            {editingId ? <Btn title="Cancel Editing" onPress={reset}/> : null}
          </Card>
          <Input placeholder="Search vaccine or disease" value={search} onChangeText={setSearch}/>
          <View style={styles.row}><Filter value="ALL"/><Filter value="ACTIVE"/><Filter value="INACTIVE"/></View>
          {loading ? <Text style={{ color: theme.muted, marginVertical: 12 }}>Loading vaccines…</Text> : null}
          {!loading && !items.length ? <Text style={{ color: theme.muted, marginVertical: 12 }}>No vaccines found.</Text> : null}
        </>} renderItem={({ item }) => <Card>
          <View style={styles.between}>
            <Text style={[styles.heading, { color: theme.text }]}>{item.name} · Dose {item.dose_number}</Text>
            <Text style={{ color: item.is_active ? '#15803d' : '#b91c1c', fontWeight: '700' }}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
          <Text style={{ color: theme.text }}>Disease: {item.disease_prevented || 'Not specified'}</Text>
          <Text style={{ color: theme.text }}>Recommended age: {item.recommended_age_days} days</Text>
          <Text style={{ color: theme.text }}>Dose gap: {item.gap_between_doses_days ?? 'Not specified'} days</Text>
          <Text style={{ color: theme.text }}>Route: {item.administration_route || 'Not specified'}</Text>
          {item.description ? <Text style={{ color: theme.muted, marginTop: 6 }}>{item.description}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={() => edit(item)}><Text style={{ color: theme.primary, fontWeight: '700' }}>Edit</Text></Pressable>
            <Pressable onPress={() => void toggle(item)}><Text style={{ color: theme.primary, fontWeight: '700' }}>{item.is_active ? 'Deactivate' : 'Activate'}</Text></Pressable>
            <Pressable onPress={() => remove(item)}><Text style={{ color: '#b91c1c', fontWeight: '700' }}>Delete</Text></Pressable>
          </View>
        </Card>}/>
    </Screen>);
}
const styles = StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', marginBottom: 12 },
    heading: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
    between: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }
});
