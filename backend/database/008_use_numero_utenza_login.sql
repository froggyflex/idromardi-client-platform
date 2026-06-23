ALTER TABLE activated_portal_users
  MODIFY COLUMN email VARCHAR(255) NULL,
  ADD COLUMN access_identifier VARCHAR(80) NULL AFTER interno,
  ADD KEY idx_portal_user_access_identifier (access_identifier);
