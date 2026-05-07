from datetime import date

from fastapi import HTTPException

from ..db import call_procedure_one, execute, fetch_all, fetch_one


CASE_LIST_SQL = """
SELECT
  case_id,
  case_code,
  title,
  description,
  case_type,
  client_id,
  client_name,
  lead_partner_id,
  lead_partner_name,
  lead_senior_id,
  lead_senior_name,
  status,
  confidentiality_level,
  created_by,
  created_by_name,
  start_date,
  end_date,
  team_size,
  document_count,
  billed_total,
  total_hours
FROM vw_case_overview
"""


def _to_case_record(row: dict):
    return {
        **row,
        "billed_total": float(row["billed_total"] or 0),
        "total_hours": float(row["total_hours"] or 0),
    }


def check_case_access(employee_id: int, case_id: int) -> bool:
    result = fetch_one(
        "SELECT check_access(%s, %s) AS has_access",
        (employee_id, case_id),
    )
    return bool(result and result["has_access"])


def ensure_case_exists(case_id: int):
    if not fetch_one("SELECT case_id FROM Cases WHERE case_id = %s", (case_id,)):
        raise HTTPException(status_code=404, detail="Case not found.")


def ensure_case_access(employee_id: int, case_id: int):
    ensure_case_exists(case_id)
    if not check_case_access(employee_id, case_id):
        raise HTTPException(status_code=403, detail="You do not have access to this case.")


def list_clients():
    return fetch_all(
        """
        SELECT client_id, name, organization, contact_info
        FROM Client
        ORDER BY organization, name, client_id
        """
    )


def create_client_record(*, name: str | None, organization: str | None, contact_info: str | None):
    if not (name or organization):
        raise HTTPException(
            status_code=400,
            detail="Provide either a client name or organization.",
        )

    client_id = execute(
        """
        INSERT INTO Client(name, contact_info, organization)
        VALUES (%s, %s, %s)
        """,
        (name, contact_info, organization),
    )

    return fetch_one(
        """
        SELECT client_id, name, organization, contact_info
        FROM Client
        WHERE client_id = %s
        """,
        (client_id,),
    )


def list_cases(employee_id: int):
    rows = fetch_all(
        f"""
        {CASE_LIST_SQL}
        WHERE check_access(%s, case_id)
        ORDER BY case_id DESC
        """,
        (employee_id,),
    )
    return [_to_case_record(row) for row in rows]


def get_case_detail(case_id: int):
    row = fetch_one(
        "SELECT * FROM vw_case_overview WHERE case_id = %s",
        (case_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Case not found.")

    hearings = fetch_all(
        """
        SELECT hearing_id, date, notes, court_name, location
        FROM vw_hearing_calendar
        WHERE case_id = %s
        ORDER BY date ASC, hearing_id ASC
        """,
        (case_id,),
    )

    return {
        "case_id": row["case_id"],
        "case_code": row["case_code"],
        "title": row["title"],
        "description": row["description"],
        "case_type": row["case_type"],
        "status": row["status"],
        "confidentiality_level": row["confidentiality_level"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "created_by": {
            "employee_id": row["created_by"],
            "name": row["created_by_name"],
        },
        "client": {
            "client_id": row["client_id"],
            "name": row["client_contact_name"],
            "organization": row["client_organization"],
            "contact_info": row["client_contact_info"],
            "display_name": row["client_name"],
        },
        "lead_partner": {
            "employee_id": row["lead_partner_id"],
            "name": row["lead_partner_name"],
            "email": row["lead_partner_email"],
        },
        "lead_senior": {
            "employee_id": row["lead_senior_id"],
            "name": row["lead_senior_name"],
            "email": row["lead_senior_email"],
        },
        "metrics": {
            "team_size": row["team_size"],
            "document_count": row["document_count"],
            "billed_total": float(row["billed_total"] or 0),
            "total_hours": float(row["total_hours"] or 0),
        },
        "next_hearing": (
            {
                "hearing_id": row["next_hearing_id"],
                "date": row["next_hearing_date"],
                "notes": row["next_hearing_notes"],
                "court_name": row["next_hearing_court_name"],
                "location": row["next_hearing_location"],
            }
            if row["next_hearing_id"]
            else None
        ),
        "hearings": hearings,
    }


def get_case_team(case_id: int):
    return {
        "case_id": case_id,
        "team": fetch_all(
            """
            SELECT
              employee_id,
              role_in_case,
              assigned_by,
              assigned_by_name,
              name,
              email,
              phone,
              status,
              employment_type,
              department_name,
              role_name,
              hierarchy_level
            FROM vw_case_team_roster
            WHERE case_id = %s
            ORDER BY
              CASE role_in_case
                WHEN 'Lead Partner' THEN 1
                WHEN 'Lead Senior' THEN 2
                ELSE 3
              END,
              hierarchy_level,
              name
            """,
            (case_id,),
        ),
    }


def get_case_status_history(case_id: int):
    return {
        "case_id": case_id,
        "history": fetch_all(
            """
            SELECT
              h.history_id,
              h.old_status,
              h.new_status,
              h.changed_by,
              e.name AS changed_by_name,
              h.timestamp
            FROM Case_Status_History h
            LEFT JOIN Employee e ON h.changed_by = e.employee_id
            WHERE h.case_id = %s
            ORDER BY h.timestamp DESC, h.history_id DESC
            """,
            (case_id,),
        ),
    }


def get_case_billing(case_id: int):
    entries = fetch_all(
        """
        SELECT
          bill_id,
          amount,
          status,
          generated_by,
          generated_by_name,
          approved_by,
          approved_by_name
        FROM vw_billing_register
        WHERE case_id = %s
        ORDER BY bill_id DESC
        """,
        (case_id,),
    )
    summary = fetch_one(
        """
        SELECT
          COUNT(*) AS bill_count,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) AS approved_amount,
          COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) AS pending_amount
        FROM Billing
        WHERE case_id = %s
        """,
        (case_id,),
    )
    hours = fetch_one(
        """
        SELECT
          get_case_total_hours(%s) AS total_hours,
          COUNT(*) AS log_count
        FROM Time_Log
        WHERE case_id = %s
        """,
        (case_id, case_id),
    )

    return {
        "case_id": case_id,
        "summary": {
            "bill_count": summary["bill_count"] if summary else 0,
            "total_amount": float(summary["total_amount"] or 0) if summary else 0,
            "approved_amount": float(summary["approved_amount"] or 0) if summary else 0,
            "pending_amount": float(summary["pending_amount"] or 0) if summary else 0,
            "total_hours": float(hours["total_hours"] or 0) if hours else 0,
            "time_log_count": hours["log_count"] if hours else 0,
        },
        "entries": [
            {
                **entry,
                "amount": float(entry["amount"] or 0),
            }
            for entry in entries
        ],
    }


def create_case(
    *,
    case_code: str | None,
    title: str,
    description: str | None,
    case_type: str | None,
    client_id: int,
    lead_partner_id: int | None,
    lead_senior_id: int | None,
    status: str,
    confidentiality_level: str,
    created_by: int | None,
    start_date: date | None,
    end_date: date | None,
):
    created = call_procedure_one(
        "create_case_full",
        (
            case_code,
            title,
            description,
            case_type,
            client_id,
            lead_partner_id,
            lead_senior_id,
            status,
            confidentiality_level,
            created_by,
            start_date,
            end_date,
        ),
    )

    if not created:
        raise HTTPException(status_code=400, detail="Case creation did not return a new id.")

    return get_case_detail(created["case_id"])


def assign_case_team_member(
    *,
    case_id: int,
    employee_id: int,
    role_in_case: str,
    assigned_by: int | None,
):
    created = call_procedure_one(
        "assign_employee_case",
        (case_id, employee_id, role_in_case, assigned_by),
    )
    if not created:
        raise HTTPException(status_code=400, detail="Case assignment did not return a result.")

    return fetch_one(
        """
        SELECT
          case_id,
          employee_id,
          role_in_case,
          assigned_by,
          assigned_by_name,
          name,
          email,
          phone,
          status,
          employment_type,
          department_name,
          role_name,
          hierarchy_level
        FROM vw_case_team_roster
        WHERE case_id = %s AND employee_id = %s
        """,
        (case_id, employee_id),
    )


def approve_billing_entry(*, bill_id: int, approver_id: int):
    approved = call_procedure_one("approve_billing", (bill_id, approver_id))
    if not approved:
        raise HTTPException(status_code=400, detail="Billing approval did not return a result.")

    entry = fetch_one(
        """
        SELECT
          bill_id,
          case_id,
          case_code,
          title,
          client_name,
          generated_by,
          generated_by_name,
          approved_by,
          approved_by_name,
          amount,
          status
        FROM vw_billing_register
        WHERE bill_id = %s
        """,
        (bill_id,),
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Billing entry not found.")

    return {
        **entry,
        "amount": float(entry["amount"] or 0),
    }


def close_case(*, case_id: int, employee_id: int):
    # Security check: Does the user have permission to close cases?
    # Managing Partners and Partners have OVERRIDE_ACCESS which includes CLOSE_CASE.
    # Other staff must have explicit CLOSE_CASE permission for this specific case.
    has_permission = fetch_one(
        "SELECT fn_can_access_case(%s, %s, 'CLOSE_CASE') AS allowed",
        (employee_id, case_id),
    )

    if not has_permission or not has_permission["allowed"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to close this matter.",
        )

    # Perform the update. Set end_date to the later of CURDATE() or start_date
    # to satisfy the chk_case_dates constraint.
    execute(
        """
        UPDATE Cases 
        SET status = 'Closed', 
            end_date = CASE WHEN CURDATE() > start_date THEN CURDATE() ELSE start_date END 
        WHERE case_id = %s
        """,
        (case_id,),
    )

    return get_case_detail(case_id)
