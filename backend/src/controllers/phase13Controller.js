/**
 * File: backend/src/controllers/phase13Controller.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * Check whether the user can access a child.
 * System admins can access all children.
 */
const ownedChild = async (childId, user) => {
    if (user.role === 'SYSTEM_ADMIN') {
        return true;
    }

    const [rows] = await pool.query(
        `SELECT id
         FROM children
         WHERE id = ? AND parent_id = ?`,
        [childId, user.id]
    );

    return rows.length > 0;
};

/**
 * Retrieve growth records for a child.
 */
export async function listGrowth(req, res, next) {
    try {
        const childId = req.query.child_id;

        if (!childId) {
            return next(
                new AppError('child_id is required', 422)
            );
        }

        if (!(await ownedChild(childId, req.user))) {
            return next(
                new AppError('Child not found', 404)
            );
        }

        const [rows] = await pool.query(
            `SELECT *
             FROM growth_records
             WHERE child_id = ?
             ORDER BY measured_on ASC, id ASC`,
            [childId]
        );

        res.json({
            success: true,
            message: 'Growth history loaded',
            data: rows,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add a growth record for a child.
 */
export async function addGrowth(req, res, next) {
    try {
        const {
            child_id,
            height_cm,
            weight_kg,
            head_circumference_cm = null,
            measured_on,
            notes = null,
        } = req.body;

        if (!(await ownedChild(child_id, req.user))) {
            return next(
                new AppError('Child not found', 404)
            );
        }

        const [result] = await pool.query(
            `INSERT INTO growth_records(
                child_id,
                height_cm,
                weight_kg,
                head_circumference_cm,
                measured_on,
                notes
            )
            VALUES(?, ?, ?, ?, ?, ?)`,
            [
                child_id,
                height_cm,
                weight_kg,
                head_circumference_cm,
                measured_on,
                notes,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Growth record added',
            data: {
                id: result.insertId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update a growth record owned by the logged-in parent.
 */
export async function updateGrowth(req, res, next) {
    try {
        const [rows] = await pool.query(
            `SELECT g.child_id
             FROM growth_records g
             JOIN children c
                 ON c.id = g.child_id
             WHERE g.id = ? AND c.parent_id = ?`,
            [req.params.id, req.user.id]
        );

        if (!rows.length) {
            return next(
                new AppError('Growth record not found', 404)
            );
        }

        const allowedFields = [
            'height_cm',
            'weight_kg',
            'head_circumference_cm',
            'measured_on',
            'notes',
        ];

        const entries = allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]);

        if (!entries.length) {
            return next(
                new AppError('No fields to update', 422)
            );
        }

        const fields = entries.map(([field]) => `${field} = ?`);
        const values = entries.map(([, value]) => value);

        await pool.query(
            `UPDATE growth_records
             SET ${fields.join(', ')}
             WHERE id = ?`,
            [...values, req.params.id]
        );

        res.json({
            success: true,
            message: 'Growth record updated',
            data: null,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a growth record owned by the logged-in parent.
 */
export async function deleteGrowth(req, res, next) {
    try {
        const [result] = await pool.query(
            `DELETE FROM growth_records
             WHERE id = ?
               AND child_id IN (
                   SELECT id
                   FROM children
                   WHERE parent_id = ?
               )`,
            [req.params.id, req.user.id]
        );

        if (!result.affectedRows) {
            return next(
                new AppError('Growth record not found', 404)
            );
        }

        res.json({
            success: true,
            message: 'Growth record deleted',
            data: null,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve medical history for a child.
 */
export async function listMedical(req, res, next) {
    try {
        const {
            child_id,
            type,
        } = req.query;

        if (!child_id) {
            return next(
                new AppError('child_id is required', 422)
            );
        }

        if (!(await ownedChild(child_id, req.user))) {
            return next(
                new AppError('Child not found', 404)
            );
        }

        const params = [child_id];

        let sql = `
            SELECT *
            FROM medical_history
            WHERE child_id = ?
        `;

        if (type) {
            sql += ' AND record_type = ?';
            params.push(type);
        }

        sql += ' ORDER BY record_date DESC, id DESC';

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            message: 'Medical history loaded',
            data: rows,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add a medical history record for a child.
 */
export async function addMedical(req, res, next) {
    try {
        const {
            child_id,
            record_type,
            title,
            description = null,
            record_date,
        } = req.body;

        if (!(await ownedChild(child_id, req.user))) {
            return next(
                new AppError('Child not found', 404)
            );
        }

        const [result] = await pool.query(
            `INSERT INTO medical_history(
                child_id,
                record_type,
                title,
                description,
                record_date,
                created_by
            )
            VALUES(?, ?, ?, ?, ?, ?)`,
            [
                child_id,
                record_type,
                title,
                description,
                record_date,
                req.user.id,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Medical history added',
            data: {
                id: result.insertId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update a medical record owned by the logged-in parent.
 */
export async function updateMedical(req, res, next) {
    try {
        const [rows] = await pool.query(
            `SELECT m.id
             FROM medical_history m
             JOIN children c
                 ON c.id = m.child_id
             WHERE m.id = ? AND c.parent_id = ?`,
            [req.params.id, req.user.id]
        );

        if (!rows.length) {
            return next(
                new AppError('Medical record not found', 404)
            );
        }

        const allowedFields = [
            'record_type',
            'title',
            'description',
            'record_date',
        ];

        const entries = allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]);

        if (!entries.length) {
            return next(
                new AppError('No fields to update', 422)
            );
        }

        const fields = entries.map(([field]) => `${field} = ?`);
        const values = entries.map(([, value]) => value);

        await pool.query(
            `UPDATE medical_history
             SET ${fields.join(', ')}
             WHERE id = ?`,
            [...values, req.params.id]
        );

        res.json({
            success: true,
            message: 'Medical history updated',
            data: null,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a medical record owned by the logged-in parent.
 */
export async function deleteMedical(req, res, next) {
    try {
        const [result] = await pool.query(
            `DELETE FROM medical_history
             WHERE id = ?
               AND child_id IN (
                   SELECT id
                   FROM children
                   WHERE parent_id = ?
               )`,
            [req.params.id, req.user.id]
        );

        if (!result.affectedRows) {
            return next(
                new AppError('Medical record not found', 404)
            );
        }

        res.json({
            success: true,
            message: 'Medical history deleted',
            data: null,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve the logged-in user's settings.
 */
export async function getSettings(req, res, next) {
    try {
        // Create default settings when the user has no settings record.
        await pool.query(
            'INSERT IGNORE INTO user_settings(user_id) VALUES(?)',
            [req.user.id]
        );

        const [[row]] = await pool.query(
            `SELECT *
             FROM user_settings
             WHERE user_id = ?`,
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'Settings loaded',
            data: row,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update the logged-in user's settings.
 */
export async function updateSettings(req, res, next) {
    try {
        await pool.query(
            'INSERT IGNORE INTO user_settings(user_id) VALUES(?)',
            [req.user.id]
        );

        const allowedFields = [
            'theme',
            'language',
            'accessibility_large_text',
            'accessibility_high_contrast',
            'biometric_enabled',
            'promotional_notifications',
            'email_notifications',
            'sms_notifications',
            'sound_enabled',
            'vibration_enabled',
        ];

        const entries = allowedFields
            .filter((field) => req.body[field] !== undefined)
            .map((field) => [field, req.body[field]]);

        if (!entries.length) {
            return next(
                new AppError('No settings to update', 422)
            );
        }

        const fields = entries.map(([field]) => `${field} = ?`);
        const values = entries.map(([, value]) => value);

        await pool.query(
            `UPDATE user_settings
             SET ${fields.join(', ')}
             WHERE user_id = ?`,
            [...values, req.user.id]
        );

        return getSettings(req, res, next);
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve active FAQs with an optional search filter.
 */
export async function faqs(req, res, next) {
    try {
        const query = `
            SELECT
                f.id,
                c.name AS category,
                f.question,
                f.answer
            FROM faq f
            JOIN help_categories c
                ON c.id = f.category_id
            WHERE f.is_active = TRUE
              AND c.is_active = TRUE
              AND (
                  ? = ''
                  OR f.question LIKE ?
                  OR f.answer LIKE ?
              )
            ORDER BY
                c.sort_order,
                f.sort_order,
                f.id
        `;

        const search = String(req.query.search || '').trim();

        const [rows] = await pool.query(
            query,
            [
                search,
                `%${search}%`,
                `%${search}%`,
            ]
        );

        res.json({
            success: true,
            message: 'FAQs loaded',
            data: rows,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Submit a support ticket.
 */
export async function submitTicket(req, res, next) {
    try {
        const {
            subject,
            category,
            description,
            attachment_url = null,
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO support_tickets(
                user_id,
                subject,
                category,
                description,
                attachment_url
            )
            VALUES(?, ?, ?, ?, ?)`,
            [
                req.user.id,
                subject,
                category,
                description,
                attachment_url,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Support ticket submitted',
            data: {
                id: result.insertId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve support tickets submitted by the logged-in user.
 */
export async function myTickets(req, res, next) {
    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM support_tickets
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'Support tickets loaded',
            data: rows,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Submit user feedback.
 */
export async function submitFeedback(req, res, next) {
    try {
        const {
            rating,
            message = null,
            suggestion = null,
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO feedback(
                user_id,
                rating,
                message,
                suggestion
            )
            VALUES(?, ?, ?, ?)`,
            [
                req.user.id,
                rating,
                message,
                suggestion,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Feedback submitted',
            data: {
                id: result.insertId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Submit a bug or application problem report.
 */
export async function submitBug(req, res, next) {
    try {
        const {
            problem_type,
            description,
            device_info = null,
            app_version = null,
            os_version = null,
            screenshot_url = null,
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO bug_reports(
                user_id,
                problem_type,
                description,
                device_info,
                app_version,
                os_version,
                screenshot_url
            )
            VALUES(?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                problem_type,
                description,
                device_info,
                app_version,
                os_version,
                screenshot_url,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Problem report submitted',
            data: {
                id: result.insertId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve application support contact information.
 */
export async function contactInfo(req, res) {
    res.json({
        success: true,
        message: 'Contact information loaded',
        data: {
            email:
                process.env.SUPPORT_EMAIL ||
                'support@childvaccination.app',
            phone:
                process.env.SUPPORT_PHONE ||
                '+91 00000 00000',
            working_hours:
                'Monday to Saturday, 9:00 AM to 6:00 PM',
            emergency_note:
                'For medical emergencies, contact your local emergency service or nearest hospital.',
        },
    });
}