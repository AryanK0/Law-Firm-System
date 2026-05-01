USE lawfirm;

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
