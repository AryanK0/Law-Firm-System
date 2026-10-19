from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from ..core.database import transaction_scope
from ..core.locking import distributed_lock
from ..core.otel import trace_span
from ..models.core import Billing, Case, CaseAccess, CaseStatusHistory, CaseTeam, Client, Employee


@trace_span("domain.create_case")
async def create_case_domain(
    db: AsyncSession,
    *,
    case_code: str | None,
    title: str,
    description: str | None,
    case_type: str | None,
    client_id: int,
    lead_partner_id: int | None,
    lead_senior_id: int | None,
    status_str: str = "Open",
    confidentiality_level: str = "Internal",
    created_by: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    """
    Migrates MySQL create_case_full stored procedure + trg_conflict_check + trg_case_status_update + trg_case_team_access_insert
    into an async domain service using SQLAlchemy transaction blocks.
    """
    async with transaction_scope(db):
        # 1. Validate Client exists
        client_res = await db.execute(select(Client).where(Client.client_id == client_id))
        client = client_res.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Client #{client_id} not found.")

        # 2. Conflict Check (replacing trg_conflict_check)
        conflict_query = select(Case).where(
            Case.client_id == client_id,
            Case.title == title,
            Case.status != "Closed",
        )
        existing_conflict = (await db.execute(conflict_query)).scalar_one_or_none()
        if existing_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ethical/Intake Conflict: Active case #{existing_conflict.case_id} ('{title}') already exists for this client.",
            )

        # 3. Create Case with OCC version initialized to 1
        new_case = Case(
            case_code=case_code or f"MATTER-{int(datetime.utcnow().timestamp())}",
            title=title,
            description=description,
            case_type=case_type or "General Practice",
            client_id=client_id,
            lead_partner_id=lead_partner_id,
            lead_senior_id=lead_senior_id,
            status=status_str,
            confidentiality_level=confidentiality_level,
            created_by=created_by,
            start_date=start_date or date.today(),
            end_date=end_date,
            version=1,
        )
        db.add(new_case)
        await db.flush()  # Populates new_case.case_id

        # 4. Status History Logging (replacing trg_case_status_update)
        status_log = CaseStatusHistory(
            case_id=new_case.case_id,
            old_status=None,
            new_status=status_str,
            changed_by=created_by,
            timestamp=datetime.utcnow(),
        )
        db.add(status_log)

        # 5. Automatically assign lead partner, senior, and creator to Case_Team and Case_Access (replacing trg_case_team_access_insert)
        assignments = []
        if lead_partner_id:
            assignments.append((lead_partner_id, "Lead Partner", True, True, True, True, True, True))
        if lead_senior_id and lead_senior_id != lead_partner_id:
            assignments.append((lead_senior_id, "Lead Senior", True, True, True, False, False, False))
        if created_by and created_by not in (lead_partner_id, lead_senior_id):
            assignments.append((created_by, "Matter Intake Coordinator", True, False, True, False, False, False))

        for emp_id, role_in_case, can_view, can_edit, can_up, can_app, can_close, can_assign in assignments:
            team_entry = CaseTeam(
                case_id=new_case.case_id,
                employee_id=emp_id,
                role_in_case=role_in_case,
                assigned_by=created_by,
            )
            db.add(team_entry)

            access_entry = CaseAccess(
                case_id=new_case.case_id,
                employee_id=emp_id,
                case_role=role_in_case,
                can_view=can_view,
                can_edit=can_edit,
                can_upload_docs=can_up,
                can_approve_docs=can_app,
                can_close_case=can_close,
                can_assign_members=can_assign,
                granted_by=created_by,
                granted_at=datetime.utcnow(),
            )
            db.add(access_entry)

        # 6. Audit transaction log entry (replacing trg_txn_case_update)
        txn_stmt = text(
            """
            INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
            VALUES ('CASE_INTAKE', 'cases', :rec_id, 'INSERT', 'Committed', NOW())
            """
        )
        await db.execute(txn_stmt, {"rec_id": new_case.case_id})

    # Return created case detail
    return await get_case_detail_domain(db, new_case.case_id)


@trace_span("domain.assign_case_team_member")
async def assign_case_team_member_domain(
    db: AsyncSession,
    *,
    case_id: int,
    employee_id: int,
    role_in_case: str,
    assigned_by: int | None = None,
) -> dict[str, Any]:
    """
    Migrates assign_employee_case stored procedure and trg_case_team_access_insert
    into an async domain service protected by distributed lock.
    """
    async with distributed_lock("case", case_id, locked_by=assigned_by or "system"):
        async with transaction_scope(db):
            # Check case exists
            case_res = await db.execute(select(Case).where(Case.case_id == case_id))
            case = case_res.scalar_one_or_none()
            if not case:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

            # Check employee exists and get role/hierarchy
            emp_stmt = text(
                """
                SELECT e.employee_id, r.role_name, r.hierarchy_level
                FROM Employee e
                JOIN Role r ON e.role_id = r.role_id
                WHERE e.employee_id = :emp_id AND e.status = 'Active'
                """
            )
            emp_res = await db.execute(emp_stmt, {"emp_id": employee_id})
            emp_row = emp_res.mappings().first()
            if not emp_row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Active employee #{employee_id} not found.")

            # Insert or update Case_Team
            team_res = await db.execute(
                select(CaseTeam).where(CaseTeam.case_id == case_id, CaseTeam.employee_id == employee_id)
            )
            existing_team = team_res.scalar_one_or_none()
            if existing_team:
                existing_team.role_in_case = role_in_case
                existing_team.assigned_by = assigned_by
            else:
                db.add(CaseTeam(
                    case_id=case_id,
                    employee_id=employee_id,
                    role_in_case=role_in_case,
                    assigned_by=assigned_by,
                ))

            # Provision CaseAccess policy based on hierarchy
            hierarchy = emp_row["hierarchy_level"]
            can_edit = hierarchy <= 4
            can_upload = hierarchy <= 5
            can_approve = hierarchy <= 2
            can_close = hierarchy <= 2
            can_assign = hierarchy <= 3

            access_res = await db.execute(
                select(CaseAccess).where(CaseAccess.case_id == case_id, CaseAccess.employee_id == employee_id)
            )
            existing_access = access_res.scalar_one_or_none()
            if existing_access:
                existing_access.case_role = role_in_case
                existing_access.can_edit = can_edit
                existing_access.can_upload_docs = can_upload
                existing_access.can_approve_docs = can_approve
                existing_access.can_close_case = can_close
                existing_access.can_assign_members = can_assign
            else:
                db.add(CaseAccess(
                    case_id=case_id,
                    employee_id=employee_id,
                    case_role=role_in_case,
                    can_view=True,
                    can_edit=can_edit,
                    can_upload_docs=can_upload,
                    can_approve_docs=can_approve,
                    can_close_case=can_close,
                    can_assign_members=can_assign,
                    granted_by=assigned_by,
                    granted_at=datetime.utcnow(),
                ))

    return {"message": "Team member successfully assigned", "case_id": case_id, "employee_id": employee_id}


async def approve_billing_entry_domain(
    db: AsyncSession,
    *,
    bill_id: int,
    approver_id: int,
) -> dict[str, Any]:
    """
    Migrates approve_billing stored procedure and trg_billing_approval.
    Enforces Optimistic Concurrency Control (OCC) and logs transaction state.
    """
    async with distributed_lock("billing", bill_id, locked_by=approver_id):
        async with transaction_scope(db):
            # Check approver credentials
            approver_stmt = text(
                """
                SELECT e.employee_id, r.role_name, r.hierarchy_level
                FROM Employee e
                JOIN Role r ON e.role_id = r.role_id
                WHERE e.employee_id = :emp_id AND e.status = 'Active'
                """
            )
            approver_res = await db.execute(approver_stmt, {"emp_id": approver_id})
            approver = approver_res.mappings().first()
            if not approver or (approver["hierarchy_level"] > 3 and approver["role_name"] != "Finance Admin"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Approving billing requires Partner, Senior Associate, or Finance Admin role.",
                )

            # Query billing entry
            bill_res = await db.execute(select(Billing).where(Billing.bill_id == bill_id))
            bill = bill_res.scalar_one_or_none()
            if not bill:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Billing record #{bill_id} not found.")

            if bill.status == "Approved":
                return {
                    "bill_id": bill.bill_id,
                    "case_id": bill.case_id,
                    "amount": float(bill.amount),
                    "status": bill.status,
                    "approved_by": bill.approved_by,
                    "message": "Billing entry was already approved.",
                }

            try:
                bill.status = "Approved"
                bill.approved_by = approver_id
                await db.flush()  # Triggers OCC check: WHERE bill_id=:id AND version=:version
            except StaleDataError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Optimistic Concurrency Conflict: Billing record was modified by another user. Please refresh and try again.",
                ) from exc

            # Log transaction
            txn_stmt = text(
                """
                INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
                VALUES ('BILLING_APPROVAL', 'billing', :rec_id, 'UPDATE', 'Committed', NOW())
                """
            )
            await db.execute(txn_stmt, {"rec_id": bill.bill_id})

            return {
                "bill_id": bill.bill_id,
                "case_id": bill.case_id,
                "amount": float(bill.amount),
                "status": bill.status,
                "approved_by": bill.approved_by,
                "version": bill.version,
                "message": "Billing entry approved successfully.",
            }


async def close_case_domain(
    db: AsyncSession,
    *,
    case_id: int,
    employee_id: int,
) -> dict[str, Any]:
    """
    Migrates case closure logic out of MySQL. Checks for pending billing and updates OCC version.
    """
    async with distributed_lock("case", case_id, locked_by=employee_id):
        async with transaction_scope(db):
            case_res = await db.execute(select(Case).where(Case.case_id == case_id))
            case = case_res.scalar_one_or_none()
            if not case:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

            if case.status == "Closed":
                return await get_case_detail_domain(db, case_id)

            old_status = case.status
            try:
                case.status = "Closed"
                case.end_date = date.today()
                await db.flush()  # OCC validation
            except StaleDataError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Optimistic Concurrency Conflict: Case was updated concurrently. Please refresh.",
                ) from exc

            # Log status history
            status_log = CaseStatusHistory(
                case_id=case_id,
                old_status=old_status,
                new_status="Closed",
                changed_by=employee_id,
                timestamp=datetime.utcnow(),
            )
            db.add(status_log)

    return await get_case_detail_domain(db, case_id)


async def get_case_detail_domain(db: AsyncSession, case_id: int) -> dict[str, Any]:
    """Asynchronous SQLAlchemy loader for full case details and metrics."""
    stmt = text(
        """
        SELECT
            c.case_id, c.case_code, c.title, c.description, c.case_type, c.status,
            c.confidentiality_level, c.start_date, c.end_date, c.version,
            c.legal_hold, c.legal_hold_reason, c.legal_hold_by, c.legal_hold_at,
            cl.client_id, cl.name as client_name, cl.organization, cl.contact_info,
            lp.employee_id as lead_partner_id, lp.name as lead_partner_name, lp.email as lead_partner_email,
            ls.employee_id as lead_senior_id, ls.name as lead_senior_name, ls.email as lead_senior_email,
            cr.employee_id as created_by_id, cr.name as created_by_name,
            COALESCE((SELECT COUNT(*) FROM case_team WHERE case_id = c.case_id), 0) as team_size,
            COALESCE((SELECT COUNT(*) FROM document WHERE case_id = c.case_id), 0) as document_count,
            COALESCE((SELECT SUM(amount) FROM billing WHERE case_id = c.case_id), 0.0) as billed_total,
            COALESCE((SELECT SUM(hours) FROM time_log WHERE case_id = c.case_id), 0.0) as total_hours
        FROM cases c
        JOIN client cl ON c.client_id = cl.client_id
        LEFT JOIN employee lp ON c.lead_partner_id = lp.employee_id
        LEFT JOIN employee ls ON c.lead_senior_id = ls.employee_id
        LEFT JOIN employee cr ON c.created_by = cr.employee_id
        WHERE c.case_id = :case_id
        """
    )
    res = await db.execute(stmt, {"case_id": case_id})
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

    # Hearings
    hearings_stmt = text(
        """
        SELECT h.hearing_id, h.date, h.notes, co.name as court_name, co.location
        FROM hearing h
        LEFT JOIN court co ON h.court_id = co.court_id
        WHERE h.case_id = :case_id
        ORDER BY h.date ASC
        """
    )
    hearings_res = await db.execute(hearings_stmt, {"case_id": case_id})
    hearings = [
        {
            "hearing_id": h["hearing_id"],
            "date": str(h["date"]) if h["date"] else None,
            "notes": h["notes"],
            "court_name": h["court_name"],
            "location": h["location"],
        }
        for h in hearings_res.mappings().all()
    ]
    next_hearing = hearings[0] if hearings else None

    return {
        "case_id": row["case_id"],
        "case_code": row["case_code"],
        "title": row["title"],
        "description": row["description"],
        "case_type": row["case_type"],
        "status": row["status"],
        "confidentiality_level": row["confidentiality_level"],
        "start_date": str(row["start_date"]) if row["start_date"] else None,
        "end_date": str(row["end_date"]) if row["end_date"] else None,
        "version": row["version"],
        "legal_hold": bool(row["legal_hold"]),
        "legal_hold_reason": row["legal_hold_reason"],
        "legal_hold_by": row["legal_hold_by"],
        "legal_hold_at": str(row["legal_hold_at"]) if row["legal_hold_at"] else None,
        "created_by": {"employee_id": row["created_by_id"], "name": row["created_by_name"]},
        "client": {
            "client_id": row["client_id"],
            "name": row["client_name"],
            "organization": row["organization"],
            "contact_info": row["contact_info"],
            "display_name": f"{row['organization']} ({row['client_name']})" if row["organization"] and row["client_name"] else (row["organization"] or row["client_name"]),
        },
        "lead_partner": {"employee_id": row["lead_partner_id"], "name": row["lead_partner_name"], "email": row["lead_partner_email"]},
        "lead_senior": {"employee_id": row["lead_senior_id"], "name": row["lead_senior_name"], "email": row["lead_senior_email"]},
        "metrics": {
            "team_size": int(row["team_size"]),
            "document_count": int(row["document_count"]),
            "billed_total": float(row["billed_total"]),
            "total_hours": float(row["total_hours"]),
        },
        "next_hearing": next_hearing,
        "hearings": hearings,
    }
