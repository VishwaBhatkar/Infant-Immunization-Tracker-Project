-- Compatibility migration for the updated Parent/Doctor registration and child form.
-- Safe to run on an existing child_vaccination_db database.

USE child_vaccination_db;

-- Ensure both public registration roles are supported by the users table.
ALTER TABLE users
  MODIFY COLUMN role ENUM('PARENT','DOCTOR','HOSPITAL_ADMIN','SYSTEM_ADMIN') NOT NULL;

-- Ensure every field used by the frontend child form exists.
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5) NULL AFTER gender,
  ADD COLUMN IF NOT EXISTS birth_weight_kg DECIMAL(5,2) NULL AFTER blood_group,
  ADD COLUMN IF NOT EXISTS current_weight_kg DECIMAL(5,2) NULL AFTER birth_weight_kg,
  ADD COLUMN IF NOT EXISTS allergies TEXT NULL AFTER current_weight_kg,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT NULL AFTER allergies,
  ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(1000) NULL AFTER medical_notes;
