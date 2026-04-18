ALTER TABLE activated_portal_users
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS mobile,
  DROP COLUMN IF EXISTS fiscal_code,
  DROP COLUMN IF EXISTS supply_address;
