from datetime import datetime

from fastapi import HTTPException

from ..db import call_procedure_one, fetch_all, fetch_one


def list_tickets():
    return fetch_all(
        """
        SELECT
          ticket_id,
          raised_by,
          description,
          priority,
          status,
          assigned_to,
          created_at,
          resolution_deadline,
          resolved_at,
          breach_flag,
          raised_by_name,
          assigned_to_name
        FROM vw_ticket_overview
        ORDER BY created_at DESC, ticket_id DESC
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
    created = call_procedure_one(
        "raise_ticket",
        (
            raised_by,
            description,
            priority,
            status,
            assigned_to,
            resolution_deadline,
        ),
    )
    if not created:
        raise HTTPException(status_code=400, detail="Ticket creation did not return a new id.")

    return get_ticket(created["ticket_id"])


def get_ticket(ticket_id: int):
    ticket = fetch_one(
        """
        SELECT
          ticket_id,
          raised_by,
          description,
          priority,
          status,
          assigned_to,
          created_at,
          resolution_deadline,
          resolved_at,
          breach_flag,
          raised_by_name,
          assigned_to_name
        FROM vw_ticket_overview
        WHERE ticket_id = %s
        """,
        (ticket_id,),
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return ticket


def resolve_ticket(*, ticket_id: int, resolved_by: int):
    resolved = call_procedure_one(
        "resolve_ticket_workflow",
        (ticket_id, resolved_by),
    )
    if not resolved:
        raise HTTPException(status_code=400, detail="Ticket resolution did not return a result.")

    return get_ticket(ticket_id)
