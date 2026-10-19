from datetime import date
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.database import get_db
from ..domain.trust_domain import (
    deposit_trust_funds_domain,
    disburse_trust_funds_domain,
    execute_three_way_reconciliation_domain,
    get_client_trust_summary_domain,
    get_trust_accounts_domain,
    transfer_earned_fee_domain,
)

router = APIRouter(prefix="/trust", tags=["trust"])


class DepositInput(BaseModel):
    account_id: int
    client_id: int
    amount: Decimal
    payee_or_payor: str
    case_id: int | None = None
    reference_number: str | None = None
    description: str | None = None


class DisburseInput(BaseModel):
    account_id: int
    client_id: int
    amount: Decimal
    payee_or_payor: str
    case_id: int | None = None
    reference_number: str | None = None
    description: str | None = None


class EarnedFeeTransferInput(BaseModel):
    iolta_account_id: int
    operating_account_id: int
    client_id: int
    amount: Decimal
    case_id: int | None = None
    reference_number: str | None = None
    invoice_number: str | None = None


class ThreeWayReconciliationInput(BaseModel):
    account_id: int
    statement_date: date
    bank_statement_balance: Decimal
    notes: str | None = None


@router.get("/accounts", summary="List firm IOLTA Trust and Operating accounts")
async def get_trust_accounts(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns segregated IOLTA and Operating accounts with ledger balances."""
    return await get_trust_accounts_domain(db)


@router.post("/deposit", summary="Deposit client escrow funds into IOLTA trust")
async def deposit_trust_funds(
    payload: DepositInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Deposits funds into a client's IOLTA trust account.
    Segregates client escrow from firm operating capital.
    """
    return await deposit_trust_funds_domain(
        db=db,
        account_id=payload.account_id,
        client_id=payload.client_id,
        case_id=payload.case_id,
        amount=payload.amount,
        payee_or_payor=payload.payee_or_payor,
        reference_number=payload.reference_number,
        description=payload.description,
        employee_id=user.employee_id,
    )


@router.post("/disburse", summary="Disburse funds from IOLTA trust with ABA Model Rule 1.15 overdraft prevention")
async def disburse_trust_funds(
    payload: DisburseInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Disburses funds from a client's IOLTA trust account.
    Strictly prohibits overdrafts (client balance cannot drop below $0.00).
    """
    return await disburse_trust_funds_domain(
        db=db,
        account_id=payload.account_id,
        client_id=payload.client_id,
        case_id=payload.case_id,
        amount=payload.amount,
        payee_or_payor=payload.payee_or_payor,
        reference_number=payload.reference_number,
        description=payload.description,
        employee_id=user.employee_id,
    )


@router.post("/transfer-earned-fee", summary="Transfer earned legal fees from IOLTA Trust to Operating Account")
async def transfer_earned_fee(
    payload: EarnedFeeTransferInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Transfers earned fees from IOLTA Trust to Operating Account upon milestone or bill approval.
    """
    return await transfer_earned_fee_domain(
        db=db,
        iolta_account_id=payload.iolta_account_id,
        operating_account_id=payload.operating_account_id,
        client_id=payload.client_id,
        case_id=payload.case_id,
        amount=payload.amount,
        reference_number=payload.reference_number,
        invoice_number=payload.invoice_number,
        employee_id=user.employee_id,
    )


@router.post("/reconciliation/three-way", summary="Execute automated Three-Way Reconciliation audit")
async def three_way_reconciliation(
    payload: ThreeWayReconciliationInput,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Performs Three-Way Reconciliation:
    1. Bank Statement Ending Balance
    2. General Ledger Balance
    3. Individual Client Subsidiary Ledgers Total
    
    Verifies variance equals $0.00 and generates detailed client balance breakdown.
    """
    return await execute_three_way_reconciliation_domain(
        db=db,
        account_id=payload.account_id,
        statement_date=payload.statement_date,
        bank_statement_balance=payload.bank_statement_balance,
        reconciled_by=user.employee_id,
        notes=payload.notes,
    )


@router.get("/clients/{client_id}", summary="Get individual client trust ledger and running balance")
async def get_client_trust_summary(
    client_id: int,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns trust ledger and running balance for an individual client."""
    return await get_client_trust_summary_domain(db, client_id)
