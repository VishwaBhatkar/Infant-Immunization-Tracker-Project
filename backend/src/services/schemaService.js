/**
 * File: backend/src/services/schemaService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';

export async function ensureReviewSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_reviews (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      appointment_id BIGINT UNSIGNED NOT NULL,
      parent_id BIGINT UNSIGNED NOT NULL,
      doctor_id BIGINT UNSIGNED NOT NULL,
      hospital_id BIGINT UNSIGNED NOT NULL,
      rating TINYINT UNSIGNED NOT NULL,
      review_text VARCHAR(1000) NULL,
      is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_doctor_reviews_appointment (appointment_id),
      KEY idx_doctor_reviews_doctor (doctor_id, created_at),
      KEY idx_doctor_reviews_parent (parent_id, created_at),
      CONSTRAINT chk_doctor_reviews_rating CHECK (rating BETWEEN 1 AND 5),
      CONSTRAINT fk_doctor_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      CONSTRAINT fk_doctor_reviews_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_doctor_reviews_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_doctor_reviews_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
