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
