USE lawfirm;

DELIMITER $$
DROP PROCEDURE IF EXISTS lab_02_control_structures $$
CREATE PROCEDURE lab_02_control_structures()
BEGIN
  DECLARE v_case_id INT DEFAULT 1;
  DECLARE v_hours DECIMAL(10,2);
  DECLARE v_open_tickets INT;
  DECLARE v_counter INT DEFAULT 0;

  SELECT fn_total_case_hours(v_case_id) INTO v_hours;
  SELECT COUNT(*) INTO v_open_tickets FROM Ticket WHERE status <> 'Resolved';

  IF v_hours > 20 THEN
    SELECT 'IF' AS example_name, 'Heavy matter' AS result;
  ELSE
    SELECT 'IF ELSE' AS example_name, 'Normal matter' AS result;
  END IF;

  IF v_open_tickets >= 10 THEN
    SELECT 'ELSIF' AS example_name, 'Critical support queue' AS result;
  ELSEIF v_open_tickets >= 5 THEN
    SELECT 'ELSIF' AS example_name, 'Watch support queue' AS result;
  ELSE
    SELECT 'ELSIF' AS example_name, 'Stable support queue' AS result;
  END IF;

  SELECT 'CASE' AS example_name,
    CASE (SELECT priority FROM Ticket ORDER BY ticket_id LIMIT 1)
      WHEN 'Critical' THEN 'Route to IT Admin'
      WHEN 'High' THEN 'Route to Partner'
      ELSE 'Normal queue'
    END AS routing;

  simple_loop: LOOP
    SET v_counter = v_counter + 1;
    SELECT 'LOOP EXIT WHEN' AS example_name, v_counter AS iteration;
    IF v_counter >= 3 THEN
      LEAVE simple_loop;
    END IF;
  END LOOP;

  SET v_counter = 0;
  WHILE v_counter < 3 DO
    SET v_counter = v_counter + 1;
    SELECT 'WHILE LOOP' AS example_name, v_counter AS iteration;
  END WHILE;

  SELECT 'FOR LOOP equivalent' AS example_name, case_code, title
  FROM Cases
  ORDER BY case_id
  LIMIT 5;

  SELECT 'pending ticket loop source' AS example_name, ticket_id, priority, status
  FROM Ticket
  WHERE status <> 'Resolved'
  ORDER BY ticket_id
  LIMIT 5;
END $$
DELIMITER ;

CALL lab_02_control_structures();
