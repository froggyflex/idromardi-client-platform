ALTER TABLE activated_portal_users
  ADD COLUMN password_hash CHAR(64) NULL AFTER email,
  ADD COLUMN password_salt CHAR(32) NULL AFTER password_hash,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_salt,
  ADD COLUMN temp_password_expires_at DATETIME NULL AFTER must_change_password,
  ADD COLUMN password_changed_at DATETIME NULL AFTER temp_password_expires_at;
