/**
 * File: frontend/src/screens/AppointmentManagementScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Btn, Card, DateInput, Input, Screen, showError } from '@/components/ui/UI';
import { api } from '@/services/apiService';
import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';
import { confirmAction } from '@/utils/confirmationUtils';
const statuses = [
    'ALL',
    'PENDING',
    'CONFIRMED',
    'RESCHEDULED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
];
const emptyForm = {
    child_id: '',
    hospital_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    purpose: 'Vaccination consultation',
    notes: '',
};
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export default function AppointmentManagementScreen() {
    const { theme, user } = useApp();
    const params = useLocalSearchParams();
    const isParent = user?.role === 'PARENT';
    const [appointments, setAppointments] = useState([]);
    const [children, setChildren] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [slots, setSlots] = useState([]);
    const [filter, setFilter] = useState(typeof params.status === 'string' ? params.status : 'ALL');
    const [scope, setScope] = useState(typeof params.scope === 'string' ? params.scope : '');
    const [view, setView] = useState(typeof params.view === 'string' ? params.view : 'APPOINTMENTS');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [rescheduleId, setRescheduleId] = useState(null);
    const [rescheduleForm, setRescheduleForm] = useState({ appointment_date: '', appointment_time: '', notes: '' });
    const [rescheduleSlots, setRescheduleSlots] = useState([]);
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [reviewId, setReviewId] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, review_text: '', is_anonymous: false });
    const [reviewLoading, setReviewLoading] = useState(false);
    const load = useCallback(async () => {
        try {
            const query = new URLSearchParams();
            if (filter !== 'ALL')
                query.set('status', filter);
            if (scope)
                query.set('scope', scope);
            const suffix = query.toString() ? `?${query.toString()}` : '';
            const response = await api.get(`/appointments${suffix}`);
            setAppointments(response.data.data || []);
        }
        catch (error) {
            showError(error);
        }
    }, [filter, scope]);
    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        if (typeof params.status === 'string' && statuses.includes(params.status))
            setFilter(params.status);
        else if (!params.status)
            setFilter('ALL');
        setScope(typeof params.scope === 'string' ? params.scope : '');
        setView(typeof params.view === 'string' ? params.view : 'APPOINTMENTS');
    }, [params.status, params.scope, params.view]);
    useEffect(() => {
        if (!isParent)
            return;
        Promise.all([api.get('/children'), api.get('/hospitals')])
            .then(([childResponse, hospitalResponse]) => {
            setChildren(childResponse.data.data || []);
            setHospitals(hospitalResponse.data.data || []);
        })
            .catch(showError);
    }, [isParent]);
    const chooseHospital = async (id) => {
        setForm((current) => ({
            ...current,
            hospital_id: String(id),
            doctor_id: '',
            appointment_time: '',
        }));
        setDoctors([]);
        setSlots([]);
        try {
            const response = await api.get(`/doctors?hospital_id=${id}`);
            const availableDoctors = response.data.data || [];
            setDoctors(availableDoctors);
            if (availableDoctors.length === 0) {
                showToast('No doctor is assigned to this hospital. Add a doctor-hospital assignment in the database.');
            }
        }
        catch (error) {
            showError(error);
        }
    };
    const chooseDoctor = (id) => {
        setForm((current) => ({ ...current, doctor_id: String(id), appointment_time: '' }));
        setSlots([]);
    };
    const loadAvailableSlots = useCallback(async () => {
        if (!form.hospital_id || !form.doctor_id || !validDate(form.appointment_date)) {
            setSlots([]);
            return;
        }
        try {
            const response = await api.get(`/doctors/${form.doctor_id}/availability`, { params: { hospital_id: form.hospital_id, date: form.appointment_date } });
            const availableSlots = response.data.data || [];
            setSlots(availableSlots);
            setForm((current) => availableSlots.includes(current.appointment_time)
                ? current
                : { ...current, appointment_time: '' });
            if (availableSlots.length === 0) {
                showToast('This doctor has no available slots on the selected date.');
            }
        }
        catch (error) {
            setSlots([]);
            showError(error);
        }
    }, [form.hospital_id, form.doctor_id, form.appointment_date]);
    useEffect(() => {
        const timer = setTimeout(() => { void loadAvailableSlots(); }, 250);
        return () => clearTimeout(timer);
    }, [loadAvailableSlots]);
    const validateBooking = () => {
        if (!form.child_id)
            return 'Select a child.';
        if (!form.hospital_id)
            return 'Select a hospital.';
        if (!validDate(form.appointment_date))
            return 'Enter a valid date using YYYY-MM-DD.';
        if (!form.doctor_id)
            return 'Select a doctor.';
        if (!validTime(form.appointment_time))
            return 'Select an available appointment time.';
        if (form.purpose.trim().length < 3)
            return 'Purpose must contain at least 3 characters.';
        return null;
    };
    const book = async () => {
        const validationMessage = validateBooking();
        if (validationMessage) {
            showToast(validationMessage);
            return;
        }
        setLoading(true);
        try {
            await api.post('/appointments', {
                child_id: Number(form.child_id),
                hospital_id: Number(form.hospital_id),
                doctor_id: Number(form.doctor_id),
                appointment_date: form.appointment_date,
                appointment_time: form.appointment_time,
                purpose: form.purpose.trim(),
                notes: form.notes.trim() || null,
            });
            showToast('Appointment booked and awaiting confirmation.');
            setForm(emptyForm);
            setDoctors([]);
            setSlots([]);
            await load();
        }
        catch (error) {
            showError(error);
        }
        finally {
            setLoading(false);
        }
    };
    const updateStatus = async (id, value) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status: value });
            showToast(`Appointment marked ${value.toLowerCase()}.`);
            await load();
        }
        catch (error) {
            showError(error);
        }
    };
    const openReschedule = (item) => {
        setRescheduleId(item.id);
        setRescheduleSlots([]);
        setRescheduleForm({
            appointment_date: '',
            appointment_time: '',
            notes: item.notes || '',
        });
    };
    const closeReschedule = () => {
        setRescheduleId(null);
        setRescheduleSlots([]);
        setRescheduleForm({ appointment_date: '', appointment_time: '', notes: '' });
    };
    useEffect(() => {
        const appointment = appointments.find((item) => item.id === rescheduleId);
        if (!appointment || !validDate(rescheduleForm.appointment_date)) {
            setRescheduleSlots([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const response = await api.get(`/doctors/${appointment.doctor_id}/availability`, {
                    params: {
                        hospital_id: appointment.hospital_id,
                        date: rescheduleForm.appointment_date,
                    },
                });
                const available = response.data.data || [];
                setRescheduleSlots(available);
                setRescheduleForm((current) => available.includes(current.appointment_time)
                    ? current
                    : { ...current, appointment_time: '' });
                if (available.length === 0)
                    showToast('No available slots for the selected date.');
            }
            catch (error) {
                setRescheduleSlots([]);
                showError(error);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [appointments, rescheduleId, rescheduleForm.appointment_date]);
    const submitReschedule = async () => {
        if (!validDate(rescheduleForm.appointment_date)) {
            showToast('Enter a valid date using YYYY-MM-DD.');
            return;
        }
        if (!validTime(rescheduleForm.appointment_time)) {
            showToast('Select an available appointment time.');
            return;
        }
        setRescheduleLoading(true);
        try {
            await api.patch(`/appointments/${rescheduleId}/reschedule`, {
                appointment_date: rescheduleForm.appointment_date,
                appointment_time: rescheduleForm.appointment_time,
                notes: rescheduleForm.notes.trim() || null,
            });
            showToast('Appointment rescheduled successfully.');
            closeReschedule();
            await load();
        }
        catch (error) {
            showError(error);
        }
        finally {
            setRescheduleLoading(false);
        }
    };
    const submitReview = async () => {
        if (!reviewId)
            return;
        setReviewLoading(true);
        try {
            await api.post(`/appointments/${reviewId}/review`, reviewForm);
            showToast('Thank you. Your feedback was submitted.');
            setReviewId(null);
            setReviewForm({ rating: 5, review_text: '', is_anonymous: false });
            await load();
        }
        catch (error) {
            showError(error);
        }
        finally {
            setReviewLoading(false);
        }
    };
    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };
    const chip = (label, active, onPress, key) => (<Pressable key={key} onPress={onPress} style={{
            padding: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: active ? theme.primary : theme.border,
            marginRight: 8,
            marginBottom: 8,
        }}>
      <Text style={{ color: active ? theme.primary : theme.text }}>{label}</Text>
    </Pressable>);
    const assignedPatients = Array.from(new Map(appointments.map((item) => [item.child_id, item])).values());
    if (view === 'PATIENTS') {
        return (<Screen>
        <FlatList data={assignedPatients} keyExtractor={(item) => String(item.child_id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>} ListHeaderComponent={<View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 25, fontWeight: '800', color: theme.text }}>Assigned patients</Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>Children who have appointments assigned to you.</Text>
            </View>} renderItem={({ item }) => (<Card>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17 }}>{item.child_name}</Text>
              {item.parent_name ? <Text style={{ color: theme.muted }}>Parent: {item.parent_name}</Text> : null}
              <Text style={{ color: theme.muted }}>Hospital: {item.hospital_name}</Text>
              <Text style={{ color: theme.text, marginTop: 4 }}>Latest visit: {String(item.appointment_date).slice(0, 10)}</Text>
              <Btn title="View appointments" onPress={() => { setView('APPOINTMENTS'); setFilter('ALL'); setScope(''); }}/>
            </Card>)} ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: 'center', marginTop: 30 }}>No assigned patients found.</Text>}/>
      </Screen>);
    }
    return (<Screen>
      <FlatList data={appointments} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>} ListHeaderComponent={<>
            <Text style={{ fontSize: 25, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
              {scope === 'TODAY' ? "Today's appointments" : filter === 'PENDING' ? 'Pending appointments' : filter === 'COMPLETED' ? 'Completed visits' : 'Appointments'}
            </Text>

            {isParent && (<Card>
                <Text style={{ fontWeight: '800', color: theme.text, marginBottom: 12 }}>
                  Book appointment
                </Text>

                <Text style={{ color: theme.muted }}>Select child</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {children.map((child) => chip(child.name, form.child_id === String(child.id), () => setForm((current) => ({ ...current, child_id: String(child.id) })), `child-${child.id}`))}
                </View>

                <Text style={{ color: theme.muted }}>Select hospital</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {hospitals.map((hospital) => chip(hospital.name, form.hospital_id === String(hospital.id), () => chooseHospital(hospital.id), `hospital-${hospital.id}`))}
                </View>

                <DateInput
                  label="Appointment date"
                  value={form.appointment_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(value) => {
                    setForm((current) => ({ ...current, appointment_date: value, appointment_time: '' }));
                    setSlots([]);
                  }}
                />

                <Text style={{ color: theme.muted }}>Select doctor</Text>
                {form.hospital_id && doctors.length === 0 ? (<Text style={{ color: theme.muted, marginBottom: 10 }}>
                    No doctors are assigned to the selected hospital.
                  </Text>) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {doctors.map((doctor) => chip(`Dr. ${doctor.name}`, form.doctor_id === String(doctor.id), () => chooseDoctor(doctor.id), `doctor-${doctor.id}`))}
                </View>

                <Text style={{ color: theme.muted }}>Available slot</Text>
                {form.doctor_id && slots.length === 0 ? (<Text style={{ color: theme.muted, marginBottom: 10 }}>
                    No time slots are available for this date.
                  </Text>) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {slots.map((slot) => chip(slot, form.appointment_time === slot, () => setForm((current) => ({ ...current, appointment_time: slot })), `booking-slot-${slot}`))}
                </View>

                <Input placeholder="Purpose" value={form.purpose} onChangeText={(value) => setForm((current) => ({ ...current, purpose: value }))}/>
                <Input placeholder="Notes (optional)" value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} multiline/>
                <Btn title="Book appointment" onPress={book} loading={loading}/>
              </Card>)}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {statuses.map((value) => chip(value, filter === value && !scope, () => { setScope(''); setFilter(value); }, `status-${value}`))}
            </View>
          </>} renderItem={({ item }) => (<Card>
            <Text style={{ color: theme.text, fontWeight: '800' }}>
              {item.child_name} · Dr. {item.doctor_name}
            </Text>
            <Text style={{ color: theme.muted }}>{item.hospital_name}</Text>
            <Text style={{ color: theme.text }}>
              {String(item.appointment_date).slice(0, 10)} {String(item.appointment_time).slice(0, 5)}
            </Text>
            <Text style={{ color: theme.text }}>{item.purpose}</Text>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>{item.status}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {isParent && ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(item.status) &&
                chip('Cancel', false, async () => {
                    const confirmed = await confirmAction('Cancel appointment?', 'This appointment will be marked as cancelled.', 'Cancel appointment', 'Keep appointment');
                    if (confirmed)
                        await updateStatus(item.id, 'CANCELLED');
                })}
              {user?.role === 'DOCTOR' && item.status === 'PENDING' &&
                chip('Confirm', false, () => updateStatus(item.id, 'CONFIRMED'))}
              {user?.role === 'DOCTOR' && item.status === 'PENDING' &&
                chip('Reject', false, () => updateStatus(item.id, 'REJECTED'))}
              {user?.role === 'DOCTOR' && ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(item.status) &&
                chip('Reschedule', rescheduleId === item.id, () => openReschedule(item))}
              {user?.role === 'DOCTOR' && ['CONFIRMED', 'RESCHEDULED'].includes(item.status) &&
                chip('Complete', false, () => updateStatus(item.id, 'COMPLETED'))}
              {isParent && item.status === 'COMPLETED' && !item.review_id &&
                chip('Give feedback', reviewId === item.id, () => {
                    setReviewId(reviewId === item.id ? null : item.id);
                    setReviewForm({ rating: 5, review_text: '', is_anonymous: false });
                })}
            </View>
            {item.review_id ? (<View style={{ marginTop: 10, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}>
              <Text style={{ color: theme.text, fontWeight: '800' }}>Doctor review</Text>
              <Text style={{ color: theme.primary, fontSize: 20, marginTop: 4 }}>{'★'.repeat(Number(item.review_rating || 0))}{'☆'.repeat(5 - Number(item.review_rating || 0))}</Text>
              {item.review_text ? <Text style={{ color: theme.text, marginTop: 4 }}>{item.review_text}</Text> : null}
              {isParent ? <Text style={{ color: theme.muted, marginTop: 4 }}>Feedback submitted</Text> : null}
            </View>) : null}
            {isParent && reviewId === item.id && !item.review_id && (<View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}>
              <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 8 }}>Rate Dr. {item.doctor_name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => chip(`${star} ★`, reviewForm.rating === star, () => setReviewForm((current) => ({ ...current, rating: star })), `rating-${star}`))}
              </View>
              <Input placeholder="Write your review (optional)" value={reviewForm.review_text} onChangeText={(value) => setReviewForm((current) => ({ ...current, review_text: value }))} multiline/>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {chip(reviewForm.is_anonymous ? 'Anonymous: Yes' : 'Anonymous: No', reviewForm.is_anonymous, () => setReviewForm((current) => ({ ...current, is_anonymous: !current.is_anonymous })))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Btn title="Submit feedback" onPress={submitReview} loading={reviewLoading}/>
                <Btn title="Close" onPress={() => setReviewId(null)} variant="secondary"/>
              </View>
            </View>)}
            {user?.role === 'DOCTOR' && rescheduleId === item.id && (<View style={{ marginTop: 12 }}>
              <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 8 }}>Reschedule appointment</Text>
              <DateInput label="New appointment date" value={rescheduleForm.appointment_date} min={new Date().toISOString().slice(0, 10)} onChange={(value) => setRescheduleForm((current) => ({ ...current, appointment_date: value, appointment_time: '' }))}/>
              <Text style={{ color: theme.muted, marginBottom: 6 }}>Available slots</Text>
              {validDate(rescheduleForm.appointment_date) && rescheduleSlots.length === 0 ? (<Text style={{ color: theme.muted, marginBottom: 10 }}>No slots available for this date.</Text>) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {rescheduleSlots.map((slot) => chip(slot, rescheduleForm.appointment_time === slot, () => setRescheduleForm((current) => ({ ...current, appointment_time: slot })), `reschedule-slot-${slot}`))}
              </View>
              <Input placeholder="Reason or notes (optional)" value={rescheduleForm.notes} onChangeText={(value) => setRescheduleForm((current) => ({ ...current, notes: value }))} multiline/>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Btn title="Save new schedule" onPress={submitReschedule} loading={rescheduleLoading}/>
                <Btn title="Close" onPress={closeReschedule} variant="secondary"/>
              </View>
            </View>)}
          </Card>)} ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: 'center', marginTop: 30 }}>
            No appointments found.
          </Text>}/>
    </Screen>);
}
