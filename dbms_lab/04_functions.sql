USE lawfirm;

SELECT 'fn_total_case_billing' AS function_name, fn_total_case_billing(1) AS result;
SELECT 'fn_total_case_hours' AS function_name, fn_total_case_hours(1) AS result;
SELECT 'fn_employee_case_count' AS function_name, fn_employee_case_count(2) AS result;
SELECT 'fn_has_permission' AS function_name, fn_has_permission(2, 'APPROVE_BILLING') AS result;
SELECT 'fn_can_access_case' AS function_name, fn_can_access_case(6, 1, 'VIEW') AS result;
SELECT 'fn_can_view_document' AS function_name, fn_can_view_document(2, 1) AS result;
SELECT 'fn_ticket_sla_status' AS function_name, fn_ticket_sla_status(1) AS result;

DELIMITER $$
DROP FUNCTION IF EXISTS fn_case_risk_score $$
DROP FUNCTION IF EXISTS fn_employee_workload_score $$

CREATE FUNCTION fn_case_risk_score(caseid INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE score INT DEFAULT 0;
  SELECT COUNT(*) * 10 INTO score FROM Document WHERE case_id = caseid;
  SET score = score + LEAST(fn_total_case_hours(caseid), 50);
  RETURN score;
END $$

CREATE FUNCTION fn_employee_workload_score(emp INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE score INT DEFAULT 0;
  SELECT fn_employee_case_count(emp) * 10 INTO score;
  RETURN score;
END $$
DELIMITER ;

SELECT 'fn_case_risk_score' AS function_name, fn_case_risk_score(1) AS result;
SELECT 'fn_employee_workload_score' AS function_name, fn_employee_workload_score(2) AS result;
