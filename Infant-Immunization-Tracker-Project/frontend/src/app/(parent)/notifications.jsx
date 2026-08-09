/**
 * File: frontend/src/app/(parent)/notifications.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
import { confirmAction } from '@/utils/confirmationUtils';
import { showToast } from '@/components/ui/Feedback';

export default function NotificationsScreen() {
    const { theme } = useApp();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);

    const load = useCallback(async () => {
        try {
            const response = await api.get('/notifications');
            setItems(response.data.data || []);
        } catch (error) {
            showError(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const deleteOne = async (item) => {
        const confirmed = await confirmAction(
            'Delete notification',
            `Delete “${item.title}”? This action cannot be undone.`,
            'Delete'
        );
        if (!confirmed) return;

        try {
            setDeletingId(item.id);
            await api.delete(`/notifications/${item.id}`);
            setItems((current) => current.filter((notification) => notification.id !== item.id));
            showToast('Notification deleted successfully.');
        } catch (error) {
            showError(error);
        } finally {
            setDeletingId(null);
        }
    };

    const deleteAll = async () => {
        const confirmed = await confirmAction(
            'Delete all notifications',
            `Delete all ${items.length} notification(s)? This action cannot be undone.`,
            'Delete all'
        );
        if (!confirmed) return;

        try {
            setDeletingAll(true);
            await api.delete('/notifications');
            setItems([]);
            showToast('All notifications deleted successfully.');
        } catch (error) {
            showError(error);
        } finally {
            setDeletingAll(false);
        }
    };

    if (loading) {
        return <Screen><ActivityIndicator size="large" color={theme.primary}/></Screen>;
    }

    return <Screen>
        <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); void load(); }}
                    tintColor={theme.primary}
                />
            }
            ListHeaderComponent={
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
                            <Text style={{ color: theme.muted }}>Vaccination and appointment updates.</Text>
                        </View>
                        {items.length > 0 ? (
                            <Btn
                                title="Delete all"
                                variant="danger"
                                compact
                                loading={deletingAll}
                                disabled={deletingId !== null}
                                onPress={deleteAll}
                            />
                        ) : null}
                    </View>
                </View>
            }
            renderItem={({ item }) => (
                <Card>
                    <View style={styles.row}>
                        <View style={[styles.dot, { backgroundColor: item.is_read ? theme.border : theme.primary }]}/>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>{item.message}</Text>
                            <Text style={{ color: theme.primary, marginTop: 8, fontSize: 12 }}>
                                {new Date(item.created_at).toLocaleString()}
                            </Text>
                            <Btn
                                title="Delete"
                                variant="danger"
                                compact
                                loading={deletingId === item.id}
                                disabled={deletingAll || (deletingId !== null && deletingId !== item.id)}
                                style={styles.deleteButton}
                                onPress={() => deleteOne(item)}
                            />
                        </View>
                    </View>
                </Card>
            )}
            ListEmptyComponent={
                <Card><Text style={{ color: theme.muted }}>No notifications found.</Text></Card>
            }
            contentContainerStyle={{ paddingBottom: 30 }}
        />
    </Screen>;
}

const styles = StyleSheet.create({
    header: { marginBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
    row: { flexDirection: 'row', gap: 12 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    itemTitle: { fontSize: 16, fontWeight: '800' },
    deleteButton: { alignSelf: 'flex-start', marginTop: 12 }
});
