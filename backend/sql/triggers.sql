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
     AND NOT EXISTS (
       SELECT 1
       FROM Employee e
       INNER JOIN Role r ON e.role_id = r.role_id
       WHERE e.employee_id = NEW.approved_by
         AND r.hierarchy_level <= 3
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only senior associates or above can approve time logs.';
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
     AND NOT EXISTS (
       SELECT 1
       FROM Employee e
       INNER JOIN Role r ON e.role_id = r.role_id
       WHERE e.employee_id = NEW.approved_by
         AND r.hierarchy_level <= 3
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only senior associates or above can approve time logs.';
  END IF;
END $$

DELIMITER ;
