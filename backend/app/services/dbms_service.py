from datetime import date, datetime
from decimal import Decimal

from ..db import call_procedure_one, fetch_all, fetch_one


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


def require_systems_viewer(employee_id: int):
    viewer = fetch_one(
        """
        SELECT e.employee_id, e.name, r.role_name
        FROM Employee e
        INNER JOIN Role r ON r.role_id = e.role_id
        WHERE e.employee_id = %s
          AND e.status = 'Active'
        """,
        (employee_id,),
    )

    if (
        not viewer
        or viewer["employee_id"] != 8
        or viewer["name"] != "Benjamin"
        or viewer["role_name"] != "IT Admin"
    ):
        raise PermissionError("Only Benjamin can view Systems Oversight.")

    return viewer


def create_checkpoint(name: str | None, notes: str | None):
    checkpoint = call_procedure_one(
        "sp_create_checkpoint",
        (name or "Systems Oversight Snapshot", notes or "Created from Systems Oversight"),
    )
    return _row(checkpoint)


def list_checkpoints():
    return _rows(
        fetch_all(
            """
            SELECT checkpoint_id, checkpoint_name, notes, created_at
            FROM vw_checkpoint_history
            """
        )
    )


def recover_transaction(txn_id: int):
    call_procedure_one("sp_recover_transaction", (txn_id,))
    return _row(
        fetch_one(
            """
            SELECT txn_id, txn_type, table_name, record_id, action, status, error_message, created_at
            FROM Transaction_Log
            WHERE txn_id = %s
            """,
            (txn_id,),
        )
    )


def generate_case_reports():
    call_procedure_one("sp_generate_case_report")
    return _rows(
        fetch_all(
            """
            SELECT report_id, case_id, case_code, title, summary, total_billing, total_hours,
                   document_count, generated_at
            FROM vw_case_reports
            ORDER BY generated_at DESC, report_id DESC
            """
        )
    )


def generate_employee_reports():
    call_procedure_one("sp_generate_employee_workload_report")
    return _rows(
        fetch_all(
            """
            SELECT er.report_id, er.employee_id, e.name, er.summary, er.active_cases,
                   er.total_hours, er.tickets_raised, er.generated_at
            FROM Employee_Report er
            INNER JOIN Employee e ON e.employee_id = er.employee_id
            ORDER BY er.generated_at DESC, er.report_id DESC
            """
        )
    )


def generate_ticket_reports():
    call_procedure_one("sp_generate_ticket_report")
    return _rows(
        fetch_all(
            """
            SELECT tr.report_id, tr.ticket_id, tr.summary, tr.sla_status, tr.priority,
                   assignee.name AS assigned_to_name, tr.generated_at
            FROM Ticket_Report tr
            LEFT JOIN Employee assignee ON assignee.employee_id = tr.assigned_to
            ORDER BY tr.generated_at DESC, tr.report_id DESC
            """
        )
    )


def list_locks():
    return _rows(
        fetch_all(
            """
            SELECT lock_id, table_name, record_id, locked_by, locked_by_name,
                   lock_reason, locked_at, released_at, status
            FROM vw_active_locks
            ORDER BY locked_at DESC, lock_id DESC
            """
        )
    )


def list_transactions():
    return {
        "recent": _rows(
            fetch_all(
                """
                SELECT txn_id, txn_type, table_name, record_id, action, status,
                       error_message, created_at
                FROM Transaction_Log
                ORDER BY created_at DESC, txn_id DESC
                LIMIT 50
                """
            )
        ),
        "failures": _rows(
            fetch_all(
                """
                SELECT txn_id, txn_type, table_name, record_id, action, status,
                       error_message, created_at
                FROM vw_transaction_failures
                LIMIT 25
                """
            )
        ),
        "recovery_logs": _rows(
            fetch_all(
                """
                SELECT txn_id, txn_type, table_name, record_id, action, status,
                       error_message, created_at
                FROM vw_recovery_logs
                LIMIT 25
                """
            )
        ),
    }
