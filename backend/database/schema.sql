CREATE DATABASE IF NOT EXISTS child_vaccination_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE child_vaccination_db;
CREATE TABLE users(id BIGINT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(100) NOT NULL,email VARCHAR(150) NOT NULL UNIQUE,phone VARCHAR(50) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,role ENUM('PARENT','DOCTOR','HOSPITAL_ADMIN','SYSTEM_ADMIN') NOT NULL,avatar_url VARCHAR(500),expo_push_token VARCHAR(255),dark_mode BOOLEAN DEFAULT FALSE,is_active BOOLEAN DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
CREATE TABLE hospitals(id BIGINT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(150) NOT NULL,address VARCHAR(255) NOT NULL,phone VARCHAR(20),is_active BOOLEAN DEFAULT TRUE,deleted_at DATETIME NULL,deleted_by BIGINT UNSIGNED NULL,FOREIGN KEY(deleted_by) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE children(id BIGINT PRIMARY KEY AUTO_INCREMENT,parent_id BIGINT NOT NULL,name VARCHAR(100) NOT NULL,dob DATE NOT NULL,gender ENUM('MALE','FEMALE','OTHER') NOT NULL,blood_group VARCHAR(5),birth_weight_kg DECIMAL(5,2),current_weight_kg DECIMAL(5,2),allergies TEXT,medical_notes TEXT,profile_image_url VARCHAR(1000),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,FOREIGN KEY(parent_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_children_parent_name ON children(parent_id,name);
CREATE TABLE vaccines(id BIGINT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(120) NOT NULL,description TEXT,disease_prevented VARCHAR(255),recommended_age_days INT NOT NULL,dose_number INT DEFAULT 1,gap_between_doses_days INT,administration_route ENUM('ORAL','INTRAMUSCULAR','SUBCUTANEOUS','INTRADERMAL','OTHER'),is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_vaccines_name_dose(name,dose_number));
CREATE INDEX idx_vaccines_active_name ON vaccines(is_active,name);
CREATE TABLE vaccine_schedules(id BIGINT PRIMARY KEY AUTO_INCREMENT,child_id BIGINT NOT NULL,vaccine_id BIGINT NOT NULL,template_vaccine_id BIGINT NULL,due_date DATE NOT NULL,status ENUM('UPCOMING','DUE','OVERDUE','COMPLETED','MISSED','CANCELLED') DEFAULT 'UPCOMING',administered_on DATE,notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_child_vaccine_schedule(child_id,vaccine_id),FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,FOREIGN KEY(vaccine_id) REFERENCES vaccines(id));
CREATE TABLE appointments(id BIGINT PRIMARY KEY AUTO_INCREMENT,parent_id BIGINT NOT NULL,child_id BIGINT NOT NULL,doctor_id BIGINT NOT NULL,hospital_id BIGINT NOT NULL,appointment_date DATE NOT NULL,appointment_time TIME NOT NULL,purpose VARCHAR(255) NOT NULL,notes TEXT,status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','RESCHEDULED') NOT NULL DEFAULT 'PENDING',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,active_slot_key VARCHAR(120) GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING','CONFIRMED','RESCHEDULED') THEN CONCAT(doctor_id,'|',appointment_date,'|',appointment_time) ELSE NULL END) STORED,UNIQUE KEY uq_active_doctor_slot(active_slot_key),FOREIGN KEY(parent_id) REFERENCES users(id),FOREIGN KEY(child_id) REFERENCES children(id),FOREIGN KEY(doctor_id) REFERENCES users(id),FOREIGN KEY(hospital_id) REFERENCES hospitals(id));
CREATE TABLE growth_records(id BIGINT PRIMARY KEY AUTO_INCREMENT,child_id BIGINT NOT NULL,height_cm DECIMAL(5,2) NOT NULL,weight_kg DECIMAL(5,2) NOT NULL,head_circumference_cm DECIMAL(5,2),measured_on DATE NOT NULL,notes VARCHAR(500),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE);
CREATE TABLE notifications(id BIGINT PRIMARY KEY AUTO_INCREMENT,user_id BIGINT NOT NULL,title VARCHAR(150) NOT NULL,message VARCHAR(500) NOT NULL,type ENUM('VACCINE','APPOINTMENT','SYSTEM') DEFAULT 'SYSTEM',is_read BOOLEAN DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id,appointment_date);CREATE INDEX idx_vaccine_due ON vaccine_schedules(due_date,status);CREATE INDEX idx_notifications_user ON notifications(user_id,is_read,created_at);

CREATE TABLE hospital_admins(user_id BIGINT PRIMARY KEY,hospital_id BIGINT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE);
CREATE TABLE doctor_hospitals(doctor_id BIGINT NOT NULL,hospital_id BIGINT NOT NULL,is_active BOOLEAN DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(doctor_id,hospital_id),FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE);
CREATE INDEX idx_users_role_active ON users(role,is_active);

CREATE TABLE vaccination_schedule_templates(id BIGINT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(150) NOT NULL UNIQUE,description TEXT,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
CREATE TABLE template_vaccines(id BIGINT PRIMARY KEY AUTO_INCREMENT,template_id BIGINT NOT NULL,vaccine_id BIGINT NOT NULL,recommended_age_days INT NOT NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_template_vaccine(template_id,vaccine_id),FOREIGN KEY(template_id) REFERENCES vaccination_schedule_templates(id) ON DELETE CASCADE,FOREIGN KEY(vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT);

INSERT IGNORE INTO vaccination_schedule_templates(name,description,is_active) VALUES('Default Child Vaccination Schedule','Initial schedule generated from active vaccine doses',TRUE);
INSERT IGNORE INTO template_vaccines(template_id,vaccine_id,recommended_age_days,is_active) SELECT t.id,v.id,v.recommended_age_days,TRUE FROM vaccination_schedule_templates t JOIN vaccines v ON v.is_active=TRUE WHERE t.name='Default Child Vaccination Schedule';


CREATE TABLE immunization_records(
 id BIGINT PRIMARY KEY AUTO_INCREMENT,
 schedule_id BIGINT NOT NULL UNIQUE,
 child_id BIGINT NOT NULL,
 vaccine_id BIGINT NOT NULL,
 vaccination_date DATE NOT NULL,
 hospital_id BIGINT NOT NULL,
 doctor_id BIGINT NOT NULL,
 batch_number VARCHAR(100),
 expiry_date DATE,
 injection_site VARCHAR(100),
 notes TEXT,
 next_dose_date DATE,
 status ENUM('COMPLETED','CORRECTED') NOT NULL DEFAULT 'COMPLETED',
 proof_image_url VARCHAR(1000),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_immunization_child_date(child_id,vaccination_date),
 INDEX idx_immunization_doctor_date(doctor_id,vaccination_date),
 INDEX idx_immunization_hospital_date(hospital_id,vaccination_date),
 FOREIGN KEY(schedule_id) REFERENCES vaccine_schedules(id) ON DELETE RESTRICT,
 FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE RESTRICT,
 FOREIGN KEY(vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT,
 FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
 FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE doctor_availability(id BIGINT PRIMARY KEY AUTO_INCREMENT,doctor_id BIGINT NOT NULL,hospital_id BIGINT NOT NULL,weekday TINYINT NOT NULL,start_time TIME NOT NULL,end_time TIME NOT NULL,slot_minutes INT NOT NULL DEFAULT 30,is_available BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_doctor_availability(doctor_id,hospital_id,weekday),FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE);
CREATE INDEX idx_appointments_parent_status_date ON appointments(parent_id,status,appointment_date);
CREATE INDEX idx_appointments_hospital_status_date ON appointments(hospital_id,status,appointment_date);


-- Phase 10 reminder preferences and delivery log


CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id BIGINT PRIMARY KEY,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vaccination_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  overdue_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vaccine_reminder_days VARCHAR(100) NOT NULL DEFAULT '7,3,1,0',
  overdue_interval_days INT NOT NULL DEFAULT 7,
  appointment_reminder_days VARCHAR(50) NOT NULL DEFAULT '1,0',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  notification_id BIGINT NULL,
  reminder_type ENUM('VACCINE_DUE','VACCINE_OVERDUE','APPOINTMENT') NOT NULL,
  related_record_id BIGINT NOT NULL,
  reminder_key VARCHAR(190) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  status ENUM('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  failure_reason VARCHAR(500) NULL,
  provider_response TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_reminder_key(reminder_key),
  INDEX idx_notification_log_status_schedule(status,scheduled_at),
  INDEX idx_notification_log_user_created(user_id,created_at),
  CONSTRAINT fk_notification_log_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_log_notification FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_record_id BIGINT NULL AFTER type,
  ADD COLUMN IF NOT EXISTS read_at DATETIME NULL AFTER is_read;

INSERT IGNORE INTO notification_preferences(user_id)
SELECT id FROM users WHERE is_active=TRUE;

-- Phase 11 Expo push notification devices
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID','IOS','WEB','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  device_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_token(expo_push_token),
  UNIQUE KEY uq_user_device(user_id,device_id),
  INDEX idx_push_tokens_user_active(user_id,is_active),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS expo_ticket_id VARCHAR(255) NULL AFTER provider_response;
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS receipt_checked_at DATETIME NULL AFTER expo_ticket_id;
USE child_vaccination_db;

ALTER TABLE growth_records
  ADD COLUMN IF NOT EXISTS notes VARCHAR(500) NULL AFTER measured_on,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

CREATE TABLE IF NOT EXISTS medical_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  child_id BIGINT NOT NULL,
  record_type ENUM('ALLERGY','ILLNESS','MEDICINE','SURGERY','DIAGNOSIS','DOCTOR_NOTE','OTHER') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  record_date DATE NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_medical_child_type_date(child_id,record_type,record_date),
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS help_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faq (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faq_active_category(is_active,category_id),
  FOREIGN KEY(category_id) REFERENCES help_categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  attachment_url VARCHAR(1000),
  status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_user_status(user_id,status),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  message TEXT,
  suggestion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bug_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  problem_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  device_info VARCHAR(500),
  app_version VARCHAR(50),
  os_version VARCHAR(100),
  screenshot_url VARCHAR(1000),
  status ENUM('OPEN','INVESTIGATING','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO help_categories(name,sort_order) VALUES
('Registration',1),('Login',2),('Child Management',3),('Vaccination Schedule',4),
('Appointment Booking',5),('Notifications',6),('Technical Issues',7),('Account Issues',8);

INSERT IGNORE INTO user_settings(user_id) SELECT id FROM users WHERE is_active=TRUE;
