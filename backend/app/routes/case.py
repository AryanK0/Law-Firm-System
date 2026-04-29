from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pymysql import MySQLError

from ..services import case_service, document_service, overview_service

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
    approver_id: int


@router.get(
    "/overview",
    tags=["overview"],
    summary="Return a firm-wide operational overview for the frontend workspace",
)
def get_overview():
    return overview_service.get_overview()


@router.get("/cases", tags=["cases"], summary="List case records for the matter workspace")
def get_cases(employee_id: int):
    return case_service.list_cases(employee_id)


@router.get("/cases/{case_id}", tags=["cases"], summary="Get full case detail")
def get_case(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_detail(case_id)


@router.get("/cases/{case_id}/team", tags=["cases"], summary="List team members assigned to a case")
def get_case_team(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_team(case_id)


@router.post("/cases/{case_id}/team", tags=["cases"], summary="Assign a team member through a stored procedure")
def assign_case_team(case_id: int, payload: CaseTeamAssignmentInput):
    try:
        case_service.assign_case_team_member(
            case_id=case_id,
            employee_id=payload.employee_id,
            role_in_case=payload.role_in_case,
            assigned_by=payload.assigned_by,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return case_service.get_case_team(case_id)


@router.get("/cases/{case_id}/documents", tags=["cases"], summary="List documents attached to a case")
def get_case_documents(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return document_service.list_case_documents(case_id)


@router.get("/cases/{case_id}/status-history", tags=["cases"], summary="List case status updates")
def get_case_status_history(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_status_history(case_id)


@router.get("/cases/{case_id}/billing", tags=["cases"], summary="Return billing summary for a case")
def get_case_billing(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_billing(case_id)


@router.post("/billing/{bill_id}/approve", tags=["cases"], summary="Approve billing through a stored procedure")
def approve_billing(bill_id: int, payload: BillingApprovalInput):
    try:
        return case_service.approve_billing_entry(
            bill_id=bill_id,
            approver_id=payload.approver_id,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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


@router.post("/cases", tags=["cases"], summary="Create a new matter")
def create_case(payload: CaseInput):
    try:
        return case_service.create_case(
            case_code=payload.case_code,
            title=payload.title,
            description=payload.description,
            case_type=payload.case_type,
            client_id=payload.client_id,
            lead_partner_id=payload.lead_partner_id,
            lead_senior_id=payload.lead_senior_id,
            status=payload.status,
            confidentiality_level=payload.confidentiality_level,
            created_by=payload.created_by,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
    except MySQLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/analytics", tags=["cases"], summary="Return chart-ready metrics for the dashboard")
def analytics():
    return overview_service.get_analytics()
