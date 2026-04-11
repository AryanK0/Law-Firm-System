DELIMITER $$

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

DELIMITER ;

DELIMITER $$

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

DELIMITER ;

DELIMITER $$

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
    OLD.name,
    NEW.name,
    NOW()
  );
END $$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_billing_approval
BEFORE UPDATE ON Billing
FOR EACH ROW
BEGIN
  IF NEW.status = 'Approved' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM Employee e
      INNER JOIN Role r ON e.role_id = r.role_id
      WHERE e.employee_id = NEW.approved_by
        AND r.hierarchy_level <= 2
    ) THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only Partner or above can approve billing';
    END IF;
  END IF;
END $$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_ticket_sla
BEFORE UPDATE ON Ticket
FOR EACH ROW
BEGIN
  IF NEW.status = 'Resolved' AND NEW.resolved_at > NEW.resolution_deadline THEN
    SET NEW.breach_flag = TRUE;
  END IF;
END $$

DELIMITER ;
