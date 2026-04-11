from datetime import datetime

from fastapi import HTTPException

from ..db import execute, fetch_all, fetch_one


def list_tickets():
    return fetch_all(
        """
        SELECT
          t.ticket_id,
          t.description,
          t.priority,
          t.status,
          t.created_at,
          t.resolution_deadline,
          t.resolved_at,
          t.breach_flag,
          raised_by.name AS raised_by_name,
          assigned_to.name AS assigned_to_name
        FROM Ticket t
        LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
        LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
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

    created = fetch_all(
        """
        SELECT
          t.ticket_id,
          t.description,
          t.priority,
          t.status,
          t.created_at,
          t.resolution_deadline,
          t.resolved_at,
          t.breach_flag,
          raised_by.name AS raised_by_name,
          assigned_to.name AS assigned_to_name
        FROM Ticket t
        LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
        LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
        WHERE t.ticket_id = %s
        """,
        (ticket_id,),
    )
    return created[0]


def resolve_ticket(*, ticket_id: int, employee_id: int):
    ticket = fetch_one(
        """
        SELECT ticket_id, assigned_to, status
        FROM Ticket
        WHERE ticket_id = %s
        """,
        (ticket_id,),
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    resolver = fetch_one(
        """
        SELECT e.employee_id, r.role_name, r.hierarchy_level
        FROM Employee e
        INNER JOIN Role r ON e.role_id = r.role_id
        WHERE e.employee_id = %s
        """,
        (employee_id,),
    )
    if not resolver:
        raise HTTPException(status_code=404, detail="Resolver not found.")

    can_resolve = (
        resolver["role_name"] == "IT"
        or resolver["hierarchy_level"] <= 2
        or ticket["assigned_to"] == employee_id
    )
    if not can_resolve:
        raise HTTPException(status_code=403, detail="You cannot resolve this ticket.")

    if ticket["status"] == "Resolved":
        return fetch_one(
            """
            SELECT
              t.ticket_id,
              t.description,
              t.priority,
              t.status,
              t.created_at,
              t.resolution_deadline,
              t.resolved_at,
              t.breach_flag,
              raised_by.name AS raised_by_name,
              assigned_to.name AS assigned_to_name
            FROM Ticket t
            LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
            LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
            WHERE t.ticket_id = %s
            """,
            (ticket_id,),
        )

    execute(
        """
        UPDATE Ticket
        SET status = 'Resolved',
            resolved_at = NOW()
        WHERE ticket_id = %s
        """,
        (ticket_id,),
    )

    return fetch_one(
        """
        SELECT
          t.ticket_id,
          t.description,
          t.priority,
          t.status,
          t.created_at,
          t.resolution_deadline,
          t.resolved_at,
          t.breach_flag,
          raised_by.name AS raised_by_name,
          assigned_to.name AS assigned_to_name
        FROM Ticket t
        LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
        LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
        WHERE t.ticket_id = %s
        """,
        (ticket_id,),
    )
