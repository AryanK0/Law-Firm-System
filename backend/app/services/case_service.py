from datetime import date

from fastapi import HTTPException

from ..db import call_procedure_one, fetch_all, fetch_one

CASE_SUMMARY_SQL = """
SELECT
  c.case_id,
  c.case_code,
  c.title,
  c.description,
  c.case_type,
  c.client_id,
  COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
  c.lead_partner_id,
  lp.name AS lead_partner_name,
  c.lead_senior_id,
  ls.name AS lead_senior_name,
  c.status,
  c.confidentiality_level,
  c.created_by,
  creator.name AS created_by_name,
  c.start_date,
  c.end_date,
  COALESCE(team.team_size, 0) AS team_size,
  COALESCE(documents.document_count, 0) AS document_count,
  COALESCE(billing.total_amount, 0) AS billed_total,
  COALESCE(hours.total_hours, 0) AS total_hours
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
  SELECT case_id, COALESCE(SUM(amount), 0) AS total_amount
  FROM Billing
  GROUP BY case_id
) billing ON billing.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(hours), 0) AS total_hours
  FROM Time_Log
  GROUP BY case_id
) hours ON hours.case_id = c.case_id
"""

CASE_DETAIL_SQL = """
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
  COALESCE(billing.total_amount, 0) AS billed_total,
  COALESCE(hours.total_hours, 0) AS total_hours,
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
  SELECT case_id, COALESCE(SUM(amount), 0) AS total_amount
  FROM Billing
  GROUP BY case_id
) billing ON billing.case_id = c.case_id
LEFT JOIN (
  SELECT case_id, COALESCE(SUM(hours), 0) AS total_hours
  FROM Time_Log
  GROUP BY case_id
) hours ON hours.case_id = c.case_id
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
    GROUP BY case_id
  ) next_hearing ON next_hearing.case_id = h.case_id AND next_hearing.next_date = h.date
) hearing ON hearing.case_id = c.case_id
"""

ACCESS_SQL = """
(
  EXISTS (
    SELECT 1
    FROM Employee e
    INNER JOIN Role r ON e.role_id = r.role_id
    WHERE e.employee_id = %s
      AND r.hierarchy_level <= 2
  )
  OR EXISTS (
    SELECT 1
    FROM Case_Team ct
    WHERE ct.case_id = c.case_id
      AND ct.employee_id = %s
  )
)
"""


def check_case_access(employee_id: int, case_id: int) -> bool:
    result = fetch_one(
        f"""
        SELECT EXISTS(
          SELECT 1
          FROM Cases c
          WHERE c.case_id = %s
            AND {ACCESS_SQL}
        ) AS has_access
        """,
        (case_id, employee_id, employee_id),
    )
    return bool(result and result["has_access"])


def ensure_case_exists(case_id: int):
    if not fetch_one("SELECT case_id FROM Cases WHERE case_id = %s", (case_id,)):
        raise HTTPException(status_code=404, detail="Case not found.")


def ensure_case_access(employee_id: int, case_id: int):
    ensure_case_exists(case_id)
    if not check_case_access(employee_id, case_id):
        raise HTTPException(status_code=403, detail="You do not have access to this case.")


def list_cases(
    employee_id: int,
    status: str | None = None,
    search: str | None = None,
):
    params: list = [employee_id, employee_id]
    parts = [ACCESS_SQL.strip()]
    if status:
        parts.append("c.status = %s")
        params.append(status)
    if search:
        like = f"%{search}%"
        parts.append(
            """
            (
              COALESCE(c.title, '') LIKE %s
              OR COALESCE(c.description, '') LIKE %s
              OR COALESCE(c.case_code, '') LIKE %s
              OR COALESCE(cl.organization, '') LIKE %s
              OR COALESCE(cl.name, '') LIKE %s
            )
            """
        )
        params.extend([like, like, like, like, like])

    where_clause = " AND ".join(parts)
    return fetch_all(
        f"""
        {CASE_SUMMARY_SQL}
        WHERE {where_clause}
        ORDER BY c.case_id DESC
        """,
        tuple(params),
    )


def get_case_detail(case_id: int):
    row = fetch_one(f"{CASE_DETAIL_SQL} WHERE c.case_id = %s", (case_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Case not found.")

    hearings = fetch_all(
        """
        SELECT
          h.hearing_id,
          h.date,
          h.notes,
          court.name AS court_name,
          court.location,
          court.jurisdiction_type
        FROM Hearing h
        LEFT JOIN Court court ON h.court_id = court.court_id
        WHERE h.case_id = %s
        ORDER BY h.date, h.hearing_id
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
              r.hierarchy_level
            FROM Case_Team ct
            INNER JOIN Employee e ON ct.employee_id = e.employee_id
            LEFT JOIN Employee assigned_by_employee ON ct.assigned_by = assigned_by_employee.employee_id
            LEFT JOIN Department d ON e.department_id = d.department_id
            LEFT JOIN Role r ON e.role_id = r.role_id
            WHERE ct.case_id = %s
            ORDER BY
              CASE ct.role_in_case
                WHEN 'Lead Partner' THEN 1
                WHEN 'Lead Senior' THEN 2
                ELSE 3
              END,
              r.hierarchy_level,
              e.name
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
          b.bill_id,
          b.amount,
          b.status,
          b.generated_by,
          generator.name AS generated_by_name,
          b.approved_by,
          approver.name AS approved_by_name
        FROM Billing b
        LEFT JOIN Employee generator ON b.generated_by = generator.employee_id
        LEFT JOIN Employee approver ON b.approved_by = approver.employee_id
        WHERE b.case_id = %s
        ORDER BY b.bill_id DESC
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
          COALESCE(SUM(hours), 0) AS total_hours,
          COUNT(*) AS log_count
        FROM Time_Log
        WHERE case_id = %s
        """,
        (case_id,),
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
