USE lawfirm;

DELIMITER $$
DROP PROCEDURE IF EXISTS lab_05_cursor_reports $$
CREATE PROCEDURE lab_05_cursor_reports()
BEGIN
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE v_case_id INT;
  DECLARE v_case_code VARCHAR(50);
  DECLARE v_title VARCHAR(200);
  DECLARE v_rowcount INT DEFAULT 0;

  DECLARE active_case_cursor CURSOR FOR
    SELECT case_id, case_code, title FROM Cases WHERE status <> 'Closed' ORDER BY case_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  DELETE FROM Case_Report;
  OPEN active_case_cursor;
  SELECT 'cursor%ISOPEN equivalent' AS concept, 'active_case_cursor opened' AS output;

  read_loop: LOOP
    FETCH active_case_cursor INTO v_case_id, v_case_code, v_title;
    IF done THEN
      SELECT 'cursor%NOTFOUND equivalent' AS concept, v_rowcount AS cursor_rowcount;
      LEAVE read_loop;
    END IF;

    SET v_rowcount = v_rowcount + 1;
    INSERT INTO Case_Report(case_id, summary, total_billing, total_hours, document_count)
    SELECT v_case_id,
           CONCAT(v_case_code, ' | ', v_title),
           fn_total_case_billing(v_case_id),
           fn_total_case_hours(v_case_id),
           COUNT(*)
    FROM Document
    WHERE case_id = v_case_id;
  END LOOP;

  CLOSE active_case_cursor;

  SELECT 'cursor results' AS section, report_id, case_id, summary, total_billing, total_hours
  FROM Case_Report
  ORDER BY report_id
  LIMIT 10;

  SELECT 'cursor FOR LOOP source' AS section, employee_id, name
  FROM Employee
  ORDER BY employee_id
  LIMIT 10;

  SELECT 'billing cursor source' AS section, bill_id, case_id, amount, status
  FROM Billing
  ORDER BY bill_id
  LIMIT 10;

  SELECT 'violation cursor source' AS section, violation_id, attempted_action, severity
  FROM Access_Violation_Log
  ORDER BY violation_id;
END $$
DELIMITER ;

CALL lab_05_cursor_reports();
