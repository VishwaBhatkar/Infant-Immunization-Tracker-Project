/**
 * File: backend/src/controllers/dashboardController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';
import { AppError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';

// Safely extract a numeric count from a database result
const count = (rows) => Number(rows?.[0]?.count || 0);

// Load dashboard statistics and upcoming activities for a parent
export const parentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Execute independent dashboard queries concurrently
    const [
      childrenR,
      upcomingVaccinesR,
      overdueR,
      appointmentsR,
      unreadR,
      recentNotificationsR,
      nextVaccinesR,
      nextAppointmentsR
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count
         FROM children
         WHERE parent_id = ?`,
        [userId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM vaccine_schedules vs
         JOIN children c ON c.id = vs.child_id
         WHERE c.parent_id = ?
           AND vs.status IN ('UPCOMING', 'DUE')`,
        [userId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM vaccine_schedules vs
         JOIN children c ON c.id = vs.child_id
         WHERE c.parent_id = ?
           AND vs.status = 'OVERDUE'`,
        [userId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM appointments
         WHERE parent_id = ?
           AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')
           AND TIMESTAMP(appointment_date, appointment_time) >= NOW()`,
        [userId]
      ),

      // Support databases where the notifications table may not contain deleted_at
      pool
        .query(
          `SELECT COUNT(*) AS count
           FROM notifications
           WHERE user_id = ?
             AND is_read = 0
             AND deleted_at IS NULL`,
          [userId]
        )
        .catch(() =>
          pool.query(
            `SELECT COUNT(*) AS count
             FROM notifications
             WHERE user_id = ?
               AND is_read = 0`,
            [userId]
          )
        ),

      pool.query(
        `SELECT
           id,
           title,
           message,
           type,
           related_record_id,
           is_read,
           created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      ),

      pool.query(
        `SELECT
           vs.id,
           vs.due_date,
           vs.status,
           c.name AS child_name,
           v.name AS vaccine_name,
           v.dose_number
         FROM vaccine_schedules vs
         JOIN children c ON c.id = vs.child_id
         JOIN vaccines v ON v.id = vs.vaccine_id
         WHERE c.parent_id = ?
           AND vs.status IN ('UPCOMING', 'DUE', 'OVERDUE')
         ORDER BY
           CASE vs.status
             WHEN 'OVERDUE' THEN 0
             WHEN 'DUE' THEN 1
             ELSE 2
           END,
           vs.due_date
         LIMIT 5`,
        [userId]
      ),

      pool.query(
        `SELECT
           a.id,
           a.appointment_date,
           a.appointment_time,
           a.status,
           c.name AS child_name,
           d.name AS doctor_name,
           h.name AS hospital_name
         FROM appointments a
         JOIN children c ON c.id = a.child_id
         JOIN users d ON d.id = a.doctor_id
         JOIN hospitals h ON h.id = a.hospital_id
         WHERE a.parent_id = ?
           AND a.status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')
           AND TIMESTAMP(a.appointment_date, a.appointment_time) >= NOW()
         ORDER BY
           a.appointment_date,
           a.appointment_time
         LIMIT 5`,
        [userId]
      )
    ]);

    ok(res, {
      children: count(childrenR[0]),
      upcomingVaccines: count(upcomingVaccinesR[0]),
      overdueVaccines: count(overdueR[0]),
      upcomingAppointments: count(appointmentsR[0]),
      unreadNotifications: count(unreadR[0]),
      recentNotifications: recentNotificationsR[0],
      nextVaccines: nextVaccinesR[0],
      nextAppointments: nextAppointmentsR[0]
    });
  } catch (error) {
    next(error);
  }
};

// Load appointment and vaccination statistics for a doctor
export const doctorDashboard = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    // Execute independent dashboard queries concurrently
    const [
      todayR,
      pendingR,
      completedR,
      patientsR,
      vaccinesR,
      todayListR
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count
         FROM appointments
         WHERE doctor_id = ?
           AND appointment_date = CURDATE()
           AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')`,
        [doctorId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM appointments
         WHERE doctor_id = ?
           AND status = 'PENDING'`,
        [doctorId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM appointments
         WHERE doctor_id = ?
           AND status = 'COMPLETED'`,
        [doctorId]
      ),

      pool.query(
        `SELECT COUNT(DISTINCT child_id) AS count
         FROM appointments
         WHERE doctor_id = ?`,
        [doctorId]
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM immunization_records
         WHERE doctor_id = ?
           AND status = 'COMPLETED'`,
        [doctorId]
      ),

      pool.query(
        `SELECT
           a.id,
           a.appointment_time,
           a.status,
           a.purpose,
           c.name AS child_name,
           u.name AS parent_name,
           h.name AS hospital_name
         FROM appointments a
         JOIN children c ON c.id = a.child_id
         JOIN users u ON u.id = a.parent_id
         JOIN hospitals h ON h.id = a.hospital_id
         WHERE a.doctor_id = ?
           AND a.appointment_date = CURDATE()
         ORDER BY a.appointment_time
         LIMIT 20`,
        [doctorId]
      )
    ]);

    ok(res, {
      todayAppointments: count(todayR[0]),
      pendingAppointments: count(pendingR[0]),
      completedAppointments: count(completedR[0]),
      assignedPatients: count(patientsR[0]),
      vaccinesAdministered: count(vaccinesR[0]),
      today: todayListR[0]
    });
  } catch (error) {
    next(error);
  }
};

// Load system-wide or hospital-specific statistics for administrators
export const adminDashboard = async (req, res, next) => {
  try {
    let hospitalId = null;
    let hospitalWhere = '';
    let params = [];

    // Restrict hospital administrators to their assigned hospital
    if (req.user.role === ROLES.HOSPITAL_ADMIN) {
      const [assigned] = await pool.query(
        `SELECT hospital_id
         FROM hospital_admins
         WHERE user_id = ?
         LIMIT 1`,
        [req.user.id]
      );

      if (!assigned.length) {
        throw new AppError(
          'No hospital is assigned to this administrator',
          403
        );
      }

      hospitalId = assigned[0].hospital_id;
      hospitalWhere = ' WHERE hospital_id = ?';
      params = [hospitalId];
    }

    const doctorSql = hospitalId
      ? `SELECT COUNT(DISTINCT doctor_id) AS count
         FROM doctor_hospitals
         WHERE hospital_id = ?
           AND is_active = 1`
      : `SELECT COUNT(*) AS count
         FROM users
         WHERE role = 'DOCTOR'
           AND is_active = 1`;

    // Use hospital-filtered queries for hospital administrators
    const [
      usersR,
      childrenR,
      doctorsR,
      hospitalsR,
      appointmentsR,
      completedVaccinesR,
      overdueR,
      recentR
    ] = await Promise.all([
      pool.query(
        hospitalId
          ? `SELECT COUNT(DISTINCT parent_id) AS count
             FROM appointments
             WHERE hospital_id = ?`
          : `SELECT COUNT(*) AS count
             FROM users
             WHERE is_active = 1`,
        params
      ),

      pool.query(
        hospitalId
          ? `SELECT COUNT(DISTINCT child_id) AS count
             FROM appointments
             WHERE hospital_id = ?`
          : `SELECT COUNT(*) AS count
             FROM children`,
        params
      ),

      pool.query(doctorSql, params),

      pool.query(
        hospitalId
          ? `SELECT COUNT(*) AS count
             FROM hospitals
             WHERE id = ?
               AND is_active = 1`
          : `SELECT COUNT(*) AS count
             FROM hospitals
             WHERE is_active = 1`,
        params
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM appointments${hospitalWhere}`,
        params
      ),

      pool.query(
        hospitalId
          ? `SELECT COUNT(*) AS count
             FROM immunization_records
             WHERE hospital_id = ?
               AND status = 'COMPLETED'`
          : `SELECT COUNT(*) AS count
             FROM immunization_records
             WHERE status = 'COMPLETED'`,
        params
      ),

      pool.query(
        hospitalId
          ? `SELECT COUNT(*) AS count
             FROM vaccine_schedules vs
             JOIN appointments a ON a.child_id = vs.child_id
             WHERE a.hospital_id = ?
               AND vs.status = 'OVERDUE'`
          : `SELECT COUNT(*) AS count
             FROM vaccine_schedules
             WHERE status = 'OVERDUE'`,
        params
      ),

      pool.query(
        hospitalId
          ? `SELECT
               a.id,
               a.appointment_date,
               a.appointment_time,
               a.status,
               c.name AS child_name,
               d.name AS doctor_name
             FROM appointments a
             JOIN children c ON c.id = a.child_id
             JOIN users d ON d.id = a.doctor_id
             WHERE a.hospital_id = ?
             ORDER BY a.created_at DESC
             LIMIT 8`
          : `SELECT
               a.id,
               a.appointment_date,
               a.appointment_time,
               a.status,
               c.name AS child_name,
               d.name AS doctor_name
             FROM appointments a
             JOIN children c ON c.id = a.child_id
             JOIN users d ON d.id = a.doctor_id
             ORDER BY a.created_at DESC
             LIMIT 8`,
        params
      )
    ]);

    ok(res, {
      hospital_id: hospitalId,
      totalUsers: count(usersR[0]),
      totalChildren: count(childrenR[0]),
      totalDoctors: count(doctorsR[0]),
      totalHospitals: count(hospitalsR[0]),
      totalAppointments: count(appointmentsR[0]),
      vaccinationsCompleted: count(completedVaccinesR[0]),
      overdueVaccinations: count(overdueR[0]),
      recentActivity: recentR[0]
    });
  } catch (error) {
    next(error);
  }
};