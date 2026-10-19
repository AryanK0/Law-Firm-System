from typing import Annotated, Any
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .security import decode_access_token

security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    def __init__(
        self,
        employee_id: int,
        name: str,
        role_name: str,
        hierarchy_level: int,
        department_name: str | None = None,
        email: str | None = None,
        clearance_rank: int = 1,
    ):
        self.employee_id = employee_id
        self.id = employee_id
        self.name = name
        self.role_name = role_name
        self.hierarchy_level = hierarchy_level
        self.department_name = department_name
        self.email = email
        self.clearance_rank = clearance_rank

    def to_dict(self) -> dict[str, Any]:
        return {
            "employee_id": self.employee_id,
            "id": self.employee_id,
            "name": self.name,
            "role_name": self.role_name,
            "hierarchy_level": self.hierarchy_level,
            "department_name": self.department_name,
            "email": self.email,
            "clearance_rank": self.clearance_rank,
        }


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthenticatedUser:
    token: str | None = None

    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials

    # Fallback to HttpOnly cookie if header is omitted
    if not token and "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    # Developer/Transition convenience: Check X-Employee-Id if JWT is absent
    if not token:
        dev_emp_id = request.headers.get("X-Employee-Id") or request.query_params.get("employee_id")
        if dev_emp_id and dev_emp_id.isdigit():
            # Query user from DB for this ID
            stmt = text(
                """
                SELECT e.employee_id, e.name, e.email, r.role_name, r.hierarchy_level, d.department_name,
                       COALESCE(sc.numeric_rank, 1) as clearance_rank
                FROM Employee e
                JOIN Role r ON e.role_id = r.role_id
                JOIN Department d ON e.department_id = d.department_id
                LEFT JOIN Security_Clearance sc ON e.clearance_id = sc.clearance_id
                WHERE e.employee_id = :emp_id AND e.status = 'Active'
                """
            )
            res = await db.execute(stmt, {"emp_id": int(dev_emp_id)})
            row = res.mappings().first()
            if row:
                return AuthenticatedUser(
                    employee_id=row["employee_id"],
                    name=row["name"],
                    role_name=row["role_name"],
                    hierarchy_level=row["hierarchy_level"],
                    department_name=row["department_name"],
                    email=row["email"],
                    clearance_rank=row["clearance_rank"],
                )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    employee_id = payload.get("employee_id")
    if not employee_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: employee_id missing",
        )

    # Verify user is active in DB
    stmt = text(
        """
        SELECT e.employee_id, e.name, e.email, r.role_name, r.hierarchy_level, d.department_name,
               COALESCE(sc.numeric_rank, 1) as clearance_rank
        FROM Employee e
        JOIN Role r ON e.role_id = r.role_id
        JOIN Department d ON e.department_id = d.department_id
        LEFT JOIN Security_Clearance sc ON e.clearance_id = sc.clearance_id
        WHERE e.employee_id = :emp_id AND e.status = 'Active'
        """
    )
    res = await db.execute(stmt, {"emp_id": employee_id})
    row = res.mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Employee account is inactive or not found.",
        )

    return AuthenticatedUser(
        employee_id=row["employee_id"],
        name=row["name"],
        role_name=row["role_name"],
        hierarchy_level=row["hierarchy_level"],
        department_name=row["department_name"],
        email=row["email"],
        clearance_rank=row["clearance_rank"],
    )


# --- Policy-Based Access Control (PBAC) Dependencies ---


def require_role(*allowed_roles: str):
    async def role_checker(user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
        if user.role_name not in allowed_roles and user.role_name != "Managing Partner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of roles: {', '.join(allowed_roles)}",
            )
        return user

    return role_checker


def require_min_hierarchy(min_level: int):
    async def hierarchy_checker(user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
        if user.hierarchy_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Hierarchy level {min_level} required (current: {user.hierarchy_level})",
            )
        return user

    return hierarchy_checker


async def require_systems_admin(user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    """Enforce Benjamin / IT Admin access for Systems Oversight without query IDOR."""
    if user.employee_id != 8 or user.role_name != "IT Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Benjamin (IT Admin) can access Systems Oversight.",
        )
    return user


async def check_case_policy(
    case_id: int,
    user: AuthenticatedUser,
    db: AsyncSession,
) -> bool:
    """Python-native PBAC replacing the MySQL check_access() stored function."""
    # 1. Managing Partners and Senior Partners (Hierarchy >= 7) have global visibility
    if user.hierarchy_level >= 7:
        return True

    # 2. Case leads or direct creators
    stmt = text(
        """
        SELECT lead_partner_id, lead_senior_id, created_by, confidentiality_level
        FROM Cases
        WHERE case_id = :case_id
        """
    )
    res = await db.execute(stmt, {"case_id": case_id})
    case_row = res.mappings().first()
    if not case_row:
        return False

    if user.employee_id in (case_row["lead_partner_id"], case_row["lead_senior_id"], case_row["created_by"]):
        return True

    # 3. Direct Case_Team membership
    team_stmt = text(
        """
        SELECT 1 FROM Case_Team
        WHERE case_id = :case_id AND employee_id = :emp_id
        """
    )
    team_res = await db.execute(team_stmt, {"case_id": case_id, "emp_id": user.employee_id})
    if team_res.first():
        return True

    # 4. Active Delegated Access
    del_stmt = text(
        """
        SELECT 1 FROM Delegated_Access
        WHERE to_employee = :emp_id
          AND status = 'Active'
          AND NOW() BETWEEN valid_from AND valid_to
        """
    )
    del_res = await db.execute(del_stmt, {"emp_id": user.employee_id})
    if del_res.first():
        return True

    return False
