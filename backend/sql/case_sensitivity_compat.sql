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

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `partner_collaboration` AS SELECT * FROM `Partner_Collaboration`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `court` AS SELECT * FROM `Court`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `hearing` AS SELECT * FROM `Hearing`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `client_interaction` AS SELECT * FROM `Client_Interaction`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `ticket_logs` AS SELECT * FROM `Ticket_Logs`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `it_system_log` AS SELECT * FROM `IT_System_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `permission` AS SELECT * FROM `Permission`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `role_permission` AS SELECT * FROM `Role_Permission`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `access_control` AS SELECT * FROM `Access_Control`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `conflict_check` AS SELECT * FROM `Conflict_Check`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `audit_log` AS SELECT * FROM `Audit_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `case_report` AS SELECT * FROM `Case_Report`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `employee_report` AS SELECT * FROM `Employee_Report`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `ticket_report` AS SELECT * FROM `Ticket_Report`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `transaction_log` AS SELECT * FROM `Transaction_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `delegated_access` AS SELECT * FROM `Delegated_Access`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `access_violation_log` AS SELECT * FROM `Access_Violation_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `system_checkpoint` AS SELECT * FROM `System_Checkpoint`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `lock_log` AS SELECT * FROM `Lock_Log`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `access_request` AS SELECT * FROM `Access_Request`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `Trust_Account` AS SELECT * FROM `trust_account`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `Trust_Transaction` AS SELECT * FROM `trust_transaction`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `Three_Way_Reconciliation` AS SELECT * FROM `three_way_reconciliation`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@val = 0, 'CREATE OR REPLACE VIEW `Case_Adverse_Party` AS SELECT * FROM `case_adverse_party`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
