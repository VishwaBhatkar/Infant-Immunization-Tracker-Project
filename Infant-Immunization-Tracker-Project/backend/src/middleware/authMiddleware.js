/**
 * File: backend/src/middleware/authMiddleware.js
 * Purpose: Provides reusable Express middleware for request validation, authorization, security, ownership, or error handling.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Verify the JWT token and authenticate the user
export const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;

  // Ensure the Authorization header contains a Bearer token
  if (!authorization?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authorization.slice(7).trim();

  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Fetch the latest user information from the database
    const [rows] = await pool.query(
      `SELECT
         id,
         role,
         is_active,
         deleted_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    // Reject inactive, deleted, or non-existent accounts
    if (
      !rows.length ||
      !rows[0].is_active ||
      rows[0].deleted_at
    ) {
      return next(
        new AppError(
          'User account not found or inactive',
          401
        )
      );
    }

    // Always use the latest role stored in the database
    req.user = {
      id: rows[0].id,
      role: rows[0].role
    };

    next();
  } catch (error) {
    // Handle expired authentication tokens
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError(
          'Session expired. Please log in again.',
          401
        )
      );
    }

    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError(
        'Invalid authentication token',
        401
      )
    );
  }
};

// Restrict access based on user roles
export const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {
      return next(
        new AppError(
          'You are not authorised for this action',
          403
        )
      );
    }

    next();
  };

// Backward-compatible alias for existing route files
export const allowRoles = authorizeRoles;