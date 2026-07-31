import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, showError } from '@/components/UI';
import { api } from '@/services/api';
import { useApp } from '@/context/AppContext';
export default function NotificationsScreen() {
    const { theme } = useApp();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const load = useCallback(async () => {
        try {
            const response = await api.get('/notifications');
            setItems(response.data.data || []);
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
    if (loading)
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    return <Screen>
    <FlatList data={items} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={theme.primary}/>} ListHeaderComponent={<View style={styles.header}><Text style={[styles.title, { color: theme.text }]}>Notifications</Text><Text style={{ color: theme.muted }}>Vaccination and appointment updates.</Text></View>} renderItem={({ item }) => <Card>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: item.is_read ? theme.border : theme.primary }]}/>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>{item.message}</Text>
            <Text style={{ color: theme.primary, marginTop: 8, fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        </View>
      </Card>} ListEmptyComponent={<Card><Text style={{ color: theme.muted }}>No notifications found.</Text></Card>} contentContainerStyle={{ paddingBottom: 30 }}/>
  </Screen>;
}
const styles = StyleSheet.create({
    header: { marginBottom: 16 }, title: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
    row: { flexDirection: 'row', gap: 12 }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    itemTitle: { fontSize: 16, fontWeight: '800' }
});
