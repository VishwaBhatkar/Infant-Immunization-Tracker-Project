/**
 * File: backend/src/controllers/hospitalAdminController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/appError.js';
import { ok } from '../utils/responseUtils.js';

async function getAdminHospitalId(userId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT h.id
     FROM hospital_admins ha
     JOIN hospitals h ON h.id = ha.hospital_id
     WHERE ha.user_id = ? AND h.is_active = 1 AND h.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) throw new AppError('Hospital is not assigned to this admin', 403);
  return Number(rows[0].id);
}

async function createDefaultAvailability(connection, doctorId, hospitalId) {
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    await connection.query(
      `INSERT INTO doctor_availability
       (doctor_id,hospital_id,weekday,start_time,end_time,slot_minutes,is_available)
       VALUES(?,?,?,'09:00:00','17:00:00',30,1)
       ON DUPLICATE KEY UPDATE is_available = 1`,
      [doctorId, hospitalId, weekday]
    );
  }
}

export const listDoctors = async (req, res, next) => {
  try {
    const hospitalId = await getAdminHospitalId(req.user.id);
    const [rows] = await pool.query(
      `SELECT u.id,u.name,u.email,u.phone,u.avatar_url,u.is_active,u.created_at,
              COUNT(DISTINCT a.id) AS appointment_count
       FROM doctor_hospitals dh
       JOIN users u ON u.id = dh.doctor_id AND u.role = ?
       LEFT JOIN appointments a ON a.doctor_id = u.id AND a.hospital_id = dh.hospital_id
       WHERE dh.hospital_id = ? AND dh.is_active = 1 AND u.deleted_at IS NULL
       GROUP BY u.id
       ORDER BY u.name`,
      [ROLES.DOCTOR, hospitalId]
    );
    return ok(res, rows, 'Hospital doctors loaded');
  } catch (error) { next(error); }
};

export const createDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hospitalId = await getAdminHospitalId(req.user.id, connection);
    const { name, email, phone, password } = req.body;
    const [existing] = await connection.query(
      'SELECT id,role,deleted_at FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone]
    );
    let doctorId;
    if (existing.length) {
      if (existing[0].role !== ROLES.DOCTOR || existing[0].deleted_at) {
        throw new AppError('Email or mobile number is already registered', 409);
      }
      doctorId = existing[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const [result] = await connection.query(
        `INSERT INTO users(name,email,phone,password_hash,role,is_active)
         VALUES(?,?,?,?,?,1)`,
        [name, email, phone, passwordHash, ROLES.DOCTOR]
      );
      doctorId = result.insertId;
    }
    await connection.query(
      `INSERT INTO doctor_hospitals(doctor_id,hospital_id,is_active)
       VALUES(?,?,1)
       ON DUPLICATE KEY UPDATE is_active = 1`,
      [doctorId, hospitalId]
    );
    await createDefaultAvailability(connection, doctorId, hospitalId);
    await connection.commit();
    const [rows] = await pool.query('SELECT id,name,email,phone,is_active FROM users WHERE id=?', [doctorId]);
    return ok(res, rows[0], 'Doctor added to hospital successfully', 201);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

export const removeDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hospitalId = await getAdminHospitalId(req.user.id, connection);
    const doctorId = Number(req.params.id);

    const [assignment] = await connection.query(
      `SELECT u.name
       FROM doctor_hospitals dh
       JOIN users u ON u.id = dh.doctor_id
       WHERE dh.doctor_id = ? AND dh.hospital_id = ? AND dh.is_active = 1
       LIMIT 1 FOR UPDATE`,
      [doctorId, hospitalId]
    );
    if (!assignment.length) throw new AppError('Doctor is not assigned to your hospital', 404);

    const [activeAppointments] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM appointments
       WHERE doctor_id = ? AND hospital_id = ?
         AND status IN ('PENDING','CONFIRMED','RESCHEDULED')`,
      [doctorId, hospitalId]
    );
    if (Number(activeAppointments[0]?.total || 0) > 0) {
      throw new AppError(
        `Doctor cannot be removed until ${activeAppointments[0].total} active appointment(s) are completed or cancelled`,
        409
      );
    }

    await connection.query(
      `UPDATE doctor_hospitals SET is_active = 0
       WHERE doctor_id = ? AND hospital_id = ? AND is_active = 1`,
      [doctorId, hospitalId]
    );
    await connection.query(
      `UPDATE doctor_availability SET is_available = 0
       WHERE doctor_id = ? AND hospital_id = ?`,
      [doctorId, hospitalId]
    );

    const [parents] = await connection.query(
      `SELECT DISTINCT a.parent_id
       FROM appointments a
       JOIN users p ON p.id = a.parent_id AND p.deleted_at IS NULL
       WHERE a.doctor_id = ? AND a.hospital_id = ?`,
      [doctorId, hospitalId]
    );
    for (const parent of parents) {
      const title = 'Doctor removed from hospital';
      const message = `Dr. ${assignment[0].name} is no longer available at this hospital for future appointments.`;
      const [notification] = await connection.query(
        `INSERT INTO notifications(user_id,title,message,type,related_record_id)
         VALUES(?,?,?,'GENERAL',?)`,
        [parent.parent_id, title, message, doctorId]
      );
      await connection.query(
        `INSERT INTO notification_log
         (user_id,notification_id,reminder_type,related_record_id,reminder_key,title,message,scheduled_at,status,attempt_count)
         VALUES(?,?, 'GENERAL', ?, ?, ?, ?, NOW(), 'PENDING', 0)`,
        [parent.parent_id, notification.insertId, doctorId,
         `doctor-hospital-removed:${hospitalId}:${doctorId}:parent:${parent.parent_id}:${Date.now()}`,
         title, message]
      );
    }

    await connection.commit();
    return ok(res, null, 'Doctor removed from hospital successfully; affected parents were notified');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listBookingParents = async (req, res, next) => {
  try {
    const hospitalId = await getAdminHospitalId(req.user.id);
    const [rows] = await pool.query(
      `SELECT p.id,p.name,p.email,p.phone,
              COUNT(DISTINCT a.id) AS appointment_count,
              COUNT(DISTINCT a.child_id) AS children_count,
              MAX(TIMESTAMP(a.appointment_date,a.appointment_time)) AS last_appointment_at
       FROM appointments a
       JOIN users p ON p.id = a.parent_id
       WHERE a.hospital_id = ?
       GROUP BY p.id
       ORDER BY last_appointment_at DESC`,
      [hospitalId]
    );
    return ok(res, rows, 'Parents who booked appointments loaded');
  } catch (error) { next(error); }
};

export const listUsers = async (req, res, next) => {
  try {
    const hospitalId = await getAdminHospitalId(req.user.id);
    const [rows] = await pool.query(
      `SELECT x.id,x.name,x.email,x.phone,x.role,x.is_active,
              x.appointment_count,x.children_count
       FROM (
         SELECT u.id,u.name,u.email,u.phone,u.role,u.is_active,
                COUNT(DISTINCT a.id) AS appointment_count,
                COUNT(DISTINCT a.child_id) AS children_count
         FROM users u
         JOIN appointments a ON a.parent_id = u.id
         WHERE a.hospital_id = ? AND u.role = ? AND u.deleted_at IS NULL
         GROUP BY u.id
         UNION ALL
         SELECT u.id,u.name,u.email,u.phone,u.role,u.is_active,
                COUNT(DISTINCT a.id) AS appointment_count,
                COUNT(DISTINCT a.child_id) AS children_count
         FROM users u
         JOIN doctor_hospitals dh ON dh.doctor_id = u.id
         LEFT JOIN appointments a ON a.doctor_id = u.id AND a.hospital_id = dh.hospital_id
         WHERE dh.hospital_id = ? AND dh.is_active = 1
           AND u.role = ? AND u.deleted_at IS NULL
         GROUP BY u.id
       ) x
       ORDER BY x.role,x.name`,
      [hospitalId, ROLES.PARENT, hospitalId, ROLES.DOCTOR]
    );
    return ok(res, rows, 'Hospital parents and doctors loaded');
  } catch (error) { next(error); }
};

export const listChildren = async (req, res, next) => {
  try {
    const hospitalId = await getAdminHospitalId(req.user.id);
    const [rows] = await pool.query(
      `SELECT c.id,c.name,c.dob,c.gender,c.blood_group,c.allergies,
              p.id AS parent_id,p.name AS parent_name,p.email AS parent_email,p.phone AS parent_phone,
              COUNT(DISTINCT a.id) AS appointment_count,
              COUNT(DISTINCT ir.id) AS completed_vaccinations
       FROM children c
       JOIN users p ON p.id = c.parent_id
       LEFT JOIN appointments a ON a.child_id = c.id AND a.hospital_id = ?
       LEFT JOIN immunization_records ir ON ir.child_id = c.id AND ir.hospital_id = ?
       WHERE EXISTS (
         SELECT 1 FROM appointments ax
         WHERE ax.child_id = c.id AND ax.hospital_id = ?
       ) OR EXISTS (
         SELECT 1 FROM immunization_records ix
         WHERE ix.child_id = c.id AND ix.hospital_id = ?
       )
       GROUP BY c.id,p.id
       ORDER BY c.name`,
      [hospitalId, hospitalId, hospitalId, hospitalId]
    );
    return ok(res, rows, 'Hospital children loaded');
  } catch (error) { next(error); }
};
