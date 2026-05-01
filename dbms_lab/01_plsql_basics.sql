-- PL/SQL-style basics mapped to the MySQL law-firm schema.
-- MySQL uses DECLARE only inside routines; SELECT statements show output.

USE lawfirm;

DELIMITER $$
DROP PROCEDURE IF EXISTS lab_01_plsql_basics $$
CREATE PROCEDURE lab_01_plsql_basics()
BEGIN
  DECLARE v_employee_id INT DEFAULT 2;
  DECLARE v_employee_name VARCHAR(100);
  DECLARE v_case_id INT DEFAULT 1;
  DECLARE v_case_title VARCHAR(200);
  DECLARE v_billing_amount DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_ticket_count INT DEFAULT 0;
  DECLARE v_today DATE DEFAULT CURRENT_DATE;
  DECLARE v_has_access BOOLEAN DEFAULT FALSE;
  DECLARE c_tax_rate DECIMAL(5,2) DEFAULT 0.18;
  DECLARE v_case_row_id INT;
  DECLARE v_case_row_code VARCHAR(50);
  DECLARE v_case_row_title VARCHAR(200);

  SELECT name INTO v_employee_name FROM Employee WHERE employee_id = v_employee_id;
  SELECT title INTO v_case_title FROM Cases WHERE case_id = v_case_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_billing_amount FROM Billing WHERE case_id = v_case_id;
  SELECT COUNT(*) INTO v_ticket_count FROM Ticket WHERE status <> 'Resolved';
  SELECT fn_can_access_case(v_employee_id, v_case_id, 'VIEW') INTO v_has_access;
  SELECT case_id, case_code, title INTO v_case_row_id, v_case_row_code, v_case_row_title FROM Cases WHERE case_id = v_case_id;

  SELECT '01 variable declaration' AS example_name, v_employee_id AS value;
  SELECT '02 varchar SELECT INTO' AS example_name, v_employee_name AS value;
  SELECT '03 date variable' AS example_name, v_today AS value;
  SELECT '04 boolean permission' AS example_name, v_has_access AS value;
  SELECT '05 constant use' AS example_name, c_tax_rate AS tax_rate;
  SELECT '06 arithmetic' AS example_name, v_billing_amount AS net, v_billing_amount * (1 + c_tax_rate) AS gross;
  SELECT '07 concatenation' AS example_name, CONCAT(v_employee_name, ' reviews ', v_case_title) AS message;
  SELECT '08 ticket count' AS example_name, v_ticket_count AS open_tickets;
  SELECT '09 TYPE equivalent' AS example_name, 'Use VARCHAR/DECIMAL matching source columns in MySQL.' AS note;
  SELECT '10 ROWTYPE equivalent' AS example_name, v_case_row_id AS case_id, v_case_row_code AS case_code, v_case_row_title AS title;
END $$
DELIMITER ;

CALL lab_01_plsql_basics();
