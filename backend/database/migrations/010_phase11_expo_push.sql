USE child_vaccination_db;

CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID','IOS','WEB','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  device_name VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_token(expo_push_token),
  UNIQUE KEY uq_user_device(user_id,device_id),
  INDEX idx_push_tokens_user_active(user_id,is_active),
  CONSTRAINT fk_push_tokens_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS expo_ticket_id VARCHAR(255) NULL AFTER provider_response,
  ADD COLUMN IF NOT EXISTS receipt_checked_at DATETIME NULL AFTER expo_ticket_id;

INSERT IGNORE INTO push_tokens(user_id,expo_push_token,device_id,platform)
SELECT id,expo_push_token,CONCAT('legacy-',id),'UNKNOWN'
FROM users WHERE expo_push_token IS NOT NULL AND expo_push_token <> '';
