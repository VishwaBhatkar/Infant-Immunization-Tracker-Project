/**
 * File: backend/src/services/reminderService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { deliverPendingPushes, checkExpoReceipts } from './expoPushService.js';
import { deliverPreferenceChannels } from './preferenceDeliveryService.js';

const parseDays = (value, fallback) => {
  const values = String(value || fallback).split(',').map(Number).filter((v) => Number.isInteger(v) && v >= 0);
  return [...new Set(values)];
};

const preferenceDefaults = {
  vaccination_reminders_enabled: 1,
  appointment_reminders_enabled: 1,
  overdue_reminders_enabled: 1,
  vaccine_reminder_days: '7,3,1,0',
  overdue_interval_days: 7,
  appointment_reminder_days: '1,0'
};

async function preferences(userId) {
  const [rows] = await pool.query('SELECT * FROM notification_preferences WHERE user_id=?', [userId]);
  return rows[0] || preferenceDefaults;
}

async function createReminder({ userId, type, relatedId, key, title, message, scheduledAt = new Date() }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query('SELECT id FROM notification_log WHERE reminder_key=? LIMIT 1', [key]);
    if (existing.length) {
      await connection.rollback();
      return false;
    }
    const [notificationResult] = await connection.query(
      `INSERT INTO notifications(user_id,title,message,type,related_record_id) VALUES(?,?,?,?,?)`,
      [userId, title, message, type === 'APPOINTMENT' ? 'APPOINTMENT' : 'VACCINE', relatedId]
    );
    await connection.query(
      `INSERT INTO notification_log(user_id,notification_id,reminder_type,related_record_id,reminder_key,title,message,scheduled_at,status,attempt_count)
       VALUES(?,?,?,?,?,?,?,?, 'PENDING',0)`,
      [userId, notificationResult.insertId, type, relatedId, key, title, message, scheduledAt]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return false;
    throw error;
  } finally {
    connection.release();
  }
}

export async function generateVaccineReminders(today = new Date()) {
  const [rows] = await pool.query(`
    SELECT vs.id schedule_id,vs.due_date,vs.status,c.name child_name,c.parent_id,v.name vaccine_name,v.dose_number
    FROM vaccine_schedules vs
    JOIN children c ON c.id=vs.child_id
    JOIN vaccines v ON v.id=vs.vaccine_id
    JOIN users u ON u.id=c.parent_id AND u.is_active=TRUE
    WHERE vs.status IN ('UPCOMING','DUE','OVERDUE')
  `);
  let created = 0;
  const todayOnly = new Date(today); todayOnly.setHours(0,0,0,0);
  for (const row of rows) {
    const pref = await preferences(row.parent_id);
    if (!pref.vaccination_reminders_enabled) continue;
    const due = new Date(row.due_date); due.setHours(0,0,0,0);
    const daysUntil = Math.round((due - todayOnly) / 86400000);
    const dueDays = parseDays(pref.vaccine_reminder_days, '7,3,1,0');
    if (daysUntil >= 0 && dueDays.includes(daysUntil)) {
      const key = `vaccine:${row.schedule_id}:before:${daysUntil}`;
      const when = daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
      created += await createReminder({ userId: row.parent_id, type: 'VACCINE_DUE', relatedId: row.schedule_id, key,
        title: 'Vaccination reminder', message: `${row.child_name}'s ${row.vaccine_name} dose ${row.dose_number} is due ${when}. Please book an appointment.` });
    } else if (daysUntil < 0 && pref.overdue_reminders_enabled) {
      const overdueDays = Math.abs(daysUntil);
      const interval = Math.max(1, Number(pref.overdue_interval_days) || 7);
      if (overdueDays === 1 || overdueDays % interval === 0) {
        const key = `vaccine:${row.schedule_id}:overdue:${overdueDays}`;
        created += await createReminder({ userId: row.parent_id, type: 'VACCINE_OVERDUE', relatedId: row.schedule_id, key,
          title: 'Vaccination overdue', message: `${row.child_name}'s ${row.vaccine_name} dose ${row.dose_number} is ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue.` });
      }
    }
  }
  return created;
}

export async function generateAppointmentReminders(today = new Date()) {
  const [rows] = await pool.query(`
    SELECT a.id,a.parent_id,a.doctor_id,a.appointment_date,a.appointment_time,a.status,c.name child_name,u.name doctor_name
    FROM appointments a JOIN children c ON c.id=a.child_id JOIN users u ON u.id=a.doctor_id
    WHERE a.status IN ('PENDING','CONFIRMED','RESCHEDULED') AND a.appointment_date >= CURDATE()
  `);
  let created = 0;
  const todayOnly = new Date(today); todayOnly.setHours(0,0,0,0);
  for (const row of rows) {
    const date = new Date(row.appointment_date); date.setHours(0,0,0,0);
    const daysUntil = Math.round((date - todayOnly) / 86400000);
    for (const userId of [row.parent_id, row.doctor_id]) {
      const pref = await preferences(userId);
      if (!pref.appointment_reminders_enabled) continue;
      if (!parseDays(pref.appointment_reminder_days, '1,0').includes(daysUntil)) continue;
      const key = `appointment:${row.id}:user:${userId}:before:${daysUntil}`;
      const when = daysUntil === 0 ? 'today' : 'tomorrow';
      const message = userId === row.parent_id
        ? `Your appointment for ${row.child_name} with ${row.doctor_name} is ${when} at ${String(row.appointment_time).slice(0,5)}.`
        : `Your appointment with ${row.child_name} is ${when} at ${String(row.appointment_time).slice(0,5)}.`;
      created += await createReminder({ userId, type: 'APPOINTMENT', relatedId: row.id, key, title: 'Appointment reminder', message });
    }
  }
  return created;
}

export async function processReminderQueue() {
  const [result] = await pool.query(`
    UPDATE notification_log nl
    LEFT JOIN notification_preferences np ON np.user_id=nl.user_id
    SET nl.status='SKIPPED',
        nl.failure_reason='Push notifications disabled by user'
    WHERE nl.status IN ('PENDING','FAILED') AND nl.scheduled_at<=NOW()
      AND COALESCE(np.push_enabled,TRUE)=FALSE
  `);
  return result.affectedRows;
}

export async function runReminderCycle() {
  await pool.query("ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS preference_channels_sent BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS preference_channel_response JSON NULL");
  const vaccines = await generateVaccineReminders();
  const appointments = await generateAppointmentReminders();
  const skipped = await processReminderQueue();
  const delivery = await deliverPendingPushes();
  const receipts = await checkExpoReceipts();
  const preferenceChannels = await deliverPreferenceChannels();
  return { vaccines, appointments, skipped, ...delivery, receipts, preferenceChannels };
}
