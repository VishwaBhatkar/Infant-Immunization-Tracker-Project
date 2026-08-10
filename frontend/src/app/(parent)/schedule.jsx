/**
 * File: frontend/src/app/(parent)/schedule.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Screen, showError } from '@/components/ui/UI';
import { HealthcareBanner, HealthcareThumbnail } from '@/components/ui/HealthcareImage';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
const filters = ['ALL', 'UPCOMING', 'DUE', 'OVERDUE', 'COMPLETED'];
export default function VaccinationScheduleScreen() {
    const { theme } = useApp();
    const params = useLocalSearchParams();
    const [children, setChildren] = useState([]);
    const [items, setItems] = useState([]);
    const [childId, setChildId] = useState(null);
    const initialStatus = typeof params.status === 'string' && filters.includes(params.status) ? params.status : 'ALL';
    const [filter, setFilter] = useState(initialStatus);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const load = useCallback(async (silent = false) => {
        if (!silent)
            setLoading(true);
        try {
            const [childrenResponse, scheduleResponse] = await Promise.all([
                api.get('/children'),
                api.get('/vaccine-schedules')
            ]);
            setChildren(childrenResponse.data.data);
            setItems(scheduleResponse.data.data);
            setChildId((current) => current ?? childrenResponse.data.data[0]?.id ?? null);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (typeof params.status === 'string' && filters.includes(params.status))
            setFilter(params.status);
    }, [params.status]);
    const visible = useMemo(() => items.filter((item) => (!childId || item.child_id === childId) && (filter === 'ALL' || item.status === filter)), [items, childId, filter]);
    const generate = async () => {
        if (!childId)
            return;
        setGenerating(true);
        try {
            await api.post(`/vaccine-schedules/generate/${childId}`, { force: false });
            await load(true);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setGenerating(false);
        }
    };
    const statusStyle = (status) => {
        if (status === 'OVERDUE')
            return { backgroundColor: theme.danger };
        if (status === 'COMPLETED')
            return { backgroundColor: theme.secondary };
        if (status === 'DUE')
            return { backgroundColor: theme.primary };
        return { backgroundColor: theme.border };
    };
    if (loading) {
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    }
    return (<Screen>
      <FlatList data={visible} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }}/>} ListHeaderComponent={<View>
            <Text style={[styles.title, { color: theme.text }]}>Vaccination Schedule</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>Due dates are calculated automatically from your child’s date of birth.</Text>
            <HealthcareBanner source={require('../../../assets/images/real-life/vaccination-schedule.webp')} eyebrow="VACCINATION PLAN" title="Stay ready for every scheduled dose" subtitle="Review upcoming, due, overdue and completed vaccines from one responsive view." accessibilityLabel="Child receiving a vaccination" />

            <Text style={[styles.label, { color: theme.text }]}>Select child</Text>
            <View style={styles.chips}>
              {children.map((child) => (<Pressable key={child.id} onPress={() => setChildId(child.id)} style={[styles.chip, { borderColor: theme.border, backgroundColor: childId === child.id ? theme.primary : theme.card }]}>
                  <Text style={{ color: childId === child.id ? '#fff' : theme.text, fontWeight: '700' }}>{child.name}</Text>
                </Pressable>))}
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Filter status</Text>
            <View style={styles.chips}>
              {filters.map((value) => (<Pressable key={value} onPress={() => setFilter(value)} style={[styles.chip, { borderColor: theme.border, backgroundColor: filter === value ? theme.primary : theme.card }]}>
                  <Text style={{ color: filter === value ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>{value}</Text>
                </Pressable>))}
            </View>

            {children.length > 0 && <Btn title="Generate Missing Schedule Items" onPress={generate} loading={generating}/>}
            <View style={{ height: 14 }}/>
          </View>} renderItem={({ item }) => (<Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vaccine, { color: theme.text }]}>{item.vaccine_name} · Dose {item.dose_number}</Text>
                <Text style={{ color: theme.muted }}>Due: {item.due_date}</Text>
              </View>
              <View style={[styles.badge, statusStyle(item.status)]}>
                <Text style={{ color: item.status === 'UPCOMING' ? theme.text : '#fff', fontSize: 11, fontWeight: '800' }}>{item.status}</Text>
              </View>
            </View>
            {!!item.disease_prevented && <Text style={{ color: theme.text, marginTop: 8 }}>Prevents: {item.disease_prevented}</Text>}
            {!!item.description && <Text style={{ color: theme.muted, marginTop: 4 }}>{item.description}</Text>}
            {!!item.administration_route && <Text style={{ color: theme.muted, marginTop: 4 }}>Route: {item.administration_route}</Text>}
          </Card>)} ListEmptyComponent={<Card><HealthcareThumbnail source={require('../../../assets/images/real-life/vaccination-secondary.webp')} accessibilityLabel="Vaccination care" style={styles.emptyImage}/><Text style={{ color: theme.muted }}>No vaccination schedule items match this filter.</Text></Card>} contentContainerStyle={{ paddingBottom: 24 }}/>
    </Screen>);
}
const styles = StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
    subtitle: { marginBottom: 16, lineHeight: 20 },
    label: { fontWeight: '700', marginTop: 8, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    vaccine: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
    emptyImage: { maxWidth: 560 }
});
