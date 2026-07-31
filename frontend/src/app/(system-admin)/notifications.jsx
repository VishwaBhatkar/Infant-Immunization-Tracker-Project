import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/api';
import { Btn, Card, Input, Screen, showError } from '@/components/UI';
import { confirmAction } from '@/utils/confirmAction';
import { useApp } from '@/context/AppContext';
const statuses = ['all', 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'SKIPPED'];
export default function NotificationsScreen() {
    const { theme } = useApp();
    const [items, setItems] = useState([]), [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0, today: 0 });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 0 });
    const [search, setSearch] = useState(''), [applied, setApplied] = useState(''), [status, setStatus] = useState('all');
    const [loading, setLoading] = useState(true), [working, setWorking] = useState(null);
    const [userId, setUserId] = useState(''), [title, setTitle] = useState(''), [message, setMessage] = useState('');
    const load = useCallback(async (page = 1) => { try {
        setLoading(true);
        const [list, summary] = await Promise.all([api.get('/admin/notifications', { params: { page, limit: 10, search: applied || undefined, status: status === 'all' ? undefined : status } }), api.get('/admin/notifications/statistics')]);
        setItems(list.data.data);
        setPagination(list.data.pagination);
        const t = summary.data.data.totals || {};
        setStats({ total: Number(t.total || 0), pending: Number(t.pending || 0), sent: Number(t.sent || 0), delivered: Number(t.delivered || 0), failed: Number(t.failed || 0), cancelled: Number(t.cancelled || 0), today: Number(t.today || 0) });
    }
    catch (e) {
        showError(e);
    }
    finally {
        setLoading(false);
    } }, [applied, status]);
    useEffect(() => { void load(1); }, [load]);
    const send = async () => { if (!userId.trim() || !title.trim() || !message.trim()) {
        Alert.alert('Required', 'Enter recipient user ID, title and message.');
        return;
    } try {
        setWorking(0);
        await api.post('/admin/notifications/send', { user_id: Number(userId), title: title.trim(), message: message.trim(), type: 'GENERAL' });
        Alert.alert('Success', 'Notification queued successfully.');
        setUserId('');
        setTitle('');
        setMessage('');
        await load(1);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorking(null);
    } };
    const retry = async (row) => { if (!await confirmAction('Retry notification', `Retry notification for ${row.recipient_name}?`, 'Retry'))
        return; try {
        setWorking(row.id);
        await api.post(`/admin/notifications/${row.id}/retry`);
        await load(pagination.page);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorking(null);
    } };
    const cancel = async (row) => { if (!await confirmAction('Cancel notification', `Cancel pending notification for ${row.recipient_name}?`, 'Cancel'))
        return; try {
        setWorking(row.id);
        await api.patch(`/admin/notifications/${row.id}/cancel`, { reason: 'Cancelled from System Admin notification management' });
        await load(pagination.page);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setWorking(null);
    } };
    return <Screen><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={[s.title, { color: theme.text }]}>Notification Management</Text><Text style={{ color: theme.muted }}>Monitor delivery, queue manual messages, retry failures and cancel pending notifications.</Text>
    <View style={s.grid}>{Object.entries(stats).map(([k, v]) => <Card key={k}><Text style={[s.stat, { color: theme.primary }]}>{v}</Text><Text style={{ color: theme.muted }}>{k[0].toUpperCase() + k.slice(1)}</Text></Card>)}</View>
    <Card><Text style={[s.heading, { color: theme.text }]}>Send manual notification</Text><Input label="Recipient user ID" value={userId} onChangeText={setUserId} keyboardType="number-pad"/><Input label="Title" value={title} onChangeText={setTitle}/><Input label="Message" value={message} onChangeText={setMessage} multiline/><Btn title={working === 0 ? 'Sending…' : 'Queue notification'} disabled={working === 0} onPress={send}/></Card>
    <Card><Input label="Search" value={search} onChangeText={setSearch} placeholder="Recipient, email, title or message"/><View style={s.row}><Btn title="Search" compact onPress={() => setApplied(search.trim())}/><Btn title="Clear" compact variant="outline" onPress={() => { setSearch(''); setApplied(''); }}/></View><View style={s.row}>{statuses.map(x => <Btn key={x} title={x} compact variant={status === x ? 'primary' : 'outline'} onPress={() => setStatus(x)}/>)}</View></Card>
    <Text style={{ color: theme.muted }}>{pagination.totalItems} notification(s)</Text>{loading ? <ActivityIndicator size="large" color={theme.primary}/> : null}
    {!loading && items.map(row => <Card key={row.id}><Text style={[s.heading, { color: theme.text }]}>{row.title}</Text><Text style={{ color: theme.muted }}>{row.recipient_name} · {row.recipient_role} · {row.recipient_email}</Text><Text style={{ color: theme.text, marginTop: 6 }}>{row.message}</Text><Text style={{ color: theme.muted, marginTop: 6 }}>{row.reminder_type} · {row.status} · Attempts {row.attempt_count}</Text>{row.failure_reason ? <Text style={{ color: theme.danger, marginTop: 6 }}>{row.failure_reason}</Text> : null}<View style={s.row}>{['FAILED', 'SKIPPED'].includes(row.status) ? <Btn title={working === row.id ? 'Working…' : 'Retry'} compact disabled={working === row.id} onPress={() => retry(row)}/> : null}{row.status === 'PENDING' ? <Btn title="Cancel" compact variant="outline" disabled={working === row.id} onPress={() => cancel(row)}/> : null}</View></Card>)}
    {!loading && pagination.totalPages > 1 ? <View style={s.row}><Btn title="Previous" compact variant="outline" disabled={pagination.page <= 1} onPress={() => load(pagination.page - 1)}/><Text style={{ color: theme.text }}>Page {pagination.page} of {pagination.totalPages}</Text><Btn title="Next" compact variant="outline" disabled={pagination.page >= pagination.totalPages} onPress={() => load(pagination.page + 1)}/></View> : null}
  </ScrollView></Screen>;
}
const s = StyleSheet.create({ content: { padding: 16, gap: 14 }, title: { fontSize: 28, fontWeight: '800' }, heading: { fontSize: 17, fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { fontSize: 24, fontWeight: '800' }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 } });
