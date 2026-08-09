/**
 * File: frontend/src/screens/HelpCenterScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/services/apiService';
import { Btn, Card, Input, Screen, showError } from '@/components/ui/UI';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
export default function HelpCenterScreen() {
    const { theme } = useApp();
    const [faqs, setFaqs] = useState([]);
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [rating, setRating] = useState('5');
    const [loadingFaqs, setLoadingFaqs] = useState(false);
    const [sendingTicket, setSendingTicket] = useState(false);
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const load = async () => {
        try {
            setLoadingFaqs(true);
            const response = await api.get('/help/faqs', { params: { search } });
            setFaqs(response.data.data || []);
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoadingFaqs(false);
        }
    };
    useEffect(() => { void load(); }, []);
    const ticket = async () => {
        try {
            setSendingTicket(true);
            await api.post('/help/support-tickets', {
                subject,
                category: 'Technical Issues',
                description
            });
            setSubject('');
            setDescription('');
            showToast('Support ticket submitted');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSendingTicket(false);
        }
    };
    const feedback = async () => {
        try {
            setSendingFeedback(true);
            await api.post('/help/feedback', {
                rating: Number(rating),
                message: description
            });
            setDescription('');
            showToast('Thank you for your feedback');
        }
        catch (error) {
            showError(error);
        }
        finally {
            setSendingFeedback(false);
        }
    };
    return (<Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Help Centre</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>Find quick answers or contact our support team.</Text>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently asked questions</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}><Input placeholder="Search FAQs" value={search} onChangeText={setSearch}/></View>
            <Btn title="Search" compact loading={loadingFaqs} onPress={load} style={styles.searchButton}/>
          </View>
          {faqs.length === 0 ? <Text style={{ color: theme.muted }}>No FAQs found.</Text> : null}
          {faqs.map((faq) => (<View key={faq.id} style={[styles.faqItem, { borderTopColor: theme.border }]}>
              <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.question}</Text>
              <Text style={[styles.faqAnswer, { color: theme.muted }]}>{faq.answer}</Text>
              <Text style={[styles.category, { color: theme.primary }]}>{faq.category}</Text>
            </View>))}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact support</Text>
          <Text style={[styles.sectionText, { color: theme.muted }]}>Describe the issue and our team will review it.</Text>
          <Input placeholder="Subject" value={subject} onChangeText={setSubject}/>
          <Input placeholder="Describe the issue" multiline value={description} onChangeText={setDescription} style={styles.multiline}/>
          <Btn title="Submit support ticket" loading={sendingTicket} onPress={ticket}/>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Share feedback</Text>
          <Text style={[styles.sectionText, { color: theme.muted }]}>Rate your experience from 1 to 5.</Text>
          <Input placeholder="Rating 1-5" keyboardType="number-pad" value={rating} onChangeText={setRating}/>
          <Btn title="Submit feedback" variant="secondary" loading={sendingFeedback} onPress={feedback}/>
        </Card>
      </ScrollView>
    </Screen>);
}
const styles = StyleSheet.create({
    content: { paddingBottom: 40 },
    title: { fontSize: 27, fontWeight: '900', marginTop: 4 },
    subtitle: { fontSize: 15, marginTop: 5, marginBottom: 16 },
    sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 6 },
    sectionText: { marginBottom: 14, lineHeight: 20 },
    searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    searchInput: { flex: 1 },
    searchButton: { minWidth: 104 },
    faqItem: { borderTopWidth: 1, paddingTop: 14, marginTop: 14 },
    faqQuestion: { fontWeight: '800', fontSize: 16 },
    faqAnswer: { marginTop: 6, lineHeight: 21 },
    category: { marginTop: 8, fontWeight: '700', fontSize: 13 },
    multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: 14 }
});
