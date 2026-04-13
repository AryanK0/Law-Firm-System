from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pymysql import MySQLError

from ..services import ticket_service

router = APIRouter(tags=["tickets"])


class TicketInput(BaseModel):
    raised_by: int
    description: str
    priority: str = "Medium"
    status: str = "Open"
    assigned_to: int | None = None
    resolution_deadline: datetime | None = None


class TicketResolveInput(BaseModel):
    resolved_by: int


@router.get("/tickets", summary="List support tickets ordered by newest activity")
def get_tickets():
    return ticket_service.list_tickets()


@router.post("/tickets", summary="Create a new support ticket")
def create_ticket(payload: TicketInput):
    try:
        return ticket_service.create_ticket(
            raised_by=payload.raised_by,
            description=payload.description,
            priority=payload.priority,
            status=payload.status,
            assigned_to=payload.assigned_to,
            resolution_deadline=payload.resolution_deadline,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/tickets/{ticket_id}/resolve", summary="Resolve a support ticket")
def resolve_ticket(ticket_id: int, payload: TicketResolveInput):
    try:
        return ticket_service.resolve_ticket(
            ticket_id=ticket_id,
            resolved_by=payload.resolved_by,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
