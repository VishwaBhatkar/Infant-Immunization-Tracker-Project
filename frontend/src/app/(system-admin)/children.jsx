import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { useApp } from '@/context/AppContext';
export default function ChildrenScreen() {
    const { theme } = useApp();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [gender, setGender] = useState('all');
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const load = useCallback(async (page = 1) => { try {
        setLoading(true);
        const r = await api.get('/admin/children', { params: { page, limit: 10, search: appliedSearch || undefined, gender: gender === 'all' ? undefined : gender } });
        setItems(r.data.data);
        setPagination(r.data.pagination);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setLoading(false);
    } }, [appliedSearch, gender]);
    useEffect(() => { void load(1); }, [load]);
    const open = async (id) => { try {
        setDetailLoading(true);
        const r = await api.get(`/admin/children/${id}`);
        setDetail(r.data.data);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setDetailLoading(false);
    } };
    if (detailLoading)
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    if (detail)
        return <Screen><ScrollView contentContainerStyle={styles.content}><View style={styles.row}><Btn title="Back to children" compact variant="outline" onPress={() => setDetail(null)}/></View><Text style={[styles.title, { color: theme.text }]}>{detail.child.name}</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Complete read-only child health record for authorised System Admin review.</Text>
  <Card><Text style={[styles.section, { color: theme.text }]}>Profile</Text><Text style={{ color: theme.muted }}>Parent: {detail.child.parent_name}</Text><Text style={{ color: theme.muted }}>Email: {detail.child.parent_email}</Text><Text style={{ color: theme.muted }}>DOB: {String(detail.child.dob).slice(0, 10)} · Gender: {detail.child.gender}</Text><Text style={{ color: theme.muted }}>Blood group: {detail.child.blood_group || 'Not recorded'}</Text><Text style={{ color: theme.muted }}>Allergies: {detail.child.allergies || 'None recorded'}</Text><Text style={{ color: theme.muted }}>Medical notes: {detail.child.medical_notes || 'None recorded'}</Text></Card>
  <Section title="Appointments" data={detail.appointments} empty="No appointments" render={(x) => <Text style={{ color: theme.muted }}>{String(x.appointment_date).slice(0, 10)} {x.appointment_time} · {x.doctor_name} · {x.hospital_name} · {x.status}</Text>}/>
  <Section title="Vaccine schedule" data={detail.schedules} empty="No vaccine schedule" render={(x) => <Text style={{ color: theme.muted }}>{x.vaccine_name} dose {x.dose_number} · Due {String(x.due_date).slice(0, 10)} · {x.status}</Text>}/>
  <Section title="Immunisation history" data={detail.immunizations} empty="No immunisation records" render={(x) => <Text style={{ color: theme.muted }}>{x.vaccine_name} · {String(x.administered_on || '').slice(0, 10)} · {x.doctor_name || 'Doctor not recorded'}</Text>}/>
  <Section title="Growth records" data={detail.growth_records} empty="No growth records" render={(x) => <Text style={{ color: theme.muted }}>{String(x.measured_on).slice(0, 10)} · {x.height_cm} cm · {x.weight_kg} kg{x.head_circumference_cm ? ` · Head ${x.head_circumference_cm} cm` : ''}</Text>}/>
  <Section title="Medical history" data={detail.medical_history} empty="No medical history" render={(x) => <Text style={{ color: theme.muted }}>{String(x.record_date).slice(0, 10)} · {x.record_type} · {x.title}{x.description ? ` — ${x.description}` : ''}</Text>}/>
 </ScrollView></Screen>;
    return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={[styles.title, { color: theme.text }]}>Child Records</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Search children and securely review vaccination, appointment, growth and medical history.</Text><Card><Input label="Search" value={search} placeholder="Child, parent, email or phone" onChangeText={setSearch} onSubmitEditing={() => setAppliedSearch(search.trim())}/><View style={styles.row}><Btn title="Search" compact onPress={() => setAppliedSearch(search.trim())}/><Btn title="Clear" compact variant="outline" onPress={() => { setSearch(''); setAppliedSearch(''); }}/></View><View style={styles.row}>{['all', 'MALE', 'FEMALE', 'OTHER'].map(x => <Btn key={x} title={x === 'all' ? 'All' : x[0] + x.slice(1).toLowerCase()} compact variant={gender === x ? 'primary' : 'outline'} onPress={() => setGender(x)}/>)}</View></Card><Text style={{ color: theme.muted, fontWeight: '700', marginBottom: 10 }}>{pagination.totalItems} child record(s) found</Text>{loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}{!loading && items.length === 0 ? <Card><Text style={{ color: theme.muted }}>No child records match the filters.</Text></Card> : null}{!loading && items.map(c => <Card key={c.id}><Text style={[styles.name, { color: theme.text }]}>{c.name}</Text><Text style={{ color: theme.muted }}>Parent: {c.parent_name}</Text><Text style={{ color: theme.muted }}>{c.parent_email}{c.parent_phone ? ` · ${c.parent_phone}` : ''}</Text><Text style={{ color: theme.muted }}>DOB: {String(c.dob).slice(0, 10)} · {c.gender} · Blood: {c.blood_group || 'N/A'}</Text><Text style={{ color: theme.muted, marginTop: 7 }}>Appointments: {c.appointment_count} · Immunisations: {c.immunization_count}</Text><Text style={{ color: theme.muted }}>Growth: {c.growth_count} · Medical history: {c.medical_history_count}</Text><View style={styles.row}><Btn title="View complete record" compact onPress={() => open(c.id)}/></View></Card>)}<View style={[styles.row, { justifyContent: 'space-between' }]}><Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1 || loading} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text, fontWeight: '800' }}>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</Text><Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onPress={() => load(pagination.page + 1)}/></View></ScrollView></Screen>;
}
function Section({ title, data, empty, render }) { const { theme } = useApp(); return <Card><Text style={[styles.section, { color: theme.text }]}>{title}</Text>{data.length ? data.map((x, i) => <View key={x.id ?? i} style={styles.item}>{render(x)}</View>) : <Text style={{ color: theme.muted }}>{empty}</Text>}</Card>; }
const styles = StyleSheet.create({ content: { paddingTop: 18, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 6, marginBottom: 16, lineHeight: 21 }, section: { fontSize: 20, fontWeight: '900', marginBottom: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 8 }, name: { fontSize: 18, fontWeight: '900', marginBottom: 4 }, item: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#9995' } });
