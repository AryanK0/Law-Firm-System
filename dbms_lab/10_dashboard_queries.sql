USE lawfirm;

SELECT 'EMPLOYEES' AS section;
SELECT employee_id, name, role_name, access_level, supervisor_name FROM vw_employee_directory;

SELECT 'CASES' AS section;
SELECT case_id, case_code, title, status, client_name, lead_partner_name FROM vw_case_overview;

SELECT 'CASE ACCESS' AS section;
SELECT ca.case_id, c.case_code, e.name, ca.case_role, ca.can_view, ca.can_edit, ca.can_upload_docs
FROM Case_Access ca INNER JOIN Cases c ON c.case_id = ca.case_id INNER JOIN Employee e ON e.employee_id = ca.employee_id;

SELECT 'DOCUMENTS' AS section;
SELECT document_id, case_code, file_name, confidentiality_level, clearance_level FROM vw_document_register;

SELECT 'BILLING' AS section;
SELECT bill_id, case_code, amount, status, generated_by_name, approved_by_name FROM vw_billing_register;

SELECT 'TRANSACTIONS' AS section;
SELECT txn_id, txn_type, table_name, action, status FROM Transaction_Log;

SELECT 'LOCKS' AS section;
SELECT lock_id, table_name, record_id, locked_by_name, status FROM vw_active_locks;

SELECT 'REPORTS' AS section;
SELECT report_id, case_id, summary, total_billing, total_hours FROM Case_Report;

SELECT 'VIOLATIONS' AS section;
SELECT violation_id, attempted_resource_type, attempted_action, severity, reason FROM Access_Violation_Log;

SELECT 'DELEGATIONS' AS section;
SELECT delegation_id, from_employee, to_employee, permission_id, status FROM Delegated_Access;

SELECT 'REQUESTS' AS section;
SELECT request_id, requester_id, resource_type, resource_id, requested_permission, status FROM Access_Request;

SELECT 'CHECKPOINTS' AS section;
SELECT checkpoint_id, checkpoint_name, notes, created_at FROM System_Checkpoint;
