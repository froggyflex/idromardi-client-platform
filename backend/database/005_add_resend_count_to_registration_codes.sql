ALTER TABLE registration_confirmation_codes
ADD COLUMN resend_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER attempts;
