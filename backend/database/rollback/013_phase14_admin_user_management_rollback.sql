USE child_vaccination_db;

DROP TABLE IF EXISTS audit_logs;
ALTER TABLE users
  DROP FOREIGN KEY fk_users_deleted_by,
  DROP INDEX idx_users_deleted_at,
  DROP INDEX idx_users_created_at,
  DROP COLUMN last_login_at,
  DROP COLUMN deleted_by,
  DROP COLUMN deleted_at;
