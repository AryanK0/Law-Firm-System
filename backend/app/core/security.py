import os
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Cryptographic password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "soc2-enterprise-legal-tech-secret-key-change-in-prod-382947192847")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours for dev/eval


class TokenPayload(BaseModel):
    sub: str
    employee_id: int
    name: str
    email: str | None = None
    role_name: str
    hierarchy_level: int
    clearance_rank: int = 1
    exp: datetime
    iat: datetime


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    employee_id: int,
    name: str,
    role_name: str,
    hierarchy_level: int,
    email: str | None = None,
    clearance_rank: int = 1,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(employee_id),
        "employee_id": employee_id,
        "name": name,
        "email": email or "",
        "role_name": role_name,
        "hierarchy_level": hierarchy_level,
        "clearance_rank": clearance_rank,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid authentication token") from exc
