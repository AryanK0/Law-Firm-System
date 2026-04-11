DELIMITER $$

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
    case_code_param,
    title_param,
    description_param,
    case_type_param,
    client_param,
    partner_id_param,
    senior_id_param,
    COALESCE(status_param, 'Open'),
    COALESCE(confidentiality_param, 'Internal'),
    created_by_param,
    start_date_param,
    end_date_param
  );

  SET new_case_id = LAST_INSERT_ID();

  INSERT INTO Case_Status_History(case_id, old_status, new_status, changed_by, timestamp)
  VALUES (new_case_id, NULL, COALESCE(status_param, 'Open'), created_by_param, NOW());

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

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE assign_employee_case(
  IN case_id_param INT,
  IN emp_id_param INT,
  IN role_param VARCHAR(50),
  IN assigned_by_param INT
)
BEGIN
  INSERT INTO Case_Team(case_id, employee_id, role_in_case, assigned_by)
  VALUES (case_id_param, emp_id_param, role_param, assigned_by_param);
END $$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE approve_billing(
  IN bill_id_param INT,
  IN approver_param INT
)
BEGIN
  UPDATE Billing
  SET status = 'Approved', approved_by = approver_param
  WHERE bill_id = bill_id_param;
END $$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE raise_ticket(
  IN emp_id_param INT,
  IN desc_param TEXT
)
BEGIN
  INSERT INTO Ticket(raised_by, description, status)
  VALUES (emp_id_param, desc_param, 'Open');
END $$

DELIMITER ;

DELIMITER $$

CREATE FUNCTION check_access(emp INT, caseid INT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
  DECLARE access_allowed BOOLEAN DEFAULT FALSE;

  SELECT (
    EXISTS (
      SELECT 1
      FROM Employee e
      INNER JOIN Role r ON e.role_id = r.role_id
      WHERE e.employee_id = emp
        AND r.hierarchy_level <= 2
    )
    OR EXISTS (
      SELECT 1
      FROM Case_Team ct
      WHERE ct.employee_id = emp
        AND ct.case_id = caseid
    )
  ) INTO access_allowed;

  RETURN access_allowed;
END $$

DELIMITER ;
