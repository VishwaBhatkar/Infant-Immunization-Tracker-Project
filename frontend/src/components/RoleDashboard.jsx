import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { Card, Screen } from '@/components/UI';
import { useApp } from '@/context/AppContext';
const routes = {
    parentChildren: '/(parent)/children',
    parentAppointments: '/(parent)/appointments',
    parentSchedule: '/(parent)/schedule',
    parentRecords: '/(parent)/immunizations',
    parentGrowth: '/(parent)/growth',
    parentMedical: '/(parent)/medical',
    parentNotifications: '/(parent)/notifications',
    doctorAppointments: '/(doctor)/appointments',
    doctorRecords: '/(doctor)/immunizations',
    hospitalVaccines: '/(hospital-admin)/vaccines',
    hospitalAppointments: '/(hospital-admin)/appointments',
    hospitalRecords: '/(hospital-admin)/immunizations',
    systemUsers: '/(system-admin)/users',
    systemVaccines: '/(system-admin)/vaccines',
    systemAppointments: '/(system-admin)/appointments',
    systemRecords: '/(system-admin)/immunizations'
};
export default function RoleDashboard({ role }) {
    const { theme, user } = useApp();
    const { width } = useWindowDimensions();
    const router = useRouter();
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadMessage, setLoadMessage] = useState('');
    const endpoint = role === 'PARENT'
        ? '/dashboard/parent'
        : role === 'DOCTOR'
            ? '/dashboard/doctor'
            : '/dashboard/admin';
    const load = useCallback(async (refresh = false) => {
        refresh ? setRefreshing(true) : setLoading(true);
        setLoadMessage('');
        try {
            const response = await api.get(endpoint);
            setData(response.data.data || {});
        }
        catch (error) {
            setLoadMessage(error instanceof Error ? error.message : 'Dashboard data is temporarily unavailable.');
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [endpoint]);
    useEffect(() => { void load(); }, [load]);
    const metrics = useMemo(() => role === 'PARENT' ? [
        { label: 'Children', value: data.children, symbol: '👶', route: routes.parentChildren },
        { label: 'Upcoming vaccines', value: data.upcomingVaccines, symbol: '💉', route: `${routes.parentSchedule}?status=UPCOMING` },
        { label: 'Overdue vaccines', value: data.overdueVaccines, symbol: '⚠️', route: `${routes.parentSchedule}?status=OVERDUE` },
        { label: 'Appointments', value: data.upcomingAppointments, symbol: '📅', route: `${routes.parentAppointments}?status=ALL` },
        { label: 'Notifications', value: data.unreadNotifications, symbol: '🔔', route: routes.parentNotifications }
    ] : role === 'DOCTOR' ? [
        { label: "Today's appointments", value: data.todayAppointments, symbol: '🩺', route: `${routes.doctorAppointments}?scope=TODAY` },
        { label: 'Pending appointments', value: data.pendingAppointments, symbol: '⏳', route: `${routes.doctorAppointments}?status=PENDING` },
        { label: 'Completed visits', value: data.completedAppointments, symbol: '✅', route: `${routes.doctorAppointments}?status=COMPLETED` },
        { label: 'Assigned patients', value: data.assignedPatients, symbol: '👨‍👩‍👧', route: `${routes.doctorAppointments}?view=PATIENTS` },
        { label: 'Vaccines administered', value: data.vaccinesAdministered, symbol: '💉', route: routes.doctorRecords }
    ] : [
        { label: 'Total users', value: data.totalUsers, symbol: '👥' },
        { label: 'Total children', value: data.totalChildren, symbol: '👶' },
        { label: 'Doctors', value: data.totalDoctors, symbol: '🩺' },
        { label: 'Hospitals', value: data.totalHospitals, symbol: '🏥' },
        { label: 'Appointments', value: data.totalAppointments, symbol: '📅' },
        { label: 'Vaccinations completed', value: data.vaccinationsCompleted, symbol: '✅' },
        { label: 'Overdue vaccinations', value: data.overdueVaccinations, symbol: '⚠️' }
    ], [data, role]);
    const actions = role === 'PARENT' ? [
        { label: 'Manage children', description: 'Add and update child profiles', route: routes.parentChildren, symbol: '👶' },
        { label: 'Vaccine schedule', description: 'See due and upcoming doses', route: routes.parentSchedule, symbol: '💉' },
        { label: 'Book appointment', description: 'Schedule a hospital visit', route: routes.parentAppointments, symbol: '📅' },
        { label: 'Immunization records', description: 'Review vaccination history', route: routes.parentRecords, symbol: '📋' },
        { label: 'Growth tracking', description: 'Record height and weight', route: routes.parentGrowth, symbol: '📈' },
        { label: 'Medical history', description: 'Maintain health information', route: routes.parentMedical, symbol: '🩺' }
    ] : role === 'DOCTOR' ? [
        { label: 'Appointments', description: 'Review and update patient visits', route: routes.doctorAppointments, symbol: '📅' },
        { label: 'Vaccination records', description: 'Record administered vaccines', route: routes.doctorRecords, symbol: '💉' }
    ] : role === 'HOSPITAL_ADMIN' ? [
        { label: 'Vaccine inventory', description: 'Manage available vaccines', route: routes.hospitalVaccines, symbol: '🧪' },
        { label: 'Appointments', description: 'Manage hospital bookings', route: routes.hospitalAppointments, symbol: '📅' },
        { label: 'Immunization records', description: 'Review vaccination activity', route: routes.hospitalRecords, symbol: '📋' }
    ] : [
        { label: 'User management', description: 'Manage roles and accounts', route: routes.systemUsers, symbol: '👥' },
        { label: 'Vaccine catalogue', description: 'Maintain vaccine master data', route: routes.systemVaccines, symbol: '💉' },
        { label: 'Appointments', description: 'Monitor all appointments', route: routes.systemAppointments, symbol: '📅' },
        { label: 'Immunization records', description: 'Review system-wide records', route: routes.systemRecords, symbol: '📋' }
    ];
    const recentItems = role === 'PARENT'
        ? (data.nextVaccines || [])
        : role === 'DOCTOR'
            ? (data.today || [])
            : (data.recentActivity || []);
    const metricWidth = width >= 1180 ? '25%' : width >= 700 ? '33.333%' : '50%';
    const actionWidth = width >= 1050 ? '33.333%' : width >= 620 ? '50%' : '100%';
    if (loading) {
        return <Screen><View style={styles.loader}><ActivityIndicator size="large" color={theme.primary}/><Text style={{ color: theme.muted }}>Loading dashboard…</Text></View></Screen>;
    }
    return (<Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary}/>}>
        <View style={[styles.hero, { backgroundColor: theme.sidebar }]}> 
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>{role.replaceAll('_', ' ')}</Text>
            <Text style={styles.title}>Welcome back, {user?.name || 'User'}</Text>
            <Text style={styles.subtitle}>Manage vaccination care, appointments and health records from one place.</Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: theme.secondary }]}><Text style={styles.heroBadgeText}>✓ Health dashboard</Text></View>
        </View>

        {loadMessage ? (<Pressable onPress={() => void load()} style={[styles.notice, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}> 
            <Text style={[styles.noticeTitle, { color: theme.text }]}>Live totals could not be loaded</Text>
            <Text style={[styles.noticeText, { color: theme.muted }]}>{loadMessage} Tap to retry. All project features remain available below.</Text>
          </Pressable>) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
        <View style={styles.grid}>
          {metrics.map((item) => (<View key={item.label} style={[styles.metricWrap, { width: metricWidth }]}>
              <Pressable disabled={!item.route} accessibilityRole={item.route ? 'button' : undefined} accessibilityLabel={item.route ? `Open ${item.label}` : undefined} onPress={() => item.route && router.push(item.route)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
                <Card>
                  <View style={styles.metricTop}><Text style={styles.metricSymbol}>{item.symbol}</Text><Text style={[styles.metricValue, { color: theme.text }]}>{Number(item.value || 0)}</Text></View>
                  <View style={styles.metricLabelRow}>
                    <Text style={[styles.metricLabel, { color: theme.muted }]}>{item.label}</Text>
                    {item.route ? <Text style={{ color: theme.primary, fontWeight: '900' }}>›</Text> : null}
                  </View>
                </Card>
              </Pressable>
            </View>))}
        </View>

   

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{role === 'PARENT' ? 'Priority vaccines' : role === 'DOCTOR' ? "Today's schedule" : 'Recent activity'}</Text>
        {recentItems.length === 0 ? (<Card><Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing needs attention</Text><Text style={{ color: theme.muted }}>New activity will appear here automatically.</Text></Card>) : recentItems.map((item, index) => (<Card key={String(item.id ?? index)}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.vaccine_name ? `${item.vaccine_name} · Dose ${item.dose_number}` : item.child_name || item.title || 'Activity'}</Text>
            <Text style={{ color: theme.muted }}>{item.status || item.message || ''}</Text>
            <Text style={[styles.itemDate, { color: theme.primary }]}>{item.due_date || item.appointment_date || ''} {item.appointment_time || ''}</Text>
          </Card>))}
      </ScrollView>
    </Screen>);
}
const styles = StyleSheet.create({
    content: { paddingTop: 18, paddingBottom: 32 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    hero: { borderRadius: 24, padding: 24, marginBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    heroText: { flex: 1 },
    eyebrow: { color: '#A9D8E8', fontWeight: '800', fontSize: 12, letterSpacing: 1.2, marginBottom: 8 },
    title: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
    subtitle: { color: '#D7E8F0', marginTop: 8, lineHeight: 21, maxWidth: 650 },
    heroBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    heroBadgeText: { color: '#FFFFFF', fontWeight: '800' },
    notice: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 18 },
    noticeTitle: { fontWeight: '800', marginBottom: 3 },
    noticeText: { lineHeight: 19 },
    sectionTitle: { fontSize: 20, fontWeight: '900', marginTop: 4, marginBottom: 8 },
    sectionHint: { marginTop: -4, marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    metricWrap: { paddingHorizontal: 6 },
    metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metricSymbol: { fontSize: 25 },
    metricValue: { fontSize: 30, fontWeight: '900' },
    metricLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    metricLabel: { fontSize: 13, marginTop: 9, fontWeight: '600' },
    actionWrap: { padding: 6 },
    actionCard: { minHeight: 94, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
    actionIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    actionSymbol: { fontSize: 23 },
    actionTextWrap: { flex: 1, paddingHorizontal: 12 },
    actionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
    actionDescription: { fontSize: 13, lineHeight: 18 },
    arrow: { fontSize: 30, fontWeight: '500' },
    emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    itemTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
    itemDate: { marginTop: 5, fontWeight: '700' }
});
