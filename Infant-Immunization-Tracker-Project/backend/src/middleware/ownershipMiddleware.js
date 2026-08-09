/**
 * File: backend/src/middleware/ownershipMiddleware.js
 * Purpose: Provides reusable Express middleware for request validation, authorization, security, ownership, or error handling.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Verify that the requested child belongs to the authenticated parent
export const requireOwnedChild =
  (source = 'params', field = 'id') =>
  async (req, res, next) => {
    try {
      const childId = req[source]?.[field];

      // Check child ownership in the database
      const [rows] = await pool.query(
        `SELECT id
         FROM children
         WHERE id = ?
           AND parent_id = ?
         LIMIT 1`,
        [childId, req.user.id]
      );

      if (!rows.length) {
        throw new AppError('Child not found', 404);
      }

      // Store the verified child ID for downstream handlers
      req.ownedChildId = rows[0].id;

      next();
    } catch (error) {
      next(error);
    }
  };