USE child_vaccination_db;

-- Expand the role enum while preserving existing ADMIN accounts as SYSTEM_ADMIN.
ALTER TABLE users
  MODIFY role ENUM('PARENT','DOCTOR','HOSPITAL_ADMIN','SYSTEM_ADMIN','ADMIN') NOT NULL;

UPDATE users SET role = 'SYSTEM_ADMIN' WHERE role = 'ADMIN';

ALTER TABLE users
  MODIFY role ENUM('PARENT','DOCTOR','HOSPITAL_ADMIN','SYSTEM_ADMIN') NOT NULL;

CREATE TABLE IF NOT EXISTS hospital_admins (
  user_id BIGINT PRIMARY KEY,
  hospital_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hospital_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_hospital_admin_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_hospitals (
  doctor_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, hospital_id),
  CONSTRAINT fk_doctor_hospital_user FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_hospital_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_role_active ON users(role, is_active);
