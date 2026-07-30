// Import database connection pool
import { pool } from '../config/db.js';

// Import success response helper
import { ok } from '../utils/response.js';

// Import custom application error class
import { AppError } from '../utils/AppError.js';

// Import vaccination schedule services
import {
    generateScheduleForChild,
    refreshScheduleStatuses,
} from '../services/vaccinationSchedule.service.js';

// Import application roles
import { ROLES } from '../constants/roles.js';

// Base query used to retrieve vaccination schedule details
const baseSelect = `
    SELECT
        vs.id,
        vs.child_id,
        vs.vaccine_id,
        vs.template_vaccine_id,
        vs.due_date,
        vs.status,
        vs.administered_on,
        vs.notes,
        vs.created_at,
        vs.updated_at,
        v.name vaccine_name,
        v.description,
        v.disease_prevented,
        v.dose_number,
        v.administration_route,
        c.name child_name,
        c.dob child_dob
    FROM vaccine_schedules vs
    JOIN vaccines v
        ON v.id = vs.vaccine_id
    JOIN children c
        ON c.id = vs.child_id
`;

/**
 * Verify that the child belongs to the logged-in parent.
 */
const ensureOwnedChild = async (childId, userId) => {
    const [rows] = await pool.query(
        'SELECT id FROM children WHERE id=? AND parent_id=? LIMIT 1',
        [childId, userId]
    );

    if (!rows.length) {
        throw new AppError('Child not found', 404);
    }
};

/**
 * Retrieve vaccination schedules based on user role and filters.
 */
export const listSchedules = async (req, res, next) => {
    try {
        // Refresh schedule statuses before loading data
        await refreshScheduleStatuses(pool);

        const conditions = [];
        const params = [];

        // Parents can view only their children's schedules
        if (req.user.role === ROLES.PARENT) {
            conditions.push('c.parent_id=?');
            params.push(req.user.id);
        }
        // Doctors can view schedules for assigned appointment children
        else if (req.user.role === ROLES.DOCTOR) {
            conditions.push(`
                EXISTS (
                    SELECT 1
                    FROM appointments a
                    WHERE a.child_id = vs.child_id
                      AND a.doctor_id = ?
                )
            `);
            params.push(req.user.id);
        }
        // Hospital admins can view schedules within their hospital
        else if (req.user.role === ROLES.HOSPITAL_ADMIN) {
            conditions.push(`
                EXISTS (
                    SELECT 1
                    FROM appointments a
                    JOIN hospital_admins ha
                        ON ha.hospital_id = a.hospital_id
                    WHERE a.child_id = vs.child_id
                      AND ha.user_id = ?
                )
            `);
            params.push(req.user.id);
        }

        // Apply child filter
        if (req.query.child_id) {
            conditions.push('vs.child_id=?');
            params.push(req.query.child_id);
        }

        // Apply status filter
        if (req.query.status) {
            conditions.push('vs.status=?');
            params.push(req.query.status);
        }

        const where = conditions.length
            ? ` WHERE ${conditions.join(' AND ')}`
            : '';

        const [rows] = await pool.query(
            `${baseSelect}${where} ORDER BY vs.due_date, v.name`,
            params
        );

        ok(res, rows, 'Vaccination schedules loaded');
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieve the vaccination schedule for a specific child.
 */
export const getChildSchedule = async (req, res, next) => {
    try {
        await ensureOwnedChild(req.params.childId, req.user.id);

        // Refresh status for the selected child
        await refreshScheduleStatuses(pool, req.params.childId);

        const [rows] = await pool.query(
            `${baseSelect} WHERE vs.child_id=? ORDER BY vs.due_date, v.name`,
            [req.params.childId]
        );

        ok(res, rows, 'Child vaccination schedule loaded');
    } catch (error) {
        next(error);
    }
};

/**
 * Generate a vaccination schedule for a child.
 */
export const generateSchedule = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        await ensureOwnedChild(req.params.childId, req.user.id);

        // Start database transaction
        await connection.beginTransaction();

        const result = await generateScheduleForChild({
            childId: req.params.childId,
            connection,
            force: req.body.force === true,
        });

        await connection.commit();

        ok(
            res,
            result,
            result.created
                ? 'Vaccination schedule generated'
                : 'Vaccination schedule is already up to date',
            result.created ? 201 : 200
        );
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Create a controller for retrieving schedules by status.
 */
export const listByStatus = (status) => async (req, res, next) => {
    try {
        await refreshScheduleStatuses(pool);

        const [rows] = await pool.query(
            `${baseSelect}
             WHERE c.parent_id=? AND vs.status=?
             ORDER BY vs.due_date, v.name`,
            [req.user.id, status]
        );

        ok(
            res,
            rows,
            `${status.toLowerCase()} vaccination schedules loaded`
        );
    } catch (error) {
        next(error);
    }
};

// Predefined schedule status endpoints
export const upcomingSchedules = listByStatus('UPCOMING');
export const dueSchedules = listByStatus('DUE');
export const overdueSchedules = listByStatus('OVERDUE');

/**
 * Refresh vaccination schedule statuses.
 */
export const refreshStatuses = async (req, res, next) => {
    try {
        const affected = await refreshScheduleStatuses(pool);

        ok(
            res,
            { affected },
            'Vaccination schedule statuses refreshed'
        );
    } catch (error) {
        next(error);
    }
};