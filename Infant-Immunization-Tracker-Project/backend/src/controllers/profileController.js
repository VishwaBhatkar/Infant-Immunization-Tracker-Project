/**
 * File: backend/src/controllers/profileController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
// Import password hashing library
import bcrypt from 'bcryptjs';

// Import database connection pool
import { pool } from '../config/db.js';

// Import custom application error class
import { AppError } from '../utils/AppError.js';

// Import success response helper
import { ok } from '../utils/responseUtils.js';

// Common profile fields returned in profile queries
const PROFILE_FIELDS =
    'id,name,email,phone,role,avatar_url,dark_mode,is_active,created_at,updated_at';

/**
 * Retrieve the logged-in user's profile.
 */
export const getProfile = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT ${PROFILE_FIELDS}
             FROM users
             WHERE id=? AND is_active=1
             LIMIT 1`,
            [req.user.id]
        );

        if (!rows.length) {
            throw new AppError('Profile not found', 404);
        }

        ok(res, rows[0], 'Profile loaded');
    } catch (error) {
        next(error);
    }
};

/**
 * Update the logged-in user's profile.
 */
export const updateProfile = async (req, res, next) => {
    try {
        // Allow updates only for these profile fields
        const allowed = ['name', 'phone', 'avatar_url', 'dark_mode'];

        const entries = allowed.filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        );

        if (!entries.length) {
            throw new AppError(
                'Provide at least one profile field to update',
                422
            );
        }

        // Ensure the mobile number is unique
        if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
            const [duplicate] = await pool.query(
                'SELECT id FROM users WHERE phone=? AND id<>? LIMIT 1',
                [req.body.phone, req.user.id]
            );

            if (duplicate.length) {
                throw new AppError(
                    'Mobile number already registered',
                    409,
                    [
                        {
                            field: 'phone',
                            message: 'Mobile number already registered',
                        },
                    ]
                );
            }
        }

        const values = entries.map((field) =>
            field === 'dark_mode'
                ? Boolean(req.body[field])
                : req.body[field]
        );

        await pool.query(
            `UPDATE users
             SET ${entries.map((field) => `${field}=?`).join(',')}
             WHERE id=?`,
            [...values, req.user.id]
        );

        const [rows] = await pool.query(
            `SELECT ${PROFILE_FIELDS}
             FROM users
             WHERE id=?
             LIMIT 1`,
            [req.user.id]
        );

        ok(res, rows[0], 'Profile updated');
    } catch (error) {
        next(error);
    }
};

/**
 * Change the logged-in user's password.
 */
export const changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        const [rows] = await pool.query(
            'SELECT password_hash FROM users WHERE id=? AND is_active=1 LIMIT 1',
            [req.user.id]
        );

        if (!rows.length) {
            throw new AppError('User account not found', 404);
        }

        // Verify the current password
        const matches = await bcrypt.compare(
            current_password,
            rows[0].password_hash
        );

        if (!matches) {
            throw new AppError(
                'Current password is incorrect',
                400,
                [
                    {
                        field: 'current_password',
                        message: 'Current password is incorrect',
                    },
                ]
            );
        }

        // Prevent reusing the existing password
        const samePassword = await bcrypt.compare(
            new_password,
            rows[0].password_hash
        );

        if (samePassword) {
            throw new AppError(
                'New password must be different from the current password',
                422,
                [
                    {
                        field: 'new_password',
                        message: 'Choose a different password',
                    },
                ]
            );
        }

        const hash = await bcrypt.hash(new_password, 12);

        await pool.query(
            'UPDATE users SET password_hash=? WHERE id=?',
            [hash, req.user.id]
        );

        ok(res, null, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Soft delete the logged-in user's account.
 */
export const deleteAccount = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT password_hash FROM users WHERE id=? AND is_active=1 LIMIT 1',
            [req.user.id]
        );

        if (!rows.length) {
            throw new AppError('User account not found', 404);
        }

        // Verify the user's password before deleting the account
        const matches = await bcrypt.compare(
            req.body.password,
            rows[0].password_hash
        );

        if (!matches) {
            throw new AppError(
                'Password is incorrect',
                400,
                [
                    {
                        field: 'password',
                        message: 'Password is incorrect',
                    },
                ]
            );
        }

        // Preserve related records while disabling the account
        const anonymisedEmail = `deleted_${req.user.id}_${Date.now()}@deleted.invalid`;
        const anonymisedPhone = `deleted_${req.user.id}_${Date.now()}`;

        await pool.query(
            `UPDATE users
             SET
                name='Deleted User',
                email=?,
                phone=?,
                avatar_url=NULL,
                expo_push_token=NULL,
                is_active=0
             WHERE id=?`,
            [anonymisedEmail, anonymisedPhone, req.user.id]
        );

        ok(res, null, 'Account deleted successfully');
    } catch (error) {
        next(error);
    }
};