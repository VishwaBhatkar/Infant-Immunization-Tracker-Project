USE child_vaccination_db;

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
