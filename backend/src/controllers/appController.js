/**
 * File: backend/src/controllers/appController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';
import { AppError } from '../utils/appError.js';

/**
 * Parent dashboard summary
 * Returns child count, upcoming appointments, and unread notifications.
 */
export const parentDashboard = async (req, res, next) => {
    try {
        const [[c], [a], [n]] = await Promise.all([
            pool.query(
                'SELECT COUNT(*) count FROM children WHERE parent_id=?',
                [req.user.id]
            ),
            pool.query(
                "SELECT COUNT(*) count FROM appointments WHERE parent_id=? AND status IN ('PENDING','CONFIRMED','RESCHEDULED')",
                [req.user.id]
            ),
            pool.query(
                'SELECT COUNT(*) count FROM notifications WHERE user_id=? AND is_read=0',
                [req.user.id]
            )
        ]);

        ok(res, {
            children: c[0].count,
            upcomingAppointments: a[0].count,
            unreadNotifications: n[0].count
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Doctor dashboard
 * Returns today's appointment list and total count.
 */
export const doctorDashboard = async (req, res, next) => {
    try {
        const [a] = await pool.query(
            `SELECT
                a.*,
                c.name child_name,
                u.name parent_name,
                h.name hospital_name
             FROM appointments a
             JOIN children c ON c.id = a.child_id
             JOIN users u ON u.id = a.parent_id
             JOIN hospitals h ON h.id = a.hospital_id
             WHERE a.doctor_id = ?
             AND a.appointment_date = CURDATE()
             ORDER BY a.appointment_time`,
            [req.user.id]
        );

        ok(res, {
            today: a,
            total: a.length
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Get all children belonging to the logged-in parent.
 */
export const listChildren = async (req, res, next) => {
    try {
        const [r] = await pool.query(
            'SELECT * FROM children WHERE parent_id=? ORDER BY created_at DESC',
            [req.user.id]
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};

/**
 * Add a new child for the logged-in parent.
 */
export const addChild = async (req, res, next) => {
    try {
        const { name, dob, gender, blood_group } = req.body;

        const [r] = await pool.query(
            'INSERT INTO children(parent_id,name,dob,gender,blood_group) VALUES(?,?,?,?,?)',
            [
                req.user.id,
                name,
                dob,
                gender,
                blood_group || null
            ]
        );

        ok(res, { id: r.insertId }, 'Child added', 201);
    } catch (e) {
        next(e);
    }
};

/**
 * Get all active hospitals.
 */
export const hospitals = async (req, res, next) => {
    try {
        const [r] = await pool.query(
            'SELECT id,name,address,phone FROM hospitals WHERE is_active=1'
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};

/**
 * Get vaccine schedules for all children of the logged-in parent.
 */
export const schedules = async (req, res, next) => {
    try {
        const [r] = await pool.query(
            `SELECT
                vs.*,
                v.name vaccine_name,
                v.description,
                c.name child_name
             FROM vaccine_schedules vs
             JOIN vaccines v ON v.id = vs.vaccine_id
             JOIN children c ON c.id = vs.child_id
             WHERE c.parent_id=?
             ORDER BY vs.due_date`,
            [req.user.id]
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};

/**
 * Get appointments based on the logged-in user's role.
 */
export const appointments = async (req, res, next) => {
    try {
        let where = '';
        let params = [];

        if (req.user.role === 'PARENT') {
            where = 'WHERE a.parent_id=?';
            params = [req.user.id];
        } else if (req.user.role === 'DOCTOR') {
            where = 'WHERE a.doctor_id=?';
            params = [req.user.id];
        } else if (req.user.role === 'HOSPITAL_ADMIN') {
            where =
                'WHERE a.hospital_id=(SELECT hospital_id FROM hospital_admins WHERE user_id=? LIMIT 1)';
            params = [req.user.id];
        }

        const [r] = await pool.query(
            `SELECT
                a.*,
                c.name child_name,
                h.name hospital_name,
                d.name doctor_name
             FROM appointments a
             JOIN children c ON c.id = a.child_id
             JOIN hospitals h ON h.id = a.hospital_id
             JOIN users d ON d.id = a.doctor_id
             ${where}
             ORDER BY a.appointment_date DESC,a.appointment_time`,
            params
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};

/**
 * Book a new appointment.
 * Also creates notifications for the parent and doctor.
 */
export const bookAppointment = async (req, res, next) => {
    try {
        const {
            child_id,
            doctor_id,
            hospital_id,
            appointment_date,
            appointment_time,
            reason
        } = req.body;

        // Verify that the child belongs to the logged-in parent.
        const [owned] = await pool.query(
            'SELECT id FROM children WHERE id=? AND parent_id=?',
            [child_id, req.user.id]
        );

        if (!owned.length) {
            throw new AppError('Child not found', 404);
        }

        const [r] = await pool.query(
            `INSERT INTO appointments(
                parent_id,
                child_id,
                doctor_id,
                hospital_id,
                appointment_date,
                appointment_time,
                reason
            )
            VALUES(?,?,?,?,?,?,?)`,
            [
                req.user.id,
                child_id,
                doctor_id,
                hospital_id,
                appointment_date,
                appointment_time,
                reason
            ]
        );

        // Notify both parent and doctor.
        await pool.query(
            `INSERT INTO notifications(user_id,title,message,type)
             VALUES
             (?,?,?,'APPOINTMENT'),
             (?,?,?,'APPOINTMENT')`,
            [
                req.user.id,
                'Appointment booked',
                `Appointment on ${appointment_date} at ${appointment_time}`,
                doctor_id,
                'New appointment',
                `New appointment on ${appointment_date} at ${appointment_time}`
            ]
        );

        ok(res, { id: r.insertId }, 'Appointment booked', 201);
    } catch (e) {
        next(e);
    }
};

/**
 * Update appointment status by the assigned doctor.
 */
export const updateAppointment = async (req, res, next) => {
    try {
        const { status } = req.body;

        await pool.query(
            'UPDATE appointments SET status=? WHERE id=? AND doctor_id=?',
            [status, req.params.id, req.user.id]
        );

        ok(res, null, 'Appointment updated');
    } catch (e) {
        next(e);
    }
};

/**
 * Get all growth records for children of the logged-in parent.
 */
export const growth = async (req, res, next) => {
    try {
        const [r] = await pool.query(
            `SELECT
                g.*,
                c.name child_name
             FROM growth_records g
             JOIN children c ON c.id = g.child_id
             WHERE c.parent_id=?
             ORDER BY measured_on DESC`,
            [req.user.id]
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};

/**
 * Add a growth record for a child.
 * Ensures the child belongs to the logged-in parent.
 */
export const addGrowth = async (req, res, next) => {
    try {
        const {
            child_id,
            height_cm,
            weight_kg,
            head_circumference_cm,
            measured_on
        } = req.body;

        const [r] = await pool.query(
            `INSERT INTO growth_records(
                child_id,
                height_cm,
                weight_kg,
                head_circumference_cm,
                measured_on
            )
            SELECT ?,?,?,?,?
            FROM children
            WHERE id=? AND parent_id=?`,
            [
                child_id,
                height_cm,
                weight_kg,
                head_circumference_cm || null,
                measured_on,
                child_id,
                req.user.id
            ]
        );

        if (!r.affectedRows) {
            throw new AppError('Child not found', 404);
        }

        ok(res, { id: r.insertId }, 'Growth record saved', 201);
    } catch (e) {
        next(e);
    }
};

/**
 * Get the latest notifications for the logged-in user.
 */
export const notifications = async (req, res, next) => {
    try {
        const [r] = await pool.query(
            `SELECT n.* FROM notifications n
             LEFT JOIN user_settings us ON us.user_id=n.user_id
             WHERE n.user_id=? AND (UPPER(n.type) <> 'PROMOTIONAL' OR COALESCE(us.promotional_notifications,FALSE)=TRUE)
             ORDER BY n.created_at DESC LIMIT 100`,
            [req.user.id]
        );

        ok(res, r);
    } catch (e) {
        next(e);
    }
};


/**
 * Delete one notification belonging to the logged-in user.
 */
export const deleteNotification = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT id FROM notifications WHERE id=? AND user_id=? FOR UPDATE',
            [req.params.id, req.user.id]
        );

        if (!rows.length) {
            throw new AppError('Notification not found', 404);
        }

        // Keep delivery history valid when notification_log references this row.
        await connection.query(
            'UPDATE notification_log SET notification_id=NULL WHERE notification_id=?',
            [req.params.id]
        );
        await connection.query(
            'DELETE FROM notifications WHERE id=? AND user_id=?',
            [req.params.id, req.user.id]
        );

        await connection.commit();
        ok(res, null, 'Notification deleted');
    } catch (e) {
        await connection.rollback();
        next(e);
    } finally {
        connection.release();
    }
};

/**
 * Delete all notifications belonging to the logged-in user.
 */
export const deleteAllNotifications = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE notification_log nl
             JOIN notifications n ON n.id=nl.notification_id
             SET nl.notification_id=NULL
             WHERE n.user_id=?`,
            [req.user.id]
        );

        const [result] = await connection.query(
            'DELETE FROM notifications WHERE user_id=?',
            [req.user.id]
        );

        await connection.commit();
        ok(res, { deleted_count: result.affectedRows }, 'All notifications deleted');
    } catch (e) {
        await connection.rollback();
        next(e);
    } finally {
        connection.release();
    }
};

/**
 * Save the Expo Push Notification token for the logged-in user.
 */
export const registerPushToken = async (req, res, next) => {
    try {
        await pool.query(
            'UPDATE users SET expo_push_token=? WHERE id=?',
            [req.body.token, req.user.id]
        );

        ok(res, null, 'Notification device registered');
    } catch (e) {
        next(e);
    }
};

/**
 * Update profile information for the logged-in user.
 */
export const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, dark_mode } = req.body;

        await pool.query(
            'UPDATE users SET name=?,phone=?,dark_mode=? WHERE id=?',
            [
                name,
                phone,
                !!dark_mode,
                req.user.id
            ]
        );

        ok(res, null, 'Profile updated');
    } catch (e) {
        next(e);
    }
};