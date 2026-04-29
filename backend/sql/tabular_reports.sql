USE lawfirm;

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
