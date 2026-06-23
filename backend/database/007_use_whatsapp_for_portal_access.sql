ALTER TABLE registration_confirmation_codes
  MODIFY COLUMN email VARCHAR(255) NULL,
  ADD COLUMN phone VARCHAR(20) NULL AFTER email,
  ADD KEY idx_registration_phone (phone),
  ADD KEY idx_registration_phone_lookup (phone, expires_at, consumed_at);

ALTER TABLE activated_portal_users
  MODIFY COLUMN email VARCHAR(255) NULL,
  ADD COLUMN phone VARCHAR(20) NULL AFTER email,
  ADD KEY idx_portal_user_phone (phone);
