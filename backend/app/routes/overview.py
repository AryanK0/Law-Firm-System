from fastapi import APIRouter

from ..services import overview_service

router = APIRouter(tags=["overview"])


@router.get(
    "/overview",
    summary="Return a firm-wide operational overview for the frontend workspace",
)
def get_overview():
    return overview_service.get_overview()
