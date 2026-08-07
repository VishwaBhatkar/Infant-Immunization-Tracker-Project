/**
 * File: backend/src/controllers/immunizationController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { ok } from '../utils/responseUtils.js';
import { ROLES } from '../constants/roles.js';

// Base query for loading complete immunization record details
const selectSql = `
    SELECT
        ir.id,
        ir.schedule_id,
        ir.child_id,
        ir.vaccine_id,
        ir.vaccination_date,
        ir.hospital_id,
        ir.doctor_id,
        ir.batch_number,
        ir.expiry_date,
        ir.injection_site,
        ir.notes,
        ir.next_dose_date,
        ir.status,
        ir.proof_image_url,
        ir.created_at,
        ir.updated_at,
        c.name AS child_name,
        c.parent_id,
        v.name AS vaccine_name,
        v.dose_number,
        h.name AS hospital_name,
        d.name AS doctor_name
    FROM immunization_records ir
    JOIN children c
        ON c.id = ir.child_id
    JOIN vaccines v
        ON v.id = ir.vaccine_id
    JOIN hospitals h
        ON h.id = ir.hospital_id
    LEFT JOIN users d
        ON d.id = ir.doctor_id
`;

/**
 * Retrieve the hospital assigned to a hospital administrator.
 */
async function hospitalForAdmin(userId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT hospital_id
         FROM hospital_admins
         WHERE user_id = ?`,
        [userId]
    );

    return rows[0]?.hospital_id ?? null;
}

/**
 * Verify that the logged-in user can access an immunization record.
 */
async function ensureScope(user, row, connection = pool) {
    if (user.role === ROLES.SYSTEM_ADMIN) {
        return;
    }

    if (
        user.role === ROLES.PARENT &&
        Number(row.parent_id) === Number(user.id)
    ) {
        return;
    }

    if (
        user.role === ROLES.DOCTOR &&
        Number(row.doctor_id) === Number(user.id)
    ) {
        return;
    }

    if (user.role === ROLES.HOSPITAL_ADMIN) {
        const hospitalId = await hospitalForAdmin(
            user.id,
            connection
        );

        if (Number(row.hospital_id) === Number(hospitalId)) {
            return;
        }
    }

    throw new AppError(
        'You are not authorised to access this immunization record',
        403
    );
}

/**
 * Retrieve immunization records based on user role and filters.
 */
export async function listRecords(req, res) {
    const where = [];
    const values = [];

    if (req.user.role === ROLES.PARENT) {
        where.push('c.parent_id = ?');
        values.push(req.user.id);
    }

    if (req.user.role === ROLES.DOCTOR) {
        where.push('ir.doctor_id = ?');
        values.push(req.user.id);
    }

    if (req.user.role === ROLES.HOSPITAL_ADMIN) {
        const hospitalId = await hospitalForAdmin(req.user.id);

        if (!hospitalId) {
            throw new AppError(
                'Hospital administrator is not assigned to a hospital',
                403
            );
        }

        where.push('ir.hospital_id = ?');
        values.push(hospitalId);
    }

    if (req.query.child_id) {
        where.push('ir.child_id = ?');
        values.push(req.query.child_id);
    }

    if (req.query.schedule_id) {
        where.push('ir.schedule_id = ?');
        values.push(req.query.schedule_id);
    }

    const whereClause = where.length
        ? ` WHERE ${where.join(' AND ')}`
        : '';

    const [rows] = await pool.query(
        `${selectSql}
         ${whereClause}
         ORDER BY ir.vaccination_date DESC, ir.id DESC`,
        values
    );

    return ok(
        res,
        rows,
        'Immunization records loaded'
    );
}

/**
 * Retrieve a single immunization record.
 */
export async function getRecord(req, res) {
    const [rows] = await pool.query(
        `${selectSql}
         WHERE ir.id = ?`,
        [req.params.id]
    );

    if (!rows[0]) {
        throw new AppError(
            'Immunization record not found',
            404
        );
    }

    await ensureScope(req.user, rows[0]);

    return ok(
        res,
        rows[0],
        'Immunization record loaded'
    );
}

/**
 * Create an immunization record and complete its vaccine schedule.
 */
export async function createRecord(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the schedule item to prevent duplicate completion
        const [schedules] = await connection.query(
            `SELECT
                vs.id,
                vs.child_id,
                vs.vaccine_id,
                vs.status,
                c.parent_id,
                v.name AS vaccine_name,
                v.dose_number
             FROM vaccine_schedules vs
             JOIN children c
                ON c.id = vs.child_id
             JOIN vaccines v
                ON v.id = vs.vaccine_id
             WHERE vs.id = ?
             FOR UPDATE`,
            [req.body.schedule_id]
        );

        const schedule = schedules[0];

        if (!schedule) {
            throw new AppError(
                'Vaccination schedule item not found',
                404
            );
        }

        if (schedule.status === 'COMPLETED') {
            throw new AppError(
                'This vaccine dose is already completed',
                409
            );
        }

        const [hospitals] = await connection.query(
            `SELECT id
             FROM hospitals
             WHERE id = ? AND is_active = TRUE`,
            [req.body.hospital_id]
        );

        if (!hospitals[0]) {
            throw new AppError(
                'Active hospital not found',
                404
            );
        }

        const doctorId =
            req.user.role === ROLES.DOCTOR
                ? req.user.id
                : Number(req.body.doctor_id || 0);

        if (!doctorId) {
            throw new AppError(
                'Doctor is required',
                422,
                [
                    {
                        field: 'doctor_id',
                        message: 'Doctor is required',
                    },
                ]
            );
        }

        const [doctors] = await connection.query(
            `SELECT id
             FROM users
             WHERE id = ?
               AND role = 'DOCTOR'
               AND is_active = TRUE`,
            [doctorId]
        );

        if (!doctors[0]) {
            throw new AppError(
                'Active doctor not found',
                404
            );
        }

        // Hospital admins can create records only for their hospital
        if (req.user.role === ROLES.HOSPITAL_ADMIN) {
            const adminHospital = await hospitalForAdmin(
                req.user.id,
                connection
            );

            if (
                Number(adminHospital) !==
                Number(req.body.hospital_id)
            ) {
                throw new AppError(
                    'You can only record vaccinations for your hospital',
                    403
                );
            }
        }

        // Verify that the doctor is assigned to the selected hospital
        if (req.user.role === ROLES.DOCTOR) {
            const [links] = await connection.query(
                `SELECT 1
                 FROM doctor_hospitals
                 WHERE doctor_id = ?
                   AND hospital_id = ?
                   AND is_active = TRUE`,
                [
                    doctorId,
                    req.body.hospital_id,
                ]
            );

            if (!links[0]) {
                throw new AppError(
                    'Doctor is not assigned to the selected hospital',
                    403
                );
            }
        }

        const [existing] = await connection.query(
            `SELECT id
             FROM immunization_records
             WHERE schedule_id = ?`,
            [schedule.id]
        );

        if (existing[0]) {
            throw new AppError(
                'An immunization record already exists for this dose',
                409
            );
        }

        const vaccinationDate =
            req.body.vaccination_date;

        const expiryDate =
            req.body.expiry_date || null;

        if (
            expiryDate &&
            expiryDate < vaccinationDate
        ) {
            throw new AppError(
                'Expiry date cannot be before vaccination date',
                422,
                [
                    {
                        field: 'expiry_date',
                        message:
                            'Expiry date cannot be before vaccination date',
                    },
                ]
            );
        }

        let nextDoseDate =
            req.body.next_dose_date || null;

        // Calculate the next dose date when it is not provided
        if (!nextDoseDate) {
            const [nextRows] = await connection.query(
                `SELECT vs.due_date
                 FROM vaccine_schedules vs
                 JOIN vaccines v
                    ON v.id = vs.vaccine_id
                 WHERE vs.child_id = ?
                   AND v.name = ?
                   AND v.dose_number > ?
                 ORDER BY v.dose_number
                 LIMIT 1`,
                [
                    schedule.child_id,
                    schedule.vaccine_name,
                    schedule.dose_number,
                ]
            );

            nextDoseDate =
                nextRows[0]?.due_date || null;
        }

        const [result] = await connection.query(
            `INSERT INTO immunization_records(
                schedule_id,
                child_id,
                vaccine_id,
                vaccination_date,
                hospital_id,
                doctor_id,
                batch_number,
                expiry_date,
                injection_site,
                notes,
                next_dose_date,
                status,
                proof_image_url
            )
            VALUES(
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'COMPLETED',
                ?
            )`,
            [
                schedule.id,
                schedule.child_id,
                schedule.vaccine_id,
                vaccinationDate,
                req.body.hospital_id,
                doctorId,
                req.body.batch_number || null,
                expiryDate,
                req.body.injection_site || null,
                req.body.notes || null,
                nextDoseDate,
                req.body.proof_image_url || null,
            ]
        );

        await connection.query(
            `UPDATE vaccine_schedules
             SET
                status = 'COMPLETED',
                administered_on = ?,
                notes = COALESCE(?, notes)
             WHERE id = ?`,
            [
                vaccinationDate,
                req.body.notes || null,
                schedule.id,
            ]
        );

        await connection.commit();

        const [rows] = await pool.query(
            `${selectSql}
             WHERE ir.id = ?`,
            [result.insertId]
        );

        return ok(
            res,
            rows[0],
            'Immunization record created and vaccine marked completed',
            201
        );
    } catch (error) {
        await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            throw new AppError(
                'An immunization record already exists for this dose',
                409
            );
        }

        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Update an existing immunization record.
 */
export async function updateRecord(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `${selectSql}
             WHERE ir.id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        const current = rows[0];

        if (!current) {
            throw new AppError(
                'Immunization record not found',
                404
            );
        }

        await ensureScope(
            req.user,
            current,
            connection
        );

        if (req.user.role === ROLES.PARENT) {
            throw new AppError(
                'Parents can view official records but cannot edit them',
                403
            );
        }

        const allowedFields = [
            'vaccination_date',
            'hospital_id',
            'doctor_id',
            'batch_number',
            'expiry_date',
            'injection_site',
            'notes',
            'next_dose_date',
            'proof_image_url',
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(
                    req.body,
                    field
                )
            ) {
                updates.push(`${field} = ?`);
                values.push(req.body[field] || null);
            }
        }

        if (!updates.length) {
            throw new AppError(
                'No profile fields were provided for update',
                422
            );
        }

        const vaccinationDate =
            req.body.vaccination_date ||
            current.vaccination_date;

        const expiryDate =
            Object.prototype.hasOwnProperty.call(
                req.body,
                'expiry_date'
            )
                ? req.body.expiry_date
                : current.expiry_date;

        if (
            expiryDate &&
            expiryDate < vaccinationDate
        ) {
            throw new AppError(
                'Expiry date cannot be before vaccination date',
                422,
                [
                    {
                        field: 'expiry_date',
                        message:
                            'Expiry date cannot be before vaccination date',
                    },
                ]
            );
        }

        values.push(req.params.id);

        await connection.query(
            `UPDATE immunization_records
             SET ${updates.join(', ')}
             WHERE id = ?`,
            values
        );

        if (req.body.vaccination_date) {
            await connection.query(
                `UPDATE vaccine_schedules
                 SET
                    administered_on = ?,
                    status = 'COMPLETED'
                 WHERE id = ?`,
                [
                    req.body.vaccination_date,
                    current.schedule_id,
                ]
            );
        }

        await connection.commit();

        const [updated] = await pool.query(
            `${selectSql}
             WHERE ir.id = ?`,
            [req.params.id]
        );

        return ok(
            res,
            updated[0],
            'Immunization record updated'
        );
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Delete an immunization record and restore its schedule status.
 */
export async function deleteRecord(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `${selectSql}
             WHERE ir.id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        const current = rows[0];

        if (!current) {
            throw new AppError(
                'Immunization record not found',
                404
            );
        }

        await ensureScope(
            req.user,
            current,
            connection
        );

        if (req.user.role === ROLES.PARENT) {
            throw new AppError(
                'Parents can view official records but cannot delete them',
                403
            );
        }

        await connection.query(
            `DELETE FROM immunization_records
             WHERE id = ?`,
            [req.params.id]
        );

        // Restore schedule status according to its due date
        await connection.query(
            `UPDATE vaccine_schedules
             SET
                status = CASE
                    WHEN due_date < CURDATE() THEN 'OVERDUE'
                    WHEN due_date = CURDATE() THEN 'DUE'
                    ELSE 'UPCOMING'
                END,
                administered_on = NULL
             WHERE id = ?`,
            [current.schedule_id]
        );

        await connection.commit();

        return ok(
            res,
            null,
            'Immunization record deleted and schedule restored'
        );
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}