/**
 * File: backend/src/controllers/vaccineController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
// Import database connection pool
import { pool } from '../config/db.js';

// Import custom application error class
import AppError from '../utils/AppError.js';

// Import success response helper
import { ok } from '../utils/responseUtils.js';

// Common columns used in vaccine queries
const columns = `
    id,
    name,
    description,
    disease_prevented,
    recommended_age_days,
    dose_number,
    gap_between_doses_days,
    administration_route,
    is_active,
    created_at,
    updated_at
`;

/**
 * Retrieve vaccines with search, status filter, and pagination.
 */
export async function listVaccines(req, res, next) {
    try {
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'ALL').toUpperCase();
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        // Apply search filter
        if (search) {
            conditions.push(
                '(name LIKE ? OR disease_prevented LIKE ? OR description LIKE ?)'
            );

            const term = `%${search}%`;
            params.push(term, term, term);
        }

        // Apply active/inactive filter
        if (status === 'ACTIVE') {
            conditions.push('is_active = 1');
        }

        if (status === 'INACTIVE') {
            conditions.push('is_active = 0');
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const [[countRow]] = await pool.query(
            `SELECT COUNT(*) total FROM vaccines ${where}`,
            params
        );

        const [rows] = await pool.query(
            `SELECT ${columns}
             FROM vaccines
             ${where}
             ORDER BY is_active DESC, name ASC, dose_number ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return ok(
            res,
            {
                items: rows,
                pagination: {
                    page,
                    limit,
                    total: Number(countRow.total),
                    pages: Math.ceil(Number(countRow.total) / limit),
                },
            },
            'Vaccines loaded'
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieve a vaccine by its ID.
 */
export async function getVaccine(req, res, next) {
    try {
        const [rows] = await pool.query(
            `SELECT ${columns} FROM vaccines WHERE id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            throw new AppError('Vaccine not found', 404);
        }

        return ok(res, rows[0], 'Vaccine loaded');
    } catch (error) {
        next(error);
    }
}

/**
 * Create a new vaccine.
 */
export async function createVaccine(req, res, next) {
    try {
        const data = req.body;

        // Prevent duplicate vaccine name and dose number
        const [duplicate] = await pool.query(
            'SELECT id FROM vaccines WHERE LOWER(name)=LOWER(?) AND dose_number=? LIMIT 1',
            [data.name, data.dose_number || 1]
        );

        if (duplicate.length) {
            throw new AppError(
                'This vaccine dose already exists',
                409,
                [
                    {
                        field: 'name',
                        message: 'Vaccine name and dose number must be unique',
                    },
                ]
            );
        }

        const [result] = await pool.query(
            `INSERT INTO vaccines(
                name,
                description,
                disease_prevented,
                recommended_age_days,
                dose_number,
                gap_between_doses_days,
                administration_route,
                is_active
            )
            VALUES(?,?,?,?,?,?,?,?)`,
            [
                data.name,
                data.description || null,
                data.disease_prevented || null,
                data.recommended_age_days,
                data.dose_number || 1,
                data.gap_between_doses_days ?? null,
                data.administration_route || null,
                data.is_active ?? true,
            ]
        );

        const [rows] = await pool.query(
            `SELECT ${columns} FROM vaccines WHERE id=?`,
            [result.insertId]
        );

        return ok(res, rows[0], 'Vaccine created successfully', 201);
    } catch (error) {
        next(error);
    }
}

/**
 * Update an existing vaccine.
 */
export async function updateVaccine(req, res, next) {
    try {
        const [existingRows] = await pool.query(
            'SELECT * FROM vaccines WHERE id=?',
            [req.params.id]
        );

        if (!existingRows.length) {
            throw new AppError('Vaccine not found', 404);
        }

        const current = existingRows[0];
        const nextName = req.body.name ?? current.name;
        const nextDose = req.body.dose_number ?? current.dose_number;

        // Prevent duplicate vaccine name and dose number
        const [duplicate] = await pool.query(
            'SELECT id FROM vaccines WHERE LOWER(name)=LOWER(?) AND dose_number=? AND id<>? LIMIT 1',
            [nextName, nextDose, req.params.id]
        );

        if (duplicate.length) {
            throw new AppError(
                'This vaccine dose already exists',
                409,
                [
                    {
                        field: 'name',
                        message: 'Vaccine name and dose number must be unique',
                    },
                ]
            );
        }

        const allowed = [
            'name',
            'description',
            'disease_prevented',
            'recommended_age_days',
            'dose_number',
            'gap_between_doses_days',
            'administration_route',
            'is_active',
        ];

        const fields = [];
        const values = [];

        // Update only the provided fields
        for (const field of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                fields.push(`${field}=?`);
                values.push(req.body[field] === '' ? null : req.body[field]);
            }
        }

        values.push(req.params.id);

        await pool.query(
            `UPDATE vaccines SET ${fields.join(',')} WHERE id=?`,
            values
        );

        const [rows] = await pool.query(
            `SELECT ${columns} FROM vaccines WHERE id=?`,
            [req.params.id]
        );

        return ok(res, rows[0], 'Vaccine updated successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Activate or deactivate a vaccine.
 */
export async function toggleVaccineStatus(req, res, next) {
    try {
        const [result] = await pool.query(
            'UPDATE vaccines SET is_active = NOT is_active WHERE id=?',
            [req.params.id]
        );

        if (!result.affectedRows) {
            throw new AppError('Vaccine not found', 404);
        }

        const [rows] = await pool.query(
            `SELECT ${columns} FROM vaccines WHERE id=?`,
            [req.params.id]
        );

        return ok(
            res,
            rows[0],
            rows[0].is_active
                ? 'Vaccine activated'
                : 'Vaccine deactivated'
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a vaccine if it is not used in any schedule.
 */
export async function deleteVaccine(req, res, next) {
    try {
        // Prevent deletion when the vaccine is already in use
        const [[usage]] = await pool.query(
            'SELECT COUNT(*) total FROM vaccine_schedules WHERE vaccine_id=?',
            [req.params.id]
        );

        if (Number(usage.total) > 0) {
            throw new AppError(
                'This vaccine is already used in vaccination schedules. Deactivate it instead.',
                409
            );
        }

        const [result] = await pool.query(
            'DELETE FROM vaccines WHERE id=?',
            [req.params.id]
        );

        if (!result.affectedRows) {
            throw new AppError('Vaccine not found', 404);
        }

        return ok(res, null, 'Vaccine deleted successfully');
    } catch (error) {
        next(error);
    }
}