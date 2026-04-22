CREATE TABLE IF NOT EXISTS condomini_v2 (
  id INT PRIMARY KEY,
  codice VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utenze_v2 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  condominio_id INT NOT NULL,
  id_user INT NOT NULL,
  Nome VARCHAR(120),
  Cognome VARCHAR(120),
  Interno VARCHAR(50),
  Mobile VARCHAR(50),
  C_F VARCHAR(50),
  Stato ENUM('ATTIVA', 'INATTIVA') DEFAULT 'ATTIVA',
  updated_at DATETIME,
  KEY idx_utenze_condominio (condominio_id),
  KEY idx_utenze_id_user (id_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registration_confirmation_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id CHAR(36) NOT NULL,
  id_Condominio INT NOT NULL,
  id_users_json JSON NOT NULL,
  interni_json JSON NULL,
  nome VARCHAR(120) NOT NULL,
  cognome VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  resend_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_registration_request_id (request_id),
  KEY idx_registration_email (email),
  KEY idx_registration_code_lookup (email, expires_at, consumed_at),
  KEY idx_registration_condominio (id_Condominio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activated_portal_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_Condominio INT NOT NULL,
  id_user INT NOT NULL,
  id_auto INT NOT NULL,
  interno VARCHAR(50) NULL,
  email VARCHAR(255) NOT NULL,
  password_hash CHAR(64) NOT NULL,
  password_salt CHAR(32) NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  temp_password_expires_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portal_user_utenza (id_Condominio, id_user),
  KEY idx_portal_user_email (email),
  KEY idx_portal_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;