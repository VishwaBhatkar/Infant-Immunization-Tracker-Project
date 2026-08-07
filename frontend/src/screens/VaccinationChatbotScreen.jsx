/**
 * File: frontend/src/screens/VaccinationChatbotScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/apiService';
import { askVaccinationAssistant } from '@/services/aiService';
import { useApp } from '@/context/AppContext';
import { Card, EmptyState, Screen, SectionHeader, showError } from '@/components/ui/UI';

const quickQuestions = [
  'When is the next vaccine due?',
  'Which vaccines are overdue?',
  'Which vaccines are completed?',
  'When was the last vaccine given?',
  'What is the purpose of the BCG vaccine?'
];

export default function VaccinationChatbotScreen() {
  const { theme } = useApp();
  const listRef = useRef(null);
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState(null);
  const [language, setLanguage] = useState('English');
  const [question, setQuestion] = useState('');
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', text: 'Hello! Select a child and ask about upcoming, overdue or completed vaccines. You can also ask about a vaccine purpose.' }]);

  useEffect(() => {
    api.get('/children')
      .then(response => {
        const records = Array.isArray(response.data?.data) ? response.data.data : [];
        setChildren(records);
        setChildId(records[0]?.id || null);
      })
      .catch(showError)
      .finally(() => setLoadingChildren(false));
  }, []);

  async function sendMessage(value = question) {
    const text = String(value || '').trim();
    if (!text || sending) return;
    setMessages(current => [...current, { id: `u-${Date.now()}`, role: 'user', text }]);
    setQuestion('');
    setSending(true);
    try {
      const result = await askVaccinationAssistant({ question: text, childId, language });
      setMessages(current => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: result?.answer || 'No answer was returned.', source: result?.source }]);
    } catch (error) {
      setMessages(current => [...current, { id: `e-${Date.now()}`, role: 'assistant', text: error.message || 'Unable to contact the assistant.', error: true }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  if (loadingChildren) return <Screen><View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View></Screen>;
  if (!children.length) return <Screen><EmptyState title="Add a child first" message="The vaccination assistant needs a child profile for schedule-related questions." icon="sparkles-outline" /></Screen>;

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SectionHeader title="Vaccination Assistant" subtitle="Answers use your registered vaccine schedule and records." icon="sparkles-outline" />

        <Card style={styles.selectorCard} animated={false}>
          <Text style={[styles.label, { color: theme.text }]}>Select child</Text>
          <View style={styles.wrapRow}>
            {children.map(child => (
              <Pressable key={child.id} onPress={() => setChildId(child.id)} style={[styles.pill, { borderColor: theme.border, backgroundColor: childId === child.id ? theme.primary : theme.input }]}>
                <Text style={{ color: childId === child.id ? '#fff' : theme.text, fontWeight: '800' }}>{child.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Response language</Text>
          <View style={styles.wrapRow}>
            {['English', 'Hindi', 'Marathi'].map(item => (
              <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.pill, { borderColor: theme.border, backgroundColor: language === item ? theme.primary : theme.input }]}>
                <Text style={{ color: language === item ? '#fff' : theme.text, fontWeight: '800' }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <View style={styles.quickList}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={quickQuestions} keyExtractor={item => item} renderItem={({ item }) => (
            <Pressable disabled={sending} onPress={() => sendMessage(item)} style={[styles.quick, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
              <Text style={[styles.quickText, { color: theme.primary }]}>{item}</Text>
            </Pressable>
          )} />
        </View>

        <FlatList ref={listRef} style={styles.flex} contentContainerStyle={styles.messages} data={messages} keyExtractor={item => item.id} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} renderItem={({ item }) => {
          const user = item.role === 'user';
          return (
            <View style={[styles.messageRow, user && styles.userRow]}>
              {!user && <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}><Ionicons name="sparkles" size={17} color={theme.primary} /></View>}
              <View style={[styles.bubble, { backgroundColor: user ? theme.primary : theme.card, borderColor: item.error ? theme.danger : theme.border }]}>
                <Text style={{ color: user ? '#fff' : item.error ? theme.danger : theme.text, lineHeight: 21 }}>{item.text}</Text>
                {item.source ? <Text style={[styles.source, { color: user ? '#fff' : theme.muted }]}>{item.source === 'DATABASE_AND_AI' ? 'Verified database + AI' : 'Verified database'}</Text> : null}
              </View>
            </View>
          );
        }} />

        <Text style={[styles.disclaimer, { color: theme.muted }]}>For information only. The assistant cannot diagnose or change vaccination records.</Text>
        <View style={[styles.composer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput value={question} onChangeText={setQuestion} multiline maxLength={500} placeholder="Ask about vaccination..." placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text }]} />
          <Pressable disabled={!question.trim() || sending} onPress={() => sendMessage()} style={[styles.send, { backgroundColor: question.trim() && !sending ? theme.primary : theme.border }]}>
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { paddingHorizontal: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectorCard: { padding: 14, marginBottom: 8 }, label: { fontWeight: '900', marginBottom: 8 }, wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 }, quickList: { minHeight: 50, marginBottom: 5 },
  quick: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8 }, quickText: { maxWidth: 180, fontWeight: '700', fontSize: 12 },
  messages: { paddingVertical: 8 }, messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, paddingRight: 45 }, userRow: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 45 },
  avatar: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 7 }, bubble: { maxWidth: '88%', borderWidth: 1, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10 },
  source: { fontSize: 10, marginTop: 6, fontWeight: '700' }, disclaimer: { textAlign: 'center', fontSize: 10, paddingVertical: 5 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderRadius: 18, padding: 7, marginBottom: 8 }, input: { flex: 1, minHeight: 42, maxHeight: 110, paddingHorizontal: 10, paddingVertical: 9 },
  send: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }
});
