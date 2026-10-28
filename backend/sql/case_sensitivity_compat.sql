USE lawfirm;

-- Compatibility layer for case-sensitive environments (Linux / lower_case_table_names=0)
-- When lower_case_table_names=0, aliases PascalCase tables created in schema.sql to lowercase for SQLAlchemy ORM models.
-- When lower_case_table_names=1 (Windows/configured Linux), no-ops to avoid duplicate object naming errors.

SET @val = @@lower_case_table_names;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `cases` AS SELECT * FROM `Cases`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `employee` AS SELECT * FROM `Employee`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `client` AS SELECT * FROM `Client`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `department` AS SELECT * FROM `Department`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `role` AS SELECT * FROM `Role`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `case_team` AS SELECT * FROM `Case_Team`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `document` AS SELECT * FROM `Document`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `billing` AS SELECT * FROM `Billing`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `time_log` AS SELECT * FROM `Time_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `ticket` AS SELECT * FROM `Ticket`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `document_version` AS SELECT * FROM `Document_Version`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `case_status_history` AS SELECT * FROM `Case_Status_History`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `hierarchy_level` AS SELECT * FROM `Hierarchy_Level`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `security_clearance` AS SELECT * FROM `Security_Clearance`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `case_access` AS SELECT * FROM `Case_Access`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
