USE child_vaccination_db;
ALTER TABLE appointments MODIFY status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','RESCHEDULED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE appointments CHANGE reason purpose VARCHAR(255) NOT NULL;
ALTER TABLE appointments ADD COLUMN notes TEXT NULL AFTER purpose, ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
CREATE TABLE IF NOT EXISTS doctor_availability(
 id BIGINT PRIMARY KEY AUTO_INCREMENT,doctor_id BIGINT NOT NULL,hospital_id BIGINT NOT NULL,weekday TINYINT NOT NULL,start_time TIME NOT NULL,end_time TIME NOT NULL,slot_minutes INT NOT NULL DEFAULT 30,is_available BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_doctor_availability(doctor_id,hospital_id,weekday),FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX idx_appointments_parent_status_date ON appointments(parent_id,status,appointment_date);
CREATE INDEX idx_appointments_hospital_status_date ON appointments(hospital_id,status,appointment_date);
-- MySQL permits multiple historical rows while this generated unique key protects active slot collisions.
ALTER TABLE appointments ADD COLUMN active_slot_key VARCHAR(120) GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING','CONFIRMED','RESCHEDULED') THEN CONCAT(doctor_id,'|',appointment_date,'|',appointment_time) ELSE NULL END) STORED, ADD UNIQUE KEY uq_active_doctor_slot(active_slot_key);
