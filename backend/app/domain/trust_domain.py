from datetime import date, datetime
from decimal import Decimal
import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import transaction_scope
from ..core.locking import distributed_lock
from ..models.core import Case, Client, Employee, ThreeWayReconciliation, TrustAccount, TrustTransaction

logger = logging.getLogger("lfms.trust_domain")


async def ensure_default_trust_accounts(db: AsyncSession) -> None:
    """
    Ensures standard segregated IOLTA Trust and Operating accounts exist.
    """
    res = await db.execute(select(func.count(TrustAccount.account_id)))
    count = res.scalar_one_or_none() or 0
    if count == 0:
        iolta = TrustAccount(
            account_number="IOLTA-CHASE-0019482",
            account_name="Primary Client Trust Account (IOLTA)",
            account_type="IOLTA_TRUST",
            bank_name="JPMorgan Chase Bank, N.A.",
            current_balance=Decimal("250000.00"),
            version=1,
            created_at=datetime.utcnow(),
        )
        operating = TrustAccount(
            account_number="OP-CHASE-0083921",
            account_name="Firm General Operating Account",
            account_type="OPERATING",
            bank_name="JPMorgan Chase Bank, N.A.",
            current_balance=Decimal("750000.00"),
            version=1,
            created_at=datetime.utcnow(),
        )
        db.add_all([iolta, operating])
        await db.flush()

        # Seed initial trust deposit for client #1
        initial_txn = TrustTransaction(
            account_id=iolta.account_id,
            client_id=1,
            transaction_type="DEPOSIT",
            amount=Decimal("250000.00"),
            running_balance=Decimal("250000.00"),
            client_running_balance=Decimal("250000.00"),
            reference_number="WIRE-INIT-001",
            payee_or_payor="TechCorp International Inc.",
            description="Initial retainer deposit into escrow trust",
            cleared=True,
            created_by=1,
            created_at=datetime.utcnow(),
        )
        db.add(initial_txn)
        await db.commit()
        logger.info("Seeded initial segregated IOLTA and Operating accounts.")


async def get_trust_accounts_domain(db: AsyncSession) -> list[dict[str, Any]]:
    """Returns all firm accounts (IOLTA Trust and Operating)."""
    await ensure_default_trust_accounts(db)

    res = await db.execute(select(TrustAccount).order_by(TrustAccount.account_type.desc()))
    accounts = res.scalars().all()
    results = []
    for acct in accounts:
        # Count transactions
        tx_count_res = await db.execute(
            select(func.count(TrustTransaction.transaction_id)).where(TrustTransaction.account_id == acct.account_id)
        )
        tx_count = tx_count_res.scalar_one_or_none() or 0

        results.append({
            "account_id": acct.account_id,
            "account_number": acct.account_number,
            "account_name": acct.account_name,
            "account_type": acct.account_type,
            "bank_name": acct.bank_name,
            "current_balance": float(acct.current_balance),
            "version": acct.version,
            "transaction_count": tx_count,
            "created_at": str(acct.created_at),
        })
    return results


async def get_client_trust_balance_internal(db: AsyncSession, client_id: int) -> Decimal:
    """Calculates the exact current trust balance for an individual client."""
    # Sum of deposits minus disbursements and earned fee transfers
    stmt = (
        select(
            func.coalesce(
                func.sum(
                    case_expr=(
                        (TrustTransaction.transaction_type == "DEPOSIT", TrustTransaction.amount)
                    ),
                    else_= -TrustTransaction.amount,
                ),
                Decimal("0.00"),
            )
        )
        .join(TrustAccount, TrustTransaction.account_id == TrustAccount.account_id)
        .where(
            TrustAccount.account_type == "IOLTA_TRUST",
            TrustTransaction.client_id == client_id,
        )
    )
    # Using explicit case when
    calc_stmt = text(
        """
        SELECT COALESCE(SUM(
            CASE 
                WHEN tt.transaction_type = 'DEPOSIT' THEN tt.amount
                ELSE -tt.amount
            END
        ), 0.00) AS client_balance
        FROM trust_transaction tt
        JOIN trust_account ta ON tt.account_id = ta.account_id
        WHERE ta.account_type = 'IOLTA_TRUST' AND tt.client_id = :cid
        """
    )
    res = await db.execute(calc_stmt, {"cid": client_id})
    val = res.scalar()
    return Decimal(str(val or "0.00"))


async def deposit_trust_funds_domain(
    db: AsyncSession,
    *,
    account_id: int,
    client_id: int,
    case_id: int | None,
    amount: Decimal,
    payee_or_payor: str,
    reference_number: str | None,
    description: str | None,
    employee_id: int,
) -> dict[str, Any]:
    """
    Deposits funds into a client's IOLTA trust account.
    Never commingles with firm operating capital.
    """
    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deposit amount must be strictly greater than $0.00.",
        )

    async with distributed_lock("trust_account", account_id, locked_by=employee_id):
        async with transaction_scope(db):
            acct_res = await db.execute(select(TrustAccount).where(TrustAccount.account_id == account_id))
            account = acct_res.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trust account not found.")

            if account.account_type != "IOLTA_TRUST":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Target account {account.account_name} is not an IOLTA Trust Account. Commingling prohibited.",
                )

            # Check client
            client_res = await db.execute(select(Client).where(Client.client_id == client_id))
            client = client_res.scalar_one_or_none()
            if not client:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

            # Current balances
            current_client_balance = await get_client_trust_balance_internal(db, client_id)
            new_client_balance = current_client_balance + amount

            account.current_balance = account.current_balance + amount
            account.version = account.version + 1

            txn = TrustTransaction(
                account_id=account.account_id,
                client_id=client_id,
                case_id=case_id,
                transaction_type="DEPOSIT",
                amount=amount,
                running_balance=account.current_balance,
                client_running_balance=new_client_balance,
                reference_number=reference_number or f"DEP-{int(datetime.utcnow().timestamp())}",
                payee_or_payor=payee_or_payor,
                description=description or "Escrow / Trust Retainer Deposit",
                cleared=True,
                created_by=employee_id,
                created_at=datetime.utcnow(),
            )
            db.add(txn)
            await db.flush()

            # Transaction audit log
            audit_stmt = text(
                """
                INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
                VALUES ('IOLTA_DEPOSIT', 'trust_transaction', :rec_id, 'INSERT', 'Committed', NOW())
                """
            )
            await db.execute(audit_stmt, {"rec_id": txn.transaction_id})

    return {
        "transaction_id": txn.transaction_id,
        "account_id": account.account_id,
        "client_id": client_id,
        "client_name": client.name,
        "transaction_type": "DEPOSIT",
        "amount": float(amount),
        "account_running_balance": float(account.current_balance),
        "client_running_balance": float(new_client_balance),
        "reference_number": txn.reference_number,
        "created_at": str(txn.created_at),
        "message": f"Successfully deposited ${amount:,.2f} into IOLTA trust for {client.name}.",
    }


async def disburse_trust_funds_domain(
    db: AsyncSession,
    *,
    account_id: int,
    client_id: int,
    case_id: int | None,
    amount: Decimal,
    payee_or_payor: str,
    reference_number: str | None,
    description: str | None,
    employee_id: int,
) -> dict[str, Any]:
    """
    Disburses funds from a client's IOLTA trust account to a third party (e.g. settlement, court fee).
    Strict ABA Model Rule 1.15 overdraft prevention:
    A client's trust balance can NEVER drop below zero.
    """
    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disbursement amount must be strictly greater than $0.00.",
        )

    async with distributed_lock("trust_account", account_id, locked_by=employee_id):
        async with transaction_scope(db):
            acct_res = await db.execute(select(TrustAccount).where(TrustAccount.account_id == account_id))
            account = acct_res.scalar_one_or_none()
            if not account or account.account_type != "IOLTA_TRUST":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid IOLTA trust account.")

            # Strict Client Balance Overdraft Check
            current_client_balance = await get_client_trust_balance_internal(db, client_id)
            if current_client_balance < amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"IOLTA Overdraft Prohibited (ABA Model Rule 1.15): "
                        f"Client #{client_id} current trust balance is ${current_client_balance:,.2f}, "
                        f"which is insufficient to disburse ${amount:,.2f}. "
                        "Using other clients' trust funds is an ethical violation."
                    ),
                )

            new_client_balance = current_client_balance - amount
            account.current_balance = account.current_balance - amount
            account.version = account.version + 1

            txn = TrustTransaction(
                account_id=account.account_id,
                client_id=client_id,
                case_id=case_id,
                transaction_type="DISBURSEMENT",
                amount=amount,
                running_balance=account.current_balance,
                client_running_balance=new_client_balance,
                reference_number=reference_number or f"DISB-{int(datetime.utcnow().timestamp())}",
                payee_or_payor=payee_or_payor,
                description=description or "Third-party escrow disbursement",
                cleared=True,
                created_by=employee_id,
                created_at=datetime.utcnow(),
            )
            db.add(txn)
            await db.flush()

            # Transaction audit log
            audit_stmt = text(
                """
                INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
                VALUES ('IOLTA_DISBURSEMENT', 'trust_transaction', :rec_id, 'INSERT', 'Committed', NOW())
                """
            )
            await db.execute(audit_stmt, {"rec_id": txn.transaction_id})

    return {
        "transaction_id": txn.transaction_id,
        "account_id": account.account_id,
        "client_id": client_id,
        "transaction_type": "DISBURSEMENT",
        "amount": float(amount),
        "account_running_balance": float(account.current_balance),
        "client_running_balance": float(new_client_balance),
        "reference_number": txn.reference_number,
        "created_at": str(txn.created_at),
        "message": f"Disbursed ${amount:,.2f} from IOLTA trust.",
    }


async def transfer_earned_fee_domain(
    db: AsyncSession,
    *,
    iolta_account_id: int,
    operating_account_id: int,
    client_id: int,
    case_id: int | None,
    amount: Decimal,
    reference_number: str | None,
    invoice_number: str | None,
    employee_id: int,
) -> dict[str, Any]:
    """
    Transfers earned legal fees from IOLTA Trust Account to Firm Operating Account.
    Enforces that funds are earned and available before transferring.
    """
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer amount must be > $0.00.")

    async with distributed_lock("trust_account", iolta_account_id, locked_by=employee_id):
        async with transaction_scope(db):
            # 1. Fetch accounts
            iolta_res = await db.execute(select(TrustAccount).where(TrustAccount.account_id == iolta_account_id))
            iolta = iolta_res.scalar_one_or_none()
            op_res = await db.execute(select(TrustAccount).where(TrustAccount.account_id == operating_account_id))
            operating = op_res.scalar_one_or_none()

            if not iolta or iolta.account_type != "IOLTA_TRUST":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source must be an IOLTA Trust account.")
            if not operating or operating.account_type != "OPERATING":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination must be an Operating account.")

            # 2. Check client trust balance
            client_bal = await get_client_trust_balance_internal(db, client_id)
            if client_bal < amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot transfer ${amount:,.2f}: Client #{client_id} trust balance is only ${client_bal:,.2f}.",
                )

            # 3. Debit IOLTA Trust
            new_client_bal = client_bal - amount
            iolta.current_balance = iolta.current_balance - amount
            iolta.version = iolta.version + 1

            debit_txn = TrustTransaction(
                account_id=iolta.account_id,
                client_id=client_id,
                case_id=case_id,
                transaction_type="EARNED_FEE_TRANSFER",
                amount=amount,
                running_balance=iolta.current_balance,
                client_running_balance=new_client_bal,
                reference_number=reference_number or f"FEE-XFR-{int(datetime.utcnow().timestamp())}",
                payee_or_payor=operating.account_name,
                description=f"Earned fee transfer to operating account (Inv #{invoice_number or 'N/A'})",
                cleared=True,
                created_by=employee_id,
                created_at=datetime.utcnow(),
            )
            db.add(debit_txn)

            # 4. Credit Operating
            operating.current_balance = operating.current_balance + amount
            operating.version = operating.version + 1

            credit_txn = TrustTransaction(
                account_id=operating.account_id,
                client_id=client_id,
                case_id=case_id,
                transaction_type="DEPOSIT",
                amount=amount,
                running_balance=operating.current_balance,
                client_running_balance=Decimal("0.00"),
                reference_number=debit_txn.reference_number,
                payee_or_payor=iolta.account_name,
                description=f"Earned fee transfer received from client trust #{client_id}",
                cleared=True,
                created_by=employee_id,
                created_at=datetime.utcnow(),
            )
            db.add(credit_txn)
            await db.flush()

    return {
        "message": f"Successfully transferred ${amount:,.2f} in earned fees from IOLTA Trust to Operating account.",
        "amount": float(amount),
        "iolta_balance": float(iolta.current_balance),
        "operating_balance": float(operating.current_balance),
        "client_remaining_trust": float(new_client_bal),
        "transfer_reference": debit_txn.reference_number,
    }


async def execute_three_way_reconciliation_domain(
    db: AsyncSession,
    *,
    account_id: int,
    statement_date: date,
    bank_statement_balance: Decimal,
    reconciled_by: int,
    notes: str | None = None,
) -> dict[str, Any]:
    """
    Automated Three-Way Reconciliation Engine:
    1. Bank Statement Balance (provided from monthly bank statement).
    2. General Ledger Balance (current trust account balance).
    3. Individual Client Subsidiary Ledgers Total (sum of each client's trust balance).
    
    Verifies that all three figures match to the cent (Variance == 0.00).
    """
    async with transaction_scope(db):
        acct_res = await db.execute(select(TrustAccount).where(TrustAccount.account_id == account_id))
        account = acct_res.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

        # 1. General Ledger Balance
        general_ledger_balance = account.current_balance

        # 2. Individual Client Subsidiary Ledgers
        client_stmt = text(
            """
            SELECT c.client_id, c.name,
                   COALESCE(SUM(
                       CASE 
                           WHEN tt.transaction_type = 'DEPOSIT' THEN tt.amount
                           ELSE -tt.amount
                       END
                   ), 0.00) AS client_balance
            FROM client c
            JOIN trust_transaction tt ON c.client_id = tt.client_id
            WHERE tt.account_id = :aid
            GROUP BY c.client_id, c.name
            HAVING client_balance <> 0.00
            ORDER BY c.name
            """
        )
        client_rows = (await db.execute(client_stmt, {"aid": account_id})).mappings().all()
        client_ledger_balance = sum((Decimal(str(r["client_balance"])) for r in client_rows), Decimal("0.00"))

        client_breakdown = [
            {
                "client_id": r["client_id"],
                "client_name": r["name"],
                "trust_balance": float(r["client_balance"]),
            }
            for r in client_rows
        ]

        # 3. Variance calculation
        variance_gl_vs_bank = bank_statement_balance - general_ledger_balance
        variance_gl_vs_client = general_ledger_balance - client_ledger_balance
        total_variance = abs(variance_gl_vs_bank) + abs(variance_gl_vs_client)

        is_balanced = (total_variance == Decimal("0.00"))
        recon_status = "BALANCED" if is_balanced else "DISCREPANCY"

        recon = ThreeWayReconciliation(
            account_id=account.account_id,
            statement_date=statement_date,
            bank_statement_balance=bank_statement_balance,
            general_ledger_balance=general_ledger_balance,
            client_ledger_balance=client_ledger_balance,
            variance=total_variance,
            status=recon_status,
            reconciled_by=reconciled_by,
            reconciled_at=datetime.utcnow(),
            notes=notes or ("Three-way reconciliation certified in balance." if is_balanced else "Variance detected between bank and trust ledgers."),
        )
        db.add(recon)
        await db.flush()

    return {
        "reconciliation_id": recon.reconciliation_id,
        "account_id": account.account_id,
        "account_name": account.account_name,
        "statement_date": str(statement_date),
        "bank_statement_balance": float(bank_statement_balance),
        "general_ledger_balance": float(general_ledger_balance),
        "client_ledger_balance": float(client_ledger_balance),
        "variance": float(total_variance),
        "status": recon_status,
        "is_balanced": is_balanced,
        "client_count": len(client_breakdown),
        "client_breakdown": client_breakdown,
        "reconciled_at": str(recon.reconciled_at),
        "notes": recon.notes,
    }


async def get_client_trust_summary_domain(db: AsyncSession, client_id: int) -> dict[str, Any]:
    """Returns trust accounting breakdown for a specific client."""
    client_res = await db.execute(select(Client).where(Client.client_id == client_id))
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    balance = await get_client_trust_balance_internal(db, client_id)

    # Transactions
    txn_stmt = (
        select(TrustTransaction)
        .where(TrustTransaction.client_id == client_id)
        .order_by(TrustTransaction.created_at.desc())
    )
    txns = (await db.execute(txn_stmt)).scalars().all()

    return {
        "client_id": client.client_id,
        "client_name": client.name,
        "trust_balance": float(balance),
        "transaction_count": len(txns),
        "transactions": [
            {
                "transaction_id": t.transaction_id,
                "type": t.transaction_type,
                "amount": float(t.amount),
                "client_running_balance": float(t.client_running_balance),
                "payee_or_payor": t.payee_or_payor,
                "reference_number": t.reference_number,
                "description": t.description,
                "created_at": str(t.created_at),
            }
            for t in txns
        ],
    }
