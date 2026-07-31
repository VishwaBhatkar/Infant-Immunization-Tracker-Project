-- =============================================================
-- Child Vaccination and Health Tracking Application
-- Corrected consolidated schema for MySQL 8.0+
-- IMPORTANT: This is a FRESH-INSTALL script. It drops existing tables.
-- Back up existing data before running it.
-- =============================================================

CREATE DATABASE IF NOT EXISTS child_vaccination_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE child_vaccination_db;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order.
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS bug_reports;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS faq;
DROP TABLE IF EXISTS help_categories;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS medical_history;
DROP TABLE IF EXISTS growth_records;
DROP TABLE IF EXISTS immunization_records;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_availability;
DROP TABLE IF EXISTS vaccine_schedules;
DROP TABLE IF EXISTS template_vaccines;
DROP TABLE IF EXISTS vaccination_schedule_templates;
DROP TABLE IF EXISTS vaccines;
DROP TABLE IF EXISTS children;
DROP TABLE IF EXISTS doctor_hospitals;
DROP TABLE IF EXISTS hospital_admins;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- 1. USERS AND ROLES
-- =============================================================
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PARENT','DOCTOR','HOSPITAL_ADMIN','SYSTEM_ADMIN') NOT NULL DEFAULT 'PARENT',
  avatar_url VARCHAR(1000) NULL,
  expo_push_token VARCHAR(255) NULL COMMENT 'Legacy single-device token; push_tokens is preferred',
  dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_deleted_at (deleted_at),
  KEY idx_users_created_at (created_at),
  CONSTRAINT fk_users_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 2. HOSPITALS AND STAFF ASSIGNMENTS
-- =============================================================
CREATE TABLE hospitals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  postcode VARCHAR(20) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  opening_hours VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME NULL,
  deleted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hospitals_name_address (name, address),
  KEY idx_hospitals_active_name (is_active, name),
  KEY idx_hospitals_deleted_at (deleted_at),
  CONSTRAINT fk_hospitals_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE hospital_admins (
  user_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_hospital_admins_hospital (hospital_id),
  CONSTRAINT fk_hospital_admin_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_hospital_admin_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctor_hospitals (
  doctor_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, hospital_id),
  KEY idx_doctor_hospitals_hospital_active (hospital_id, is_active),
  CONSTRAINT fk_doctor_hospital_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_hospital_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctor_availability (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doctor_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday, 1=Monday, ... 6=Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doctor_availability (doctor_id, hospital_id, weekday),
  KEY idx_doctor_availability_lookup (doctor_id, hospital_id, weekday, is_available),
  CONSTRAINT chk_doctor_weekday CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT chk_doctor_availability_time CHECK (end_time > start_time),
  CONSTRAINT chk_doctor_slot_minutes CHECK (slot_minutes BETWEEN 5 AND 240),
  CONSTRAINT fk_availability_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_availability_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 3. CHILD PROFILES
-- =============================================================
CREATE TABLE children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender ENUM('MALE','FEMALE','OTHER') NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  birth_weight_kg DECIMAL(5,2) NULL,
  current_weight_kg DECIMAL(5,2) NULL,
  allergies TEXT NULL,
  medical_notes TEXT NULL,
  profile_image_url VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_children_parent_name (parent_id, name),
  CONSTRAINT chk_child_birth_weight CHECK (birth_weight_kg IS NULL OR birth_weight_kg BETWEEN 0.30 AND 10.00),
  CONSTRAINT chk_child_current_weight CHECK (current_weight_kg IS NULL OR current_weight_kg BETWEEN 0.30 AND 200.00),
  CONSTRAINT fk_children_parent
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 4. VACCINES AND SCHEDULES
-- =============================================================
CREATE TABLE vaccines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  disease_prevented VARCHAR(255) NULL,
  recommended_age_days INT UNSIGNED NOT NULL DEFAULT 0,
  dose_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  gap_between_doses_days INT UNSIGNED NULL,
  administration_route ENUM('ORAL','INTRAMUSCULAR','SUBCUTANEOUS','INTRADERMAL','OTHER') NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vaccines_name_dose (name, dose_number),
  KEY idx_vaccines_active_name (is_active, name),
  CONSTRAINT chk_vaccine_dose_number CHECK (dose_number BETWEEN 1 AND 20),
  CONSTRAINT chk_vaccine_age_days CHECK (recommended_age_days <= 36500),
  CONSTRAINT chk_vaccine_gap_days CHECK (gap_between_doses_days IS NULL OR gap_between_doses_days <= 3650)
) ENGINE=InnoDB;

CREATE TABLE vaccination_schedule_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_template_name (name),
  KEY idx_schedule_template_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE template_vaccines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id BIGINT UNSIGNED NOT NULL,
  vaccine_id BIGINT UNSIGNED NOT NULL,
  recommended_age_days INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_template_vaccine (template_id, vaccine_id),
  KEY idx_template_vaccines_active (template_id, is_active),
  CONSTRAINT fk_template_vaccine_template
    FOREIGN KEY (template_id) REFERENCES vaccination_schedule_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_vaccine_vaccine
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vaccine_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NOT NULL,
  vaccine_id BIGINT UNSIGNED NOT NULL,
  template_vaccine_id BIGINT UNSIGNED NULL,
  due_date DATE NOT NULL,
  status ENUM('UPCOMING','DUE','OVERDUE','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  administered_on DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_child_vaccine_schedule (child_id, vaccine_id),
  KEY idx_vaccine_due (due_date, status),
  KEY idx_schedule_child_status_due (child_id, status, due_date),
  CONSTRAINT fk_schedule_child
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_vaccine
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT,
  CONSTRAINT fk_schedule_template_vaccine
    FOREIGN KEY (template_vaccine_id) REFERENCES template_vaccines(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 5. APPOINTMENTS
-- =============================================================
CREATE TABLE appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  child_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  cancellation_reason VARCHAR(500) NULL,
  status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','RESCHEDULED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_slot_key VARCHAR(190)
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN ('PENDING','CONFIRMED','RESCHEDULED')
          THEN CONCAT(doctor_id, '|', DATE_FORMAT(appointment_date, '%Y-%m-%d'), '|', TIME_FORMAT(appointment_time, '%H:%i:%s'))
        ELSE NULL
      END
    ) STORED,
  active_child_slot_key VARCHAR(190)
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN ('PENDING','CONFIRMED','RESCHEDULED')
          THEN CONCAT(child_id, '|', DATE_FORMAT(appointment_date, '%Y-%m-%d'), '|', TIME_FORMAT(appointment_time, '%H:%i:%s'))
        ELSE NULL
      END
    ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_active_doctor_slot (active_slot_key),
  UNIQUE KEY uq_active_child_slot (active_child_slot_key),
  KEY idx_appointments_doctor_date (doctor_id, appointment_date),
  KEY idx_appointments_parent_status_date (parent_id, status, appointment_date),
  KEY idx_appointments_hospital_status_date (hospital_id, status, appointment_date),
  CONSTRAINT fk_appointment_parent
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_child
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- 6. IMMUNIZATION RECORDS
-- =============================================================
CREATE TABLE immunization_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id BIGINT UNSIGNED NOT NULL,
  child_id BIGINT UNSIGNED NOT NULL,
  vaccine_id BIGINT UNSIGNED NOT NULL,
  vaccination_date DATE NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  batch_number VARCHAR(100) NULL,
  expiry_date DATE NULL,
  injection_site VARCHAR(100) NULL,
  notes TEXT NULL,
  next_dose_date DATE NULL,
  status ENUM('COMPLETED','CORRECTED') NOT NULL DEFAULT 'COMPLETED',
  proof_image_url VARCHAR(1000) NULL,
  verified_by BIGINT UNSIGNED NULL,
  verified_at DATETIME NULL,
  correction_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_immunization_schedule (schedule_id),
  KEY idx_immunization_child_date (child_id, vaccination_date),
  KEY idx_immunization_doctor_date (doctor_id, vaccination_date),
  KEY idx_immunization_hospital_date (hospital_id, vaccination_date),
  CONSTRAINT chk_immunization_expiry CHECK (expiry_date IS NULL OR expiry_date >= vaccination_date),
  CONSTRAINT fk_immunization_schedule
    FOREIGN KEY (schedule_id) REFERENCES vaccine_schedules(id) ON DELETE RESTRICT,
  CONSTRAINT fk_immunization_child
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE RESTRICT,
  CONSTRAINT fk_immunization_vaccine
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT,
  CONSTRAINT fk_immunization_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_immunization_doctor
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_immunization_verified_by
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 7. GROWTH AND MEDICAL HISTORY
-- =============================================================
CREATE TABLE growth_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NOT NULL,
  height_cm DECIMAL(6,2) NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  head_circumference_cm DECIMAL(6,2) NULL,
  measured_on DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_growth_child_date (child_id, measured_on),
  CONSTRAINT chk_growth_height CHECK (height_cm > 0 AND height_cm <= 250),
  CONSTRAINT chk_growth_weight CHECK (weight_kg > 0 AND weight_kg <= 300),
  CONSTRAINT chk_growth_head CHECK (head_circumference_cm IS NULL OR (head_circumference_cm > 0 AND head_circumference_cm <= 100)),
  CONSTRAINT fk_growth_child
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE medical_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NOT NULL,
  record_type ENUM('ALLERGY','ILLNESS','MEDICINE','SURGERY','DIAGNOSIS','DOCTOR_NOTE','OTHER') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  record_date DATE NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medical_child_type_date (child_id, record_type, record_date),
  CONSTRAINT fk_medical_child
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_medical_creator
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- 8. NOTIFICATIONS, REMINDERS, AND PUSH DEVICES
-- =============================================================
CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM('VACCINE','APPOINTMENT','SYSTEM','ANNOUNCEMENT','GENERAL') NOT NULL DEFAULT 'SYSTEM',
  related_record_id BIGINT UNSIGNED NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_created (user_id, is_read, created_at),
  KEY idx_notifications_user_created (user_id, created_at),
  KEY idx_notifications_type (type),
  CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notification_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vaccination_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  overdue_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vaccine_reminder_days VARCHAR(100) NOT NULL DEFAULT '7,3,1,0',
  overdue_interval_days INT UNSIGNED NOT NULL DEFAULT 7,
  appointment_reminder_days VARCHAR(50) NOT NULL DEFAULT '1,0',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT chk_overdue_interval CHECK (overdue_interval_days BETWEEN 1 AND 365),
  CONSTRAINT fk_notification_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notification_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_id BIGINT UNSIGNED NULL,
  reminder_type ENUM('VACCINE_DUE','VACCINE_OVERDUE','APPOINTMENT','GENERAL') NOT NULL,
  related_record_id BIGINT UNSIGNED NOT NULL,
  reminder_key VARCHAR(190) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  delivered_at DATETIME NULL,
  status ENUM('PENDING','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  failure_reason VARCHAR(500) NULL,
  provider_response JSON NULL,
  expo_ticket_id VARCHAR(255) NULL,
  receipt_checked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_reminder_key (reminder_key),
  KEY idx_notification_log_status_schedule (status, scheduled_at),
  KEY idx_notification_log_user_created (user_id, created_at),
  KEY idx_notification_log_ticket (expo_ticket_id),
  CONSTRAINT fk_notification_log_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_log_notification
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE push_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID','IOS','WEB','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  device_name VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_token (expo_push_token),
  UNIQUE KEY uq_user_device (user_id, device_id),
  KEY idx_push_tokens_user_active (user_id, is_active),
  CONSTRAINT fk_push_token_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 9. USER SETTINGS
-- =============================================================
CREATE TABLE user_settings (
  user_id BIGINT UNSIGNED NOT NULL,
  theme ENUM('LIGHT','DARK','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  language ENUM('EN','HI','MR') NOT NULL DEFAULT 'EN',
  accessibility_large_text BOOLEAN NOT NULL DEFAULT FALSE,
  accessibility_high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  promotional_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 10. HELP CENTRE
-- =============================================================
CREATE TABLE help_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_help_category_name (name)
) ENGINE=InnoDB;

CREATE TABLE faq (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_faq_active_category (is_active, category_id),
  CONSTRAINT fk_faq_category
    FOREIGN KEY (category_id) REFERENCES help_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  attachment_url VARCHAR(1000) NULL,
  status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  admin_response TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_user_status (user_id, status),
  CONSTRAINT fk_support_ticket_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE feedback (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  message TEXT NULL,
  suggestion TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_user_created (user_id, created_at),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bug_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  problem_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  device_info VARCHAR(500) NULL,
  app_version VARCHAR(50) NULL,
  os_version VARCHAR(100) NULL,
  screenshot_url VARCHAR(1000) NULL,
  status ENUM('OPEN','INVESTIGATING','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bug_reports_user_status (user_id, status),
  CONSTRAINT fk_bug_report_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 11. ADMIN AUDIT LOGS
-- =============================================================
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  reason VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_admin_user (admin_user_id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_action (action),
  KEY idx_audit_created_at (created_at),
  CONSTRAINT fk_audit_admin_user
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- 12. DEFAULT MASTER DATA
-- =============================================================
INSERT INTO hospitals
  (name, address, city, state, phone, email, opening_hours, is_active)
VALUES
  ('Sunrise Children Hospital', 'Baner Road, Pune', 'Pune', 'Maharashtra', '020-40000001', 'sunrise@example.com', '09:00-18:00', TRUE),
  ('Lotus Mother & Child Hospital', 'Hinjewadi, Pune', 'Pune', 'Maharashtra', '020-40000002', 'lotus@example.com', '09:00-18:00', TRUE),
  ('City Care Paediatric Centre', 'Wakad, Pune', 'Pune', 'Maharashtra', '020-40000003', 'citycare@example.com', '09:00-18:00', TRUE);

INSERT INTO vaccines
  (name, description, disease_prevented, recommended_age_days, dose_number, gap_between_doses_days, administration_route, is_active)
VALUES
  ('BCG', 'Tuberculosis protection', 'Tuberculosis', 0, 1, NULL, 'INTRADERMAL', TRUE),
  ('Hepatitis B', 'Birth dose', 'Hepatitis B', 0, 1, 28, 'INTRAMUSCULAR', TRUE),
  ('OPV', 'Oral polio vaccine', 'Poliomyelitis', 42, 1, 28, 'ORAL', TRUE),
  ('Pentavalent', 'DPT, Hepatitis B and Hib protection', 'Diphtheria, Pertussis, Tetanus, Hepatitis B and Hib', 42, 1, 28, 'INTRAMUSCULAR', TRUE),
  ('MR', 'Measles and rubella vaccine', 'Measles and Rubella', 270, 1, NULL, 'SUBCUTANEOUS', TRUE);

INSERT INTO vaccination_schedule_templates (name, description, is_active)
VALUES ('Default Child Vaccination Schedule', 'Initial schedule generated from active vaccine doses', TRUE);

INSERT INTO template_vaccines (template_id, vaccine_id, recommended_age_days, is_active)
SELECT template.id, vaccine.id, vaccine.recommended_age_days, TRUE
FROM vaccination_schedule_templates AS template
JOIN vaccines AS vaccine ON vaccine.is_active = TRUE
WHERE template.name = 'Default Child Vaccination Schedule';

INSERT INTO help_categories (name, sort_order)
VALUES
  ('Registration', 1),
  ('Login', 2),
  ('Child Management', 3),
  ('Vaccination Schedule', 4),
  ('Appointment Booking', 5),
  ('Notifications', 6),
  ('Technical Issues', 7),
  ('Account Issues', 8);

INSERT INTO faq (category_id, question, answer, sort_order)
SELECT id, 'How do I register?', 'Open the Register screen, enter your name, email, mobile number and a strong password, then submit the form.', 1
FROM help_categories WHERE name = 'Registration';

INSERT INTO faq (category_id, question, answer, sort_order)
SELECT id, 'How do I add a child?', 'Sign in as a Parent, open Children, complete the child profile form and save it.', 1
FROM help_categories WHERE name = 'Child Management';

INSERT INTO faq (category_id, question, answer, sort_order)
SELECT id, 'How is the vaccination schedule created?', 'The application creates the vaccination schedule automatically from the child date of birth and the active schedule template.', 1
FROM help_categories WHERE name = 'Vaccination Schedule';

INSERT INTO faq (category_id, question, answer, sort_order)
SELECT id, 'How do I book an appointment?', 'Open Appointments, select a child, hospital, doctor, date and an available time slot, then submit the booking.', 1
FROM help_categories WHERE name = 'Appointment Booking';

-- Users and Admin accounts must be created through the backend so bcrypt hashes are generated correctly.
-- After registration, a development-only role assignment can be performed manually, for example:
-- UPDATE users SET role = 'SYSTEM_ADMIN' WHERE email = 'admin@example.com';

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'child_vaccination_db' AND table_type = 'BASE TABLE';

SELECT 'child_vaccination_db created successfully' AS result;