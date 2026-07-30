USE child_vaccination_db;
UPDATE notification_log SET status='SKIPPED' WHERE status IN ('PROCESSING','DELIVERED','CANCELLED');
UPDATE notification_log SET reminder_type='APPOINTMENT', related_record_id=COALESCE(related_record_id,0) WHERE reminder_type='GENERAL';
ALTER TABLE notification_log
  MODIFY reminder_type ENUM('VACCINE_DUE','VACCINE_OVERDUE','APPOINTMENT') NOT NULL,
  MODIFY related_record_id BIGINT UNSIGNED NOT NULL,
  MODIFY status ENUM('PENDING','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING';
