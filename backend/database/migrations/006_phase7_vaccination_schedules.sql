USE child_vaccination_db;

CREATE TABLE IF NOT EXISTS vaccination_schedule_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schedule_template_name (name)
);

CREATE TABLE IF NOT EXISTS template_vaccines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id BIGINT NOT NULL,
  vaccine_id BIGINT NOT NULL,
  recommended_age_days INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_template_vaccine (template_id,vaccine_id),
  CONSTRAINT fk_template_vaccines_template FOREIGN KEY(template_id) REFERENCES vaccination_schedule_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_vaccines_vaccine FOREIGN KEY(vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT
);

INSERT IGNORE INTO vaccination_schedule_templates(name,description,is_active)
VALUES('Default Child Vaccination Schedule','Initial schedule generated from active vaccine doses',TRUE);

INSERT IGNORE INTO template_vaccines(template_id,vaccine_id,recommended_age_days,is_active)
SELECT t.id,v.id,v.recommended_age_days,TRUE
FROM vaccination_schedule_templates t
JOIN vaccines v ON v.is_active=TRUE
WHERE t.name='Default Child Vaccination Schedule';

ALTER TABLE vaccine_schedules
  MODIFY status ENUM('UPCOMING','DUE','OVERDUE','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  ADD COLUMN template_vaccine_id BIGINT NULL AFTER vaccine_id,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD CONSTRAINT fk_vaccine_schedule_template_item FOREIGN KEY(template_vaccine_id) REFERENCES template_vaccines(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_child_vaccine_schedule ON vaccine_schedules(child_id,vaccine_id);
CREATE INDEX idx_schedule_child_status_due ON vaccine_schedules(child_id,status,due_date);
