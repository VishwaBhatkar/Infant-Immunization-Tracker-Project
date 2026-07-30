USE child_vaccination_db;
ALTER TABLE hospitals DROP FOREIGN KEY fk_hospitals_deleted_by;
DROP INDEX idx_hospitals_deleted_at ON hospitals;
ALTER TABLE hospitals DROP COLUMN deleted_by, DROP COLUMN deleted_at;
