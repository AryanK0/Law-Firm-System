USE lawfirm;

-- Production procedures already exist in backend/sql/procedures.sql and access_control.sql.
-- This lab invokes them and shows IN, OUT, and INOUT styles with compact examples.

DELIMITER $$
DROP PROCEDURE IF EXISTS lab_raise_ticket $$
DROP PROCEDURE IF EXISTS lab_permission_echo $$

CREATE PROCEDURE lab_raise_ticket(
  IN emp_id INT,
  IN issue_text TEXT,
  OUT created_ticket_id INT
)
BEGIN
  DECLARE created_row JSON;
  CALL raise_ticket(emp_id, issue_text, 'Medium', 'Open', emp_id, DATE_ADD(NOW(), INTERVAL 2 DAY));
  SELECT MAX(ticket_id) INTO created_ticket_id FROM Ticket WHERE raised_by = emp_id;
  SELECT created_ticket_id AS ticket_id, 'Ticket raised through stored procedure' AS status;
END $$

CREATE PROCEDURE lab_permission_echo(INOUT permission_name VARCHAR(100))
BEGIN
  IF permission_name IS NULL OR permission_name = '' THEN
    SET permission_name = 'VIEW_CASE';
  END IF;
  SELECT permission_name AS normalized_permission;
END $$
DELIMITER ;

-- Core project procedures to demonstrate:
-- create_case_full, assign_employee_case, approve_billing, raise_ticket,
-- resolve_ticket_workflow, sp_delegate_access, sp_request_access,
-- sp_create_checkpoint, sp_restore_checkpoint, sp_generate_case_report,
-- sp_generate_employee_workload_report.
