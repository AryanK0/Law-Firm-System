USE railway;

-- --- From backend/sql/procedures.sql ---
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

-- --- From backend/sql/triggers.sql ---
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

-- --- From backend/sql/views_reports.sql ---
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

-- --- From backend/sql/tabular_reports.sql ---
SELECT 'EMPLOYEE DIRECTORY' AS report_section;
SELECT *
FROM vw_employee_directory
ORDER BY hierarchy_level, name;

SELECT 'ROLE ACCESS MATRIX' AS report_section;
SELECT *
FROM vw_role_access_matrix
ORDER BY hierarchy_level, role_name;

SELECT 'CLIENT PORTFOLIO' AS report_section;
SELECT
  client_id,
  client_name,
  matter_count,
  open_matter_count,
  billed_total,
  last_contact
FROM vw_client_portfolio
ORDER BY matter_count DESC, billed_total DESC, client_name;

SELECT 'CASE OVERVIEW' AS report_section;
SELECT
  case_id,
  COALESCE(case_code, CONCAT('Case #', case_id)) AS case_code,
  title,
  case_type,
  client_name,
  lead_partner_name,
  lead_senior_name,
  status,
  confidentiality_level,
  team_size,
  document_count,
  billed_total,
  total_hours,
  next_hearing_date,
  next_hearing_court_name
FROM vw_case_overview
ORDER BY case_id;

SELECT 'CASE TEAM ROSTER' AS report_section;
SELECT *
FROM vw_case_team_roster
ORDER BY case_id, hierarchy_level, name;

SELECT 'HEARING CALENDAR' AS report_section;
SELECT *
FROM vw_hearing_calendar
ORDER BY date, hearing_id;

SELECT 'DOCUMENT REGISTER' AS report_section;
SELECT
  document_id,
  case_id,
  case_code,
  case_title,
  confidentiality_level,
  file_name,
  uploaded_by_name,
  created_at,
  latest_version,
  version_count,
  last_modified_at
FROM vw_document_register
ORDER BY created_at DESC, document_id DESC;

SELECT 'BILLING REGISTER' AS report_section;
SELECT *
FROM vw_billing_register
ORDER BY
  CASE status
    WHEN 'Pending' THEN 1
    WHEN 'Approved' THEN 2
    ELSE 3
  END,
  amount DESC,
  bill_id DESC;

SELECT 'TIME LOG REGISTER' AS report_section;
SELECT
  tl.log_id,
  tl.case_id,
  COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
  e.name AS employee_name,
  tl.hours,
  tl.work_description,
  approver.name AS approved_by_name
FROM Time_Log tl
INNER JOIN Cases c ON tl.case_id = c.case_id
INNER JOIN Employee e ON tl.employee_id = e.employee_id
LEFT JOIN Employee approver ON tl.approved_by = approver.employee_id
ORDER BY tl.case_id, tl.log_id;

SELECT 'TICKET OVERVIEW' AS report_section;
SELECT *
FROM vw_ticket_overview
ORDER BY created_at DESC, ticket_id DESC;

SELECT 'TICKET LOGS' AS report_section;
SELECT
  tl.log_id,
  tl.ticket_id,
  updater.name AS updated_by_name,
  tl.update_note,
  tl.timestamp
FROM Ticket_Logs tl
LEFT JOIN Employee updater ON tl.updated_by = updater.employee_id
ORDER BY tl.timestamp DESC, tl.log_id DESC;

SELECT 'ACCESS CONTROL REGISTER' AS report_section;
SELECT
  ac.access_id,
  e.name AS employee_name,
  ac.resource_type,
  ac.resource_id,
  ac.access_type
FROM Access_Control ac
INNER JOIN Employee e ON ac.employee_id = e.employee_id
ORDER BY e.name, ac.resource_type, ac.resource_id;

SELECT 'CONFLICT REGISTER' AS report_section;
SELECT *
FROM vw_conflict_register
ORDER BY employee_name, client_name;

SELECT 'AUDIT TRAIL' AS report_section;
SELECT *
FROM vw_audit_trail
ORDER BY timestamp DESC, audit_id DESC;

SELECT 'IT SYSTEM LOGS' AS report_section;
SELECT
  isl.log_id,
  e.name AS employee_name,
  isl.action_type,
  isl.affected_table,
  isl.timestamp,
  isl.ip_address
FROM IT_System_Log isl
LEFT JOIN Employee e ON isl.employee_id = e.employee_id
ORDER BY isl.timestamp DESC, isl.log_id DESC;

SELECT 'CURSOR REPORT: CLIENT BILLING REPORT FOR CLIENT 1' AS report_section;
CALL generate_client_billing_report(1);

SELECT 'CURSOR REPORT: TICKET SLA REVIEW FOR NEXT 3 DAYS' AS report_section;
CALL generate_ticket_sla_review(3);

