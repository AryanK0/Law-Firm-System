from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pymysql import MySQLError

from ..services import overview_service, dbms_service

router = APIRouter(tags=["operations"])

# --- Operations: Employees ---


@router.get("/employees", summary="List the employee directory with access context")
def get_employees():
    return overview_service.list_employees()


@router.get("/roles", summary="List roles ordered by hierarchy")
def get_roles():
    return overview_service.list_roles()


# --- Operations: Tickets ---

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
    return overview_service.list_tickets()


@router.post("/tickets", summary="Create a new support ticket")
def create_ticket(payload: TicketInput):
    try:
        return overview_service.create_ticket(
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
        return overview_service.resolve_ticket(
            ticket_id=ticket_id,
            resolved_by=payload.resolved_by,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- Operations: DBMS ---


class CheckpointInput(BaseModel):
    name: str | None = None
    notes: str | None = None


def _require_systems_viewer(employee_id: int):
    try:
        return dbms_service.require_systems_viewer(employee_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/dbms/checkpoint/create", summary="Create a continuity snapshot")
def create_checkpoint(payload: CheckpointInput | None = None, employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    raise HTTPException(status_code=403, detail="Systems Oversight is view-only for Benjamin.")


@router.get("/dbms/checkpoint/list", summary="List continuity snapshot history")
def list_checkpoints(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_checkpoints()


@router.post("/dbms/recovery/{txn_id}", summary="Resolve an interrupted activity")
def recover_transaction(txn_id: int, employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    raise HTTPException(status_code=403, detail="Systems Oversight is view-only for Benjamin.")


@router.get("/dbms/reports/cases", summary="Return case workload reports")
def get_case_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_case_reports()


@router.get("/dbms/reports/employees", summary="Return employee workload reports")
def get_employee_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_employee_reports()


@router.get("/dbms/reports/tickets", summary="Return ticket service reports")
def get_ticket_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_ticket_reports()


@router.get("/dbms/locks", summary="List protected record activity")
def get_locks(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_locks()


@router.get("/dbms/transactions", summary="List recent and interrupted activity")
def get_transactions(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_transactions()
