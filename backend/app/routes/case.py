from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel
from pymysql import MySQLError

from ..db import execute, fetch_all, fetch_one
from ..services import case_service, document_service, overview_service

router = APIRouter(tags=["cases"])


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


@router.get("/cases", summary="List case records for the matter workspace")
def get_cases(employee_id: int):
    return case_service.list_cases(employee_id)


@router.get("/cases/{case_id}", summary="Get full case detail")
def get_case(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_detail(case_id)


@router.get("/cases/{case_id}/team", summary="List team members assigned to a case")
def get_case_team(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_team(case_id)


@router.get("/cases/{case_id}/documents", summary="List documents attached to a case")
def get_case_documents(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return document_service.list_case_documents(case_id)


@router.get("/cases/{case_id}/status-history", summary="List case status updates")
def get_case_status_history(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_status_history(case_id)


@router.get("/cases/{case_id}/billing", summary="Return billing summary for a case")
def get_case_billing(case_id: int, employee_id: int):
    case_service.ensure_case_access(employee_id, case_id)
    return case_service.get_case_billing(case_id)


@router.get("/clients", summary="List clients available for matter intake")
def get_clients():
    return fetch_all(
        """
        SELECT client_id, name, organization, contact_info
        FROM Client
        ORDER BY organization, name
        """
    )


@router.post("/clients", summary="Create a new client record")
def create_client(payload: ClientInput):
    if not (payload.name or payload.organization):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail="Provide either a client name or organization.",
        )

    try:
        client_id = execute(
            """
            INSERT INTO Client(name, contact_info, organization)
            VALUES (%s, %s, %s)
            """,
            (payload.name, payload.contact_info, payload.organization),
        )
    except MySQLError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return fetch_one(
        """
        SELECT client_id, name, organization, contact_info
        FROM Client
        WHERE client_id = %s
        """,
        (client_id,),
    )


@router.post("/cases", summary="Create a new matter")
def create_case(payload: CaseInput):
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


@router.get("/analytics", summary="Return chart-ready metrics for the dashboard")
def analytics():
    return overview_service.get_analytics()
