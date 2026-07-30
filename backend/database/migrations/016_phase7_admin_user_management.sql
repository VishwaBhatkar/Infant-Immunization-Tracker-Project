USE child_vaccination_db;
CREATE INDEX idx_hospital_admins_hospital ON hospital_admins(hospital_id);
CREATE INDEX idx_users_admin_lookup ON users(role, is_active, deleted_at, created_at);
