DROP DATABASE IF EXISTS railway;

CREATE DATABASE IF NOT EXISTS railway
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE railway;

CREATE TABLE Department (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  hierarchy_level INT NOT NULL,
  CONSTRAINT chk_role_hierarchy_level CHECK (hierarchy_level BETWEEN 1 AND 10)
);

CREATE TABLE Employee (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  role_id INT NOT NULL,
  department_id INT NOT NULL,
  supervisor_id INT NULL,
  employment_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_employee_status CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES Role(role_id),
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES Department(department_id),
  CONSTRAINT fk_employee_supervisor FOREIGN KEY (supervisor_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Client (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  contact_info TEXT,
  organization VARCHAR(100)
);

CREATE TABLE Cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_code VARCHAR(50) UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  case_type VARCHAR(100),
  client_id INT NOT NULL,
  lead_partner_id INT,
  lead_senior_id INT,
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Internal',
  created_by INT,
  start_date DATE,
  end_date DATE,
  CONSTRAINT chk_case_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT fk_case_client FOREIGN KEY (client_id) REFERENCES Client(client_id),
  CONSTRAINT fk_case_lead_partner FOREIGN KEY (lead_partner_id) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_case_lead_senior FOREIGN KEY (lead_senior_id) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_case_creator FOREIGN KEY (created_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Case_Team (
  case_id INT NOT NULL,
  employee_id INT NOT NULL,
  role_in_case VARCHAR(50) NOT NULL,
  assigned_by INT,
  PRIMARY KEY (case_id, employee_id),
  CONSTRAINT fk_case_team_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_team_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_team_assigner FOREIGN KEY (assigned_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Partner_Collaboration (
  collaboration_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  partner_id INT,
  role VARCHAR(50) NOT NULL,
  CONSTRAINT fk_collaboration_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_collaboration_partner FOREIGN KEY (partner_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Court (
  court_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  jurisdiction_type VARCHAR(50)
);

CREATE TABLE Hearing (
  hearing_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  court_id INT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  CONSTRAINT fk_hearing_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_hearing_court FOREIGN KEY (court_id) REFERENCES Court(court_id)
);

CREATE TABLE Case_Status_History (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_history_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_history_user FOREIGN KEY (changed_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Document (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  uploaded_by INT,
  confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Internal',
  file_path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_document_uploader FOREIGN KEY (uploaded_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Document_Version (
  version_id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  version_number INT NOT NULL,
  modified_by INT,
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  CONSTRAINT chk_document_version_number CHECK (version_number >= 1),
  CONSTRAINT fk_document_version_document FOREIGN KEY (document_id) REFERENCES Document(document_id) ON DELETE CASCADE,
  CONSTRAINT fk_document_version_user FOREIGN KEY (modified_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Billing (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  generated_by INT,
  approved_by INT,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  CONSTRAINT chk_billing_amount CHECK (amount >= 0),
  CONSTRAINT fk_billing_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_billing_generator FOREIGN KEY (generated_by) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  CONSTRAINT fk_billing_approver FOREIGN KEY (approved_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Time_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  case_id INT NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  work_description TEXT,
  approved_by INT,
  CONSTRAINT chk_time_log_hours CHECK (hours > 0 AND hours <= 24),
  CONSTRAINT fk_time_log_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_time_log_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_time_log_approver FOREIGN KEY (approved_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Client_Interaction (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  employee_id INT,
  interaction_type VARCHAR(50) NOT NULL,
  notes TEXT,
  datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_interaction_client FOREIGN KEY (client_id) REFERENCES Client(client_id) ON DELETE CASCADE,
  CONSTRAINT fk_client_interaction_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Ticket (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  raised_by INT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  assigned_to INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolution_deadline DATETIME,
  breach_flag BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_ticket_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT chk_ticket_resolution CHECK (resolved_at IS NULL OR resolved_at >= created_at),
  CONSTRAINT fk_ticket_raiser FOREIGN KEY (raised_by) REFERENCES Employee(employee_id),
  CONSTRAINT fk_ticket_assignee FOREIGN KEY (assigned_to) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Ticket_Logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  updated_by INT,
  update_note TEXT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_log_ticket FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_log_user FOREIGN KEY (updated_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IT_System_Log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  action_type VARCHAR(100) NOT NULL,
  affected_table VARCHAR(100) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  CONSTRAINT fk_it_log_user FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE Permission (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE Role_Permission (
  hierarchy_id INT NOT NULL,
  permission_id INT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (hierarchy_id, permission_id),
  CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES Permission(permission_id) ON DELETE CASCADE
);

CREATE TABLE Access_Control (
  access_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT NOT NULL,
  access_type VARCHAR(50) NOT NULL,
  CONSTRAINT fk_access_control_user FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

CREATE TABLE Conflict_Check (
  conflict_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  client_id INT NOT NULL,
  restriction_reason TEXT NOT NULL,
  CONSTRAINT fk_conflict_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_conflict_client FOREIGN KEY (client_id) REFERENCES Client(client_id) ON DELETE CASCADE
);

CREATE TABLE Audit_Log (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE INDEX idx_employee_role_department ON Employee(role_id, department_id);
CREATE INDEX idx_employee_status ON Employee(status);
CREATE INDEX idx_case_client_status ON Cases(client_id, status);
CREATE INDEX idx_case_leads ON Cases(lead_partner_id, lead_senior_id);
CREATE INDEX idx_case_team_employee_role ON Case_Team(employee_id, role_in_case);
CREATE INDEX idx_hearing_case_date ON Hearing(case_id, date);
CREATE INDEX idx_document_case_created ON Document(case_id, created_at);
CREATE INDEX idx_document_version_document_number ON Document_Version(document_id, version_number);
CREATE INDEX idx_billing_case_status ON Billing(case_id, status);
CREATE INDEX idx_time_log_case_employee ON Time_Log(case_id, employee_id);
CREATE INDEX idx_client_interaction_client_datetime ON Client_Interaction(client_id, datetime);
CREATE INDEX idx_ticket_status_priority_deadline ON Ticket(status, priority, resolution_deadline);
CREATE INDEX idx_ticket_logs_ticket_time ON Ticket_Logs(ticket_id, timestamp);
CREATE INDEX idx_access_control_lookup ON Access_Control(employee_id, resource_type, resource_id);
CREATE INDEX idx_conflict_lookup ON Conflict_Check(employee_id, client_id);
CREATE INDEX idx_audit_log_lookup ON Audit_Log(table_name, record_id, timestamp);


USE lawfirm;

CREATE TABLE IF NOT EXISTS Hierarchy_Level (
  hierarchy_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL UNIQUE,
  rank_no INT NOT NULL UNIQUE,
  can_view_lower BOOLEAN NOT NULL DEFAULT FALSE,
  can_modify_lower BOOLEAN NOT NULL DEFAULT FALSE,
  can_assign_case BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve_billing BOOLEAN NOT NULL DEFAULT FALSE,
  can_override_access BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_confidential_docs BOOLEAN NOT NULL DEFAULT FALSE,
  can_create_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  can_run_recovery BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_lock_log BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Security_Clearance (
  clearance_id INT AUTO_INCREMENT PRIMARY KEY,
  level_name VARCHAR(50) NOT NULL UNIQUE,
  numeric_rank INT NOT NULL UNIQUE,
  description TEXT
);

ALTER TABLE Employee
  ADD COLUMN hierarchy_id INT NULL,
  ADD COLUMN clearance_id INT NULL;

ALTER TABLE Employee
  ADD CONSTRAINT fk_employee_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES Hierarchy_Level(hierarchy_id),
  ADD CONSTRAINT fk_employee_clearance FOREIGN KEY (clearance_id) REFERENCES Security_Clearance(clearance_id);

ALTER TABLE Document
  ADD COLUMN clearance_id INT NULL;

ALTER TABLE Document
  ADD CONSTRAINT fk_document_clearance FOREIGN KEY (clearance_id) REFERENCES Security_Clearance(clearance_id);

ALTER TABLE Role_Permission
  ADD CONSTRAINT fk_role_permission_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES Hierarchy_Level(hierarchy_id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS Case_Access (
  case_access_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  employee_id INT NOT NULL,
  case_role VARCHAR(100) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_upload_docs BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve_docs BOOLEAN NOT NULL DEFAULT FALSE,
  can_close_case BOOLEAN NOT NULL DEFAULT FALSE,
  can_assign_members BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by INT,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  CONSTRAINT fk_case_access_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_access_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_access_granter FOREIGN KEY (granted_by) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  UNIQUE KEY uq_case_access_employee (case_id, employee_id)
);

CREATE TABLE IF NOT EXISTS Access_Violation_Log (
  violation_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  attempted_resource_type VARCHAR(80) NOT NULL,
  attempted_resource_id INT,
  attempted_action VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  CONSTRAINT chk_access_violation_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT fk_access_violation_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Delegated_Access (
  delegation_id INT AUTO_INCREMENT PRIMARY KEY,
  from_employee INT NOT NULL,
  to_employee INT NOT NULL,
  permission_id INT NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_delegated_access_status CHECK (status IN ('Active', 'Expired', 'Revoked')),
  CONSTRAINT fk_delegate_from FOREIGN KEY (from_employee) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_delegate_to FOREIGN KEY (to_employee) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_delegate_permission FOREIGN KEY (permission_id) REFERENCES Permission(permission_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Access_Request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id INT NOT NULL,
  requested_permission VARCHAR(100) NOT NULL,
  reason TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  approved_by INT,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_access_request_status CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  CONSTRAINT fk_access_requester FOREIGN KEY (requester_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_access_approver FOREIGN KEY (approved_by) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

INSERT INTO Hierarchy_Level (
  hierarchy_id, title, rank_no, can_view_lower, can_modify_lower, can_assign_case,
  can_approve_billing, can_override_access, can_view_financials, can_view_confidential_docs,
  can_create_checkpoint, can_run_recovery, can_view_lock_log
) VALUES
  (1, 'Managing Partner', 8, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  (2, 'Partner', 7, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE),
  (3, 'Senior Associate', 6, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE),
  (4, 'Associate', 5, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  (5, 'Paralegal', 4, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  (6, 'Intern', 1, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  (7, 'IT Admin', 3, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, TRUE),
  (8, 'Finance Admin', 2, TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE);

INSERT INTO Security_Clearance (clearance_id, level_name, numeric_rank, description) VALUES
  (1, 'Public', 1, 'Non-sensitive public records.'),
  (2, 'Internal', 2, 'Internal operational data.'),
  (3, 'Confidential', 3, 'Matter team and client-sensitive material.'),
  (4, 'Restricted', 4, 'High-risk legal or investigation material.'),
  (5, 'Executive', 5, 'Managing partner and executive-only material.');

INSERT INTO Permission (permission_id, permission_name, description) VALUES
  (1, 'VIEW_CASE', 'View matter records.'),
  (2, 'EDIT_CASE', 'Edit matter details.'),
  (3, 'ASSIGN_CASE', 'Assign or reassign matter staff.'),
  (4, 'VIEW_TEAM', 'View matter team roster.'),
  (5, 'MODIFY_TEAM', 'Modify matter team roster.'),
  (6, 'VIEW_DOCUMENT', 'View matter documents.'),
  (7, 'UPLOAD_DOCUMENT', 'Upload matter documents.'),
  (8, 'DELETE_DOCUMENT', 'Delete matter documents.'),
  (9, 'VIEW_BILLING', 'View billing records.'),
  (10, 'APPROVE_BILLING', 'Approve billing records.'),
  (11, 'VIEW_REPORTS', 'View operations reports.'),
  (12, 'VIEW_LOCKS', 'View protected record activity.'),
  (13, 'CREATE_CHECKPOINT', 'Create continuity snapshots.'),
  (14, 'RUN_RECOVERY', 'Run resolution routines.'),
  (15, 'ACCESS_AUDIT_LOG', 'View access/audit logs.'),
  (16, 'UPDATE_STATUS', 'Update case status.'),
  (17, 'ASSIGN_HEARING', 'Assign hearing dates.'),
  (18, 'CLOSE_CASE', 'Close matters.'),
  (19, 'OVERRIDE_ACCESS', 'Override normal case/document access.');

INSERT INTO Role_Permission (hierarchy_id, permission_id, allowed)
SELECT h.hierarchy_id, p.permission_id,
  CASE
    WHEN h.title IN ('Managing Partner', 'Partner') THEN TRUE
    WHEN h.title = 'Senior Associate' AND p.permission_name IN ('VIEW_CASE','EDIT_CASE','ASSIGN_CASE','VIEW_TEAM','MODIFY_TEAM','VIEW_DOCUMENT','UPLOAD_DOCUMENT','VIEW_REPORTS','UPDATE_STATUS','ASSIGN_HEARING') THEN TRUE
    WHEN h.title = 'Associate' AND p.permission_name IN ('VIEW_CASE','EDIT_CASE','VIEW_TEAM','VIEW_DOCUMENT','UPLOAD_DOCUMENT','VIEW_REPORTS','UPDATE_STATUS') THEN TRUE
    WHEN h.title = 'Paralegal' AND p.permission_name IN ('VIEW_CASE','VIEW_TEAM','VIEW_DOCUMENT','UPLOAD_DOCUMENT','VIEW_REPORTS') THEN TRUE
    WHEN h.title = 'Intern' AND p.permission_name IN ('VIEW_CASE','VIEW_TEAM','VIEW_DOCUMENT') THEN TRUE
    WHEN h.title = 'IT Admin' AND p.permission_name IN ('VIEW_CASE','VIEW_DOCUMENT','VIEW_REPORTS','VIEW_LOCKS','ACCESS_AUDIT_LOG','OVERRIDE_ACCESS') THEN TRUE
    WHEN h.title = 'Finance Admin' AND p.permission_name IN ('VIEW_CASE','VIEW_BILLING','APPROVE_BILLING','VIEW_REPORTS','ACCESS_AUDIT_LOG') THEN TRUE
    ELSE FALSE
  END
FROM Hierarchy_Level h
CROSS JOIN Permission p;

DELIMITER $$

DROP FUNCTION IF EXISTS fn_has_delegated_permission $$
DROP FUNCTION IF EXISTS fn_has_permission $$
DROP FUNCTION IF EXISTS fn_can_access_case $$
DROP FUNCTION IF EXISTS fn_can_view_document $$
DROP PROCEDURE IF EXISTS sp_log_access_violation $$
DROP PROCEDURE IF EXISTS sp_check_access $$
DROP PROCEDURE IF EXISTS sp_delegate_access $$
DROP PROCEDURE IF EXISTS sp_request_access $$
DROP PROCEDURE IF EXISTS sp_approve_access_request $$
DROP PROCEDURE IF EXISTS sp_sync_case_access $$
DROP TRIGGER IF EXISTS trg_case_team_access_insert $$
DROP TRIGGER IF EXISTS trg_document_clearance_default $$
DROP TRIGGER IF EXISTS trg_delegated_access_expire_insert $$
DROP TRIGGER IF EXISTS trg_delegated_access_expire_update $$

CREATE FUNCTION fn_has_delegated_permission(emp INT, perm_name VARCHAR(100))
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE delegated_allowed BOOLEAN DEFAULT FALSE;

  SELECT EXISTS (
    SELECT 1
    FROM Delegated_Access da
    INNER JOIN Permission p ON p.permission_id = da.permission_id
    WHERE da.to_employee = emp
      AND p.permission_name = perm_name
      AND da.status = 'Active'
      AND NOW() BETWEEN da.valid_from AND da.valid_to
  )
  INTO delegated_allowed;

  RETURN delegated_allowed;
END $$

CREATE FUNCTION fn_has_permission(emp INT, perm_name VARCHAR(100))
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE allowed_value BOOLEAN DEFAULT FALSE;

  SELECT COALESCE(MAX(rp.allowed), FALSE)
  INTO allowed_value
  FROM Employee e
  INNER JOIN Role_Permission rp ON rp.hierarchy_id = e.hierarchy_id
  INNER JOIN Permission p ON p.permission_id = rp.permission_id
  WHERE e.employee_id = emp
    AND p.permission_name = perm_name;

  RETURN COALESCE(allowed_value, FALSE) OR fn_has_delegated_permission(emp, perm_name);
END $$

CREATE FUNCTION fn_can_access_case(emp INT, caseid INT, action_type VARCHAR(50))
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE allowed_value BOOLEAN DEFAULT FALSE;

  IF fn_has_permission(emp, 'OVERRIDE_ACCESS') THEN
    RETURN TRUE;
  END IF;

  SELECT CASE UPPER(action_type)
    WHEN 'VIEW' THEN ca.can_view
    WHEN 'EDIT' THEN ca.can_edit
    WHEN 'UPLOAD_DOCUMENT' THEN ca.can_upload_docs
    WHEN 'APPROVE_DOCUMENT' THEN ca.can_approve_docs
    WHEN 'CLOSE_CASE' THEN ca.can_close_case
    WHEN 'ASSIGN_MEMBER' THEN ca.can_assign_members
    ELSE ca.can_view
  END
  INTO allowed_value
  FROM Case_Access ca
  WHERE ca.employee_id = emp
    AND ca.case_id = caseid
    AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
  LIMIT 1;

  RETURN COALESCE(allowed_value, FALSE);
END $$

CREATE FUNCTION fn_can_view_document(emp INT, documentid INT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE doc_case_id INT;
  DECLARE doc_clearance_rank INT DEFAULT 1;
  DECLARE employee_clearance_rank INT DEFAULT 1;

  SELECT d.case_id, COALESCE(sc.numeric_rank, 1)
  INTO doc_case_id, doc_clearance_rank
  FROM Document d
  LEFT JOIN Security_Clearance sc ON sc.clearance_id = d.clearance_id
  WHERE d.document_id = documentid;

  SELECT COALESCE(sc.numeric_rank, 1)
  INTO employee_clearance_rank
  FROM Employee e
  LEFT JOIN Security_Clearance sc ON sc.clearance_id = e.clearance_id
  WHERE e.employee_id = emp;

  RETURN fn_has_permission(emp, 'OVERRIDE_ACCESS')
    OR (
      fn_has_permission(emp, 'VIEW_DOCUMENT')
      AND fn_can_access_case(emp, doc_case_id, 'VIEW')
      AND employee_clearance_rank >= doc_clearance_rank
    );
END $$

CREATE PROCEDURE sp_log_access_violation(
  IN emp INT,
  IN resource_type_param VARCHAR(80),
  IN resource_id_param INT,
  IN action_param VARCHAR(100),
  IN reason_param TEXT,
  IN severity_param VARCHAR(20),
  IN ip_param VARCHAR(50)
)
BEGIN
  INSERT INTO Access_Violation_Log(
    employee_id, attempted_resource_type, attempted_resource_id,
    attempted_action, reason, severity, ip_address
  )
  VALUES (
    emp, resource_type_param, resource_id_param, action_param, reason_param,
    COALESCE(NULLIF(severity_param, ''), 'MEDIUM'), ip_param
  );
END $$

CREATE PROCEDURE sp_check_access(
  IN emp INT,
  IN resource_type_param VARCHAR(80),
  IN resource_id_param INT,
  IN action_param VARCHAR(100),
  IN ip_param VARCHAR(50)
)
BEGIN
  DECLARE access_allowed BOOLEAN DEFAULT FALSE;
  DECLARE reason_text TEXT DEFAULT 'Access denied by hierarchy and case policy.';

  IF resource_type_param = 'Case' THEN
    SET access_allowed = fn_can_access_case(emp, resource_id_param, action_param);
  ELSEIF resource_type_param = 'Document' THEN
    SET access_allowed = fn_can_view_document(emp, resource_id_param);
    SET reason_text = 'Document access denied by case access or clearance policy.';
  ELSE
    SET access_allowed = fn_has_permission(emp, action_param);
  END IF;

  IF NOT access_allowed THEN
    CALL sp_log_access_violation(emp, resource_type_param, resource_id_param, action_param, reason_text, 'MEDIUM', ip_param);
  END IF;

  SELECT access_allowed AS allowed, IF(access_allowed, 'Allowed', reason_text) AS message;
END $$

CREATE PROCEDURE sp_sync_case_access()
BEGIN
  INSERT INTO Case_Access(
    case_id, employee_id, case_role, can_view, can_edit, can_upload_docs,
    can_approve_docs, can_close_case, can_assign_members, granted_by
  )
  SELECT
    ct.case_id,
    ct.employee_id,
    ct.role_in_case,
    TRUE,
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate', 'Associate'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate', 'Associate', 'Paralegal'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate'),
    hl.title IN ('Managing Partner', 'Partner'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate'),
    ct.assigned_by
  FROM Case_Team ct
  INNER JOIN Employee e ON e.employee_id = ct.employee_id
  INNER JOIN Hierarchy_Level hl ON hl.hierarchy_id = e.hierarchy_id
  ON DUPLICATE KEY UPDATE
    case_role = VALUES(case_role),
    can_view = VALUES(can_view),
    can_edit = VALUES(can_edit),
    can_upload_docs = VALUES(can_upload_docs),
    can_approve_docs = VALUES(can_approve_docs),
    can_close_case = VALUES(can_close_case),
    can_assign_members = VALUES(can_assign_members);
END $$

CREATE PROCEDURE sp_delegate_access(
  IN from_emp INT,
  IN to_emp INT,
  IN permission_name_param VARCHAR(100),
  IN valid_from_param DATETIME,
  IN valid_to_param DATETIME
)
BEGIN
  DECLARE target_permission_id INT;

  IF NOT fn_has_permission(from_emp, 'OVERRIDE_ACCESS') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Delegator lacks override access.';
  END IF;

  SELECT permission_id INTO target_permission_id
  FROM Permission
  WHERE permission_name = permission_name_param;

  INSERT INTO Delegated_Access(from_employee, to_employee, permission_id, valid_from, valid_to, status)
  VALUES (from_emp, to_emp, target_permission_id, COALESCE(valid_from_param, NOW()), valid_to_param, 'Active');

  SELECT LAST_INSERT_ID() AS delegation_id, 'Active' AS status;
END $$

CREATE PROCEDURE sp_request_access(
  IN requester_id_param INT,
  IN resource_type_param VARCHAR(80),
  IN resource_id_param INT,
  IN permission_param VARCHAR(100),
  IN reason_param TEXT
)
BEGIN
  INSERT INTO Access_Request(requester_id, resource_type, resource_id, requested_permission, reason, status)
  VALUES (requester_id_param, resource_type_param, resource_id_param, permission_param, reason_param, 'Pending');

  SELECT LAST_INSERT_ID() AS request_id, 'Pending' AS status;
END $$

CREATE PROCEDURE sp_approve_access_request(
  IN request_id_param INT,
  IN approver_id_param INT
)
BEGIN
  DECLARE req_employee INT;
  DECLARE req_resource_type VARCHAR(80);
  DECLARE req_resource_id INT;
  DECLARE req_permission VARCHAR(100);

  IF NOT fn_has_permission(approver_id_param, 'OVERRIDE_ACCESS') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Approver lacks override access.';
  END IF;

  SELECT requester_id, resource_type, resource_id, requested_permission
  INTO req_employee, req_resource_type, req_resource_id, req_permission
  FROM Access_Request
  WHERE request_id = request_id_param
  FOR UPDATE;

  UPDATE Access_Request
  SET status = 'Approved', approved_by = approver_id_param, approved_at = NOW()
  WHERE request_id = request_id_param;

  IF req_resource_type = 'Case' THEN
    INSERT INTO Case_Access(
      case_id, employee_id, case_role, can_view, can_edit, can_upload_docs,
      can_approve_docs, can_close_case, can_assign_members, granted_by
    )
    VALUES (
      req_resource_id, req_employee, CONCAT('Approved ', req_permission),
      TRUE,
      req_permission IN ('EDIT_CASE', 'MODIFY_TEAM', 'CLOSE_CASE'),
      req_permission IN ('UPLOAD_DOCUMENT', 'EDIT_CASE'),
      FALSE,
      req_permission = 'CLOSE_CASE',
      req_permission IN ('ASSIGN_CASE', 'MODIFY_TEAM'),
      approver_id_param
    )
    ON DUPLICATE KEY UPDATE
      can_view = TRUE,
      can_edit = can_edit OR VALUES(can_edit),
      can_upload_docs = can_upload_docs OR VALUES(can_upload_docs),
      can_close_case = can_close_case OR VALUES(can_close_case),
      can_assign_members = can_assign_members OR VALUES(can_assign_members),
      granted_by = approver_id_param,
      granted_at = NOW();
  END IF;

  SELECT request_id_param AS request_id, 'Approved' AS status;
END $$

CREATE TRIGGER trg_case_team_access_insert
AFTER INSERT ON Case_Team
FOR EACH ROW
BEGIN
  INSERT INTO Case_Access(
    case_id, employee_id, case_role, can_view, can_edit, can_upload_docs,
    can_approve_docs, can_close_case, can_assign_members, granted_by
  )
  SELECT
    NEW.case_id,
    NEW.employee_id,
    NEW.role_in_case,
    TRUE,
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate', 'Associate'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate', 'Associate', 'Paralegal'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate'),
    hl.title IN ('Managing Partner', 'Partner'),
    hl.title IN ('Managing Partner', 'Partner', 'Senior Associate'),
    NEW.assigned_by
  FROM Employee e
  INNER JOIN Hierarchy_Level hl ON hl.hierarchy_id = e.hierarchy_id
  WHERE e.employee_id = NEW.employee_id
  ON DUPLICATE KEY UPDATE
    case_role = VALUES(case_role),
    can_view = VALUES(can_view),
    can_edit = VALUES(can_edit),
    can_upload_docs = VALUES(can_upload_docs),
    can_approve_docs = VALUES(can_approve_docs),
    can_close_case = VALUES(can_close_case),
    can_assign_members = VALUES(can_assign_members);
END $$

CREATE TRIGGER trg_document_clearance_default
BEFORE INSERT ON Document
FOR EACH ROW
BEGIN
  IF NEW.clearance_id IS NULL THEN
    SET NEW.clearance_id = (
      SELECT clearance_id
      FROM Security_Clearance
      WHERE level_name = COALESCE(NULLIF(NEW.confidentiality_level, ''), 'Internal')
         OR (NEW.confidentiality_level = 'Highly Confidential' AND level_name = 'Restricted')
      ORDER BY numeric_rank DESC
      LIMIT 1
    );
  END IF;
END $$

CREATE TRIGGER trg_delegated_access_expire_insert
BEFORE INSERT ON Delegated_Access
FOR EACH ROW
BEGIN
  IF NEW.valid_to <= NOW() THEN
    SET NEW.status = 'Expired';
  END IF;
END $$

CREATE TRIGGER trg_delegated_access_expire_update
BEFORE UPDATE ON Delegated_Access
FOR EACH ROW
BEGIN
  IF NEW.valid_to <= NOW() THEN
    SET NEW.status = 'Expired';
  END IF;
END $$

DELIMITER ;


﻿USE lawfirm;
-- Consolidated DBMS feature layer: functions, transaction logs, logical locks, recovery, checkpoints, cursor reports, and DBMS console views.

-- Stored functions
DELIMITER $$

DROP FUNCTION IF EXISTS check_access $$
DROP FUNCTION IF EXISTS get_employee_access_level $$
DROP FUNCTION IF EXISTS get_case_billed_total $$
DROP FUNCTION IF EXISTS get_case_total_hours $$
DROP FUNCTION IF EXISTS fn_total_case_billing $$
DROP FUNCTION IF EXISTS fn_total_case_hours $$
DROP FUNCTION IF EXISTS fn_employee_case_count $$
DROP FUNCTION IF EXISTS fn_has_case_access $$
DROP FUNCTION IF EXISTS fn_ticket_sla_status $$

CREATE FUNCTION fn_total_case_billing(caseid INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE billed_total DECIMAL(10,2) DEFAULT 0.00;

  SELECT COALESCE(SUM(amount), 0.00)
  INTO billed_total
  FROM Billing
  WHERE case_id = caseid;

  RETURN billed_total;
END $$

CREATE FUNCTION fn_total_case_hours(caseid INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE total_hours DECIMAL(10,2) DEFAULT 0.00;

  SELECT COALESCE(SUM(hours), 0.00)
  INTO total_hours
  FROM Time_Log
  WHERE case_id = caseid;

  RETURN total_hours;
END $$

CREATE FUNCTION fn_employee_case_count(emp INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE case_count INT DEFAULT 0;

  SELECT COUNT(DISTINCT case_id)
  INTO case_count
  FROM (
    SELECT c.case_id
    FROM Cases c
    WHERE c.status <> 'Closed'
      AND (c.lead_partner_id = emp OR c.lead_senior_id = emp OR c.created_by = emp)
    UNION
    SELECT ct.case_id
    FROM Case_Team ct
    INNER JOIN Cases c ON c.case_id = ct.case_id
    WHERE ct.employee_id = emp
      AND c.status <> 'Closed'
  ) assigned_cases;

  RETURN COALESCE(case_count, 0);
END $$

CREATE FUNCTION fn_has_case_access(emp INT, caseid INT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  RETURN fn_can_access_case(emp, caseid, 'VIEW');
END $$

CREATE FUNCTION fn_ticket_sla_status(ticketid INT)
RETURNS VARCHAR(30)
READS SQL DATA
BEGIN
  DECLARE ticket_status VARCHAR(50);
  DECLARE ticket_deadline DATETIME;
  DECLARE ticket_resolved DATETIME;
  DECLARE ticket_breach BOOLEAN DEFAULT FALSE;

  SELECT status, resolution_deadline, resolved_at, breach_flag
  INTO ticket_status, ticket_deadline, ticket_resolved, ticket_breach
  FROM Ticket
  WHERE ticket_id = ticketid
  LIMIT 1;

  IF ticket_status IS NULL THEN
    RETURN 'Not Found';
  END IF;

  IF ticket_status = 'Resolved' AND ticket_breach THEN
    RETURN 'Resolved Late';
  END IF;

  IF ticket_status = 'Resolved' THEN
    RETURN 'Resolved On Time';
  END IF;

  IF ticket_deadline IS NULL THEN
    RETURN 'No Deadline';
  END IF;

  IF ticket_deadline < NOW() THEN
    RETURN 'Overdue';
  END IF;

  IF ticket_deadline <= DATE_ADD(NOW(), INTERVAL 2 DAY) THEN
    RETURN 'Due Soon';
  END IF;

  RETURN 'On Track';
END $$

CREATE FUNCTION get_case_billed_total(caseid INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  RETURN fn_total_case_billing(caseid);
END $$

CREATE FUNCTION get_case_total_hours(caseid INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  RETURN fn_total_case_hours(caseid);
END $$

CREATE FUNCTION check_access(emp INT, caseid INT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  RETURN fn_can_access_case(emp, caseid, 'VIEW');
END $$

CREATE FUNCTION get_employee_access_level(emp INT)
RETURNS VARCHAR(50)
READS SQL DATA
BEGIN
  DECLARE access_label VARCHAR(50) DEFAULT 'Support Access';

  SELECT h.title
  INTO access_label
  FROM Employee e
  INNER JOIN Hierarchy_Level h ON h.hierarchy_id = e.hierarchy_id
  WHERE e.employee_id = emp
  LIMIT 1;

  RETURN access_label;
END $$

DELIMITER ;


-- Logical locking and concurrency procedures
CREATE TABLE IF NOT EXISTS Lock_Log (
  lock_id INT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  locked_by INT,
  lock_reason VARCHAR(255),
  locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at DATETIME NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_lock_log_employee FOREIGN KEY (locked_by) REFERENCES Employee(employee_id) ON DELETE SET NULL,
  INDEX idx_lock_log_active (table_name, record_id, status),
  INDEX idx_lock_log_user (locked_by, locked_at)
);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_lock_case_record $$
DROP PROCEDURE IF EXISTS sp_release_case_lock $$
DROP PROCEDURE IF EXISTS sp_assign_employee_case_locked $$
DROP PROCEDURE IF EXISTS sp_reassign_case_transaction $$
DROP PROCEDURE IF EXISTS sp_assign_ticket_transaction $$
DROP PROCEDURE IF EXISTS sp_update_document_version_transaction $$

CREATE PROCEDURE sp_lock_case_record(
  IN case_id_param INT,
  IN employee_id_param INT
)
BEGIN
  DECLARE locked_case_id INT;
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      action,
      status,
      error_message
    )
    VALUES (
      'LOCK_CASE',
      'Cases',
      case_id_param,
      'LOCK',
      'Failed',
      v_error
    );

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT case_id
  INTO locked_case_id
  FROM Cases
  WHERE case_id = case_id_param
  FOR UPDATE;

  IF locked_case_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Case not found for locking.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM Lock_Log
    WHERE table_name = 'Cases'
      AND record_id = case_id_param
      AND status = 'Active'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Case already has an active logical lock.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Cases', case_id_param, employee_id_param, 'Manual case record lock', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (employee_id_param, 'LOCK', 'Cases', case_id_param, CONCAT('Lock id ', new_lock_id), NOW());

  COMMIT;

  SELECT new_lock_id AS lock_id, case_id_param AS case_id, 'Active' AS status;
END $$

CREATE PROCEDURE sp_release_case_lock(
  IN case_id_param INT,
  IN employee_id_param INT
)
BEGIN
  DECLARE released_count INT DEFAULT 0;

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE table_name = 'Cases'
    AND record_id = case_id_param
    AND locked_by = employee_id_param
    AND status = 'Active';

  SET released_count = ROW_COUNT();

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (employee_id_param, 'RELEASE_LOCK', 'Cases', case_id_param, 'Case lock released', NOW());

  SELECT released_count AS released_rows;
END $$

CREATE PROCEDURE sp_assign_employee_case_locked(
  IN case_id_param INT,
  IN emp_id_param INT,
  IN role_param VARCHAR(50),
  IN assigned_by_param INT
)
BEGIN
  DECLARE locked_case_id INT;
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      new_value,
      action,
      status,
      error_message
    )
    VALUES (
      'CASE_ASSIGNMENT',
      'Case_Team',
      case_id_param,
      JSON_OBJECT('employee_id', emp_id_param, 'role_in_case', role_param),
      'INSERT',
      'Failed',
      v_error
    );

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT case_id
  INTO locked_case_id
  FROM Cases
  WHERE case_id = case_id_param
  FOR UPDATE;

  IF locked_case_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Case not found for assignment.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Cases', case_id_param, assigned_by_param, 'Case team assignment', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
  VALUES (case_id_param, emp_id_param, role_param, assigned_by_param)
  ON DUPLICATE KEY UPDATE
    role_in_case = VALUES(role_in_case),
    assigned_by = VALUES(assigned_by);

  INSERT INTO Access_Control(employee_id, resource_type, resource_id, access_type)
  SELECT emp_id_param, 'Case', case_id_param, 'Team Assignment'
  FROM DUAL
  WHERE NOT EXISTS (
    SELECT 1
    FROM Access_Control ac
    WHERE ac.employee_id = emp_id_param
      AND ac.resource_type = 'Case'
      AND ac.resource_id = case_id_param
      AND ac.access_type = 'Team Assignment'
  );

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE lock_id = new_lock_id;

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    new_value,
    action,
    status
  )
  VALUES (
    'CASE_ASSIGNMENT',
    'Case_Team',
    case_id_param,
    JSON_OBJECT('employee_id', emp_id_param, 'role_in_case', role_param),
    'UPSERT',
    'Success'
  );

  COMMIT;

  SELECT case_id_param AS case_id, emp_id_param AS employee_id;
END $$

CREATE PROCEDURE sp_reassign_case_transaction(
  IN case_id_param INT,
  IN lead_partner_param INT,
  IN lead_senior_param INT,
  IN updated_by_param INT
)
BEGIN
  DECLARE old_partner INT;
  DECLARE old_senior INT;
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      action,
      status,
      error_message
    )
    VALUES ('CASE_REASSIGNMENT', 'Cases', case_id_param, 'UPDATE', 'Failed', v_error);

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT lead_partner_id, lead_senior_id
  INTO old_partner, old_senior
  FROM Cases
  WHERE case_id = case_id_param
  FOR UPDATE;

  IF old_partner IS NULL AND old_senior IS NULL
     AND NOT EXISTS (SELECT 1 FROM Cases WHERE case_id = case_id_param) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Case not found for reassignment.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Cases', case_id_param, updated_by_param, 'Case lead reassignment', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  UPDATE Cases
  SET lead_partner_id = lead_partner_param,
      lead_senior_id = lead_senior_param
  WHERE case_id = case_id_param;

  IF lead_partner_param IS NOT NULL THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (case_id_param, lead_partner_param, 'Lead Partner', updated_by_param)
    ON DUPLICATE KEY UPDATE role_in_case = 'Lead Partner', assigned_by = updated_by_param;
  END IF;

  IF lead_senior_param IS NOT NULL THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (case_id_param, lead_senior_param, 'Lead Senior', updated_by_param)
    ON DUPLICATE KEY UPDATE role_in_case = 'Lead Senior', assigned_by = updated_by_param;
  END IF;

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE lock_id = new_lock_id;

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, old_value, new_value, timestamp)
  VALUES (
    updated_by_param,
    'REASSIGN',
    'Cases',
    case_id_param,
    CONCAT('partner=', COALESCE(CAST(old_partner AS CHAR), 'NULL'), '; senior=', COALESCE(CAST(old_senior AS CHAR), 'NULL')),
    CONCAT('partner=', COALESCE(CAST(lead_partner_param AS CHAR), 'NULL'), '; senior=', COALESCE(CAST(lead_senior_param AS CHAR), 'NULL')),
    NOW()
  );

  COMMIT;

  SELECT case_id_param AS case_id;
END $$

CREATE PROCEDURE sp_assign_ticket_transaction(
  IN ticket_id_param INT,
  IN assigned_to_param INT,
  IN assigned_by_param INT
)
BEGIN
  DECLARE old_assignee INT;
  DECLARE ticket_status VARCHAR(50);
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      action,
      status,
      error_message
    )
    VALUES ('TICKET_ASSIGNMENT', 'Ticket', ticket_id_param, 'UPDATE', 'Failed', v_error);

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT assigned_to, status
  INTO old_assignee, ticket_status
  FROM Ticket
  WHERE ticket_id = ticket_id_param
  FOR UPDATE;

  IF ticket_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ticket not found for assignment.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Ticket', ticket_id_param, assigned_by_param, 'Ticket assignment', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  UPDATE Ticket
  SET assigned_to = assigned_to_param,
      status = CASE WHEN status = 'Resolved' THEN status ELSE 'Open' END
  WHERE ticket_id = ticket_id_param;

  INSERT INTO Ticket_Logs(ticket_id, updated_by, update_note, timestamp)
  VALUES (
    ticket_id_param,
    assigned_by_param,
    CONCAT('Ticket assigned to employee ', assigned_to_param, ' using row-level locking.'),
    NOW()
  );

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    old_value,
    new_value,
    action,
    status
  )
  VALUES (
    'TICKET_ASSIGNMENT',
    'Ticket',
    ticket_id_param,
    JSON_OBJECT('assigned_to', old_assignee, 'status', ticket_status),
    JSON_OBJECT('assigned_to', assigned_to_param, 'status', 'Open'),
    'UPDATE',
    'Success'
  );

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE lock_id = new_lock_id;

  COMMIT;

  SELECT ticket_id_param AS ticket_id;
END $$

CREATE PROCEDURE sp_update_document_version_transaction(
  IN version_id_param INT,
  IN modified_by_param INT,
  IN change_notes_param TEXT
)
BEGIN
  DECLARE current_document_id INT;
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      action,
      status,
      error_message
    )
    VALUES ('DOCUMENT_VERSION_UPDATE', 'Document_Version', version_id_param, 'UPDATE', 'Failed', v_error);

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT document_id
  INTO current_document_id
  FROM Document_Version
  WHERE version_id = version_id_param
  FOR UPDATE;

  IF current_document_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Document version not found for update.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Document_Version', version_id_param, modified_by_param, 'Document version update', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  UPDATE Document_Version
  SET modified_by = modified_by_param,
      modified_at = NOW(),
      change_notes = COALESCE(NULLIF(change_notes_param, ''), change_notes)
  WHERE version_id = version_id_param;

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE lock_id = new_lock_id;

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (modified_by_param, 'UPDATE_VERSION', 'Document_Version', version_id_param, change_notes_param, NOW());

  COMMIT;

  SELECT version_id_param AS version_id;
END $$

DELIMITER ;


-- Transaction log, recovery, and checkpoints
CREATE TABLE IF NOT EXISTS Transaction_Log (
  txn_id INT AUTO_INCREMENT PRIMARY KEY,
  txn_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  old_value JSON NULL,
  new_value JSON NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Success',
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction_log_status (status, created_at),
  INDEX idx_transaction_log_record (table_name, record_id)
);

CREATE TABLE IF NOT EXISTS System_Checkpoint (
  checkpoint_id INT AUTO_INCREMENT PRIMARY KEY,
  checkpoint_name VARCHAR(150) NOT NULL,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELIMITER $$

DROP TRIGGER IF EXISTS trg_txn_case_update $$
DROP TRIGGER IF EXISTS trg_txn_billing_update $$
DROP TRIGGER IF EXISTS trg_txn_document_version_update $$
DROP PROCEDURE IF EXISTS sp_recover_transaction $$
DROP PROCEDURE IF EXISTS sp_create_checkpoint $$
DROP PROCEDURE IF EXISTS sp_restore_checkpoint $$

CREATE TRIGGER trg_txn_case_update
AFTER UPDATE ON Cases
FOR EACH ROW
BEGIN
  IF COALESCE(OLD.status, '') <> COALESCE(NEW.status, '')
     OR COALESCE(OLD.lead_partner_id, -1) <> COALESCE(NEW.lead_partner_id, -1)
     OR COALESCE(OLD.lead_senior_id, -1) <> COALESCE(NEW.lead_senior_id, -1) THEN
    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      old_value,
      new_value,
      action,
      status
    )
    VALUES (
      'CASE_UPDATE',
      'Cases',
      NEW.case_id,
      JSON_OBJECT(
        'status', OLD.status,
        'lead_partner_id', OLD.lead_partner_id,
        'lead_senior_id', OLD.lead_senior_id
      ),
      JSON_OBJECT(
        'status', NEW.status,
        'lead_partner_id', NEW.lead_partner_id,
        'lead_senior_id', NEW.lead_senior_id
      ),
      'UPDATE',
      'Success'
    );
  END IF;
END $$

CREATE TRIGGER trg_txn_billing_update
AFTER UPDATE ON Billing
FOR EACH ROW
BEGIN
  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    old_value,
    new_value,
    action,
    status
  )
  VALUES (
    'BILLING_UPDATE',
    'Billing',
    NEW.bill_id,
    JSON_OBJECT(
      'amount', OLD.amount,
      'status', OLD.status,
      'approved_by', OLD.approved_by
    ),
    JSON_OBJECT(
      'amount', NEW.amount,
      'status', NEW.status,
      'approved_by', NEW.approved_by
    ),
    'UPDATE',
    'Success'
  );
END $$

CREATE TRIGGER trg_txn_document_version_update
AFTER UPDATE ON Document_Version
FOR EACH ROW
BEGIN
  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    old_value,
    new_value,
    action,
    status
  )
  VALUES (
    'DOCUMENT_VERSION_UPDATE',
    'Document_Version',
    NEW.version_id,
    JSON_OBJECT(
      'version_number', OLD.version_number,
      'change_notes', OLD.change_notes
    ),
    JSON_OBJECT(
      'version_number', NEW.version_number,
      'change_notes', NEW.change_notes
    ),
    'UPDATE',
    'Success'
  );
END $$

CREATE PROCEDURE sp_recover_transaction(IN txn_id_param INT)
BEGIN
  DECLARE v_table_name VARCHAR(100);
  DECLARE v_record_id INT;
  DECLARE v_old_value LONGTEXT;
  DECLARE v_action VARCHAR(50);
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    UPDATE Transaction_Log
    SET status = 'Failed',
        error_message = v_error
    WHERE txn_id = txn_id_param;

    INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
    VALUES (
      NULL,
      'RECOVERY_FAILED',
      'Transaction_Log',
      txn_id_param,
      v_error,
      NOW()
    );

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT table_name, record_id, old_value, action
  INTO v_table_name, v_record_id, v_old_value, v_action
  FROM Transaction_Log
  WHERE txn_id = txn_id_param
  FOR UPDATE;

  IF v_table_name IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Transaction log entry not found.';
  END IF;

  IF v_action = 'INSERT' THEN
    IF v_table_name = 'Cases' THEN
      DELETE FROM Cases WHERE case_id = v_record_id;
    ELSEIF v_table_name = 'Billing' THEN
      DELETE FROM Billing WHERE bill_id = v_record_id;
    ELSEIF v_table_name = 'Ticket' THEN
      DELETE FROM Ticket WHERE ticket_id = v_record_id;
    ELSEIF v_table_name = 'Document_Version' THEN
      DELETE FROM Document_Version WHERE version_id = v_record_id;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insert recovery is not configured for this table.';
    END IF;
  ELSEIF v_action = 'UPDATE' THEN
    IF v_old_value IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Old value is required for update recovery.';
    END IF;

    IF v_table_name = 'Cases' THEN
      UPDATE Cases
      SET status = COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.status')), 'null'), status),
          lead_partner_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.lead_partner_id')), 'null') AS UNSIGNED),
          lead_senior_id = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.lead_senior_id')), 'null') AS UNSIGNED)
      WHERE case_id = v_record_id;
    ELSEIF v_table_name = 'Billing' THEN
      UPDATE Billing
      SET amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.amount')) AS DECIMAL(10,2)),
          status = COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.status')), 'null'), status),
          approved_by = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.approved_by')), 'null') AS UNSIGNED)
      WHERE bill_id = v_record_id;
    ELSEIF v_table_name = 'Ticket' THEN
      UPDATE Ticket
      SET status = COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.status')), 'null'), status),
          assigned_to = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.assigned_to')), 'null') AS UNSIGNED),
          resolution_deadline = CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.resolution_deadline')), 'null') AS DATETIME)
      WHERE ticket_id = v_record_id;
    ELSEIF v_table_name = 'Document_Version' THEN
      UPDATE Document_Version
      SET version_number = CAST(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.version_number')) AS UNSIGNED),
          change_notes = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_old_value, '$.change_notes')), 'null')
      WHERE version_id = v_record_id;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Update recovery is not configured for this table.';
    END IF;
  ELSE
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only INSERT and UPDATE recovery are supported.';
  END IF;

  UPDATE Transaction_Log
  SET status = 'Recovered',
      error_message = NULL
  WHERE txn_id = txn_id_param;

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (
    NULL,
    'RECOVER',
    v_table_name,
    v_record_id,
    CONCAT('Recovered transaction ', txn_id_param),
    NOW()
  );

  COMMIT;

  SELECT txn_id_param AS txn_id, 'Recovered' AS status;
END $$

CREATE PROCEDURE sp_create_checkpoint(
  IN checkpoint_name_param VARCHAR(150),
  IN notes_param TEXT
)
BEGIN
  DECLARE summary_text TEXT;
  DECLARE new_checkpoint_id INT;

  SELECT CONCAT(
    COALESCE(NULLIF(notes_param, ''), 'Manual checkpoint'),
    ' | total_cases=', (SELECT COUNT(*) FROM Cases),
    '; total_documents=', (SELECT COUNT(*) FROM Document),
    '; total_billing=', (SELECT COUNT(*) FROM Billing),
    '; active_locks=', (SELECT COUNT(*) FROM Lock_Log WHERE status = 'Active'),
    '; active_tickets=', (SELECT COUNT(*) FROM Ticket WHERE status <> 'Resolved')
  )
  INTO summary_text;

  INSERT INTO System_Checkpoint(checkpoint_name, notes, created_at)
  VALUES (
    COALESCE(NULLIF(checkpoint_name_param, ''), CONCAT('Checkpoint ', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i'))),
    summary_text,
    NOW()
  );

  SET new_checkpoint_id = LAST_INSERT_ID();

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    new_value,
    action,
    status
  )
  VALUES (
    'CHECKPOINT',
    'System_Checkpoint',
    new_checkpoint_id,
    JSON_OBJECT('summary', summary_text),
    'CREATE',
    'Success'
  );

  SELECT *
  FROM System_Checkpoint
  WHERE checkpoint_id = new_checkpoint_id;
END $$

CREATE PROCEDURE sp_restore_checkpoint(IN checkpoint_id_param INT)
BEGIN
  DECLARE checkpoint_notes TEXT;

  SELECT notes
  INTO checkpoint_notes
  FROM System_Checkpoint
  WHERE checkpoint_id = checkpoint_id_param;

  IF checkpoint_notes IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Checkpoint not found.';
  END IF;

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    old_value,
    new_value,
    action,
    status
  )
  VALUES (
    'CHECKPOINT_RESTORE',
    'System_Checkpoint',
    checkpoint_id_param,
    JSON_OBJECT('note', 'Live data was not modified.'),
    JSON_OBJECT('restored_summary', checkpoint_notes),
    'RESTORE_SIMULATION',
    'Recovered'
  );

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (
    NULL,
    'RESTORE_CHECKPOINT',
    'System_Checkpoint',
    checkpoint_id_param,
    checkpoint_notes,
    NOW()
  );

  SELECT checkpoint_id_param AS checkpoint_id, 'Restore metadata logged' AS status;
END $$

DELIMITER ;


-- Multi-step transaction procedures
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_open_new_case_transaction $$
DROP PROCEDURE IF EXISTS sp_approve_billing_transaction $$

CREATE PROCEDURE sp_open_new_case_transaction(
  IN case_code_param VARCHAR(50),
  IN title_param VARCHAR(200),
  IN description_param TEXT,
  IN case_type_param VARCHAR(100),
  IN client_id_param INT,
  IN lead_partner_param INT,
  IN lead_senior_param INT,
  IN created_by_param INT,
  IN court_id_param INT,
  IN hearing_date_param DATE,
  IN hearing_notes_param TEXT,
  IN first_bill_amount_param DECIMAL(10,2)
)
BEGIN
  DECLARE new_case_id INT;
  DECLARE selected_court_id INT;
  DECLARE billing_failed BOOLEAN DEFAULT FALSE;
  DECLARE billing_error TEXT DEFAULT NULL;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      new_value,
      action,
      status,
      error_message
    )
    VALUES (
      'OPEN_NEW_CASE',
      'Cases',
      new_case_id,
      JSON_OBJECT('title', title_param, 'client_id', client_id_param),
      'INSERT',
      'Failed',
      v_error
    );

    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO Cases(
    case_code,
    title,
    description,
    case_type,
    client_id,
    status,
    confidentiality_level,
    created_by,
    start_date
  )
  VALUES (
    NULLIF(case_code_param, ''),
    title_param,
    description_param,
    case_type_param,
    client_id_param,
    'Open',
    'Internal',
    created_by_param,
    CURDATE()
  );

  SET new_case_id = LAST_INSERT_ID();
  SAVEPOINT after_case_insert;

  UPDATE Cases
  SET lead_partner_id = lead_partner_param,
      lead_senior_id = lead_senior_param
  WHERE case_id = new_case_id;

  IF lead_partner_param IS NOT NULL THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (new_case_id, lead_partner_param, 'Lead Partner', created_by_param);
  END IF;

  IF lead_senior_param IS NOT NULL AND lead_senior_param <> COALESCE(lead_partner_param, -1) THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (new_case_id, lead_senior_param, 'Lead Senior', created_by_param);
  END IF;

  SAVEPOINT after_team_assignment;

  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
      GET DIAGNOSTICS CONDITION 1 billing_error = MESSAGE_TEXT;
      SET billing_failed = TRUE;
      ROLLBACK TO SAVEPOINT after_team_assignment;
    END;

    INSERT INTO Billing(case_id, generated_by, amount, status)
    VALUES (
      new_case_id,
      created_by_param,
      COALESCE(first_bill_amount_param, 0.00),
      'Pending'
    );
  END;

  IF billing_failed THEN
    INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
    VALUES (
      created_by_param,
      'SAVEPOINT_ROLLBACK',
      'Billing',
      new_case_id,
      CONCAT('Billing insert failed and transaction rolled back to after_team_assignment: ', billing_error),
      NOW()
    );

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      new_value,
      action,
      status,
      error_message
    )
    VALUES (
      'OPEN_NEW_CASE_BILLING_SAVEPOINT',
      'Billing',
      new_case_id,
      JSON_OBJECT('amount', first_bill_amount_param),
      'SAVEPOINT_ROLLBACK',
      'Recovered',
      billing_error
    );
  END IF;

  SAVEPOINT after_billing;

  SELECT COALESCE(court_id_param, (SELECT court_id FROM Court ORDER BY court_id LIMIT 1))
  INTO selected_court_id;

  IF selected_court_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A court record is required for the first hearing.';
  END IF;

  INSERT INTO Hearing(case_id, court_id, date, notes)
  VALUES (
    new_case_id,
    selected_court_id,
    COALESCE(hearing_date_param, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
    COALESCE(NULLIF(hearing_notes_param, ''), 'Initial hearing scheduled during case opening transaction.')
  );

  INSERT INTO Case_Status_History(case_id, old_status, new_status, changed_by, timestamp)
  VALUES (new_case_id, NULL, 'Open', created_by_param, NOW());

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
  VALUES (
    created_by_param,
    'OPEN_CASE_TRANSACTION',
    'Cases',
    new_case_id,
    CONCAT('Opened case with partner ', COALESCE(CAST(lead_partner_param AS CHAR), 'NULL'),
      ' and senior ', COALESCE(CAST(lead_senior_param AS CHAR), 'NULL')),
    NOW()
  );

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    new_value,
    action,
    status
  )
  VALUES (
    'OPEN_NEW_CASE',
    'Cases',
    new_case_id,
    JSON_OBJECT(
      'case_code', case_code_param,
      'title', title_param,
      'client_id', client_id_param,
      'billing_status', IF(billing_failed, 'Skipped after savepoint rollback', 'Inserted')
    ),
    'INSERT',
    'Success'
  );

  COMMIT;

  SELECT
    new_case_id AS case_id,
    IF(billing_failed, 'Billing skipped after savepoint rollback', 'Billing row inserted') AS billing_status;
END $$

CREATE PROCEDURE sp_approve_billing_transaction(
  IN bill_id_param INT,
  IN approver_param INT
)
BEGIN
  DECLARE target_bill_id INT;
  DECLARE old_status VARCHAR(50);
  DECLARE old_approved_by INT;
  DECLARE old_amount DECIMAL(10,2);
  DECLARE is_authorized BOOLEAN DEFAULT FALSE;
  DECLARE new_lock_id INT;
  DECLARE v_error TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error = MESSAGE_TEXT;
    ROLLBACK;

    INSERT INTO Transaction_Log(
      txn_type,
      table_name,
      record_id,
      action,
      status,
      error_message
    )
    VALUES (
      'BILLING_APPROVAL',
      'Billing',
      bill_id_param,
      'UPDATE',
      'Failed',
      v_error
    );

    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT fn_has_permission(approver_param, 'APPROVE_BILLING')
  INTO is_authorized;

  IF NOT is_authorized THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only Partner-level staff can approve billing.';
  END IF;

  SELECT bill_id, status, approved_by, amount
  INTO target_bill_id, old_status, old_approved_by, old_amount
  FROM Billing
  WHERE bill_id = bill_id_param
  FOR UPDATE;

  IF target_bill_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Billing row not found.';
  END IF;

  INSERT INTO Lock_Log(table_name, record_id, locked_by, lock_reason, locked_at, status)
  VALUES ('Billing', bill_id_param, approver_param, 'Billing approval transaction', NOW(), 'Active');

  SET new_lock_id = LAST_INSERT_ID();

  UPDATE Billing
  SET status = 'Approved',
      approved_by = approver_param
  WHERE bill_id = bill_id_param;

  INSERT INTO Audit_Log(user_id, action, table_name, record_id, old_value, new_value, timestamp)
  VALUES (
    approver_param,
    'APPROVE',
    'Billing',
    bill_id_param,
    CONCAT('status=', old_status, '; approved_by=', COALESCE(CAST(old_approved_by AS CHAR), 'NULL')),
    CONCAT('status=Approved; approved_by=', approver_param),
    NOW()
  );

  INSERT INTO Transaction_Log(
    txn_type,
    table_name,
    record_id,
    old_value,
    new_value,
    action,
    status
  )
  VALUES (
    'BILLING_APPROVAL',
    'Billing',
    bill_id_param,
    JSON_OBJECT('amount', old_amount, 'status', old_status, 'approved_by', old_approved_by),
    JSON_OBJECT('amount', old_amount, 'status', 'Approved', 'approved_by', approver_param),
    'UPDATE',
    'Success'
  );

  UPDATE Lock_Log
  SET released_at = NOW(),
      status = 'Released'
  WHERE lock_id = new_lock_id;

  COMMIT;

  SELECT bill_id_param AS bill_id, 'Approved' AS status;
END $$

DELIMITER ;


-- Cursor report tables and procedures
CREATE TABLE IF NOT EXISTS Case_Report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  summary TEXT NOT NULL,
  total_billing DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  document_count INT NOT NULL DEFAULT 0,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_report_case FOREIGN KEY (case_id) REFERENCES Cases(case_id) ON DELETE CASCADE,
  INDEX idx_case_report_generated (generated_at)
);

CREATE TABLE IF NOT EXISTS Employee_Report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  summary TEXT NOT NULL,
  active_cases INT NOT NULL DEFAULT 0,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tickets_raised INT NOT NULL DEFAULT 0,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_report_employee FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  INDEX idx_employee_report_generated (generated_at)
);

CREATE TABLE IF NOT EXISTS Ticket_Report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  summary TEXT NOT NULL,
  sla_status VARCHAR(30) NOT NULL,
  priority VARCHAR(50),
  assigned_to INT,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_report_ticket FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id) ON DELETE CASCADE,
  INDEX idx_ticket_report_generated (generated_at)
);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_generate_case_report $$
DROP PROCEDURE IF EXISTS sp_generate_employee_workload_report $$
DROP PROCEDURE IF EXISTS sp_generate_ticket_report $$

CREATE PROCEDURE sp_generate_case_report()
BEGIN
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE v_case_id INT;
  DECLARE v_case_code VARCHAR(50);
  DECLARE v_title VARCHAR(200);
  DECLARE v_billing DECIMAL(10,2);
  DECLARE v_hours DECIMAL(10,2);
  DECLARE v_documents INT;
  DECLARE v_hearings INT;
  DECLARE v_team_size INT;

  DECLARE case_cursor CURSOR FOR
    SELECT case_id, COALESCE(NULLIF(case_code, ''), CONCAT('Case #', case_id)), title
    FROM Cases
    WHERE status <> 'Closed'
    ORDER BY case_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  DELETE FROM Case_Report;

  OPEN case_cursor;

  case_loop: LOOP
    FETCH case_cursor INTO v_case_id, v_case_code, v_title;
    IF done THEN
      LEAVE case_loop;
    END IF;

    SET v_billing = fn_total_case_billing(v_case_id);
    SET v_hours = fn_total_case_hours(v_case_id);

    SELECT COUNT(*) INTO v_documents FROM Document WHERE case_id = v_case_id;
    SELECT COUNT(*) INTO v_hearings FROM Hearing WHERE case_id = v_case_id;
    SELECT COUNT(*) INTO v_team_size FROM Case_Team WHERE case_id = v_case_id;

    INSERT INTO Case_Report(
      case_id,
      summary,
      total_billing,
      total_hours,
      document_count,
      generated_at
    )
    VALUES (
      v_case_id,
      CONCAT(
        v_case_code,
        ' | ',
        COALESCE(v_title, 'Untitled case'),
        ' | hearings=', v_hearings,
        ', team_size=', v_team_size,
        ', documents=', v_documents
      ),
      v_billing,
      v_hours,
      v_documents,
      NOW()
    );
  END LOOP;

  CLOSE case_cursor;

  SELECT * FROM Case_Report ORDER BY report_id;
END $$

CREATE PROCEDURE sp_generate_employee_workload_report()
BEGIN
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE v_employee_id INT;
  DECLARE v_name VARCHAR(100);
  DECLARE v_active_cases INT;
  DECLARE v_total_hours DECIMAL(10,2);
  DECLARE v_tickets_raised INT;

  DECLARE employee_cursor CURSOR FOR
    SELECT employee_id, name
    FROM Employee
    WHERE status = 'Active'
    ORDER BY employee_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  DELETE FROM Employee_Report;

  OPEN employee_cursor;

  employee_loop: LOOP
    FETCH employee_cursor INTO v_employee_id, v_name;
    IF done THEN
      LEAVE employee_loop;
    END IF;

    SET v_active_cases = fn_employee_case_count(v_employee_id);

    SELECT COALESCE(SUM(hours), 0.00)
    INTO v_total_hours
    FROM Time_Log
    WHERE employee_id = v_employee_id;

    SELECT COUNT(*)
    INTO v_tickets_raised
    FROM Ticket
    WHERE raised_by = v_employee_id;

    INSERT INTO Employee_Report(
      employee_id,
      summary,
      active_cases,
      total_hours,
      tickets_raised,
      generated_at
    )
    VALUES (
      v_employee_id,
      CONCAT(
        v_name,
        ' | active_cases=', v_active_cases,
        ', total_hours=', v_total_hours,
        ', tickets_raised=', v_tickets_raised
      ),
      v_active_cases,
      v_total_hours,
      v_tickets_raised,
      NOW()
    );
  END LOOP;

  CLOSE employee_cursor;

  SELECT * FROM Employee_Report ORDER BY report_id;
END $$

CREATE PROCEDURE sp_generate_ticket_report()
BEGIN
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE v_ticket_id INT;
  DECLARE v_priority VARCHAR(50);
  DECLARE v_assigned_to INT;
  DECLARE v_sla_status VARCHAR(30);

  DECLARE ticket_cursor CURSOR FOR
    SELECT ticket_id, priority, assigned_to
    FROM Ticket
    WHERE status <> 'Resolved'
    ORDER BY resolution_deadline IS NULL, resolution_deadline, ticket_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  DELETE FROM Ticket_Report;

  OPEN ticket_cursor;

  ticket_loop: LOOP
    FETCH ticket_cursor INTO v_ticket_id, v_priority, v_assigned_to;
    IF done THEN
      LEAVE ticket_loop;
    END IF;

    SET v_sla_status = fn_ticket_sla_status(v_ticket_id);

    INSERT INTO Ticket_Report(
      ticket_id,
      summary,
      sla_status,
      priority,
      assigned_to,
      generated_at
    )
    VALUES (
      v_ticket_id,
      CONCAT('Ticket #', v_ticket_id, ' | priority=', v_priority, ', SLA=', v_sla_status),
      v_sla_status,
      v_priority,
      v_assigned_to,
      NOW()
    );
  END LOOP;

  CLOSE ticket_cursor;

  SELECT * FROM Ticket_Report ORDER BY report_id;
END $$

DELIMITER ;


-- DBMS console views
CREATE OR REPLACE VIEW vw_case_dashboard AS
SELECT
  c.case_id,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  c.title,
  c.status,
  c.case_type,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  partner.name AS lead_partner_name,
  senior.name AS lead_senior_name,
  fn_total_case_billing(c.case_id) AS total_billing,
  fn_total_case_hours(c.case_id) AS total_hours,
  COALESCE(documents.document_count, 0) AS document_count,
  COALESCE(team.team_size, 0) AS team_size,
  c.start_date,
  c.end_date
FROM Cases c
INNER JOIN Client cl ON cl.client_id = c.client_id
LEFT JOIN Employee partner ON partner.employee_id = c.lead_partner_id
LEFT JOIN Employee senior ON senior.employee_id = c.lead_senior_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS document_count
  FROM Document
  GROUP BY case_id
) documents ON documents.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS team_size
  FROM Case_Team
  GROUP BY case_id
) team ON team.case_id = c.case_id;

CREATE OR REPLACE VIEW vw_employee_workload AS
SELECT
  e.employee_id,
  e.name,
  r.role_name,
  d.department_name,
  e.status,
  fn_employee_case_count(e.employee_id) AS active_cases,
  COALESCE(hours.total_hours, 0.00) AS total_hours,
  COALESCE(tickets.tickets_raised, 0) AS tickets_raised
FROM Employee e
INNER JOIN Role r ON r.role_id = e.role_id
INNER JOIN Department d ON d.department_id = e.department_id
LEFT JOIN (
  SELECT employee_id, COALESCE(SUM(hours), 0.00) AS total_hours
  FROM Time_Log
  GROUP BY employee_id
) hours ON hours.employee_id = e.employee_id
LEFT JOIN (
  SELECT raised_by AS employee_id, COUNT(*) AS tickets_raised
  FROM Ticket
  GROUP BY raised_by
) tickets ON tickets.employee_id = e.employee_id;

CREATE OR REPLACE VIEW vw_open_tickets AS
SELECT
  t.ticket_id,
  t.priority,
  t.status,
  fn_ticket_sla_status(t.ticket_id) AS sla_status,
  t.resolution_deadline,
  t.created_at,
  raised.name AS raised_by_name,
  assignee.name AS assigned_to_name,
  t.description
FROM Ticket t
LEFT JOIN Employee raised ON raised.employee_id = t.raised_by
LEFT JOIN Employee assignee ON assignee.employee_id = t.assigned_to
WHERE t.status <> 'Resolved';

CREATE OR REPLACE VIEW vw_active_locks AS
SELECT
  ll.lock_id,
  ll.table_name,
  ll.record_id,
  ll.locked_by,
  e.name AS locked_by_name,
  ll.lock_reason,
  ll.locked_at,
  ll.released_at,
  ll.status
FROM Lock_Log ll
LEFT JOIN Employee e ON e.employee_id = ll.locked_by
WHERE ll.status = 'Active';

CREATE OR REPLACE VIEW vw_transaction_failures AS
SELECT
  txn_id,
  txn_type,
  table_name,
  record_id,
  action,
  status,
  error_message,
  created_at
FROM Transaction_Log
WHERE status = 'Failed'
ORDER BY created_at DESC, txn_id DESC;

CREATE OR REPLACE VIEW vw_checkpoint_history AS
SELECT
  checkpoint_id,
  checkpoint_name,
  notes,
  created_at
FROM System_Checkpoint
ORDER BY created_at DESC, checkpoint_id DESC;

CREATE OR REPLACE VIEW vw_case_reports AS
SELECT
  cr.report_id,
  cr.case_id,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  c.title,
  cr.summary,
  cr.total_billing,
  cr.total_hours,
  cr.document_count,
  cr.generated_at
FROM Case_Report cr
INNER JOIN Cases c ON c.case_id = cr.case_id;

CREATE OR REPLACE VIEW vw_recovery_logs AS
SELECT
  txn_id,
  txn_type,
  table_name,
  record_id,
  action,
  status,
  error_message,
  created_at
FROM Transaction_Log
WHERE status IN ('Recovered', 'Failed')
ORDER BY created_at DESC, txn_id DESC;



DELIMITER $$

DROP PROCEDURE IF EXISTS create_case_full $$
DROP PROCEDURE IF EXISTS assign_employee_case $$
DROP PROCEDURE IF EXISTS approve_billing $$
DROP PROCEDURE IF EXISTS raise_ticket $$
DROP PROCEDURE IF EXISTS resolve_ticket_workflow $$
DROP PROCEDURE IF EXISTS generate_client_billing_report $$
DROP PROCEDURE IF EXISTS generate_ticket_sla_review $$

CREATE PROCEDURE create_case_full(
  IN case_code_param VARCHAR(50),
  IN title_param VARCHAR(200),
  IN description_param TEXT,
  IN case_type_param VARCHAR(100),
  IN client_param INT,
  IN partner_id_param INT,
  IN senior_id_param INT,
  IN status_param VARCHAR(50),
  IN confidentiality_param VARCHAR(50),
  IN created_by_param INT,
  IN start_date_param DATE,
  IN end_date_param DATE
)
BEGIN
  DECLARE new_case_id INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF end_date_param IS NOT NULL
     AND start_date_param IS NOT NULL
     AND end_date_param < start_date_param THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Case end date cannot be earlier than the start date.';
  END IF;

  START TRANSACTION;

  INSERT INTO Cases(
    case_code,
    title,
    description,
    case_type,
    client_id,
    lead_partner_id,
    lead_senior_id,
    status,
    confidentiality_level,
    created_by,
    start_date,
    end_date
  )
  VALUES (
    NULLIF(case_code_param, ''),
    title_param,
    description_param,
    case_type_param,
    client_param,
    partner_id_param,
    senior_id_param,
    COALESCE(NULLIF(status_param, ''), 'Open'),
    COALESCE(NULLIF(confidentiality_param, ''), 'Internal'),
    created_by_param,
    start_date_param,
    end_date_param
  );

  SET new_case_id = LAST_INSERT_ID();

  INSERT INTO Case_Status_History(case_id, old_status, new_status, changed_by, timestamp)
  VALUES (new_case_id, NULL, COALESCE(NULLIF(status_param, ''), 'Open'), created_by_param, NOW());

  IF partner_id_param IS NOT NULL THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (new_case_id, partner_id_param, 'Lead Partner', created_by_param);
  END IF;

  IF senior_id_param IS NOT NULL THEN
    INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
    VALUES (new_case_id, senior_id_param, 'Lead Senior', created_by_param);
  END IF;

  COMMIT;

  SELECT new_case_id AS case_id;
END $$

CREATE PROCEDURE assign_employee_case(
  IN case_id_param INT,
  IN emp_id_param INT,
  IN role_param VARCHAR(50),
  IN assigned_by_param INT
)
BEGIN
  CALL sp_assign_employee_case_locked(
    case_id_param,
    emp_id_param,
    role_param,
    assigned_by_param
  );
END $$

CREATE PROCEDURE approve_billing(
  IN bill_id_param INT,
  IN approver_param INT
)
BEGIN
  CALL sp_approve_billing_transaction(bill_id_param, approver_param);
END $$

CREATE PROCEDURE raise_ticket(
  IN emp_id_param INT,
  IN desc_param TEXT,
  IN priority_param VARCHAR(50),
  IN status_param VARCHAR(50),
  IN assigned_to_param INT,
  IN deadline_param DATETIME
)
BEGIN
  DECLARE new_ticket_id INT;

  INSERT INTO Ticket(
    raised_by,
    description,
    priority,
    status,
    assigned_to,
    resolution_deadline
  )
  VALUES (
    emp_id_param,
    desc_param,
    COALESCE(NULLIF(priority_param, ''), 'Medium'),
    COALESCE(NULLIF(status_param, ''), 'Open'),
    assigned_to_param,
    deadline_param
  );

  SET new_ticket_id = LAST_INSERT_ID();

  INSERT INTO Ticket_Logs(ticket_id, updated_by, update_note, timestamp)
  VALUES (new_ticket_id, emp_id_param, 'Ticket created through stored procedure workflow.', NOW());

  SELECT new_ticket_id AS ticket_id;
END $$

CREATE PROCEDURE resolve_ticket_workflow(
  IN ticket_id_param INT,
  IN resolved_by_param INT
)
BEGIN
  DECLARE assigned_owner INT;
  DECLARE current_status VARCHAR(50);
  DECLARE can_manage_tickets BOOLEAN DEFAULT FALSE;

  SELECT
    t.assigned_to,
    t.status,
    fn_has_permission(resolved_by_param, 'OVERRIDE_ACCESS')
  INTO assigned_owner, current_status, can_manage_tickets
  FROM Ticket t
  INNER JOIN Employee e ON e.employee_id = resolved_by_param
  WHERE t.ticket_id = ticket_id_param;

  IF current_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ticket not found.';
  END IF;

  IF NOT (
    assigned_owner = resolved_by_param
    OR can_manage_tickets
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'You do not have permission to resolve this ticket.';
  END IF;

  IF current_status <> 'Resolved' THEN
    UPDATE Ticket
    SET status = 'Resolved',
        resolved_at = NOW(),
        breach_flag = CASE
          WHEN resolution_deadline IS NOT NULL AND NOW() > resolution_deadline THEN TRUE
          ELSE FALSE
        END
    WHERE ticket_id = ticket_id_param;

    INSERT INTO Ticket_Logs(ticket_id, updated_by, update_note, timestamp)
    VALUES (
      ticket_id_param,
      resolved_by_param,
      'Ticket resolved through stored procedure workflow.',
      NOW()
    );
  END IF;

  SELECT ticket_id_param AS ticket_id;
END $$

CREATE PROCEDURE generate_client_billing_report(
  IN client_id_param INT
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE case_id_value INT;
  DECLARE case_code_value VARCHAR(50);
  DECLARE case_title_value VARCHAR(200);
  DECLARE client_display_name VARCHAR(150);

  DECLARE case_cursor CURSOR FOR
    SELECT
      c.case_id,
      COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)),
      c.title
    FROM Cases c
    WHERE c.client_id = client_id_param
    ORDER BY c.case_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  SELECT COALESCE(NULLIF(organization, ''), NULLIF(name, ''), CONCAT('Client #', client_id_param))
  INTO client_display_name
  FROM Client
  WHERE client_id = client_id_param;

  DROP TEMPORARY TABLE IF EXISTS tmp_client_billing_report;
  CREATE TEMPORARY TABLE tmp_client_billing_report (
    line_no INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT,
    case_code VARCHAR(50),
    case_title VARCHAR(200),
    bill_count INT,
    total_amount DECIMAL(10,2),
    approved_amount DECIMAL(10,2),
    pending_amount DECIMAL(10,2),
    total_hours DECIMAL(10,2)
  );

  OPEN case_cursor;

  client_loop: LOOP
    FETCH case_cursor INTO case_id_value, case_code_value, case_title_value;
    IF done THEN
      LEAVE client_loop;
    END IF;

    INSERT INTO tmp_client_billing_report(
      case_id,
      case_code,
      case_title,
      bill_count,
      total_amount,
      approved_amount,
      pending_amount,
      total_hours
    )
    SELECT
      case_id_value,
      case_code_value,
      case_title_value,
      COUNT(b.bill_id),
      COALESCE(SUM(b.amount), 0.00),
      COALESCE(SUM(CASE WHEN b.status = 'Approved' THEN b.amount ELSE 0 END), 0.00),
      COALESCE(SUM(CASE WHEN b.status = 'Pending' THEN b.amount ELSE 0 END), 0.00),
      get_case_total_hours(case_id_value)
    FROM Billing b
    WHERE b.case_id = case_id_value;
  END LOOP;

  CLOSE case_cursor;

  SELECT
    line_no,
    case_id,
    case_code,
    case_title,
    bill_count,
    total_amount,
    approved_amount,
    pending_amount,
    total_hours
  FROM tmp_client_billing_report
  ORDER BY line_no;

  SELECT
    COALESCE(client_display_name, CONCAT('Client #', client_id_param)) AS client_name,
    COUNT(*) AS total_cases,
    COALESCE(SUM(total_amount), 0.00) AS billed_total,
    COALESCE(SUM(approved_amount), 0.00) AS approved_total,
    COALESCE(SUM(pending_amount), 0.00) AS pending_total,
    COALESCE(SUM(total_hours), 0.00) AS worked_hours
  FROM tmp_client_billing_report;
END $$

CREATE PROCEDURE generate_ticket_sla_review(
  IN days_ahead_param INT
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE review_window INT DEFAULT 3;
  DECLARE ticket_id_value INT;
  DECLARE priority_value VARCHAR(50);
  DECLARE status_value VARCHAR(50);
  DECLARE deadline_value DATETIME;
  DECLARE assignee_name_value VARCHAR(100);
  DECLARE breach_value BOOLEAN;
  DECLARE risk_label_value VARCHAR(20);
  DECLARE action_note_value VARCHAR(255);

  DECLARE ticket_cursor CURSOR FOR
    SELECT
      t.ticket_id,
      t.priority,
      t.status,
      t.resolution_deadline,
      assignee.name,
      t.breach_flag
    FROM Ticket t
    LEFT JOIN Employee assignee ON assignee.employee_id = t.assigned_to
    WHERE t.status <> 'Resolved'
    ORDER BY t.resolution_deadline IS NULL, t.resolution_deadline, t.ticket_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  SET review_window = COALESCE(NULLIF(days_ahead_param, 0), 3);

  DROP TEMPORARY TABLE IF EXISTS tmp_ticket_sla_review;
  CREATE TEMPORARY TABLE tmp_ticket_sla_review (
    ticket_id INT PRIMARY KEY,
    priority VARCHAR(50),
    status VARCHAR(50),
    resolution_deadline DATETIME,
    assigned_to_name VARCHAR(100),
    risk_label VARCHAR(20),
    action_note VARCHAR(255)
  );

  OPEN ticket_cursor;

  ticket_loop: LOOP
    FETCH ticket_cursor
    INTO ticket_id_value, priority_value, status_value, deadline_value, assignee_name_value, breach_value;

    IF done THEN
      LEAVE ticket_loop;
    END IF;

    IF deadline_value IS NULL THEN
      SET risk_label_value = 'No Deadline';
      SET action_note_value = 'Assign an owner deadline for SLA tracking.';
    ELSEIF breach_value OR deadline_value < NOW() THEN
      SET risk_label_value = 'Overdue';
      SET action_note_value = 'Escalate immediately and record the reason for delay.';
    ELSEIF DATE(deadline_value) = CURDATE() THEN
      SET risk_label_value = 'Due Today';
      SET action_note_value = 'Prioritize same-day completion.';
    ELSEIF deadline_value <= DATE_ADD(NOW(), INTERVAL review_window DAY) THEN
      SET risk_label_value = 'Due Soon';
      SET action_note_value = 'Review ownership and clear blockers before the deadline.';
    ELSE
      SET risk_label_value = 'On Track';
      SET action_note_value = 'Monitor normally through the next review cycle.';
    END IF;

    INSERT INTO tmp_ticket_sla_review(
      ticket_id,
      priority,
      status,
      resolution_deadline,
      assigned_to_name,
      risk_label,
      action_note
    )
    VALUES (
      ticket_id_value,
      priority_value,
      status_value,
      deadline_value,
      assignee_name_value,
      risk_label_value,
      action_note_value
    );
  END LOOP;

  CLOSE ticket_cursor;

  SELECT
    ticket_id,
    priority,
    status,
    resolution_deadline,
    assigned_to_name,
    risk_label,
    action_note
  FROM tmp_ticket_sla_review
  ORDER BY
    CASE risk_label
      WHEN 'Overdue' THEN 1
      WHEN 'Due Today' THEN 2
      WHEN 'Due Soon' THEN 3
      WHEN 'No Deadline' THEN 4
      ELSE 5
    END,
    resolution_deadline,
    ticket_id;
END $$

DELIMITER ;


DELIMITER $$

DROP TRIGGER IF EXISTS trg_conflict_check $$
DROP TRIGGER IF EXISTS trg_case_status_update $$
DROP TRIGGER IF EXISTS trg_audit_employee_update $$
DROP TRIGGER IF EXISTS trg_billing_approval $$
DROP TRIGGER IF EXISTS trg_ticket_sla $$
DROP TRIGGER IF EXISTS trg_document_seed_version $$
DROP TRIGGER IF EXISTS trg_ticket_status_log $$
DROP TRIGGER IF EXISTS trg_time_log_validation_insert $$
DROP TRIGGER IF EXISTS trg_time_log_validation_update $$

CREATE TRIGGER trg_conflict_check
BEFORE INSERT ON Case_Team
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1
    FROM Conflict_Check cc
    INNER JOIN Cases c ON c.case_id = NEW.case_id
    WHERE cc.employee_id = NEW.employee_id
      AND cc.client_id = c.client_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Employee has a recorded conflict for this client.';
  END IF;
END $$

CREATE TRIGGER trg_case_status_update
BEFORE UPDATE ON Cases
FOR EACH ROW
BEGIN
  IF COALESCE(OLD.status, '') <> COALESCE(NEW.status, '') THEN
    INSERT INTO Case_Status_History(case_id, old_status, new_status, changed_by, timestamp)
    VALUES (
      OLD.case_id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.created_by, OLD.created_by),
      NOW()
    );
  END IF;
END $$

CREATE TRIGGER trg_audit_employee_update
AFTER UPDATE ON Employee
FOR EACH ROW
BEGIN
  INSERT INTO Audit_Log(user_id, action, table_name, record_id, old_value, new_value, timestamp)
  VALUES (
    NEW.employee_id,
    'UPDATE',
    'Employee',
    NEW.employee_id,
    CONCAT('name=', OLD.name, '; status=', OLD.status, '; role_id=', OLD.role_id),
    CONCAT('name=', NEW.name, '; status=', NEW.status, '; role_id=', NEW.role_id),
    NOW()
  );
END $$

CREATE TRIGGER trg_billing_approval
BEFORE UPDATE ON Billing
FOR EACH ROW
BEGIN
  IF NEW.amount < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Billing amount cannot be negative.';
  END IF;

  IF NEW.status = 'Approved' THEN
    IF NEW.approved_by IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Approved billing entries must include an approver.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM Employee e
      INNER JOIN Role r ON e.role_id = r.role_id
      WHERE e.employee_id = NEW.approved_by
        AND r.hierarchy_level <= 2
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only Partner-level staff can approve billing.';
    END IF;
  END IF;
END $$

CREATE TRIGGER trg_ticket_sla
BEFORE UPDATE ON Ticket
FOR EACH ROW
BEGIN
  IF NEW.status = 'Resolved' THEN
    SET NEW.breach_flag = (
      NEW.resolution_deadline IS NOT NULL
      AND NEW.resolved_at IS NOT NULL
      AND NEW.resolved_at > NEW.resolution_deadline
    );
  END IF;
END $$

CREATE TRIGGER trg_document_seed_version
AFTER INSERT ON Document
FOR EACH ROW
BEGIN
  INSERT INTO Document_Version(
    document_id,
    version_number,
    modified_by,
    modified_at,
    change_notes
  )
  VALUES (
    NEW.document_id,
    1,
    NEW.uploaded_by,
    COALESCE(NEW.created_at, NOW()),
    'Initial document registration.'
  );
END $$

CREATE TRIGGER trg_ticket_status_log
AFTER UPDATE ON Ticket
FOR EACH ROW
BEGIN
  IF COALESCE(OLD.status, '') <> COALESCE(NEW.status, '')
     OR COALESCE(OLD.assigned_to, -1) <> COALESCE(NEW.assigned_to, -1)
     OR COALESCE(OLD.resolution_deadline, '1900-01-01 00:00:00')
        <> COALESCE(NEW.resolution_deadline, '1900-01-01 00:00:00') THEN
    INSERT INTO Ticket_Logs(ticket_id, updated_by, update_note, timestamp)
    VALUES (
      NEW.ticket_id,
      COALESCE(NEW.assigned_to, NEW.raised_by),
      CONCAT(
        'Ticket updated. Status: ',
        COALESCE(OLD.status, 'Unspecified'),
        ' -> ',
        COALESCE(NEW.status, 'Unspecified'),
        '; Assignee: ',
        COALESCE(CAST(OLD.assigned_to AS CHAR), 'Unassigned'),
        ' -> ',
        COALESCE(CAST(NEW.assigned_to AS CHAR), 'Unassigned')
      ),
      NOW()
    );
  END IF;
END $$

CREATE TRIGGER trg_time_log_validation_insert
BEFORE INSERT ON Time_Log
FOR EACH ROW
BEGIN
  IF NEW.hours <= 0 OR NEW.hours > 24 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Time log hours must be between 0 and 24.';
  END IF;

  IF NEW.approved_by IS NOT NULL
     AND NOT (
       fn_has_permission(NEW.approved_by, 'EDIT_CASE')
       OR fn_has_permission(NEW.approved_by, 'APPROVE_BILLING')
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Approver lacks time-log approval authority.';
  END IF;
END $$

CREATE TRIGGER trg_time_log_validation_update
BEFORE UPDATE ON Time_Log
FOR EACH ROW
BEGIN
  IF NEW.hours <= 0 OR NEW.hours > 24 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Time log hours must be between 0 and 24.';
  END IF;

  IF NEW.approved_by IS NOT NULL
     AND NOT (
       fn_has_permission(NEW.approved_by, 'EDIT_CASE')
       OR fn_has_permission(NEW.approved_by, 'APPROVE_BILLING')
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Approver lacks time-log approval authority.';
  END IF;
END $$

DELIMITER ;


USE lawfirm;

CREATE OR REPLACE VIEW vw_employee_directory AS
SELECT
  e.employee_id,
  e.name,
  e.email,
  e.phone,
  e.status,
  e.employment_type,
  d.department_name,
  r.role_name,
  hl.rank_no AS hierarchy_level,
  get_employee_access_level(e.employee_id) AS access_level,
  supervisor.name AS supervisor_name
FROM Employee e
LEFT JOIN Department d ON e.department_id = d.department_id
LEFT JOIN Role r ON e.role_id = r.role_id
LEFT JOIN Hierarchy_Level hl ON e.hierarchy_id = hl.hierarchy_id
LEFT JOIN Employee supervisor ON e.supervisor_id = supervisor.employee_id;

CREATE OR REPLACE VIEW vw_role_access_matrix AS
SELECT
  h.hierarchy_id AS role_id,
  h.title AS role_name,
  h.rank_no AS hierarchy_level,
  h.title AS access_level,
  COALESCE(
    GROUP_CONCAT(DISTINCT CASE WHEN rp.allowed THEN p.permission_name END ORDER BY p.permission_name SEPARATOR ', '),
    'No explicit permissions mapped'
  ) AS permissions
FROM Hierarchy_Level h
LEFT JOIN Role_Permission rp ON h.hierarchy_id = rp.hierarchy_id
LEFT JOIN Permission p ON rp.permission_id = p.permission_id
GROUP BY h.hierarchy_id, h.title, h.rank_no;

CREATE OR REPLACE VIEW vw_case_overview AS
SELECT
  c.case_id,
  c.case_code,
  c.title,
  c.description,
  c.case_type,
  c.status,
  c.confidentiality_level,
  c.start_date,
  c.end_date,
  c.created_by,
  creator.name AS created_by_name,
  c.client_id,
  cl.name AS client_contact_name,
  cl.organization AS client_organization,
  cl.contact_info AS client_contact_info,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  c.lead_partner_id,
  lp.name AS lead_partner_name,
  lp.email AS lead_partner_email,
  c.lead_senior_id,
  ls.name AS lead_senior_name,
  ls.email AS lead_senior_email,
  COALESCE(team.team_size, 0) AS team_size,
  COALESCE(documents.document_count, 0) AS document_count,
  get_case_billed_total(c.case_id) AS billed_total,
  get_case_total_hours(c.case_id) AS total_hours,
  hearing.hearing_id AS next_hearing_id,
  hearing.date AS next_hearing_date,
  hearing.notes AS next_hearing_notes,
  hearing.court_name AS next_hearing_court_name,
  hearing.location AS next_hearing_location
FROM Cases c
LEFT JOIN Client cl ON c.client_id = cl.client_id
LEFT JOIN Employee lp ON c.lead_partner_id = lp.employee_id
LEFT JOIN Employee ls ON c.lead_senior_id = ls.employee_id
LEFT JOIN Employee creator ON c.created_by = creator.employee_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS team_size
  FROM Case_Team
  GROUP BY case_id
) team ON team.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COUNT(*) AS document_count
  FROM Document
  GROUP BY case_id
) documents ON documents.case_id = c.case_id
LEFT JOIN (
  SELECT
    h.case_id,
    h.hearing_id,
    h.date,
    h.notes,
    court.name AS court_name,
    court.location
  FROM Hearing h
  INNER JOIN Court court ON h.court_id = court.court_id
  INNER JOIN (
    SELECT case_id, MIN(date) AS next_date
    FROM Hearing
    WHERE date >= CURDATE()
    GROUP BY case_id
  ) next_hearing
    ON next_hearing.case_id = h.case_id
   AND next_hearing.next_date = h.date
) hearing ON hearing.case_id = c.case_id;

CREATE OR REPLACE VIEW vw_case_team_roster AS
SELECT
  ct.case_id,
  ct.employee_id,
  ct.role_in_case,
  ct.assigned_by,
  assigned_by_employee.name AS assigned_by_name,
  e.name,
  e.email,
  e.phone,
  e.status,
  e.employment_type,
  d.department_name,
  r.role_name,
  hl.rank_no AS hierarchy_level
FROM Case_Team ct
INNER JOIN Employee e ON ct.employee_id = e.employee_id
LEFT JOIN Employee assigned_by_employee ON ct.assigned_by = assigned_by_employee.employee_id
LEFT JOIN Department d ON e.department_id = d.department_id
LEFT JOIN Role r ON e.role_id = r.role_id
LEFT JOIN Hierarchy_Level hl ON e.hierarchy_id = hl.hierarchy_id;

CREATE OR REPLACE VIEW vw_hearing_calendar AS
SELECT
  h.hearing_id,
  h.case_id,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  c.title,
  h.date,
  h.notes,
  court.name AS court_name,
  court.location,
  court.jurisdiction_type
FROM Hearing h
INNER JOIN Cases c ON h.case_id = c.case_id
INNER JOIN Court court ON h.court_id = court.court_id;

CREATE OR REPLACE VIEW vw_document_register AS
SELECT
  d.document_id,
  d.case_id,
  d.uploaded_by,
  d.confidentiality_level,
  d.clearance_id,
  sc.level_name AS clearance_level,
  d.file_path,
  CONCAT('/', TRIM(LEADING '/' FROM d.file_path)) AS file_url,
  SUBSTRING_INDEX(d.file_path, '/', -1) AS file_name,
  d.created_at,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  c.title AS case_title,
  uploader.name AS uploaded_by_name,
  COALESCE(version_data.latest_version, 1) AS latest_version,
  COALESCE(version_data.version_count, 1) AS version_count,
  version_data.last_modified_at
FROM Document d
LEFT JOIN Cases c ON d.case_id = c.case_id
LEFT JOIN Employee uploader ON d.uploaded_by = uploader.employee_id
LEFT JOIN Security_Clearance sc ON d.clearance_id = sc.clearance_id
LEFT JOIN (
  SELECT
    document_id,
    MAX(version_number) AS latest_version,
    COUNT(*) AS version_count,
    MAX(modified_at) AS last_modified_at
  FROM Document_Version
  GROUP BY document_id
) version_data ON version_data.document_id = d.document_id;

CREATE OR REPLACE VIEW vw_billing_register AS
SELECT
  b.bill_id,
  b.case_id,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  c.title,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  b.generated_by,
  generator.name AS generated_by_name,
  b.approved_by,
  approver.name AS approved_by_name,
  b.amount,
  b.status
FROM Billing b
LEFT JOIN Cases c ON b.case_id = c.case_id
LEFT JOIN Client cl ON c.client_id = cl.client_id
LEFT JOIN Employee generator ON b.generated_by = generator.employee_id
LEFT JOIN Employee approver ON b.approved_by = approver.employee_id;

CREATE OR REPLACE VIEW vw_ticket_overview AS
SELECT
  t.ticket_id,
  t.raised_by,
  t.description,
  t.priority,
  t.status,
  t.assigned_to,
  t.created_at,
  t.resolution_deadline,
  t.resolved_at,
  t.breach_flag,
  raised_by.name AS raised_by_name,
  assigned_to.name AS assigned_to_name,
  CASE
    WHEN t.status = 'Resolved' AND t.breach_flag THEN 'Resolved Late'
    WHEN t.status = 'Resolved' THEN 'Resolved On Time'
    WHEN t.resolution_deadline IS NULL THEN 'No Deadline'
    WHEN t.resolution_deadline < NOW() THEN 'Overdue'
    WHEN t.resolution_deadline <= DATE_ADD(NOW(), INTERVAL 2 DAY) THEN 'Due Soon'
    ELSE 'On Track'
  END AS sla_state
FROM Ticket t
LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id;

CREATE OR REPLACE VIEW vw_client_portfolio AS
SELECT
  cl.client_id,
  cl.name,
  cl.organization,
  cl.contact_info,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  COALESCE(m.matter_count, 0) AS matter_count,
  COALESCE(m.open_matter_count, 0) AS open_matter_count,
  COALESCE(b.billed_total, 0.00) AS billed_total,
  i.last_contact
FROM Client cl
LEFT JOIN (
  SELECT
    client_id,
    COUNT(*) AS matter_count,
    SUM(CASE WHEN status <> 'Closed' THEN 1 ELSE 0 END) AS open_matter_count
  FROM Cases
  GROUP BY client_id
) m ON m.client_id = cl.client_id
LEFT JOIN (
  SELECT c.client_id, COALESCE(SUM(b.amount), 0.00) AS billed_total
  FROM Cases c
  LEFT JOIN Billing b ON b.case_id = c.case_id
  GROUP BY c.client_id
) b ON b.client_id = cl.client_id
LEFT JOIN (
  SELECT client_id, MAX(datetime) AS last_contact
  FROM Client_Interaction
  GROUP BY client_id
) i ON i.client_id = cl.client_id;

CREATE OR REPLACE VIEW vw_conflict_register AS
SELECT
  cc.conflict_id,
  cc.employee_id,
  e.name AS employee_name,
  cc.client_id,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  cc.restriction_reason
FROM Conflict_Check cc
INNER JOIN Employee e ON cc.employee_id = e.employee_id
INNER JOIN Client cl ON cc.client_id = cl.client_id;

CREATE OR REPLACE VIEW vw_audit_trail AS
SELECT
  al.audit_id,
  al.user_id,
  e.name AS user_name,
  al.action,
  al.table_name,
  al.record_id,
  al.old_value,
  al.new_value,
  al.timestamp
FROM Audit_Log al
LEFT JOIN Employee e ON al.user_id = e.employee_id;


USE lawfirm;

-- DEPARTMENTS
INSERT INTO Department (department_id, department_name) VALUES
  (1, 'Executive'),
  (2, 'Litigation'),
  (3, 'Corporate'),
  (4, 'Client Advisory'),
  (5, 'Technology'),
  (6, 'Operations'),
  (7, 'Knowledge Management'),
  (8, 'Regulatory');

-- ROLES
INSERT INTO Role (role_id, role_name, hierarchy_level) VALUES
  (1, 'Managing Partner', 1),
  (2, 'Partner', 2),
  (3, 'Senior Associate', 3),
  (4, 'Associate', 4),
  (5, 'Paralegal', 5),
  (6, 'Intern', 6),
  (7, 'IT Admin', 4),
  (8, 'Finance Admin', 4);

-- EMPLOYEES
INSERT INTO Employee (
  employee_id,
  name,
  email,
  phone,
  role_id,
  department_id,
  supervisor_id,
  employment_type,
  status,
  hierarchy_id,
  clearance_id
) VALUES
  (1, 'Jessica Pearson', 'jessica.pearson@pearsonspecter.example', '+1-212-555-0101', 1, 1, NULL, 'Equity', 'Active', 1, 5),
  (2, 'Harvey Specter', 'harvey.specter@pearsonspecter.example', '+1-212-555-0102', 2, 2, 1, 'Equity', 'Active', 2, 5),
  (3, 'Louis Litt', 'louis.litt@pearsonspecter.example', '+1-212-555-0103', 2, 3, 1, 'Equity', 'Active', 2, 5),
  (4, 'Donna Paulsen', 'donna.paulsen@pearsonspecter.example', '+1-212-555-0104', 8, 6, 1, 'Full-Time', 'Active', 8, 5),
  (5, 'Katrina Bennett', 'katrina.bennett@pearsonspecter.example', '+1-212-555-0105', 3, 2, 2, 'Full-Time', 'Active', 3, 4),
  (6, 'Mike Ross', 'mike.ross@pearsonspecter.example', '+1-212-555-0106', 4, 3, 2, 'Full-Time', 'Active', 4, 3),
  (7, 'Rachel Zane', 'rachel.zane@pearsonspecter.example', '+1-212-555-0107', 5, 4, 5, 'Full-Time', 'Active', 5, 3),
  (8, 'Benjamin', 'benjamin@pearsonspecter.example', '+1-212-555-0108', 7, 5, 4, 'Full-Time', 'Active', 7, 4),
  (9, 'Gretchen Bodinski', 'gretchen.bodinski@pearsonspecter.example', '+1-212-555-0109', 5, 6, 2, 'Full-Time', 'Active', 5, 3),
  (10, 'Alex Williams', 'alex.williams@pearsonspecter.example', '+1-212-555-0110', 2, 2, 1, 'Equity', 'Active', 2, 5),
  (11, 'Samantha Wheeler', 'samantha.wheeler@pearsonspecter.example', '+1-212-555-0111', 2, 2, 1, 'Equity', 'Active', 2, 5),
  (12, 'Robert Zane', 'robert.zane@pearsonspecter.example', '+1-212-555-0112', 2, 3, 1, 'Equity', 'Active', 2, 5),
  (13, 'Sheila Sazs', 'sheila.sazs@pearsonspecter.example', '+1-212-555-0113', 5, 7, 4, 'Full-Time', 'Active', 5, 4),
  (14, 'Jeff Malone', 'jeff.malone@pearsonspecter.example', '+1-212-555-0114', 2, 8, 1, 'Equity', 'Active', 2, 5),
  (15, 'Oliver Grady', 'oliver.grady@pearsonspecter.example', '+1-212-555-0115', 6, 3, 3, 'Full-Time', 'Active', 6, 2),
  (16, 'Brian Altman', 'brian.altman@pearsonspecter.example', '+1-212-555-0116', 4, 2, 10, 'Full-Time', 'Active', 4, 3),
  (17, 'Sean Cahill', 'sean.cahill@pearsonspecter.example', '+1-212-555-0117', 3, 8, 14, 'Full-Time', 'Active', 3, 4),
  (18, 'Dana Scott', 'dana.scott@pearsonspecter.example', '+1-212-555-0118', 2, 3, 1, 'Equity', 'Active', 2, 5),
  (19, 'Cameron Dennis', 'cameron.dennis@pearsonspecter.example', '+1-212-555-0119', 2, 8, 1, 'Equity', 'Active', 2, 5),
  (20, 'Jenny Griffith', 'jenny.griffith@pearsonspecter.example', '+1-212-555-0120', 6, 4, 7, 'Internship', 'Active', 6, 2);

-- CLIENTS
INSERT INTO Client (client_id, name, contact_info, organization) VALUES
  (1, 'Evelyn Porter', 'evelyn.porter@libertyrail.com | +1-302-555-0181', 'Liberty Rail Holdings'),
  (2, 'Marcus Trent', 'marcus.trent@blueridgecap.com | +1-646-555-0182', 'Blue Ridge Capital'),
  (3, 'Ariana Cole', 'ariana.cole@monarchaviation.com | +1-917-555-0183', 'Monarch Aviation Group'),
  (4, 'Damien Cross', 'damien.cross@valeridgeenergy.com | +1-713-555-0184', 'Vale Ridge Energy'),
  (5, 'Nina Kapoor', 'nina.kapoor@sterlingbiotech.com | +1-415-555-0185', 'Sterling Biotech'),
  (6, 'Julian Moss', 'julian.moss@northharbortelecom.com | +1-206-555-0186', 'North Harbor Telecom'),
  (7, 'Elena Brooks', 'elena.brooks@caldermfg.com | +1-312-555-0187', 'Calder Manufacturing'),
  (8, 'Caroline Reed', 'caroline.reed@hudsonfo.com | +1-646-555-0188', 'Hudson Family Office'),
  (9, 'Tessa Vaughn', 'tessa.vaughn@hamiltonhospitality.com | +1-305-555-0189', 'Hamilton Hospitality'),
  (10, 'Victor Shaw', 'victor.shaw@blackwellventures.com | +1-917-555-0190', 'Blackwell Ventures'),
  (11, 'Dr. Anika Rao', 'anika.rao@redwoodbio.com | +1-617-555-0191', 'Redwood Biologics'),
  (12, 'Caleb Morris', 'caleb.morris@ironcladlogistics.com | +1-713-555-0192', 'Ironclad Logistics'),
  (13, 'Leah Hart', 'leah.hart@oakwellestates.com | +1-914-555-0193', 'Oakwell Estates'),
  (14, 'Noah Price', 'noah.price@meridiansports.com | +1-646-555-0194', 'Meridian Sports Group');

-- CASES
INSERT INTO Cases (
  case_id,
  case_code,
  title,
  description,
  case_type,
  client_id,
  lead_partner_id,
  lead_senior_id,
  status,
  confidentiality_level,
  created_by,
  start_date,
  end_date
) VALUES
  (1, 'MAT-2026-001', 'Liberty Rail antitrust readiness', 'Liberty Rail Holdings is preparing to defend a threatened antitrust suit brought by two regional competitors after a cross-state freight corridor acquisition. The team is coordinating market-share analysis, board testimony preparation, and early regulator outreach.', 'Antitrust', 1, 2, 5, 'Open', 'Highly Confidential', 1, '2026-01-10', '2026-05-22'),
  (2, 'MAT-2026-002', 'Blue Ridge proxy defense', 'Blue Ridge Capital is resisting an activist investor suit challenging the board''s poison-pill response and proxy disclosures ahead of the annual meeting. The matter includes injunction risk, director interview prep, and emergency Delaware filings.', 'Corporate Litigation', 2, 3, 5, 'Hearing Scheduled', 'Confidential', 3, '2026-01-28', '2026-04-28'),
  (3, 'MAT-2026-003', 'Monarch Aviation labor arbitration', 'Monarch Aviation faces a union-backed arbitration over alleged retaliatory discipline after a maintenance schedule overhaul. The file combines witness preparation, labor-policy review, and operational expert reports.', 'Arbitration', 3, 10, 16, 'Open', 'Confidential', 10, '2026-02-03', '2026-06-10'),
  (4, 'MAT-2026-004', 'Vale Ridge sanctions review', 'Vale Ridge Energy is answering a sanctions-related investigation tied to shipments routed through screened intermediaries. Counsel is reviewing internal emails, export controls, and disclosure obligations before a federal review panel.', 'Regulatory', 4, 14, 17, 'Drafting', 'Highly Confidential', 14, '2026-02-11', NULL),
  (5, 'MAT-2026-005', 'Sterling acquisition diligence', 'Sterling Biotech is buying a clinical-data vendor and needs diligence completed before a tightly negotiated signing window. The matter includes contract review, data-room issue tracking, and indemnity markups.', 'Mergers and Acquisitions', 5, 2, 5, 'Open', 'Highly Confidential', 2, '2026-02-24', '2026-05-15'),
  (6, 'MAT-2026-006', 'North Harbor incident response', 'North Harbor Telecom retained the firm after a ransomware event interrupted enterprise messaging services. The team is coordinating incident response, vendor containment, customer notices, and regulator-facing position papers.', 'Cybersecurity', 6, 11, 17, 'Negotiation', 'Highly Confidential', 11, '2026-03-01', NULL),
  (7, 'MAT-2026-007', 'Calder facility closure advisory', 'Calder Manufacturing is closing a Midwest facility and expects WARN Act claims plus labor negotiations with local representatives. The file covers separation notices, benefits modeling, and litigation-ready communication templates.', 'Employment', 7, 18, 15, 'Drafting', 'Confidential', 18, '2026-03-07', '2026-05-30'),
  (8, 'MAT-2026-008', 'Hudson succession structure', 'Hudson Family Office completed a succession restructuring and now needs closeout support on trust governance and tax allocation mechanics. The matter is closed but remains in the system as a strong estate-planning example.', 'Private Wealth', 8, 12, 6, 'Closed', 'Confidential', 12, '2025-11-18', '2026-02-12'),
  (9, 'MAT-2026-009', 'Liberty Rail class action strategy', 'Liberty Rail is separately defending a putative class action alleging freight-rate overcharges on agricultural shipments. Litigation strategy is focused on class certification, data preservation, and venue pressure.', 'Class Action', 1, 10, 16, 'Hearing Scheduled', 'Confidential', 10, '2026-03-11', '2026-07-08'),
  (10, 'MAT-2026-010', 'Blue Ridge compensation review', 'Blue Ridge Capital asked for a board-level review of executive bonus changes after a whistleblower complaint about inconsistent compensation approvals. The team is comparing committee minutes, plan language, and disclosure obligations.', 'Executive Compensation', 2, 3, 15, 'Open', 'Internal', 3, '2026-03-21', '2026-06-18'),
  (11, 'MAT-2026-011', 'Vale Ridge financing package', 'Vale Ridge closed a reserve-backed financing package but requested post-closing cleanup on covenant schedules and lender notice obligations. The matter is preserved as a completed finance example.', 'Finance', 4, 14, 6, 'Closed', 'Internal', 14, '2025-12-02', '2026-02-26'),
  (12, 'MAT-2026-012', 'Sterling licensing dispute', 'Sterling Biotech is suing a former licensing partner for underreported royalties and misuse of research milestones. The matter includes damages modeling, lab notebook preservation, and settlement leverage analysis.', 'IP Litigation', 5, 11, 5, 'Open', 'Highly Confidential', 11, '2026-03-19', NULL),
  (13, 'MAT-2026-013', 'Hamilton leasing claims', 'Hamilton Hospitality is pursuing lease-default claims against a departing operator after renovation commitments stalled. The file mixes contract claims, property damage calculations, and insurance coordination.', 'Commercial Litigation', 9, 2, 16, 'Open', 'Confidential', 2, '2026-04-01', '2026-06-26'),
  (14, 'MAT-2026-014', 'Blackwell governance reset', 'Blackwell Ventures requested a governance reset after founder disputes slowed board approvals and investor communications. Counsel is redrafting committee charters, consent mechanics, and information-rights protocols.', 'Governance', 10, 18, 6, 'Drafting', 'Internal', 18, '2026-04-04', NULL),
  (15, 'MAT-2026-015', 'Redwood supply breach suit', 'Redwood Biologics filed a supply-breach suit after a manufacturing vendor missed sterile-fill timelines for a phase-two study. The team is tracing contract milestones, deviation logs, and emergency replacement costs.', 'Contract Dispute', 11, 11, 5, 'Open', 'Highly Confidential', 11, '2026-04-06', '2026-07-18'),
  (16, 'MAT-2026-016', 'Ironclad cargo diversion defense', 'Ironclad Logistics retained the firm in a criminal-defense posture after prosecutors alleged cargo-diversion fraud involving port manifests and customs declarations. The file includes interview prep, device imaging, and parallel internal investigation work.', 'Criminal Defense', 12, 2, 17, 'Hearing Scheduled', 'Highly Confidential', 2, '2026-03-26', '2026-05-30'),
  (17, 'MAT-2026-017', 'Oakwell probate challenge', 'Oakwell Estates is defending a probate challenge by relatives contesting testamentary capacity and property transfers made during hospice care. The team is collecting medical timelines, caregiver statements, and estate accounting records.', 'Probate Litigation', 13, 12, 6, 'Open', 'Confidential', 12, '2026-04-02', '2026-07-03'),
  (18, 'MAT-2026-018', 'Meridian sponsorship termination dispute', 'Meridian Sports is in a sponsorship termination dispute after a jersey-rights partner alleged morality-clause breaches following an executive scandal. Counsel is reviewing notice provisions, clawback language, and media-response coordination.', 'Commercial Contracts', 14, 10, 15, 'Negotiation', 'Confidential', 10, '2026-04-05', '2026-06-21');

INSERT INTO Case_Team (case_id, employee_id, role_in_case, assigned_by) VALUES
  (1, 2, 'Lead Partner', 1),
  (1, 5, 'Lead Senior', 2),
  (1, 7, 'Paralegal', 5),
  (1, 9, 'Partner Secretary', 2),
  (1, 13, 'Records Control', 4),
  (2, 3, 'Lead Partner', 1),
  (2, 5, 'Lead Senior', 3),
  (2, 6, 'Drafting Associate', 5),
  (2, 7, 'Hearing Binder Support', 5),
  (3, 10, 'Lead Partner', 1),
  (3, 16, 'Lead Senior', 10),
  (3, 9, 'Hearing Logistics', 10),
  (3, 14, 'Secure Room Support', 4),
  (4, 14, 'Lead Partner', 1),
  (4, 17, 'Lead Senior', 14),
  (4, 13, 'Regulatory Records', 4),
  (4, 11, 'Cyber Coordination', 1),
  (5, 2, 'Lead Partner', 1),
  (5, 5, 'Lead Senior', 2),
  (5, 6, 'Diligence Associate', 5),
  (5, 7, 'Closing Coordinator', 5),
  (5, 13, 'Data Room Records', 4),
  (6, 11, 'Lead Partner', 1),
  (6, 17, 'Lead Senior', 11),
  (6, 8, 'Systems Response', 4),
  (6, 13, 'Records Escalation', 4),
  (7, 18, 'Lead Partner', 1),
  (7, 15, 'Lead Senior', 18),
  (7, 7, 'Client Coordination', 15),
  (7, 9, 'Scheduling Support', 18),
  (8, 12, 'Lead Partner', 1),
  (8, 6, 'Lead Senior', 12),
  (8, 7, 'Document Preparation', 6),
  (9, 10, 'Lead Partner', 1),
  (9, 16, 'Lead Senior', 10),
  (9, 5, 'Discovery Lead', 10),
  (9, 9, 'War Room Logistics', 10),
  (10, 3, 'Lead Partner', 1),
  (10, 15, 'Lead Senior', 3),
  (10, 13, 'Records Review', 4),
  (11, 14, 'Lead Partner', 1),
  (11, 6, 'Lead Senior', 14),
  (12, 11, 'Lead Partner', 1),
  (12, 5, 'Lead Senior', 11),
  (12, 7, 'Exhibit Coordination', 5),
  (12, 8, 'Secure Workspace', 4),
  (13, 2, 'Lead Partner', 1),
  (13, 16, 'Lead Senior', 2),
  (13, 7, 'Client Communications', 16),
  (13, 9, 'Scheduling Desk', 2),
  (14, 18, 'Lead Partner', 1),
  (14, 6, 'Lead Senior', 18),
  (14, 13, 'Board Records', 4),
  (15, 11, 'Lead Partner', 1),
  (15, 5, 'Lead Senior', 11),
  (15, 7, 'Paralegal', 5),
  (15, 13, 'Records Control', 4),
  (16, 2, 'Lead Partner', 1),
  (16, 17, 'Lead Senior', 2),
  (16, 16, 'Investigations Associate', 17),
  (16, 8, 'Systems Forensics', 4),
  (17, 12, 'Lead Partner', 1),
  (17, 6, 'Lead Senior', 12),
  (17, 7, 'Client Coordination', 6),
  (17, 9, 'Probate Scheduling', 12),
  (18, 10, 'Lead Partner', 1),
  (18, 15, 'Lead Senior', 10),
  (18, 17, 'Commercial Strategy', 10),
  (18, 13, 'Board Records', 4);

INSERT INTO Partner_Collaboration (collaboration_id, case_id, partner_id, role) VALUES
  (1, 1, 1, 'Executive Oversight'),
  (2, 1, 3, 'Corporate Antitrust Coordination'),
  (3, 4, 11, 'Cyber Escalation Review'),
  (4, 5, 12, 'Private Equity Strategy'),
  (5, 6, 14, 'Regulatory Escalation'),
  (6, 9, 2, 'Trial Strategy Review'),
  (7, 12, 10, 'Commercial Dispute Review'),
  (8, 14, 3, 'Governance Structuring Review'),
  (9, 15, 2, 'Supply Chain Litigation Review'),
  (10, 16, 10, 'White Collar Response Strategy'),
  (11, 17, 18, 'Family Office Sensitivity Review'),
  (12, 18, 3, 'Sponsor Settlement Posture');

-- COURTS AND HEARINGS
INSERT INTO Court (court_id, name, location, jurisdiction_type) VALUES
  (1, 'Delaware Court of Chancery', 'Wilmington, DE', 'State'),
  (2, 'Southern District of New York', 'New York, NY', 'Federal'),
  (3, 'International Centre for Dispute Resolution', 'New York, NY', 'Arbitration'),
  (4, 'New York Supreme Court Commercial Division', 'New York, NY', 'State'),
  (5, 'Federal Administrative Review Panel', 'Washington, DC', 'Administrative'),
  (6, 'New Jersey Superior Court Commercial Part', 'Newark, NJ', 'State'),
  (7, 'Eastern District of Pennsylvania', 'Philadelphia, PA', 'Federal'),
  (8, 'Surrogate''s Court of New York County', 'New York, NY', 'Probate');

INSERT INTO Hearing (hearing_id, case_id, court_id, date, notes) VALUES
  (1, 2, 1, '2026-04-22', 'Preliminary injunction argument window confirmed.'),
  (2, 3, 3, '2026-05-06', 'Labor arbitration witness list due forty eight hours prior.'),
  (3, 4, 5, '2026-05-13', 'Regulatory briefing conference on sanctions exposure.'),
  (4, 9, 2, '2026-05-28', 'Class certification scheduling conference.'),
  (5, 12, 4, '2026-06-04', 'Initial commercial division appearance scheduled.'),
  (6, 13, 4, '2026-06-16', 'Status conference on landlord damages model.'),
  (7, 15, 6, '2026-06-11', 'Case management conference on expedited vendor discovery.'),
  (8, 16, 7, '2026-04-29', 'Detention and disclosure hearing on customs-record subpoenas.'),
  (9, 17, 8, '2026-06-08', 'Probate evidentiary hearing on testamentary capacity.'),
  (10, 18, 4, '2026-05-19', 'Commercial-part settlement conference on sponsor termination notice.');

INSERT INTO Case_Status_History (case_id, old_status, new_status, changed_by, timestamp) VALUES
  (1, 'Open', 'Drafting', 5, '2026-02-02 10:15:00'),
  (1, 'Drafting', 'Open', 2, '2026-02-18 09:45:00'),
  (2, 'Open', 'Drafting', 5, '2026-02-14 10:15:00'),
  (2, 'Drafting', 'Hearing Scheduled', 3, '2026-04-03 16:40:00'),
  (3, 'Open', 'Drafting', 16, '2026-02-20 13:05:00'),
  (3, 'Drafting', 'Open', 10, '2026-03-02 11:50:00'),
  (4, 'Open', 'Drafting', 17, '2026-03-02 11:00:00'),
  (5, 'Open', 'Drafting', 5, '2026-03-04 08:25:00'),
  (5, 'Drafting', 'Open', 2, '2026-03-16 18:05:00'),
  (6, 'Open', 'Drafting', 17, '2026-03-03 09:30:00'),
  (6, 'Drafting', 'Negotiation', 11, '2026-04-01 14:20:00'),
  (7, 'Open', 'Drafting', 15, '2026-03-18 12:40:00'),
  (8, 'Open', 'Negotiation', 6, '2025-12-18 11:10:00'),
  (8, 'Negotiation', 'Closed', 12, '2026-02-12 18:10:00'),
  (9, 'Open', 'Drafting', 5, '2026-03-25 10:55:00'),
  (9, 'Drafting', 'Hearing Scheduled', 10, '2026-04-05 09:25:00'),
  (10, 'Open', 'Drafting', 15, '2026-03-29 15:10:00'),
  (10, 'Drafting', 'Open', 3, '2026-04-07 09:40:00'),
  (11, 'Open', 'Negotiation', 6, '2026-01-17 10:20:00'),
  (11, 'Negotiation', 'Closed', 14, '2026-02-26 15:50:00'),
  (12, 'Open', 'Drafting', 5, '2026-03-26 11:30:00'),
  (12, 'Drafting', 'Open', 11, '2026-04-08 08:15:00'),
  (13, 'Open', 'Drafting', 16, '2026-04-04 13:10:00'),
  (13, 'Drafting', 'Open', 2, '2026-04-09 17:45:00'),
  (14, 'Open', 'Drafting', 6, '2026-04-06 10:35:00'),
  (15, 'Open', 'Drafting', 5, '2026-04-08 09:05:00'),
  (15, 'Drafting', 'Open', 11, '2026-04-10 16:20:00'),
  (16, 'Open', 'Hearing Scheduled', 2, '2026-04-01 12:25:00'),
  (17, 'Open', 'Drafting', 6, '2026-04-09 10:15:00'),
  (17, 'Drafting', 'Open', 12, '2026-04-10 17:55:00'),
  (18, 'Open', 'Drafting', 15, '2026-04-08 14:10:00'),
  (18, 'Drafting', 'Negotiation', 10, '2026-04-11 09:20:00');

-- DOCUMENTS
INSERT INTO Document (
  document_id,
  case_id,
  uploaded_by,
  confidentiality_level,
  file_path,
  created_at
) VALUES
  (1, 1, 5, 'Highly Confidential', 'uploads/liberty_market_share_report.pdf', '2026-04-01 09:12:00'),
  (2, 1, 7, 'Highly Confidential', 'uploads/liberty_board_readout.docx', '2026-04-01 13:35:00'),
  (3, 1, 13, 'Highly Confidential', 'uploads/liberty_competitor_matrix.xlsx', '2026-04-02 08:20:00'),
  (4, 2, 5, 'Confidential', 'uploads/blue_proxy_response_brief.docx', '2026-04-03 13:35:00'),
  (5, 2, 7, 'Confidential', 'uploads/blue_board_interview_notes.pdf', '2026-04-03 18:10:00'),
  (6, 2, 6, 'Confidential', 'uploads/blue_proxy_timeline.xlsx', '2026-04-04 09:25:00'),
  (7, 3, 16, 'Confidential', 'uploads/monarch_arbitration_timeline.xlsx', '2026-04-04 11:05:00'),
  (8, 3, 9, 'Confidential', 'uploads/monarch_union_correspondence.pdf', '2026-04-04 15:45:00'),
  (9, 3, 16, 'Confidential', 'uploads/monarch_witness_outline.docx', '2026-04-05 09:55:00'),
  (10, 4, 13, 'Highly Confidential', 'uploads/vale_sanctions_memo.pdf', '2026-04-05 08:42:00'),
  (11, 4, 17, 'Highly Confidential', 'uploads/vale_screening_report.xlsx', '2026-04-05 14:05:00'),
  (12, 4, 11, 'Highly Confidential', 'uploads/vale_regulator_questions.docx', '2026-04-06 09:20:00'),
  (13, 5, 6, 'Highly Confidential', 'uploads/sterling_diligence_index.xlsx', '2026-04-06 15:14:00'),
  (14, 5, 5, 'Highly Confidential', 'uploads/sterling_purchase_agreement_markup.docx', '2026-04-06 18:30:00'),
  (15, 5, 13, 'Highly Confidential', 'uploads/sterling_data_room_redflags.pdf', '2026-04-07 08:50:00'),
  (16, 6, 8, 'Highly Confidential', 'uploads/north_incident_bridge_notes.txt', '2026-04-07 18:05:00'),
  (17, 6, 17, 'Highly Confidential', 'uploads/north_forensic_scope.docx', '2026-04-08 09:25:00'),
  (18, 6, 13, 'Highly Confidential', 'uploads/north_notification_tracker.xlsx', '2026-04-08 12:15:00'),
  (19, 7, 15, 'Confidential', 'uploads/calder_warn_analysis.pdf', '2026-04-02 10:05:00'),
  (20, 7, 7, 'Confidential', 'uploads/calder_employee_notice_pack.docx', '2026-04-03 11:10:00'),
  (21, 7, 9, 'Confidential', 'uploads/calder_facility_closure_budget.xlsx', '2026-04-04 14:20:00'),
  (22, 8, 6, 'Confidential', 'uploads/hudson_trust_structure_chart.pdf', '2026-01-20 09:35:00'),
  (23, 8, 7, 'Confidential', 'uploads/hudson_tax_allocation_notes.docx', '2026-01-28 15:15:00'),
  (24, 8, 6, 'Confidential', 'uploads/hudson_family_meeting_summary.txt', '2026-02-10 16:45:00'),
  (25, 9, 9, 'Confidential', 'uploads/liberty_class_action_plan.pdf', '2026-04-08 10:18:00'),
  (26, 9, 5, 'Confidential', 'uploads/liberty_rate_data_extract.xlsx', '2026-04-08 13:10:00'),
  (27, 9, 16, 'Confidential', 'uploads/liberty_class_cert_outline.docx', '2026-04-08 17:20:00'),
  (28, 10, 15, 'Internal', 'uploads/blue_compensation_review_memo.pdf', '2026-04-05 10:22:00'),
  (29, 10, 13, 'Internal', 'uploads/blue_committee_minutes_index.xlsx', '2026-04-06 09:10:00'),
  (30, 10, 15, 'Internal', 'uploads/blue_whistleblower_timeline.docx', '2026-04-07 15:45:00'),
  (31, 11, 6, 'Internal', 'uploads/vale_financing_closeout_checklist.docx', '2026-02-12 11:05:00'),
  (32, 11, 6, 'Internal', 'uploads/vale_covenant_matrix.xlsx', '2026-02-16 13:35:00'),
  (33, 11, 14, 'Internal', 'uploads/vale_lender_notice_log.pdf', '2026-02-24 17:20:00'),
  (34, 12, 5, 'Highly Confidential', 'uploads/sterling_royalty_claim_chart.docx', '2026-04-08 17:52:00'),
  (35, 12, 7, 'Highly Confidential', 'uploads/sterling_lab_notebook_index.pdf', '2026-04-09 09:18:00'),
  (36, 12, 5, 'Highly Confidential', 'uploads/sterling_settlement_options.xlsx', '2026-04-09 16:40:00'),
  (37, 13, 7, 'Confidential', 'uploads/hamilton_lease_damage_grid.xlsx', '2026-04-09 09:44:00'),
  (38, 13, 16, 'Confidential', 'uploads/hamilton_operator_default_notice.docx', '2026-04-09 14:10:00'),
  (39, 13, 9, 'Confidential', 'uploads/hamilton_insurance_gap_report.pdf', '2026-04-10 11:15:00'),
  (40, 14, 13, 'Internal', 'uploads/blackwell_board_governance_matrix.pdf', '2026-04-09 16:28:00'),
  (41, 14, 6, 'Internal', 'uploads/blackwell_committee_charter_redline.docx', '2026-04-10 09:40:00'),
  (42, 14, 13, 'Internal', 'uploads/blackwell_investor_qna_notes.txt', '2026-04-10 18:05:00'),
  (43, 15, 5, 'Highly Confidential', 'uploads/redwood_supply_breach_complaint.docx', '2026-04-10 10:15:00'),
  (44, 15, 7, 'Highly Confidential', 'uploads/redwood_deviation_log.xlsx', '2026-04-10 13:20:00'),
  (45, 15, 13, 'Highly Confidential', 'uploads/redwood_cover_cost_summary.pdf', '2026-04-10 17:35:00'),
  (46, 16, 17, 'Highly Confidential', 'uploads/ironclad_defense_interview_outline.docx', '2026-04-02 09:55:00'),
  (47, 16, 16, 'Highly Confidential', 'uploads/ironclad_manifest_discrepancies.xlsx', '2026-04-03 12:25:00'),
  (48, 16, 8, 'Highly Confidential', 'uploads/ironclad_device_collection_report.pdf', '2026-04-04 18:05:00'),
  (49, 17, 6, 'Confidential', 'uploads/oakwell_medical_timeline.pdf', '2026-04-10 08:45:00'),
  (50, 17, 9, 'Confidential', 'uploads/oakwell_estate_accounting.xlsx', '2026-04-10 14:05:00'),
  (51, 17, 7, 'Confidential', 'uploads/oakwell_affidavit_digest.docx', '2026-04-11 10:40:00'),
  (52, 18, 15, 'Confidential', 'uploads/meridian_sponsorship_termination_notice.pdf', '2026-04-10 11:55:00'),
  (53, 18, 17, 'Confidential', 'uploads/meridian_morality_clause_markup.docx', '2026-04-10 16:25:00'),
  (54, 18, 13, 'Confidential', 'uploads/meridian_media_response_grid.xlsx', '2026-04-11 09:05:00');

INSERT INTO Document_Version (
  document_id,
  version_number,
  modified_by,
  modified_at,
  change_notes
) VALUES
  (1, 2, 5, '2026-04-01 13:40:00', 'Updated market concentration narrative for board review.'),
  (4, 2, 3, '2026-04-03 19:10:00', 'Partner revisions for emergency proxy briefing.'),
  (7, 2, 16, '2026-04-04 18:35:00', 'Added final witness sequence and hearing prep notes.'),
  (10, 2, 14, '2026-04-05 12:50:00', 'Expanded sanctions control timeline and open questions.'),
  (15, 2, 6, '2026-04-07 09:15:00', 'Added red flag scoring and indemnity references.'),
  (18, 2, 17, '2026-04-08 15:05:00', 'Inserted notification dependencies for regulator outreach.'),
  (25, 2, 10, '2026-04-08 18:25:00', 'Updated class certification themes after data review.'),
  (34, 2, 11, '2026-04-09 18:05:00', 'Added damages ranges and licensing audit notes.'),
  (40, 3, 18, '2026-04-10 11:05:00', 'Second board review round on committee authority.'),
  (45, 2, 11, '2026-04-10 18:05:00', 'Refined replacement-cost model and cover assumptions.'),
  (49, 2, 12, '2026-04-10 16:15:00', 'Inserted hospice timeline references and medical source cites.'),
  (53, 2, 10, '2026-04-11 08:35:00', 'Partner markup on sponsor notice and clawback fallback terms.');

-- BILLING
INSERT INTO Billing (bill_id, case_id, generated_by, approved_by, amount, status) VALUES
  (1, 1, 5, 2, 26400.00, 'Pending'),
  (2, 2, 5, 3, 31800.00, 'Approved'),
  (3, 3, 16, 10, 22150.00, 'Pending'),
  (4, 4, 17, 14, 28700.00, 'Approved'),
  (5, 5, 6, 2, 35600.00, 'Pending'),
  (6, 6, 17, 11, 40850.00, 'Pending'),
  (7, 7, 15, 18, 14950.00, 'Approved'),
  (8, 8, 6, 12, 19500.00, 'Approved'),
  (9, 9, 16, 10, 27225.00, 'Pending'),
  (10, 10, 15, 3, 16875.00, 'Pending'),
  (11, 11, 6, 14, 21400.00, 'Approved'),
  (12, 12, 5, 11, 33350.00, 'Pending'),
  (13, 13, 16, 2, 18240.00, 'Pending'),
  (14, 14, 6, 18, 12980.00, 'Pending'),
  (15, 15, 5, 11, 24750.00, 'Pending'),
  (16, 16, 17, 2, 45200.00, 'Approved'),
  (17, 17, 6, 12, 17640.00, 'Pending'),
  (18, 18, 15, 10, 28910.00, 'Pending');

-- TIME LOGS
INSERT INTO Time_Log (log_id, employee_id, case_id, hours, work_description, approved_by) VALUES
  (1, 5, 1, 6.50, 'Prepared antitrust issue map for Liberty Rail board review.', 2),
  (2, 7, 1, 3.20, 'Built hearing binders and disclosure index.', 5),
  (3, 6, 2, 5.75, 'Drafted proxy defense chronology and research memo.', 3),
  (4, 16, 3, 4.80, 'Prepared witness prep outline for arbitration hearing.', 10),
  (5, 17, 4, 7.10, 'Reviewed sanctions touchpoints and regulator questions.', 14),
  (6, 6, 5, 8.25, 'Ran diligence tracker for acquisition workstream.', 2),
  (7, 8, 6, 4.40, 'Coordinated secure bridge and credential resets.', 4),
  (8, 15, 7, 5.10, 'Drafted workforce closure advisory summary.', 18),
  (9, 6, 8, 3.75, 'Updated family office structure chart.', 12),
  (10, 16, 9, 6.00, 'Prepared class certification response sections.', 10),
  (11, 15, 10, 4.25, 'Reviewed compensation policy amendments.', 3),
  (12, 6, 11, 5.60, 'Drafted financing package closeout checklist.', 14),
  (13, 5, 12, 7.80, 'Mapped licensing dispute damages themes.', 11),
  (14, 16, 13, 4.35, 'Updated lease default damages model.', 2),
  (15, 6, 14, 3.95, 'Prepared governance charter comparison table.', 18),
  (16, 5, 15, 6.85, 'Reviewed manufacturing deviations against supply milestones.', 11),
  (17, 17, 16, 8.10, 'Prepared interview sequence and defense memo for cargo diversion allegations.', 2),
  (18, 16, 16, 5.25, 'Built customs-manifest discrepancy tracker for defense review.', 2),
  (19, 6, 17, 4.95, 'Compiled estate accounting irregularities and witness summaries.', 12),
  (20, 15, 18, 5.70, 'Redlined sponsor exit provisions and clawback options.', 10);

-- CLIENT INTERACTIONS
INSERT INTO Client_Interaction (
  interaction_id,
  client_id,
  employee_id,
  interaction_type,
  notes,
  datetime
) VALUES
  (1, 1, 2, 'Call', 'Reviewed board concerns around market concentration and timing.', '2026-04-01 11:00:00'),
  (2, 2, 3, 'Meeting', 'Walked the client team through proxy defense milestones.', '2026-04-02 14:20:00'),
  (3, 3, 10, 'Call', 'Confirmed arbitration hearing prep calendar.', '2026-04-03 09:45:00'),
  (4, 4, 14, 'Email', 'Sent regulator question tracker and escalation path.', '2026-04-03 17:10:00'),
  (5, 5, 2, 'Meeting', 'Aligned diligence scope with the buyer legal team.', '2026-04-04 13:30:00'),
  (6, 6, 11, 'Call', 'Reviewed incident communication protocol and board notice timing.', '2026-04-05 10:05:00'),
  (7, 7, 18, 'Email', 'Shared first draft of closure advisory checklist.', '2026-04-06 15:40:00'),
  (8, 8, 12, 'Meeting', 'Discussed closeout of succession structure engagement.', '2026-02-11 09:15:00'),
  (9, 9, 2, 'Call', 'Confirmed lease claim damage assumptions with finance lead.', '2026-04-08 16:25:00'),
  (10, 10, 18, 'Meeting', 'Reviewed governance reset sequencing with founder group.', '2026-04-09 12:50:00'),
  (11, 11, 11, 'Call', 'Discussed supply replacement options and litigation hold scope.', '2026-04-10 09:30:00'),
  (12, 12, 2, 'Meeting', 'Prepared executive team for criminal-defense coordination and press silence.', '2026-04-07 18:10:00'),
  (13, 13, 12, 'Call', 'Reviewed probate mediation posture and caregiver witness list.', '2026-04-10 17:05:00'),
  (14, 14, 10, 'Email', 'Shared first sponsor settlement range and media coordination grid.', '2026-04-11 08:20:00');

-- TICKETS
INSERT INTO Ticket (
  ticket_id,
  raised_by,
  description,
  priority,
  status,
  assigned_to,
  created_at,
  resolved_at,
  resolution_deadline,
  breach_flag
) VALUES
  (1, 2, 'Provision guest wifi and locked display routing for the Liberty Rail war room.', 'High', 'In Progress', 8, '2026-04-06 08:20:00', NULL, '2026-04-11 18:00:00', FALSE),
  (2, 7, 'Restore archive access to the Blue Ridge hearing binder for overnight revisions.', 'Medium', 'Open', 13, '2026-04-06 10:05:00', NULL, '2026-04-14 17:00:00', FALSE),
  (3, 4, 'Prepare boardroom print run and room controls for a Sterling diligence review.', 'Medium', 'Resolved', 8, '2026-04-02 12:30:00', '2026-04-02 15:10:00', '2026-04-03 10:00:00', FALSE),
  (4, 11, 'Renew trial travel certificate for remote testimony setup before next week.', 'High', 'Resolved', 8, '2026-03-28 09:15:00', '2026-03-31 19:20:00', '2026-03-30 18:00:00', TRUE),
  (5, 6, 'Create a secure document room for the Sterling acquisition diligence stream.', 'High', 'Open', 8, '2026-04-07 09:00:00', NULL, '2026-04-12 17:00:00', FALSE),
  (6, 1, 'Audit matter permissions after partner staffing changes across active litigations.', 'High', 'In Progress', 13, '2026-04-08 07:45:00', NULL, '2026-04-15 18:00:00', FALSE),
  (7, 5, 'Scanner on the litigation floor is dropping OCR on exhibit packets.', 'Low', 'Resolved', 8, '2026-04-04 11:40:00', '2026-04-04 13:15:00', '2026-04-07 17:00:00', FALSE),
  (8, 15, 'Need outside counsel portal invites for the Blackwell governance room.', 'Medium', 'Open', 8, '2026-04-08 15:55:00', NULL, '2026-04-16 17:00:00', FALSE),
  (9, 9, 'Conference room audio is drifting during witness prep recordings.', 'Medium', 'Open', 8, '2026-04-09 08:05:00', NULL, '2026-04-13 12:00:00', FALSE),
  (10, 7, 'Recover archived filings from the Hudson estate binder for client closeout.', 'Low', 'Resolved', 13, '2026-04-01 09:25:00', '2026-04-01 14:40:00', '2026-04-02 17:00:00', FALSE);

INSERT INTO Ticket_Logs (log_id, ticket_id, updated_by, update_note, timestamp) VALUES
  (1, 1, 8, 'Display routes reserved; network lock still pending security approval.', '2026-04-06 14:05:00'),
  (2, 2, 13, 'Archive permissions queued for records review.', '2026-04-06 12:12:00'),
  (3, 3, 8, 'Room presets restored and board materials confirmed.', '2026-04-02 15:05:00'),
  (4, 4, 8, 'Vendor certificate update landed after the requested deadline.', '2026-03-31 19:25:00'),
  (5, 6, 13, 'Cross matter access list exported for executive signoff.', '2026-04-08 16:50:00'),
  (6, 9, 8, 'Testing ceiling microphone array and capture profile.', '2026-04-09 10:18:00');

INSERT INTO IT_System_Log (log_id, employee_id, action_type, affected_table, timestamp, ip_address) VALUES
  (1, 8, 'ROOM_PROVISIONING', 'Ticket', '2026-04-06 14:01:00', '10.20.4.12'),
  (2, 8, 'SECURE_FOLDER_CREATED', 'Document', '2026-04-07 09:22:00', '10.20.4.12'),
  (3, 13, 'ACCESS_AUDIT_EXPORT', 'Access_Control', '2026-04-08 16:43:00', '10.20.7.11'),
  (4, 8, 'AUDIO_PROFILE_RESET', 'Ticket', '2026-04-09 10:15:00', '10.20.4.12');

INSERT INTO Access_Control (access_id, employee_id, resource_type, resource_id, access_type) VALUES
  (1, 2, 'Case', 1, 'Lead'),
  (2, 5, 'Case', 1, 'Edit'),
  (3, 7, 'Document', 1, 'Upload'),
  (4, 8, 'System', 1, 'Admin'),
  (5, 13, 'Case', 6, 'Records'),
  (6, 14, 'Case', 4, 'Lead'),
  (7, 17, 'Case', 4, 'Regulatory Review'),
  (8, 10, 'Case', 9, 'Lead'),
  (9, 16, 'Case', 9, 'Edit'),
  (10, 11, 'Case', 12, 'Lead'),
  (11, 5, 'Document', 8, 'Edit'),
  (12, 18, 'Case', 14, 'Lead'),
  (13, 6, 'Case', 14, 'Edit'),
  (14, 9, 'Document', 7, 'Manage'),
  (15, 13, 'System', 2, 'Audit'),
  (16, 11, 'Case', 15, 'Lead'),
  (17, 2, 'Case', 16, 'Lead'),
  (18, 12, 'Case', 17, 'Lead'),
  (19, 10, 'Case', 18, 'Lead');

INSERT INTO Conflict_Check (conflict_id, employee_id, client_id, restriction_reason) VALUES
  (1, 18, 7, 'Prior representation on a historic supplier dispute.'),
  (2, 17, 1, 'Government contact sensitivity requires screening.');

INSERT INTO Audit_Log (audit_id, user_id, action, table_name, record_id, old_value, new_value, timestamp) VALUES
  (1, 4, 'UPDATE', 'Access_Control', 15, 'Pending review', 'Audit rights granted', '2026-04-08 16:44:00'),
  (2, 1, 'UPDATE', 'Cases', 9, 'Drafting', 'Hearing Scheduled', '2026-04-05 09:26:00');

-- ENTERPRISE HIERARCHY AND ACCESS SEEDING
UPDATE Employee e
INNER JOIN Role r ON r.role_id = e.role_id
INNER JOIN Hierarchy_Level h ON h.title = r.role_name
SET e.hierarchy_id = h.hierarchy_id;

UPDATE Employee e
SET e.clearance_id = CASE
  WHEN e.employee_id IN (1, 2, 3, 4, 10, 11, 12, 14, 18, 19) THEN 5
  WHEN e.employee_id IN (5, 8, 13, 17) THEN 4
  WHEN e.employee_id IN (6, 7, 9, 16) THEN 3
  ELSE 2
END;

UPDATE Document
SET clearance_id = CASE
  WHEN confidentiality_level = 'Highly Confidential' THEN 4
  WHEN confidentiality_level = 'Confidential' THEN 3
  WHEN confidentiality_level = 'Internal' THEN 2
  ELSE 1
END;

CALL sp_sync_case_access();

INSERT INTO Access_Request (
  request_id, requester_id, resource_type, resource_id, requested_permission,
  reason, status, approved_by, approved_at, created_at
) VALUES
  (1, 6, 'Case', 2, 'VIEW_DOCUMENT', 'Mike needs the Blue Ridge binder for emergency motion drafting.', 'Approved', 2, '2026-04-09 13:15:00', '2026-04-09 12:40:00'),
  (2, 20, 'Case', 1, 'VIEW_CASE', 'Jenny requested shadow access for training on antitrust matter intake.', 'Pending', NULL, NULL, '2026-04-10 09:20:00'),
  (3, 7, 'Case', 12, 'UPLOAD_DOCUMENT', 'Rachel requested upload access for licensing exhibits.', 'Pending', NULL, NULL, '2026-04-10 10:05:00');

INSERT INTO Delegated_Access (
  delegation_id, from_employee, to_employee, permission_id, valid_from, valid_to, status
) VALUES
  (1, 1, 4, 13, '2026-04-10 08:00:00', '2026-04-12 18:00:00', 'Active'),
  (2, 2, 5, 3, '2026-04-09 09:00:00', '2026-04-15 18:00:00', 'Active');

INSERT INTO Access_Violation_Log (
  violation_id, employee_id, attempted_resource_type, attempted_resource_id,
  attempted_action, reason, severity, timestamp, ip_address
) VALUES
  (1, 20, 'Document', 11, 'VIEW_DOCUMENT', 'Intern clearance is below Restricted document clearance.', 'HIGH', '2026-04-10 09:35:00', '10.20.9.21'),
  (2, 7, 'Billing', 5, 'APPROVE_BILLING', 'Paralegal hierarchy does not include billing approval.', 'MEDIUM', '2026-04-10 11:25:00', '10.20.6.18'),
  (3, 6, 'Case', 4, 'OVERRIDE_ACCESS', 'Associate attempted override access without permission.', 'CRITICAL', '2026-04-10 12:10:00', '10.20.3.44');

-- SYSTEMS OVERSIGHT DEMO DATA
-- These rows keep the systems view populated immediately after initialization.
-- They are synthetic operational traces for continuity review, not live user actions.
INSERT INTO System_Checkpoint (checkpoint_id, checkpoint_name, notes, created_at) VALUES
  (1, 'Morning continuity snapshot', 'Baseline before billing approvals | total_cases=18; total_documents=48; protected_records=2; open_tickets=6', '2026-04-10 08:30:00'),
  (2, 'Pre-hearing operations snapshot', 'Captured active matters before hearing calendar updates | total_cases=18; total_documents=48; protected_records=2; open_tickets=6', '2026-04-10 16:45:00');

INSERT INTO Lock_Log (lock_id, table_name, record_id, locked_by, lock_reason, locked_at, released_at, status) VALUES
  (1, 'Cases', 2, 3, 'Partner reviewing proxy defense staffing before assignment changes.', '2026-04-10 09:15:00', NULL, 'Active'),
  (2, 'Document_Version', 7, 13, 'Records team validating exhibit packet version history.', '2026-04-10 10:40:00', NULL, 'Active'),
  (3, 'Billing', 5, 2, 'Billing approval transaction completed during demo seed.', '2026-04-09 17:10:00', '2026-04-09 17:12:00', 'Released');

INSERT INTO Transaction_Log (
  txn_id,
  txn_type,
  table_name,
  record_id,
  old_value,
  new_value,
  action,
  status,
  error_message,
  created_at
) VALUES
  (
    1,
    'CASE_REASSIGNMENT',
    'Cases',
    4,
    JSON_OBJECT('status', 'Drafting', 'lead_partner_id', 14, 'lead_senior_id', 17),
    JSON_OBJECT('status', 'Drafting', 'lead_partner_id', 99, 'lead_senior_id', 17),
    'UPDATE',
    'Failed',
    'Foreign key validation failed while assigning a non-existent partner.',
    '2026-04-10 11:05:00'
  ),
  (
    2,
    'BILLING_APPROVAL',
    'Billing',
    5,
    JSON_OBJECT('amount', 35600.00, 'status', 'Pending', 'approved_by', NULL),
    JSON_OBJECT('amount', 35600.00, 'status', 'Approved', 'approved_by', 7),
    'UPDATE',
    'Failed',
    'Only Partner-level staff can approve billing.',
    '2026-04-10 11:22:00'
  ),
  (
    3,
    'DOCUMENT_VERSION_UPDATE',
    'Document_Version',
    12,
    JSON_OBJECT('version_number', 1, 'change_notes', 'Initial version created from document trigger.'),
    JSON_OBJECT('version_number', 2, 'change_notes', 'Recovered after duplicate exhibit notes were detected.'),
    'UPDATE',
    'Recovered',
    NULL,
    '2026-04-10 12:05:00'
  ),
  (
    4,
    'CHECKPOINT',
    'System_Checkpoint',
    2,
    NULL,
    JSON_OBJECT('summary', 'Pre-hearing operations snapshot created for systems review.'),
    'CREATE',
    'Success',
    NULL,
    '2026-04-10 16:45:00'
  );


