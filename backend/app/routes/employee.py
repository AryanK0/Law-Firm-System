from fastapi import APIRouter

from ..services import employee_service

router = APIRouter(tags=["employees"])


@router.get("/employees", summary="List the employee directory with access context")
def get_employees():
    return employee_service.list_employees()


@router.get("/roles", summary="List roles ordered by hierarchy")
def get_roles():
    return employee_service.list_roles()
