USE data railway;

SELECT 'HIERARCHY LEVELS' AS section;
SELECT hierarchy_id, title, rank_no, can_assign_case, can_approve_billing,
       can_override_access, can_create_checkpoint, can_run_recovery, can_view_lock_log
FROM Hierarchy_Level
ORDER BY rank_no DESC;

SELECT 'PERMISSIONS' AS section;
SELECT permission_id, permission_name, description
FROM Permission
ORDER BY permission_id;

SELECT 'ROLE PERMISSION MATRIX' AS section;
SELECT h.title, p.permission_name, rp.allowed
FROM Role_Permission rp
INNER JOIN Hierarchy_Level h ON h.hierarchy_id = rp.hierarchy_id
INNER JOIN Permission p ON p.permission_id = rp.permission_id
ORDER BY h.rank_no DESC, p.permission_name;

SELECT 'CASE ACCESS' AS section;
SELECT ca.case_access_id, c.case_code, c.title, e.name AS employee_name, ca.case_role,
       ca.can_view, ca.can_edit, ca.can_upload_docs, ca.can_approve_docs,
       ca.can_close_case, ca.can_assign_members, granter.name AS granted_by_name
FROM Case_Access ca
INNER JOIN Cases c ON c.case_id = ca.case_id
INNER JOIN Employee e ON e.employee_id = ca.employee_id
LEFT JOIN Employee granter ON granter.employee_id = ca.granted_by
ORDER BY ca.case_access_id;

SELECT 'SECURITY CLEARANCE' AS section;
SELECT clearance_id, level_name, numeric_rank, description
FROM Security_Clearance
ORDER BY numeric_rank DESC;

SELECT 'ACCESS VIOLATIONS' AS section;
SELECT av.violation_id, e.name AS employee_name, av.attempted_resource_type,
       av.attempted_resource_id, av.attempted_action, av.reason, av.severity,
       av.timestamp, av.ip_address
FROM Access_Violation_Log av
LEFT JOIN Employee e ON e.employee_id = av.employee_id
ORDER BY av.timestamp DESC;

SELECT 'DELEGATED ACCESS' AS section;
SELECT da.delegation_id, source.name AS from_employee, target.name AS to_employee,
       p.permission_name, da.valid_from, da.valid_to, da.status
FROM Delegated_Access da
INNER JOIN Employee source ON source.employee_id = da.from_employee
INNER JOIN Employee target ON target.employee_id = da.to_employee
INNER JOIN Permission p ON p.permission_id = da.permission_id
ORDER BY da.valid_to DESC;

SELECT 'ACCESS REQUESTS' AS section;
SELECT ar.request_id, requester.name AS requester, ar.resource_type, ar.resource_id,
       ar.requested_permission, ar.reason, ar.status, approver.name AS approved_by,
       ar.approved_at, ar.created_at
FROM Access_Request ar
INNER JOIN Employee requester ON requester.employee_id = ar.requester_id
LEFT JOIN Employee approver ON approver.employee_id = ar.approved_by
ORDER BY ar.created_at DESC;
