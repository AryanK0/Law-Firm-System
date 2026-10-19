from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import transaction_scope
from ..models.core import CaseAccess


async def check_access_domain(
    db: AsyncSession,
    *,
    employee_id: int,
    resource_type: str,
    resource_id: int,
    action: str = "view",
    ip_address: str | None = None,
) -> dict[str, Any]:
    """
    Migrates MySQL sp_check_access, check_access() function, and sp_log_access_violation
    into Python PBAC domain logic with automated violation logging.
    """
    # 1. Fetch employee details and hierarchy
    emp_stmt = text(
        """
        SELECT e.employee_id, e.name, r.role_name, r.hierarchy_level,
               COALESCE(sc.numeric_rank, 1) as clearance_rank
        FROM employee e
        JOIN role r ON e.role_id = r.role_id
        LEFT JOIN security_clearance sc ON e.clearance_id = sc.clearance_id
        WHERE e.employee_id = :emp_id AND e.status = 'Active'
        """
    )
    emp_res = await db.execute(emp_stmt, {"emp_id": employee_id})
    emp = emp_res.mappings().first()
    if not emp:
        return {"granted": False, "reason": "Employee account inactive or not found"}

    granted = False
    reason = "Access denied by PBAC policy matrix"

    # Executive override: Managing Partner or hierarchy <= 2 (Pearson/Specter)
    if emp["hierarchy_level"] <= 2 or emp["role_name"] == "Managing Partner":
        granted = True
        reason = "Granted: Executive Leadership clearance"

    elif resource_type.lower() == "case":
        # Check case existence & leads
        case_stmt = text(
            """
            SELECT case_id, lead_partner_id, lead_senior_id, created_by, confidentiality_level
            FROM cases
            WHERE case_id = :case_id
            """
        )
        case_res = await db.execute(case_stmt, {"case_id": resource_id})
        case = case_res.mappings().first()
        if not case:
            return {"granted": False, "reason": f"Case #{resource_id} not found"}

        if employee_id in (case["lead_partner_id"], case["lead_senior_id"], case["created_by"]):
            granted = True
            reason = "Granted: Matter lead assignment"
        else:
            # Check Case_Access granular permissions
            ca_stmt = text(
                """
                SELECT can_view, can_edit, can_upload_docs, can_approve_docs, can_close_case, can_assign_members
                FROM case_access
                WHERE case_id = :case_id AND employee_id = :emp_id
                """
            )
            ca_res = await db.execute(ca_stmt, {"case_id": resource_id, "emp_id": employee_id})
            ca = ca_res.mappings().first()
            if ca:
                action_clean = action.lower().strip()
                if action_clean in ("view", "read") and ca["can_view"]:
                    granted = True
                    reason = "Granted: Case access policy (can_view)"
                elif action_clean in ("edit", "update", "write") and ca["can_edit"]:
                    granted = True
                    reason = "Granted: Case access policy (can_edit)"
                elif action_clean in ("upload", "upload_docs") and ca["can_upload_docs"]:
                    granted = True
                    reason = "Granted: Case access policy (can_upload_docs)"
                elif action_clean in ("approve", "approve_docs") and ca["can_approve_docs"]:
                    granted = True
                    reason = "Granted: Case access policy (can_approve_docs)"
                elif action_clean in ("close", "close_case") and ca["can_close_case"]:
                    granted = True
                    reason = "Granted: Case access policy (can_close_case)"
                elif action_clean in ("assign", "assign_members") and ca["can_assign_members"]:
                    granted = True
                    reason = "Granted: Case access policy (can_assign_members)"

        # Check Active Delegated Access
        if not granted:
            del_stmt = text(
                """
                SELECT 1 FROM delegated_access
                WHERE to_employee = :emp_id
                  AND status = 'Active'
                  AND NOW() BETWEEN valid_from AND valid_to
                """
            )
            if (await db.execute(del_stmt, {"emp_id": employee_id})).first():
                granted = True
                reason = "Granted: Active delegated authority"

    # If Denied, log access violation (replacing sp_log_access_violation)
    if not granted:
        async with transaction_scope(db):
            log_stmt = text(
                """
                INSERT INTO access_violation_log (
                    employee_id, attempted_resource_type, attempted_resource_id,
                    attempted_action, reason, severity, timestamp, ip_address
                )
                VALUES (
                    :emp_id, :res_type, :res_id,
                    :action, :reason, 'HIGH', NOW(), :ip
                )
                """
            )
            await db.execute(log_stmt, {
                "emp_id": employee_id,
                "res_type": resource_type,
                "res_id": resource_id,
                "action": action,
                "reason": reason,
                "ip": ip_address or "127.0.0.1",
            })

    return {
        "granted": granted,
        "reason": reason,
        "employee_id": employee_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "action": action,
    }


async def request_access_domain(
    db: AsyncSession,
    *,
    employee_id: int,
    resource_type: str,
    resource_id: int,
    permission: str,
    reason: str | None = None,
) -> dict[str, Any]:
    """Migrates sp_request_access stored procedure into async SQLAlchemy domain logic."""
    async with transaction_scope(db):
        stmt = text(
            """
            INSERT INTO access_request (employee_id, resource_type, resource_id, permission, reason, status, requested_at)
            VALUES (:emp_id, :res_type, :res_id, :perm, :reason, 'Pending', NOW())
            """
        )
        res = await db.execute(stmt, {
            "emp_id": employee_id,
            "res_type": resource_type,
            "res_id": resource_id,
            "perm": permission,
            "reason": reason or "Need access for matter support",
        })
        request_id = res.lastrowid

    return {
        "request_id": request_id,
        "status": "Pending",
        "message": "Access request submitted for review",
    }


async def approve_access_request_domain(
    db: AsyncSession,
    *,
    request_id: int,
    approver_id: int,
) -> dict[str, Any]:
    """Migrates sp_approve_access_request stored procedure into async domain logic."""
    async with transaction_scope(db):
        req_res = await db.execute(text("SELECT * FROM access_request WHERE request_id = :id"), {"id": request_id})
        req = req_res.mappings().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Access request #{request_id} not found.")

        # Update access_request
        await db.execute(
            text(
                """
                UPDATE access_request
                SET status = 'Approved', approved_by = :app_id, approved_at = NOW()
                WHERE request_id = :id
                """
            ),
            {"app_id": approver_id, "id": request_id},
        )

        # If matter access, grant in case_access
        if req["resource_type"].lower() == "case":
            await db.execute(
                text(
                    """
                    INSERT INTO case_access (case_id, employee_id, case_role, can_view, can_edit, granted_by, granted_at)
                    VALUES (:case_id, :emp_id, 'Approved Requester', TRUE, FALSE, :app_id, NOW())
                    ON DUPLICATE KEY UPDATE can_view = TRUE, granted_by = :app_id, granted_at = NOW()
                    """
                ),
                {"case_id": req["resource_id"], "emp_id": req["employee_id"], "app_id": approver_id},
            )

    return {"request_id": request_id, "status": "Approved", "approved_by": approver_id}
