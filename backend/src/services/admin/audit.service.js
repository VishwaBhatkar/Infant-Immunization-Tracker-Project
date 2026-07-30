import { pool } from '../../config/db.js';

export const writeAuditLog = async ({
  adminUserId,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  reason = null,
  ipAddress = null,
  userAgent = null,
  connection = pool
}) => {
  await connection.query(
    `INSERT INTO audit_logs
      (admin_user_id, action, entity_type, entity_id, old_values, new_values, reason, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminUserId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason,
      ipAddress,
      userAgent
    ]
  );
};
