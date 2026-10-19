from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.database import get_db
from ..domain.conflict_domain import (
    add_case_adverse_party_domain,
    check_conflict_of_interest_domain,
    get_case_adverse_parties_domain,
)

router = APIRouter(prefix="/conflicts", tags=["conflicts"])


class ConflictCheckInput(BaseModel):
    query: str
    target_matter_type: str | None = None
    proposed_client_name: str | None = None
    proposed_adverse_party: str | None = None


class AdversePartyInput(BaseModel):
    party_name: str
    party_type: str = "OPPOSING_PARTY"  # 'OPPOSING_PARTY', 'CO_DEFENDANT', 'KEY_WITNESS', 'AFFILIATE'
    corporate_affiliate: str | None = None


@router.post("/check", summary="Execute deep Boolean conflict of interest check")
async def check_conflict(
    payload: ConflictCheckInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Evaluates potential conflicts using Boolean search logic (AND, OR, NOT)
    across clients, adverse parties, opposing counsel, and attorney restrictions.
    Classifies risk under ABA Model Rules 1.7, 1.9, and 1.10.
    """
    return await check_conflict_of_interest_domain(
        db=db,
        query=payload.query,
        target_matter_type=payload.target_matter_type,
        proposed_client_name=payload.proposed_client_name,
        proposed_adverse_party=payload.proposed_adverse_party,
    )


@router.post("/cases/{case_id}/adverse-parties", summary="Register adverse party for a matter")
async def add_case_adverse_party(
    case_id: int,
    payload: AdversePartyInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Adds an opposing party, co-defendant, or key witness to a matter."""
    return await add_case_adverse_party_domain(
        db=db,
        case_id=case_id,
        party_name=payload.party_name,
        party_type=payload.party_type,
        corporate_affiliate=payload.corporate_affiliate,
    )


@router.get("/cases/{case_id}/adverse-parties", summary="List adverse parties registered for a matter")
async def get_case_adverse_parties(
    case_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns all adverse parties registered for a matter."""
    return await get_case_adverse_parties_domain(db, case_id)
