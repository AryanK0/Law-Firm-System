from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from pymysql import MySQLError

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.database import get_db
from ..domain.access_domain import (
    approve_access_request_domain,
    check_access_domain,
    request_access_domain,
)
from ..services import access_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/access", tags=["access"])


class AccessCheckInput(BaseModel):
    employee_id: int | None = None
    resource_type: str
    resource_id: int
    action: str


class AccessRequestInput(BaseModel):
    employee_id: int | None = None
    resource_type: str
    resource_id: int
    permission: str
    reason: str | None = None


class AccessApprovalInput(BaseModel):
    approver_id: int | None = None


class DelegationInput(BaseModel):
    from_employee: int | None = None
    to_employee: int
    permission: str
    valid_to: str
    valid_from: str | None = None


class CaseAccessUpdateInput(BaseModel):
    approver_id: int | None = None
    employee_id: int
    case_id: int
    case_role: str | None = None
    can_view: bool = True
    can_edit: bool = False
    can_upload_docs: bool = False
    can_approve_docs: bool = False
    can_close_case: bool = False
    can_assign_members: bool = False


@router.get("/dashboard")
def get_access_dashboard():
    return access_service.dashboard()


@router.post("/check")
async def check_access(
    payload: AccessCheckInput,
    request: Request,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    emp_id = payload.employee_id or user.employee_id
    return await check_access_domain(
        db=db,
        employee_id=emp_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        action=payload.action,
        ip_address=request.client.host if request.client else None,
    )


@router.post("/request")
async def request_access(
    payload: AccessRequestInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    emp_id = payload.employee_id or user.employee_id
    return await request_access_domain(
        db=db,
        employee_id=emp_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        permission=payload.permission,
        reason=payload.reason,
    )


@router.post("/approve/{request_id}")
async def approve_request(
    request_id: int,
    payload: AccessApprovalInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    approver_id = payload.approver_id or user.employee_id
    return await approve_access_request_domain(
        db=db,
        request_id=request_id,
        approver_id=approver_id,
    )


@router.post("/delegations")
def delegate_access(
    payload: DelegationInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    from_emp = payload.from_employee or user.employee_id
    try:
        return access_service.delegate_access(
            from_emp,
            payload.to_employee,
            payload.permission,
            payload.valid_to,
            payload.valid_from,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/case-access")
def update_case_access(
    payload: CaseAccessUpdateInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    approver_id = payload.approver_id or user.employee_id
    try:
        return access_service.update_case_access(
            approver_id,
            payload.employee_id,
            payload.case_id,
            payload.case_role,
            payload.can_view,
            payload.can_edit,
            payload.can_upload_docs,
            payload.can_approve_docs,
            payload.can_close_case,
            payload.can_assign_members,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/violations")
def get_violations():
    return access_service.list_violations()


@router.get("/delegations")
def get_delegations():
    return access_service.list_delegations()
