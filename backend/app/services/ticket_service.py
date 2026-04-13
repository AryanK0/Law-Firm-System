from datetime import datetime

from fastapi import HTTPException

from ..db import execute, fetch_all, fetch_one

TICKET_SELECT_SQL = """
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
  assigned_to.name AS assigned_to_name
FROM Ticket t
LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
"""


def list_tickets():
    return fetch_all(
        f"""
        {TICKET_SELECT_SQL}
        ORDER BY t.created_at DESC, t.ticket_id DESC
        """
    )


def create_ticket(
    *,
    raised_by: int,
    description: str,
    priority: str = "Medium",
    status: str = "Open",
    assigned_to: int | None = None,
    resolution_deadline: datetime | None = None,
):
    ticket_id = execute(
        """
        INSERT INTO Ticket(
          raised_by,
          description,
          priority,
          status,
          assigned_to,
          resolution_deadline
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            raised_by,
            description,
            priority,
            status,
            assigned_to,
            resolution_deadline,
        ),
    )

    return get_ticket(ticket_id)


def get_ticket(ticket_id: int):
    ticket = fetch_one(
        f"""
        {TICKET_SELECT_SQL}
        WHERE t.ticket_id = %s
        """,
        (ticket_id,),
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return ticket


def resolve_ticket(*, ticket_id: int, resolved_by: int):
    ticket = fetch_one(
        """
        SELECT
          t.ticket_id,
          t.assigned_to,
          t.status,
          resolver.employee_id AS resolver_id,
          role.role_name,
          EXISTS (
            SELECT 1
            FROM Role_Permission rp
            INNER JOIN Permission p ON p.permission_id = rp.permission_id
            WHERE rp.role_id = resolver.role_id
              AND p.permission_name = 'Manage Tickets'
          ) AS can_manage_tickets
        FROM Ticket t
        INNER JOIN Employee resolver ON resolver.employee_id = %s
        LEFT JOIN Role role ON resolver.role_id = role.role_id
        WHERE t.ticket_id = %s
        """,
        (resolved_by, ticket_id),
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    can_resolve = (
        ticket["assigned_to"] == resolved_by
        or ticket["role_name"] == "IT"
        or bool(ticket["can_manage_tickets"])
    )
    if not can_resolve:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to resolve this ticket.",
        )

    if ticket["status"] != "Resolved":
        execute(
            """
            UPDATE Ticket
            SET status = 'Resolved',
                resolved_at = NOW(),
                breach_flag = FALSE
            WHERE ticket_id = %s
            """,
            (ticket_id,),
        )
        execute(
            """
            INSERT INTO Ticket_Logs(ticket_id, updated_by, update_note, timestamp)
            VALUES (%s, %s, %s, NOW())
            """,
            (
                ticket_id,
                resolved_by,
                "Ticket resolved by assigned support owner.",
            ),
        )

    return get_ticket(ticket_id)
