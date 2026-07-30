USE child_vaccination_db;

-- Before applying this migration, resolve any existing duplicate mobile numbers.
ALTER TABLE users
  ADD CONSTRAINT uq_users_phone UNIQUE (phone);
