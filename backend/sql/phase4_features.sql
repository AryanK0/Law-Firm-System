USE lawfirm;

SET FOREIGN_KEY_CHECKS = 0;

-- OCC Version Columns (Phase 2)
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `billing` ADD COLUMN IF NOT EXISTS `version` INT NOT NULL DEFAULT 1;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `version` INT NOT NULL DEFAULT 1;

-- Legal Hold & S3 Vault Tracking Columns (Phase 3)
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `legal_hold` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `legal_hold_reason` TEXT NULL;
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `legal_hold_by` INT NULL;
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `legal_hold_at` DATETIME NULL;

ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `s3_key` VARCHAR(500) NULL;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `s3_bucket` VARCHAR(100) NULL;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `sha256_checksum` VARCHAR(64) NULL;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `encryption_status` VARCHAR(50) NOT NULL DEFAULT 'AES-256';
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `ocr_status` VARCHAR(50) NOT NULL DEFAULT 'Pending';
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `extracted_text` TEXT NULL;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `is_archived` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `document` ADD COLUMN IF NOT EXISTS `file_size_bytes` BIGINT NULL;

-- UTBMS / LEDES Columns (Phase 4)
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `log_date` DATE NULL;
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 350.00;
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `task_code` VARCHAR(20) NULL;
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `activity_code` VARCHAR(20) NULL;
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `expense_code` VARCHAR(20) NULL;
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `line_item_type` VARCHAR(10) NOT NULL DEFAULT 'F';
ALTER TABLE `time_log` ADD COLUMN IF NOT EXISTS `adjustment_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `opposing_party` VARCHAR(200) NULL;
ALTER TABLE `cases` ADD COLUMN IF NOT EXISTS `opposing_counsel` VARCHAR(200) NULL;

-- Phase 4 Tables: Trust Accounting (IOLTA), Reconciliation, and Conflict Parties
CREATE TABLE IF NOT EXISTS `trust_account` (
  `account_id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_number` VARCHAR(50) NOT NULL UNIQUE,
  `account_name` VARCHAR(100) NOT NULL,
  `account_type` VARCHAR(50) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `current_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `trust_transaction` (
  `transaction_id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_id` INT NOT NULL,
  `client_id` INT NULL,
  `case_id` INT NULL,
  `transaction_type` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `running_balance` DECIMAL(14,2) NOT NULL,
  `client_running_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `reference_number` VARCHAR(100) NULL,
  `payee_or_payor` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `cleared` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_by` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_trust_tx_account` FOREIGN KEY (`account_id`) REFERENCES `trust_account` (`account_id`),
  CONSTRAINT `fk_trust_tx_client` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`),
  CONSTRAINT `fk_trust_tx_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `fk_trust_tx_creator` FOREIGN KEY (`created_by`) REFERENCES `employee` (`employee_id`)
);

CREATE TABLE IF NOT EXISTS `three_way_reconciliation` (
  `reconciliation_id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_id` INT NOT NULL,
  `statement_date` DATE NOT NULL,
  `bank_statement_balance` DECIMAL(14,2) NOT NULL,
  `general_ledger_balance` DECIMAL(14,2) NOT NULL,
  `client_ledger_balance` DECIMAL(14,2) NOT NULL,
  `variance` DECIMAL(14,2) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `reconciled_by` INT NOT NULL,
  `reconciled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT NULL,
  CONSTRAINT `fk_reconcile_account` FOREIGN KEY (`account_id`) REFERENCES `trust_account` (`account_id`),
  CONSTRAINT `fk_reconcile_employee` FOREIGN KEY (`reconciled_by`) REFERENCES `employee` (`employee_id`)
);

CREATE TABLE IF NOT EXISTS `case_adverse_party` (
  `party_id` INT AUTO_INCREMENT PRIMARY KEY,
  `case_id` INT NOT NULL,
  `party_name` VARCHAR(200) NOT NULL,
  `party_type` VARCHAR(50) NOT NULL,
  `corporate_affiliate` VARCHAR(200) NULL,
  `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_adverse_party_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`)
);

-- Seed IOLTA and Operating accounts
INSERT INTO `trust_account` (`account_id`, `account_number`, `account_name`, `account_type`, `bank_name`, `current_balance`, `version`)
VALUES
  (1, 'IOLTA-CHASE-0019482', 'Primary Client Trust Account (IOLTA)', 'IOLTA_TRUST', 'JPMorgan Chase Bank, N.A.', 250000.00, 1),
  (2, 'OP-CHASE-0083921', 'Firm General Operating Account', 'OPERATING', 'JPMorgan Chase Bank, N.A.', 750000.00, 1)
ON DUPLICATE KEY UPDATE `current_balance`=VALUES(`current_balance`);

-- Stamp Alembic version table to head
CREATE TABLE IF NOT EXISTS `alembic_version` (
  `version_num` VARCHAR(32) NOT NULL PRIMARY KEY
);
INSERT INTO `alembic_version` (`version_num`) VALUES ('51d131db1d8f')
ON DUPLICATE KEY UPDATE `version_num`='51d131db1d8f';

SET FOREIGN_KEY_CHECKS = 1;
