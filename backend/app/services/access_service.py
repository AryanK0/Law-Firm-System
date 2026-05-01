from datetime import date, datetime
from decimal import Decimal

from ..db import call_procedure_one, execute, fetch_all, fetch_one


def _json_ready(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _rows(rows):
    return [{key: _json_ready(value) for key, value in row.items()} for row in rows]


def _row(row):
    if not row:
        return None
    return {key: _json_ready(value) for key, value in row.items()}


def _bit(value: bool):
    return 1 if value else 0


def _case_access_row(case_id: int, employee_id: int):
    return _row(
        fetch_one(
            """
            SELECT ca.*, c.case_code, c.title, e.name AS employee_name, granter.name AS granted_by_name
            FROM Case_Access ca
            INNER JOIN Cases c ON c.case_id = ca.case_id
            INNER JOIN Employee e ON e.employee_id = ca.employee_id
            LEFT JOIN Employee granter ON granter.employee_id = ca.granted_by
            WHERE ca.case_id = %s AND ca.employee_id = %s
            """,
            (case_id, employee_id),
        )
    )


def _require_managing_partner(employee_id: int):
    approver = fetch_one(
        """
        SELECT e.employee_id, e.name, h.title
        FROM Employee e
        INNER JOIN Hierarchy_Level h ON h.hierarchy_id = e.hierarchy_id
        WHERE e.employee_id = %s
          AND e.status = 'Active'
        """,
        (employee_id,),
    )

    if not approver or approver["title"] != "Managing Partner":
        raise PermissionError("Only the Managing Partner can change access grants.")

    return approver


def dashboard():
    return {
        "hierarchy": _rows(fetch_all("SELECT * FROM Hierarchy_Level ORDER BY rank_no DESC")),
        "permissions": _rows(fetch_all("SELECT * FROM Permission ORDER BY permission_id")),
        "matrix": _rows(
            fetch_all(
                """
                SELECT h.title, p.permission_name, rp.allowed
                FROM Role_Permission rp
                INNER JOIN Hierarchy_Level h ON h.hierarchy_id = rp.hierarchy_id
                INNER JOIN Permission p ON p.permission_id = rp.permission_id
                ORDER BY h.rank_no DESC, p.permission_name
                """
            )
        ),
        "case_access": _rows(
            fetch_all(
                """
                SELECT ca.*, c.case_code, c.title, e.name AS employee_name, granter.name AS granted_by_name
                FROM Case_Access ca
                INNER JOIN Cases c ON c.case_id = ca.case_id
                INNER JOIN Employee e ON e.employee_id = ca.employee_id
                LEFT JOIN Employee granter ON granter.employee_id = ca.granted_by
                ORDER BY ca.granted_at DESC, ca.case_access_id DESC
                LIMIT 80
                """
            )
        ),
        "clearances": _rows(fetch_all("SELECT * FROM Security_Clearance ORDER BY numeric_rank DESC")),
        "violations": list_violations(),
        "delegations": list_delegations(),
        "requests": list_requests(),
    }


def check_access(employee_id: int, resource_type: str, resource_id: int, action: str, ip_address: str | None):
    return _row(call_procedure_one("sp_check_access", (employee_id, resource_type, resource_id, action, ip_address)))


def request_access(employee_id: int, resource_type: str, resource_id: int, permission: str, reason: str | None):
    return _row(call_procedure_one("sp_request_access", (employee_id, resource_type, resource_id, permission, reason)))


def approve_request(request_id: int, approver_id: int):
    return _row(call_procedure_one("sp_approve_access_request", (request_id, approver_id)))


def delegate_access(from_employee: int, to_employee: int, permission: str, valid_to: str, valid_from: str | None):
    return _row(call_procedure_one("sp_delegate_access", (from_employee, to_employee, permission, valid_from, valid_to)))


def update_case_access(
    approver_id: int,
    employee_id: int,
    case_id: int,
    case_role: str | None,
    can_view: bool,
    can_edit: bool,
    can_upload_docs: bool,
    can_approve_docs: bool,
    can_close_case: bool,
    can_assign_members: bool,
):
    _require_managing_partner(approver_id)

    execute(
        """
        INSERT INTO Case_Access(
          case_id, employee_id, case_role, can_view, can_edit, can_upload_docs,
          can_approve_docs, can_close_case, can_assign_members, granted_by, granted_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
          case_role = VALUES(case_role),
          can_view = VALUES(can_view),
          can_edit = VALUES(can_edit),
          can_upload_docs = VALUES(can_upload_docs),
          can_approve_docs = VALUES(can_approve_docs),
          can_close_case = VALUES(can_close_case),
          can_assign_members = VALUES(can_assign_members),
          granted_by = VALUES(granted_by),
          granted_at = NOW()
        """,
        (
            case_id,
            employee_id,
            case_role or "Managed access",
            _bit(can_view),
            _bit(can_edit),
            _bit(can_upload_docs),
            _bit(can_approve_docs),
            _bit(can_close_case),
            _bit(can_assign_members),
            approver_id,
        ),
    )

    execute(
        """
        INSERT INTO Audit_Log(user_id, action, table_name, record_id, new_value, timestamp)
        VALUES (%s, 'UPDATE_ACCESS', 'Case_Access', %s, %s, NOW())
        """,
        (
            approver_id,
            case_id,
            (
                f"employee={employee_id}; role={case_role or 'Managed access'}; "
                f"view={_bit(can_view)}; edit={_bit(can_edit)}; "
                f"upload={_bit(can_upload_docs)}; approve_docs={_bit(can_approve_docs)}; "
                f"close_case={_bit(can_close_case)}; assign_members={_bit(can_assign_members)}"
            ),
        ),
    )

    return _case_access_row(case_id, employee_id)


def list_violations():
    return _rows(
        fetch_all(
            """
            SELECT av.*, e.name AS employee_name
            FROM Access_Violation_Log av
            LEFT JOIN Employee e ON e.employee_id = av.employee_id
            ORDER BY av.timestamp DESC, av.violation_id DESC
            LIMIT 80
            """
        )
    )


def list_delegations():
    return _rows(
        fetch_all(
            """
            SELECT da.*, p.permission_name, source.name AS from_employee_name, target.name AS to_employee_name
            FROM Delegated_Access da
            INNER JOIN Permission p ON p.permission_id = da.permission_id
            INNER JOIN Employee source ON source.employee_id = da.from_employee
            INNER JOIN Employee target ON target.employee_id = da.to_employee
            ORDER BY da.valid_to DESC, da.delegation_id DESC
            LIMIT 80
            """
        )
    )


def list_requests():
    return _rows(
        fetch_all(
            """
            SELECT ar.*, requester.name AS requester_name, approver.name AS approved_by_name
            FROM Access_Request ar
            INNER JOIN Employee requester ON requester.employee_id = ar.requester_id
            LEFT JOIN Employee approver ON approver.employee_id = ar.approved_by
            ORDER BY ar.created_at DESC, ar.request_id DESC
            LIMIT 80
            """
        )
    )
