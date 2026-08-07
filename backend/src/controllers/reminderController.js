/**
 * File: backend/src/controllers/reminderController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
// Import database connection pool
import { pool } from '../config/db.js';

// Import success response helper
import { ok } from '../utils/responseUtils.js';

// Import custom application error class
import { AppError } from '../utils/appError.js';

// Import reminder service
import { runReminderCycle } from '../services/reminderService.js';

/**
 * Get the logged-in user's notification preferences.
 */
export async function getPreferences(req, res, next) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM notification_preferences WHERE user_id=?',
            [req.user.id]
        );

        ok(
            res,
            rows[0] || {
                user_id: req.user.id,
                push_enabled: 1,
                vaccination_reminders_enabled: 1,
                appointment_reminders_enabled: 1,
                overdue_reminders_enabled: 1,
                vaccine_reminder_days: '7,3,1,0',
                overdue_interval_days: 7,
                appointment_reminder_days: '1,0',
            },
            'Notification preferences loaded'
        );
    } catch (e) {
        next(e);
    }
}

/**
 * Create or update the user's notification preferences.
 */
export async function updatePreferences(req, res, next) {
    try {
        const p = req.body;

        await pool.query(
            `INSERT INTO notification_preferences(
                user_id,
                push_enabled,
                vaccination_reminders_enabled,
                appointment_reminders_enabled,
                overdue_reminders_enabled,
                vaccine_reminder_days,
                overdue_interval_days,
                appointment_reminder_days
            )
            VALUES(?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                push_enabled=VALUES(push_enabled),
                vaccination_reminders_enabled=VALUES(vaccination_reminders_enabled),
                appointment_reminders_enabled=VALUES(appointment_reminders_enabled),
                overdue_reminders_enabled=VALUES(overdue_reminders_enabled),
                vaccine_reminder_days=VALUES(vaccine_reminder_days),
                overdue_interval_days=VALUES(overdue_interval_days),
                appointment_reminder_days=VALUES(appointment_reminder_days)`,
            [
                req.user.id,
                !!p.push_enabled,
                !!p.vaccination_reminders_enabled,
                !!p.appointment_reminders_enabled,
                !!p.overdue_reminders_enabled,
                p.vaccine_reminder_days || '7,3,1,0',
                p.overdue_interval_days || 7,
                p.appointment_reminder_days || '1,0',
            ]
        );

        return getPreferences(req, res, next);
    } catch (e) {
        next(e);
    }
}

/**
 * Retrieve notification reminder logs.
 */
export async function listLogs(req, res, next) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

        const params = [];
        let where = '1=1';

        // Restrict non-admin users to their own logs
        if (req.user.role !== 'SYSTEM_ADMIN') {
            where += ' AND user_id=?';
            params.push(req.user.id);
        }

        // Apply status filter when provided
        if (req.query.status) {
            where += ' AND status=?';
            params.push(req.query.status);
        }

        const [[count]] = await pool.query(
            `SELECT COUNT(*) total FROM notification_log WHERE ${where}`,
            params
        );

        const [items] = await pool.query(
            `SELECT * FROM notification_log
             WHERE ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        ok(
            res,
            {
                items,
                pagination: {
                    page,
                    limit,
                    total: count.total,
                    pages: Math.ceil(count.total / limit),
                },
            },
            'Reminder logs loaded'
        );
    } catch (e) {
        next(e);
    }
}

/**
 * Manually execute the reminder cycle.
 */
export async function runNow(req, res, next) {
    try {
        // Allow only System Admin users to run reminder jobs manually
        if (req.user.role !== 'SYSTEM_ADMIN') {
            throw new AppError(
                'Only System Admin can run reminder jobs manually',
                403
            );
        }

        ok(
            res,
            await runReminderCycle(),
            'Reminder cycle completed'
        );
    } catch (e) {
        next(e);
    }
}