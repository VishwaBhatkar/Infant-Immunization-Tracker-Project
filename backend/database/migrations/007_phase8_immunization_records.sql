USE child_vaccination_db;

CREATE TABLE IF NOT EXISTS immunization_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  schedule_id BIGINT NOT NULL,
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
  UNIQUE KEY uq_immunization_schedule (schedule_id),
  INDEX idx_immunization_child_date (child_id, vaccination_date),
  INDEX idx_immunization_doctor_date (doctor_id, vaccination_date),
  INDEX idx_immunization_hospital_date (hospital_id, vaccination_date),
  FOREIGN KEY (schedule_id) REFERENCES vaccine_schedules(id) ON DELETE RESTRICT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE RESTRICT,
  FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT
);
