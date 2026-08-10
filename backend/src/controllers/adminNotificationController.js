/**
 * File: backend/src/controllers/adminNotificationController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/admin/auditService.js';
import { deliverPendingPushes } from '../services/expoPushService.js';

const auditContext = req => ({
  adminUserId: req.user?.id,
  ipAddress: req.ip || req.socket?.remoteAddress || null,
  userAgent: req.get('user-agent') || null
});

/**
 * GET /api/admin/notifications
 * List notification delivery logs.
 */
export async function listNotifications(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const type = String(req.query.type || '').trim();

    const where = [];
    const params = [];

    if (search) {
      const term = `%${search}%`;

      where.push(`
        (
          nl.title LIKE ?
          OR nl.message LIKE ?
          OR u.name LIKE ?
          OR u.email LIKE ?
        )
      `);

      params.push(term, term, term, term);
    }

    if (status) {
      where.push('nl.status = ?');
      params.push(status);
    }

    if (type) {
      where.push('nl.reminder_type = ?');
      params.push(type);
    }

    const whereClause = where.length
      ? `WHERE ${where.join(' AND ')}`
      : '';

    const [countResult, rowsResult] = await Promise.all([
      pool.query(
        `
          SELECT COUNT(*) AS total
          FROM notification_log nl
          INNER JOIN users u ON u.id = nl.user_id
          ${whereClause}
        `,
        params
      ),

      pool.query(
        `
          SELECT
            nl.id,
            nl.user_id,
            nl.notification_id,
            nl.reminder_type,
            nl.related_record_id,
            nl.title,
            nl.message,
            nl.scheduled_at,
            nl.sent_at,
            nl.status,
            nl.attempt_count,
            nl.failure_reason,
            nl.created_at,
            u.name AS recipient_name,
            u.email AS recipient_email,
            u.role AS recipient_role
          FROM notification_log nl
          INNER JOIN users u ON u.id = nl.user_id
          ${whereClause}
          ORDER BY nl.created_at DESC, nl.id DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
      )
    ]);

    const countRows = countResult[0];
    const rows = rowsResult[0];

    const totalItems = Number(countRows[0]?.total || 0);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/notifications/:id
 * Get a single notification log.
 */
export async function getNotification(req, res, next) {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new AppError('Invalid notification ID', 400);
    }

    const [rows] = await pool.query(
      `
        SELECT
          nl.*,
          u.name AS recipient_name,
          u.email AS recipient_email,
          u.phone AS recipient_phone,
          u.role AS recipient_role,
          n.title AS in_app_title,
          n.message AS in_app_message,
          n.type AS in_app_type,
          n.is_read,
          n.read_at
        FROM notification_log nl
        INNER JOIN users u ON u.id = nl.user_id
        LEFT JOIN notifications n ON n.id = nl.notification_id
        WHERE nl.id = ?
        LIMIT 1
      `,
      [notificationId]
    );

    if (rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    return ok(
      res,
      rows[0],
      'Notification retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/notifications/statistics
 * Get notification statistics.
 */
export async function statistics(req, res, next) {
  try {
    const [totalsResult, dailyResult, typesResult] =
      await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) AS total,
            COALESCE(SUM(status = 'PENDING'), 0) AS pending,
            COALESCE(SUM(status = 'PROCESSING'), 0) AS processing,
            COALESCE(SUM(status = 'SENT'), 0) AS sent,
            COALESCE(SUM(status = 'DELIVERED'), 0) AS delivered,
            COALESCE(SUM(status = 'FAILED'), 0) AS failed,
            COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled,
            COALESCE(SUM(status = 'SKIPPED'), 0) AS skipped,
            COALESCE(SUM(DATE(created_at) = CURDATE()), 0) AS today
          FROM notification_log
        `),

        pool.query(`
          SELECT
            DATE(created_at) AS day,
            COUNT(*) AS total,
            COALESCE(
              SUM(status IN ('SENT', 'DELIVERED')),
              0
            ) AS successful,
            COALESCE(SUM(status = 'FAILED'), 0) AS failed
          FROM notification_log
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `),

        pool.query(`
          SELECT
            reminder_type,
            COUNT(*) AS total
          FROM notification_log
          GROUP BY reminder_type
          ORDER BY total DESC
        `)
      ]);

    return ok(
      res,
      {
        totals: totalsResult[0][0],
        daily: dailyResult[0],
        types: typesResult[0]
      },
      'Notification statistics retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/notifications
 * Create an in-app notification and queue push delivery.
 */
export async function sendNotification(req, res, next) {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const {
      user_id,
      title,
      message,
      type = 'GENERAL',
      scheduled_at = null
    } = req.body;

    const userId = Number(user_id);
    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();
    const requestedType = String(type || 'GENERAL')
      .trim()
      .toUpperCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Valid user_id is required', 400);
    }

    if (!cleanTitle) {
      throw new AppError('Notification title is required', 400);
    }

    if (cleanTitle.length > 150) {
      throw new AppError(
        'Notification title cannot exceed 150 characters',
        400
      );
    }

    if (!cleanMessage) {
      throw new AppError('Notification message is required', 400);
    }

    if (cleanMessage.length > 500) {
      throw new AppError(
        'Notification message cannot exceed 500 characters',
        400
      );
    }

    /*
     * Valid values according to your notifications table:
     * VACCINE, APPOINTMENT, SYSTEM, ANNOUNCEMENT, GENERAL
     */
    const allowedNotificationTypes = [
      'VACCINE',
      'APPOINTMENT',
      'SYSTEM',
      'ANNOUNCEMENT',
      'GENERAL'
    ];

    /*
     * Convert reminder-specific values into the notification ENUM.
     * The original value is still stored in notification_log.reminder_type.
     */
    const notificationTypeMap = {
      VACCINE_DUE: 'VACCINE',
      VACCINE_OVERDUE: 'VACCINE',
      VACCINE_REMINDER: 'VACCINE',
      APPOINTMENT_REMINDER: 'APPOINTMENT',
      ADMIN: 'SYSTEM'
    };

    const notificationType =
      notificationTypeMap[requestedType] ||
      (
        allowedNotificationTypes.includes(requestedType)
          ? requestedType
          : 'GENERAL'
      );

    let scheduledDate = new Date();

    if (scheduled_at) {
      scheduledDate = new Date(scheduled_at);

      if (Number.isNaN(scheduledDate.getTime())) {
        throw new AppError('Invalid scheduled_at date', 400);
      }
    }

    const [users] = await conn.query(
      `
        SELECT
          id,
          name,
          is_active,
          deleted_at
        FROM users
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    const recipient = users[0];

    if (
      !recipient ||
      Number(recipient.is_active) !== 1 ||
      recipient.deleted_at
    ) {
      throw new AppError('Active recipient not found', 404);
    }

    const [notificationResult] = await conn.query(
      `
        INSERT INTO notifications
          (
            user_id,
            title,
            message,
            type
          )
        VALUES (?, ?, ?, ?)
      `,
      [
        userId,
        cleanTitle,
        cleanMessage,
        notificationType
      ]
    );

    const reminderKey = [
      'ADMIN',
      req.user?.id || 'UNKNOWN',
      Date.now(),
      userId
    ].join(':');

    const [logResult] = await conn.query(
      `
        INSERT INTO notification_log
          (
            user_id,
            notification_id,
            reminder_type,
            related_record_id,
            reminder_key,
            title,
            message,
            scheduled_at,
            status,
            attempt_count
          )
        VALUES
          (?, ?, ?, NULL, ?, ?, ?, ?, 'PENDING', 0)
      `,
      [
        userId,
        notificationResult.insertId,
        requestedType,
        reminderKey,
        cleanTitle,
        cleanMessage,
        scheduledDate
      ]
    );

    await writeAuditLog({
      ...auditContext(req),
      action: 'SEND_NOTIFICATION',
      entityType: 'NOTIFICATION',
      entityId: logResult.insertId,
      newValues: {
        user_id: userId,
        notification_id: notificationResult.insertId,
        title: cleanTitle,
        message: cleanMessage,
        type: requestedType,
        notification_type: notificationType,
        scheduled_at: scheduledDate
      },
      connection: conn
    });

    await conn.commit();

    return ok(
      res,
      {
        id: logResult.insertId,
        notification_id: notificationResult.insertId,
        status: 'PENDING',
        scheduled_at: scheduledDate
      },
      'Notification queued successfully',
      201
    );
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error(
          'Notification transaction rollback failed:',
          rollbackError
        );
      }
    }

    console.error('Send admin notification error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });

    next(error);
  } finally {
    conn?.release();
  }
}

/**
 * POST /api/admin/notifications/:id/retry
 * Retry a failed or skipped notification.
 */
export async function retryNotification(req, res, next) {
  let conn;

  try {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new AppError('Invalid notification ID', 400);
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT *
        FROM notification_log
        WHERE id = ?
        FOR UPDATE
      `,
      [notificationId]
    );

    if (rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    const existingNotification = rows[0];

    if (
      !['FAILED', 'SKIPPED'].includes(
        existingNotification.status
      )
    ) {
      throw new AppError(
        'Only failed or skipped notifications can be retried',
        409
      );
    }

    await conn.query(
      `
        UPDATE notification_log
        SET
          status = 'PENDING',
          scheduled_at = NOW(),
          failure_reason = NULL
        WHERE id = ?
      `,
      [notificationId]
    );

    await writeAuditLog({
      ...auditContext(req),
      action: 'RETRY_NOTIFICATION',
      entityType: 'NOTIFICATION',
      entityId: notificationId,
      oldValues: existingNotification,
      newValues: {
        ...existingNotification,
        status: 'PENDING',
        scheduled_at: new Date(),
        failure_reason: null
      },
      connection: conn
    });

    await conn.commit();

    /*
     * Delivery is attempted after the database transaction is committed.
     * A push-service failure will not undo the retry status.
     */
    let delivery = null;

    try {
      delivery = await deliverPendingPushes();
    } catch (deliveryError) {
      console.error(
        'Immediate push delivery failed after retry:',
        deliveryError
      );
    }

    return ok(
      res,
      {
        id: notificationId,
        status: 'PENDING',
        delivery
      },
      'Notification queued for retry'
    );
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error(
          'Notification retry rollback failed:',
          rollbackError
        );
      }
    }

    next(error);
  } finally {
    conn?.release();
  }
}

/**
 * PATCH /api/admin/notifications/:id/cancel
 * Cancel a pending notification.
 */
export async function cancelNotification(req, res, next) {
  let conn;

  try {
    const notificationId = Number(req.params.id);
    const reason =
      String(req.body?.reason || '').trim() ||
      'Cancelled by System Admin';

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new AppError('Invalid notification ID', 400);
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT *
        FROM notification_log
        WHERE id = ?
        FOR UPDATE
      `,
      [notificationId]
    );

    if (rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    const existingNotification = rows[0];

    if (existingNotification.status !== 'PENDING') {
      throw new AppError(
        'Only pending notifications can be cancelled',
        409
      );
    }

    await conn.query(
      `
        UPDATE notification_log
        SET
          status = 'CANCELLED',
          failure_reason = ?
        WHERE id = ?
      `,
      [reason, notificationId]
    );

    await writeAuditLog({
      ...auditContext(req),
      action: 'CANCEL_NOTIFICATION',
      entityType: 'NOTIFICATION',
      entityId: notificationId,
      oldValues: existingNotification,
      newValues: {
        ...existingNotification,
        status: 'CANCELLED',
        failure_reason: reason
      },
      reason,
      connection: conn
    });

    await conn.commit();

    return ok(
      res,
      {
        id: notificationId,
        status: 'CANCELLED'
      },
      'Notification cancelled successfully'
    );
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error(
          'Notification cancellation rollback failed:',
          rollbackError
        );
      }
    }

    next(error);
  } finally {
    conn?.release();
  }
}