USE lawfirm;
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

