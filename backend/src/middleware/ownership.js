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