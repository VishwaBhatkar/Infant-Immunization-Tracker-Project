/**
 * File: frontend/src/screens/VaccinationScheduleScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';

const filters = ['ALL', 'UPCOMING', 'DUE', 'OVERDUE', 'COMPLETED'];

export default function VaccinationScheduleScreen() {
  const { theme } = useApp();
  const params = useLocalSearchParams();
  const initialStatus = typeof params.status === 'string' && filters.includes(params.status)
    ? params.status
    : 'ALL';
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof params.status === 'string' && filters.includes(params.status)) {
      setStatus(params.status);
    }
  }, [params.status]);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/vaccine-schedules', {
        params: status === 'ALL' ? undefined : { status },
      });
      setItems(response.data.data || []);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const title = useMemo(() => status === 'OVERDUE'
    ? 'Overdue Vaccinations'
    : status === 'COMPLETED'
      ? 'Completed Vaccination Schedules'
      : 'Vaccination Schedules', [status]);

  if (loading) {
    return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}/>} 
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={<View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>View vaccination schedules and filter them by current status.</Text>
          <View style={styles.filters}>
            {filters.map((value) => (
              <Pressable
                key={value}
                onPress={() => setStatus(value)}
                style={[styles.chip, {
                  borderColor: theme.border,
                  backgroundColor: status === value ? theme.primary : theme.card,
                }]}
              >
                <Text style={{ color: status === value ? '#FFFFFF' : theme.text, fontWeight: '700' }}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heading, { color: theme.text }]}>{item.child_name}</Text>
                <Text style={{ color: theme.text }}>{item.vaccine_name} · Dose {item.dose_number}</Text>
                <Text style={{ color: theme.muted, marginTop: 4 }}>Due date: {String(item.due_date || '').slice(0, 10)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.status === 'OVERDUE' ? '#FEE2E2' : theme.primarySoft }]}> 
                <Text style={{ color: item.status === 'OVERDUE' ? '#991B1B' : theme.primary, fontWeight: '800' }}>{item.status}</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Card><Text style={{ color: theme.muted }}>No vaccination schedules found for this filter.</Text></Card>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { marginTop: 5, marginBottom: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
});
