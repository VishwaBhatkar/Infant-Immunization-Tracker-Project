USE child_vaccination_db;

ALTER TABLE children
  ADD COLUMN birth_weight_kg DECIMAL(5,2) NULL AFTER blood_group,
  ADD COLUMN current_weight_kg DECIMAL(5,2) NULL AFTER birth_weight_kg,
  ADD COLUMN allergies TEXT NULL AFTER current_weight_kg,
  ADD COLUMN medical_notes TEXT NULL AFTER allergies,
  ADD COLUMN profile_image_url VARCHAR(1000) NULL AFTER medical_notes,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

CREATE INDEX idx_children_parent_name ON children(parent_id, name);
