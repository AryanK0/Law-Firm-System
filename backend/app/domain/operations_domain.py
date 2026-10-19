from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import transaction_scope
from ..models.core import Ticket


# SLA priority to hours mapping
SLA_HOURS_MAP = {
    "Critical": 4,
    "Urgent": 4,
    "High": 24,
    "Medium": 72,
    "Low": 168,
}


async def create_ticket_domain(
    db: AsyncSession,
    *,
    raised_by: int,
    description: str,
    priority: str = "Medium",
    status_str: str = "Open",
    assigned_to: int | None = None,
    resolution_deadline: datetime | None = None,
) -> dict[str, Any]:
    """
    Migrates raise_ticket stored procedure and trg_ticket_sla trigger.
    Calculates SLA resolution deadline based on priority.
    """
    async with transaction_scope(db):
        # Validate raised_by employee exists
        emp_check = await db.execute(text("SELECT employee_id FROM employee WHERE employee_id = :id AND status = 'Active'"), {"id": raised_by})
        if not emp_check.first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Active employee #{raised_by} not found.")

        # Normalize priority against DB constraint ('Low', 'Medium', 'High', 'Critical')
        priority_norm = priority.capitalize()
        if priority_norm == "Urgent":
            priority_norm = "Critical"

        # Compute SLA deadline if not explicitly provided (replacing trg_ticket_sla)
        if not resolution_deadline:
            hours = SLA_HOURS_MAP.get(priority_norm, 72)
            resolution_deadline = datetime.utcnow() + timedelta(hours=hours)

        ticket = Ticket(
            raised_by=raised_by,
            description=description,
            priority=priority_norm,
            status=status_str,
            assigned_to=assigned_to,
            created_at=datetime.utcnow(),
            resolution_deadline=resolution_deadline,
            breach_flag=False,
        )
        db.add(ticket)
        await db.flush()

        # Log transition to ticket_logs (replacing trg_ticket_status_log)
        log_stmt = text(
            """
            INSERT INTO ticket_logs (ticket_id, updated_by, update_note, timestamp)
            VALUES (:t_id, :updated_by, :note, NOW())
            """
        )
        await db.execute(log_stmt, {
            "t_id": ticket.ticket_id,
            "updated_by": raised_by,
            "note": f"Ticket created with priority {priority_norm}",
        })

    return {
        "ticket_id": ticket.ticket_id,
        "raised_by": ticket.raised_by,
        "description": ticket.description,
        "priority": ticket.priority,
        "status": ticket.status,
        "assigned_to": ticket.assigned_to,
        "resolution_deadline": str(ticket.resolution_deadline) if ticket.resolution_deadline else None,
        "created_at": str(ticket.created_at),
        "breach_flag": ticket.breach_flag,
    }


async def resolve_ticket_domain(
    db: AsyncSession,
    *,
    ticket_id: int,
    resolved_by: int,
) -> dict[str, Any]:
    """
    Migrates resolve_ticket_workflow stored procedure.
    Validates deadline breach and logs status transition.
    """
    async with transaction_scope(db):
        t_res = await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))
        ticket = t_res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket #{ticket_id} not found.")

        old_status = ticket.status
        now = datetime.utcnow()
        ticket.status = "Resolved"
        ticket.resolved_at = now

        # Determine if SLA breached
        if ticket.resolution_deadline and now > ticket.resolution_deadline:
            ticket.breach_flag = True

        # Log transition to ticket_logs
        log_stmt = text(
            """
            INSERT INTO ticket_logs (ticket_id, updated_by, update_note, timestamp)
            VALUES (:t_id, :updated_by, :note, NOW())
            """
        )
        await db.execute(log_stmt, {
            "t_id": ticket_id,
            "updated_by": resolved_by,
            "note": f"Status changed from {old_status} to Resolved",
        })

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status,
        "resolved_at": str(ticket.resolved_at),
        "breach_flag": ticket.breach_flag,
        "message": "Ticket resolved successfully.",
    }


async def create_checkpoint_domain(
    db: AsyncSession,
    *,
    checkpoint_name: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    """
    Migrates sp_create_checkpoint into async SQLAlchemy domain logic.
    """
    async with transaction_scope(db):
        name = checkpoint_name or f"SNAPSHOT-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

        # Collect current stats
        case_cnt = (await db.execute(text("SELECT COUNT(*) FROM cases"))).scalar() or 0
        doc_cnt = (await db.execute(text("SELECT COUNT(*) FROM document"))).scalar() or 0
        bill_cnt = (await db.execute(text("SELECT COUNT(*) FROM billing"))).scalar() or 0

        detail_notes = f"{notes or 'Automated snapshot'} | cases={case_cnt}, docs={doc_cnt}, bills={bill_cnt}"

        stmt = text(
            """
            INSERT INTO system_checkpoint (checkpoint_name, notes, created_at)
            VALUES (:name, :notes, NOW())
            """
        )
        res = await db.execute(stmt, {"name": name, "notes": detail_notes})
        checkpoint_id = res.lastrowid

    return {
        "checkpoint_id": checkpoint_id,
        "checkpoint_name": name,
        "notes": detail_notes,
        "created_at": str(datetime.utcnow()),
    }
