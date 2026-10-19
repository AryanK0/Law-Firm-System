from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymysql import MySQLError

from ..core.auth import AuthenticatedUser, get_current_user, require_systems_admin
from ..core.database import get_db
from ..core.locking import get_active_locks
from ..domain.operations_domain import (
    create_checkpoint_domain,
    create_ticket_domain,
    resolve_ticket_domain,
)
from ..domain.reporting_domain import (
    generate_case_reports_domain,
    generate_employee_workload_reports_domain,
    generate_ticket_reports_domain,
)
from ..services import dbms_service, overview_service
from sqlalchemy.ext.asyncio import AsyncSession

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
    raised_by: int | None = None
    description: str
    priority: str = "Medium"
    status: str = "Open"
    assigned_to: int | None = None
    resolution_deadline: datetime | None = None


class TicketResolveInput(BaseModel):
    resolved_by: int | None = None


@router.get("/tickets", summary="List support tickets ordered by newest activity")
def get_tickets():
    return overview_service.list_tickets()


@router.post("/tickets", summary="Create a new support ticket via domain service")
async def create_ticket(
    payload: TicketInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    raised_by = payload.raised_by or user.employee_id
    return await create_ticket_domain(
        db=db,
        raised_by=raised_by,
        description=payload.description,
        priority=payload.priority,
        status_str=payload.status,
        assigned_to=payload.assigned_to,
        resolution_deadline=payload.resolution_deadline,
    )


@router.post("/tickets/{ticket_id}/resolve", summary="Resolve a support ticket via domain service")
async def resolve_ticket(
    ticket_id: int,
    payload: TicketResolveInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    resolved_by = payload.resolved_by or user.employee_id
    return await resolve_ticket_domain(
        db=db,
        ticket_id=ticket_id,
        resolved_by=resolved_by,
    )


# --- Operations: DBMS ---


class CheckpointInput(BaseModel):
    name: str | None = None
    notes: str | None = None


@router.post("/dbms/checkpoint/create", summary="Create a continuity snapshot via domain service")
async def create_checkpoint(
    payload: CheckpointInput | None = None,
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    return await create_checkpoint_domain(
        db=db,
        checkpoint_name=payload.name if payload else None,
        notes=payload.notes if payload else None,
    )


@router.get("/dbms/checkpoint/list", summary="List continuity snapshot history")
def list_checkpoints(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
):
    return dbms_service.list_checkpoints()


@router.post("/dbms/recovery/{txn_id}", summary="Resolve an interrupted activity")
def recover_transaction(
    txn_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
):
    raise HTTPException(status_code=403, detail="Systems Oversight is view-only for Benjamin.")


@router.get("/dbms/reports/cases", summary="Return set-based case workload reports without cursors")
async def get_case_reports(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await generate_case_reports_domain(db)


@router.get("/dbms/reports/employees", summary="Return set-based employee workload reports without cursors")
async def get_employee_reports(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await generate_employee_workload_reports_domain(db)


@router.get("/dbms/reports/tickets", summary="Return set-based ticket service reports without cursors")
async def get_ticket_reports(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await generate_ticket_reports_domain(db)


@router.get("/dbms/locks", summary="List active distributed and protected record locks")
async def get_locks(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
):
    dist_locks = await get_active_locks()
    db_locks = dbms_service.list_locks()
    return dist_locks if dist_locks else db_locks


@router.get("/dbms/transactions", summary="List recent and interrupted activity")
def get_transactions(
    user: Annotated[AuthenticatedUser, Depends(require_systems_admin)],
):
    return dbms_service.list_transactions()
