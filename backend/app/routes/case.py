from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymysql import MySQLError

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.database import get_db
from ..domain.case_domain import (
    approve_billing_entry_domain,
    assign_case_team_member_domain,
    close_case_domain,
    create_case_domain,
    get_case_detail_domain,
)
from ..services import case_service, document_service, overview_service
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.cache import cache, invalidate_case_cache

router = APIRouter()


class CaseInput(BaseModel):
    title: str
    description: str | None = None
    client_id: int
    case_code: str | None = None
    case_type: str | None = None
    lead_partner_id: int | None = None
    lead_senior_id: int | None = None
    status: str = "Open"
    confidentiality_level: str = "Internal"
    created_by: int | None = None
    start_date: date | None = None
    end_date: date | None = None


class ClientInput(BaseModel):
    name: str | None = None
    organization: str | None = None
    contact_info: str | None = None


class CaseTeamAssignmentInput(BaseModel):
    employee_id: int
    role_in_case: str
    assigned_by: int | None = None


class BillingApprovalInput(BaseModel):
    approver_id: int | None = None


@router.get(
    "/overview",
    tags=["overview"],
    summary="Return a firm-wide operational overview for the frontend workspace",
)
def get_overview():
    return overview_service.get_overview()


@router.get("/cases", tags=["cases"], summary="List case records for the matter workspace")
def get_cases(user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return case_service.list_cases(user.employee_id)


@router.get("/cases/{case_id}", tags=["cases"], summary="Get full case detail")
async def get_case(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    case_service.ensure_case_access(user.employee_id, case_id)
    cache_key = f"case:detail:{case_id}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached

    detail = await get_case_detail_domain(db, case_id)
    await cache.set_json(cache_key, detail, ttl=300)
    return detail


@router.get("/cases/{case_id}/team", tags=["cases"], summary="List team members assigned to a case")
def get_case_team(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    case_service.ensure_case_access(user.employee_id, case_id)
    return case_service.get_case_team(case_id)


@router.post("/cases/{case_id}/team", tags=["cases"], summary="Assign a team member through domain logic")
async def assign_case_team(
    case_id: int,
    payload: CaseTeamAssignmentInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    assigned_by = payload.assigned_by or user.employee_id
    await assign_case_team_member_domain(
        db=db,
        case_id=case_id,
        employee_id=payload.employee_id,
        role_in_case=payload.role_in_case,
        assigned_by=assigned_by,
    )
    await invalidate_case_cache(case_id)
    return case_service.get_case_team(case_id)


@router.get("/cases/{case_id}/documents", tags=["cases"], summary="List documents attached to a case")
def get_case_documents(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    case_service.ensure_case_access(user.employee_id, case_id)
    return document_service.list_case_documents(case_id)


@router.get("/cases/{case_id}/status-history", tags=["cases"], summary="List case status updates")
def get_case_status_history(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    case_service.ensure_case_access(user.employee_id, case_id)
    return case_service.get_case_status_history(case_id)


@router.get("/cases/{case_id}/billing", tags=["cases"], summary="Return billing summary for a case")
def get_case_billing(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    case_service.ensure_case_access(user.employee_id, case_id)
    return case_service.get_case_billing(case_id)


@router.post("/billing/{bill_id}/approve", tags=["cases"], summary="Approve billing through domain logic with OCC")
async def approve_billing(
    bill_id: int,
    payload: BillingApprovalInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    approver_id = payload.approver_id or user.employee_id
    return await approve_billing_entry_domain(
        db=db,
        bill_id=bill_id,
        approver_id=approver_id,
    )


@router.get("/billing/utbms-codes", tags=["cases"], summary="Return UTBMS standard task, activity, and expense codes")
def get_utbms_codes():
    """Returns official UTBMS task, activity, and expense codes."""
    from ..domain.ledes_domain import get_utbms_reference_data
    return get_utbms_reference_data()


@router.get("/billing/{bill_id}/ledes", tags=["cases"], summary="Generate and validate LEDES 1998B format invoice")
async def get_ledes_invoice(
    bill_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generates certified LEDES 1998B format ebilling file with 24 standardized fields."""
    from ..domain.ledes_domain import generate_ledes_1998b_invoice_domain
    return await generate_ledes_1998b_invoice_domain(db, bill_id=bill_id)


@router.get("/billing/{bill_id}/ledes/download", tags=["cases"], summary="Download certified LEDES 1998B flat file")
async def download_ledes_invoice(
    bill_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Downloads flat file formatted in standard LEDES 1998B delimiter specification."""
    from fastapi import Response
    from ..domain.ledes_domain import generate_ledes_1998b_invoice_domain
    result = await generate_ledes_1998b_invoice_domain(db, bill_id=bill_id)
    return Response(
        content=result["file_content"],
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{result["file_name"]}"'},
    )


@router.get("/clients", tags=["cases"], summary="List clients available for matter intake")
def get_clients():
    return case_service.list_clients()


@router.post("/clients", tags=["cases"], summary="Create a new client record")
def create_client(payload: ClientInput):
    try:
        return case_service.create_client_record(
            name=payload.name,
            organization=payload.organization,
            contact_info=payload.contact_info,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/cases", tags=["cases"], summary="Create a new matter via domain transaction")
async def create_case(
    payload: CaseInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    created_by = payload.created_by or user.employee_id
    result = await create_case_domain(
        db=db,
        case_code=payload.case_code,
        title=payload.title,
        description=payload.description,
        case_type=payload.case_type,
        client_id=payload.client_id,
        lead_partner_id=payload.lead_partner_id,
        lead_senior_id=payload.lead_senior_id,
        status_str=payload.status,
        confidentiality_level=payload.confidentiality_level,
        created_by=created_by,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    await invalidate_case_cache(result["case_id"])
    return result


@router.get("/analytics", tags=["cases"], summary="Return chart-ready metrics for the dashboard")
def analytics():
    return overview_service.get_analytics()


@router.post("/cases/{case_id}/close", tags=["cases"], summary="Close a matter via domain service")
async def close_case(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await close_case_domain(
        db=db,
        case_id=case_id,
        employee_id=user.employee_id,
    )
    await invalidate_case_cache(case_id)
    return result


class LegalHoldInput(BaseModel):
    legal_hold: bool = True
    reason: str | None = None


@router.post("/cases/{case_id}/legal-hold", tags=["cases"], summary="Set or release legal hold on a matter")
async def set_legal_hold(
    case_id: int,
    payload: LegalHoldInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from ..domain.storage_domain import set_case_legal_hold_domain
    result = await set_case_legal_hold_domain(
        db=db,
        case_id=case_id,
        legal_hold=payload.legal_hold,
        reason=payload.reason,
        employee_id=user.employee_id,
    )
    await invalidate_case_cache(case_id)
    return result


@router.get("/cases/{case_id}/legal-hold", tags=["cases"], summary="Get legal hold status for a matter")
async def get_legal_hold(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    case_detail = await get_case_detail_domain(db, case_id)
    return {
        "case_id": case_id,
        "legal_hold": case_detail.get("legal_hold", False),
        "legal_hold_reason": case_detail.get("legal_hold_reason"),
        "legal_hold_by": case_detail.get("legal_hold_by"),
        "legal_hold_at": case_detail.get("legal_hold_at"),
    }

