from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..services import dbms_service

router = APIRouter(prefix="/dbms", tags=["systems"])


class CheckpointInput(BaseModel):
    name: str | None = None
    notes: str | None = None


def _require_systems_viewer(employee_id: int):
    try:
        return dbms_service.require_systems_viewer(employee_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/checkpoint/create", summary="Create a continuity snapshot")
def create_checkpoint(payload: CheckpointInput | None = None, employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    raise HTTPException(status_code=403, detail="Systems Oversight is view-only for Benjamin.")


@router.get("/checkpoint/list", summary="List continuity snapshot history")
def list_checkpoints(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_checkpoints()


@router.post("/recovery/{txn_id}", summary="Resolve an interrupted activity")
def recover_transaction(txn_id: int, employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    raise HTTPException(status_code=403, detail="Systems Oversight is view-only for Benjamin.")


@router.get("/reports/cases", summary="Return case workload reports")
def get_case_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_case_reports()


@router.get("/reports/employees", summary="Return employee workload reports")
def get_employee_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_employee_reports()


@router.get("/reports/tickets", summary="Return ticket service reports")
def get_ticket_reports(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.generate_ticket_reports()


@router.get("/locks", summary="List protected record activity")
def get_locks(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_locks()


@router.get("/transactions", summary="List recent and interrupted activity")
def get_transactions(employee_id: int = Query(...)):
    _require_systems_viewer(employee_id)
    return dbms_service.list_transactions()
