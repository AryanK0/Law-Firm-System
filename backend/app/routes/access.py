from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from pymysql import MySQLError

from ..services import access_service

router = APIRouter(prefix="/access", tags=["access"])


class AccessCheckInput(BaseModel):
    employee_id: int
    resource_type: str
    resource_id: int
    action: str


class AccessRequestInput(BaseModel):
    employee_id: int
    resource_type: str
    resource_id: int
    permission: str
    reason: str | None = None


class AccessApprovalInput(BaseModel):
    approver_id: int


class DelegationInput(BaseModel):
    from_employee: int
    to_employee: int
    permission: str
    valid_to: str
    valid_from: str | None = None


class CaseAccessUpdateInput(BaseModel):
    approver_id: int
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
def check_access(payload: AccessCheckInput, request: Request):
    try:
        return access_service.check_access(
            payload.employee_id,
            payload.resource_type,
            payload.resource_id,
            payload.action,
            request.client.host if request.client else None,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/request")
def request_access(payload: AccessRequestInput):
    try:
        return access_service.request_access(
            payload.employee_id,
            payload.resource_type,
            payload.resource_id,
            payload.permission,
            payload.reason,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/approve/{request_id}")
def approve_request(request_id: int, payload: AccessApprovalInput):
    try:
        return access_service.approve_request(request_id, payload.approver_id)
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/delegations")
def delegate_access(payload: DelegationInput):
    try:
        return access_service.delegate_access(
            payload.from_employee,
            payload.to_employee,
            payload.permission,
            payload.valid_to,
            payload.valid_from,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/case-access")
def update_case_access(payload: CaseAccessUpdateInput):
    try:
        return access_service.update_case_access(
            payload.approver_id,
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
