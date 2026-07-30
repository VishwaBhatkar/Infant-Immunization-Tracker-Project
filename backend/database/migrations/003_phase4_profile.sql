USE child_vaccination_db;

-- Existing users table already contains the fields required for Phase 4.
-- Increase phone length so anonymised values used during safe account deletion fit.
ALTER TABLE users MODIFY phone VARCHAR(50) NOT NULL;
