import os
import sys
from collections.abc import AsyncGenerator
from urllib.parse import quote_plus, urlparse

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from ..config import get_env


class Base(DeclarativeBase):
    pass


def build_async_database_url() -> str:
    """Build a valid SQLAlchemy aiomysql database connection URL."""
    database_url = get_env("MYSQL_URL", "MYSQL_PUBLIC_URL", "DATABASE_URL")

    if database_url:
        if "://" not in database_url:
            database_url = "mysql+aiomysql://" + database_url
        elif database_url.startswith("mysql://"):
            database_url = database_url.replace("mysql://", "mysql+aiomysql://", 1)
        elif database_url.startswith("mysql2://"):
            database_url = database_url.replace("mysql2://", "mysql+aiomysql://", 1)
        elif database_url.startswith("mysql+asyncmy://"):
            database_url = database_url.replace("mysql+asyncmy://", "mysql+aiomysql://", 1)
        return database_url

    host = get_env("DB_HOST", "MYSQL_HOST", "MYSQLHOST", default="127.0.0.1")
    user = get_env("DB_USER", "MYSQL_USER", "MYSQLUSER", default="root")
    raw_password = get_env("DB_PASSWORD", "MYSQL_PASSWORD", "MYSQLPASSWORD", default="")
    database = get_env("DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE", default="lawfirm")
    port = get_env("DB_PORT", "MYSQL_PORT", "MYSQLPORT", default="3306")

    encoded_password = quote_plus(raw_password) if raw_password else ""
    auth_part = f"{user}:{encoded_password}@" if encoded_password else f"{user}@"

    return f"mysql+aiomysql://{auth_part}{host}:{port}/{database}?charset=utf8mb4"


ASYNC_DATABASE_URL = build_async_database_url()

is_testing = os.getenv("TESTING", "false").lower() == "true" or "pytest" in sys.modules

if is_testing:
    async_engine: AsyncEngine = create_async_engine(
        ASYNC_DATABASE_URL,
        poolclass=NullPool,
    )
else:
    async_engine: AsyncEngine = create_async_engine(
        ASYNC_DATABASE_URL,
        echo=os.getenv("SQL_DEBUG", "false").lower() == "true",
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing asynchronous SQLAlchemy sessions per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


from contextlib import asynccontextmanager


@asynccontextmanager
async def transaction_scope(session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager ensuring an atomic transaction block.
    If session is already in a transaction, uses a savepoint (begin_nested),
    otherwise initiates a new transaction via session.begin().
    """
    if session.in_transaction():
        async with session.begin_nested():
            yield session
        await session.commit()
    else:
        async with session.begin():
            yield session
