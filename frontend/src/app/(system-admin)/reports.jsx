import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { useApp } from '@/context/AppContext';
export default function ReportsScreen() {
    const { theme } = useApp();
    const today = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const [start, setStart] = useState(d.toISOString().slice(0, 10)), [end, setEnd] = useState(today);
    const [data, setData] = useState(null), [rows, setRows] = useState([]), [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 }), [loading, setLoading] = useState(true);
    const load = useCallback(async (page = 1) => { try {
        setLoading(true);
        const [o, r] = await Promise.all([api.get('/admin/reports/overview', { params: { start_date: start, end_date: end } }), api.get('/admin/reports/overdue-vaccines', { params: { page, limit: 10 } })]);
        setData(o.data.data);
        setRows(r.data.data);
        setPagination(r.data.pagination);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setLoading(false);
    } }, [start, end]);
    useEffect(() => { void load(1); }, []);
    if (loading && !data)
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    const cards = data ? [['Active parents', data.users.active_parents], ['Active doctors', data.users.active_doctors], ['Appointments', data.appointments.total], ['Completed', data.appointments.completed], ['Vaccinations', data.vaccinations.completed], ['Notification success %', data.notifications.success_rate ?? 0]] : [];
    return <Screen><ScrollView contentContainerStyle={s.content}>
    <Text style={[s.title, { color: theme.text }]}>Reports & Analytics</Text><Text style={{ color: theme.muted }}>Review registrations, appointments, vaccination completion, notification delivery and hospital performance.</Text>
    <Card><View style={s.row}><View style={s.field}><Input label="Start date" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD"/></View><View style={s.field}><Input label="End date" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD"/></View></View><Btn title="Apply date range" onPress={() => load(1)}/></Card>
    <View style={s.grid}>{cards.map(([label, value]) => <Card key={String(label)}><Text style={[s.stat, { color: theme.primary }]}>{String(value ?? 0)}</Text><Text style={{ color: theme.muted }}>{label}</Text></Card>)}</View>
    <Card><Text style={[s.heading, { color: theme.text }]}>Appointment status</Text>{data && Object.entries(data.appointments).filter(([k]) => k !== 'total').map(([k, v]) => <Text key={k} style={{ color: theme.text, marginTop: 6 }}>{k}: {String(v ?? 0)}</Text>)}</Card>
    <Card><Text style={[s.heading, { color: theme.text }]}>Hospital performance</Text>{data?.hospital_performance?.length ? data.hospital_performance.map(h => <View key={h.id} style={s.item}><Text style={[s.itemTitle, { color: theme.text }]}>{h.name}</Text><Text style={{ color: theme.muted }}>Appointments {h.appointments} · Completed {h.completed_appointments} · Vaccinations {h.vaccinations}</Text></View>) : <Text style={{ color: theme.muted }}>No hospital activity in this range.</Text>}</Card>
    <Card><Text style={[s.heading, { color: theme.text }]}>Overdue and missed vaccines</Text><Text style={{ color: theme.muted }}>{pagination.totalItems} schedule(s) require attention</Text>{rows.map(r => <View key={r.id} style={s.item}><Text style={[s.itemTitle, { color: theme.text }]}>{r.child_name} · {r.vaccine_name} dose {r.dose_number}</Text><Text style={{ color: theme.muted }}>{r.parent_name} · Due {String(r.due_date).slice(0, 10)} · {r.status} · {r.overdue_days} day(s)</Text></View>)}{pagination.totalPages > 1 ? <View style={s.row}><Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text }}>Page {pagination.page} of {pagination.totalPages}</Text><Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages} onPress={() => load(pagination.page + 1)}/></View> : null}</Card>
  </ScrollView></Screen>;
}
const s = StyleSheet.create({ content: { padding: 16, gap: 14 }, title: { fontSize: 28, fontWeight: '800' }, heading: { fontSize: 18, fontWeight: '700', marginBottom: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { fontSize: 24, fontWeight: '800' }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }, field: { flex: 1, minWidth: 180 }, item: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#94a3b8' }, itemTitle: { fontWeight: '700', marginBottom: 4 } });
