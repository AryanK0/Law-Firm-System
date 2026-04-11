from datetime import datetime, timezone
import os
from fastapi import FastAPI, HTTPException
from pymysql import MySQLError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import fetch_one
from .paths import upload_dir as resolve_upload_dir
from .routes import case, document, employee, overview, ticket

TAGS_METADATA = [
    {
        "name": "platform",
        "description": "Connectivity, status, and route discovery for the API.",
    },
    {
        "name": "overview",
        "description": "High-level firm activity, access mapping, and operational watchlists.",
    },
    {
        "name": "cases",
        "description": "Matter intake, case records, clients, and analytics.",
    },
    {
        "name": "employees",
        "description": "Firm directory, roles, and reporting structure.",
    },
    {
        "name": "tickets",
        "description": "Internal support queue and SLA-sensitive ticket activity.",
    },
    {
        "name": "documents",
        "description": "Document registration and upload handling.",
    },
]

ROUTE_INDEX = {
    "platform": {
        "root": "/api/",
        "health": "/api/health",
        "docs": "/api/docs",
        "openapi": "/api/openapi.json",
    },
    "firm_overview": "/api/overview",
    "matters": {
        "analytics": "/api/analytics",
        "list": "/api/cases",
        "detail": "/api/cases/{case_id}",
        "team": "/api/cases/{case_id}/team",
        "documents": "/api/cases/{case_id}/documents",
        "status_history": "/api/cases/{case_id}/status-history",
        "billing": "/api/cases/{case_id}/billing",
        "create": "/api/cases",
        "clients": "/api/clients",
    },
    "people": {
        "employees": "/api/employees",
        "roles": "/api/roles",
    },
    "support": {
        "tickets": "/api/tickets",
    },
    "documents": {
        "list": "/api/documents",
        "upload": "/api/upload-document",
        "uploads_static": "/uploads/{filename}",
    },
}


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
            "http://127.0.0.1:5175",
            "http://localhost:5175",
            "http://127.0.0.1:5176",
            "http://localhost:5176",
        ]
    return [x.strip() for x in raw.split(",") if x.strip()]


def create_api_app() -> FastAPI:
    api = FastAPI(
        title="Precision Legal Management API",
        summary="Operational backend for a premium legal-management demo workspace.",
        description=(
            "FastAPI service for the legal-management dashboard. Mount at /api for Vercel "
            "static + cross-origin production, or run standalone for local dev."
        ),
        version="2.0.0",
        openapi_tags=TAGS_METADATA,
    )

    api.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_origin_regex=os.getenv(
            "CORS_ORIGIN_REGEX",
            r"https://.*\.vercel\.app|https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api.include_router(case.router)
    api.include_router(document.router)
    api.include_router(employee.router)
    api.include_router(overview.router)
    api.include_router(ticket.router)

    @api.get("/", tags=["platform"], summary="Describe the API surface")
    def api_root():
        return {
            "name": api.title,
            "status": "online",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "docs": "/api/docs",
            "summary": (
                "Legal-management API: matters, people, tickets, documents, analytics."
            ),
            "routes": ROUTE_INDEX,
        }

    @api.get("/health", tags=["platform"], summary="Check API and database connectivity")
    def health_check():
        try:
            database_time = fetch_one("SELECT NOW() AS database_time")
        except MySQLError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"MySQL: {exc}",
            ) from exc
        return {
            "status": "ok",
            "database": "connected",
            "database_time": database_time["database_time"] if database_time else None,
        }

    return api


api_app = create_api_app()

app = FastAPI(
    title="Precision Legal Management — gateway",
    description="Mounts /api (JSON) and /uploads (static files).",
    version="2.0.0",
)

app.mount("/api", api_app)

app.mount(
    "/uploads",
    StaticFiles(directory=str(resolve_upload_dir())),
    name="uploads",
)


@app.get("/")
def gateway_root():
    return {
        "name": "Precision Legal Management API gateway",
        "status": "online",
        "api": "/api",
        "health": "/api/health",
        "docs": "/api/docs",
        "uploads": "/uploads",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
