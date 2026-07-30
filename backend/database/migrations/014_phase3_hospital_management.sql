USE child_vaccination_db;
ALTER TABLE hospitals
  ADD COLUMN deleted_at DATETIME NULL AFTER is_active,
  ADD COLUMN deleted_by BIGINT UNSIGNED NULL AFTER deleted_at;
CREATE INDEX idx_hospitals_deleted_at ON hospitals(deleted_at);
ALTER TABLE hospitals ADD CONSTRAINT fk_hospitals_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
