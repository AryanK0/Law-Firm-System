USE railway;

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
