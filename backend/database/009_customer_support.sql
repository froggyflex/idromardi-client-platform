-- Shared by the operator platform and the existing customer portal.
-- No customer/password/utenza data is modified by this migration.
CREATE TABLE IF NOT EXISTS portal_support_requests (
  id CHAR(36) PRIMARY KEY,
  account_group_id CHAR(36) NOT NULL,
  utenza_id CHAR(36) NULL,
  subject VARCHAR(160) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'OTHER',
  status VARCHAR(30) NOT NULL DEFAULT 'NEW',
  assigned_to CHAR(36) NULL,
  creation_hash CHAR(64) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  customer_read_at DATETIME(3) NULL,
  operator_read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_support_owner (account_group_id, updated_at),
  KEY idx_support_queue (status, updated_at),
  KEY idx_support_assignee (assigned_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS portal_support_messages (
  id CHAR(36) PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  actor_id VARCHAR(80) NOT NULL,
  sender VARCHAR(20) NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_support_thread (request_id, created_at, id),
  CONSTRAINT fk_support_message_request FOREIGN KEY (request_id) REFERENCES portal_support_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS portal_support_audit (
  id CHAR(36) PRIMARY KEY,
  account_group_id CHAR(36) NOT NULL,
  request_id CHAR(36) NULL,
  actor_id VARCHAR(80) NOT NULL,
  action VARCHAR(40) NOT NULL,
  details_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_support_audit (account_group_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
