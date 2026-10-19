from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.database import get_db
from ..core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str | None = None
    employee_id: int | None = None
    password: str | None = "demo"


class SwitchPersonaRequest(BaseModel):
    employee_id: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse, summary="Authenticate employee and issue JWT")
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not payload.email and not payload.employee_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either email or employee_id must be provided to log in.",
        )

    if payload.employee_id:
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
        res = await db.execute(stmt, {"emp_id": payload.employee_id})
    else:
        stmt = text(
            """
            SELECT e.employee_id, e.name, e.email, r.role_name, r.hierarchy_level, d.department_name,
                   COALESCE(sc.numeric_rank, 1) as clearance_rank
            FROM Employee e
            JOIN Role r ON e.role_id = r.role_id
            JOIN Department d ON e.department_id = d.department_id
            LEFT JOIN Security_Clearance sc ON e.clearance_id = sc.clearance_id
            WHERE LOWER(e.email) = LOWER(:email) AND e.status = 'Active'
            """
        )
        res = await db.execute(stmt, {"email": payload.email.strip()})
    user_row = res.mappings().first()

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Employee not found or inactive.",
        )

    # In enterprise production, verify password hash: verify_password(payload.password, user_row["password_hash"])
    token = create_access_token(
        employee_id=user_row["employee_id"],
        name=user_row["name"],
        role_name=user_row["role_name"],
        hierarchy_level=user_row["hierarchy_level"],
        email=user_row["email"],
        clearance_rank=user_row["clearance_rank"],
    )

    # Issue HttpOnly, SameSite=Lax cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set True in production HTTPS
        max_age=86400,
    )

    return TokenResponse(
        access_token=token,
        user={
            "id": user_row["employee_id"],
            "employee_id": user_row["employee_id"],
            "name": user_row["name"],
            "email": user_row["email"],
            "role": user_row["role_name"],
            "role_name": user_row["role_name"],
            "hierarchy": user_row["hierarchy_level"],
            "department": user_row["department_name"],
        },
    )


@router.post("/switch-persona", response_model=TokenResponse, summary="Switch active PSL persona and issue valid JWT")
async def switch_persona(
    payload: SwitchPersonaRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
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
    res = await db.execute(stmt, {"emp_id": payload.employee_id})
    user_row = res.mappings().first()

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with employee ID {payload.employee_id} not found.",
        )

    token = create_access_token(
        employee_id=user_row["employee_id"],
        name=user_row["name"],
        role_name=user_row["role_name"],
        hierarchy_level=user_row["hierarchy_level"],
        email=user_row["email"],
        clearance_rank=user_row["clearance_rank"],
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=86400,
    )

    return TokenResponse(
        access_token=token,
        user={
            "id": user_row["employee_id"],
            "employee_id": user_row["employee_id"],
            "name": user_row["name"],
            "email": user_row["email"],
            "role": user_row["role_name"],
            "role_name": user_row["role_name"],
            "hierarchy": user_row["hierarchy_level"],
            "department": user_row["department_name"],
        },
    )


@router.get("/me", summary="Get currently authenticated employee profile")
async def get_me(user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return user.to_dict()


@router.post("/logout", summary="Log out and clear session cookie")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "success", "message": "Logged out successfully."}
