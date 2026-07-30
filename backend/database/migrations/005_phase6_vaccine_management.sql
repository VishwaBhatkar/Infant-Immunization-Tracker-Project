USE child_vaccination_db;

ALTER TABLE vaccines
  ADD COLUMN disease_prevented VARCHAR(255) NULL AFTER description,
  ADD COLUMN gap_between_doses_days INT NULL AFTER dose_number,
  ADD COLUMN administration_route ENUM('ORAL','INTRAMUSCULAR','SUBCUTANEOUS','INTRADERMAL','OTHER') NULL AFTER gap_between_doses_days,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER administration_route,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE vaccines
  ADD CONSTRAINT uq_vaccines_name_dose UNIQUE (name, dose_number);

CREATE INDEX idx_vaccines_active_name ON vaccines(is_active, name);
