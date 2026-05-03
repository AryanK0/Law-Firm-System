from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pymysql import MySQLError

from .config import ensure_upload_dir, get_env
from .db import fetch_one, get_connection_info
from .routes import access, case, document, operations

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
UPLOAD_DIR = ensure_upload_dir()


def parse_cors_origins():
    raw = get_env("CORS_ORIGINS", default="")
    configured = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if configured:
        return configured

    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

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
    {
        "name": "access",
        "description": "Hierarchy, permissions, clearances, delegation, requests, and violations.",
    },
    {
        "name": "systems",
        "description": "Systems oversight views for protected records, continuity snapshots, exceptions, and workload reports.",
    },
]

ROUTE_INDEX = {
    "platform": {
        "root": "/",
        "health": "/health",
        "docs": "/docs",
        "openapi": "/openapi.json",
    },
    "firm_overview": "/overview",
    "matters": {
        "analytics": "/analytics",
        "overview": "/overview",
        "list": "/cases",
        "detail": "/cases/{case_id}",
        "team": "/cases/{case_id}/team",
        "team_assign": "/cases/{case_id}/team [POST]",
        "documents": "/cases/{case_id}/documents",
        "status_history": "/cases/{case_id}/status-history",
        "billing": "/cases/{case_id}/billing",
        "billing_approve": "/billing/{bill_id}/approve",
        "create": "/cases",
        "clients": "/clients",
    },
    "people": {
        "employees": "/employees",
        "roles": "/roles",
    },
    "support": {
        "tickets": "/tickets",
    },
    "documents": {
        "list": "/documents",
        "upload": "/upload-document/",
        "uploads_static": "/uploads/{filename}",
    },
    "access": {
        "dashboard": "/access/dashboard",
        "check": "/access/check",
        "request": "/access/request",
        "approve": "/access/approve/{request_id}",
        "violations": "/access/violations",
        "delegations": "/access/delegations",
    },
    "systems_oversight": {
        "snapshot_create": "/dbms/checkpoint/create",
        "snapshot_list": "/dbms/checkpoint/list",
        "resolve_activity": "/dbms/recovery/{txn_id}",
        "case_reports": "/dbms/reports/cases",
        "employee_reports": "/dbms/reports/employees",
        "protected_records": "/dbms/locks",
        "activity": "/dbms/transactions",
    },
}

app = FastAPI(
    title="Law Firm Operations API",
    summary="MySQL backend for legal matter, billing, document, and access-control workflows.",
    description=(
        "This FastAPI service exposes a legal operations dataset backed by "
        "MySQL tables, views, stored procedures, stored functions, cursor procedures, "
        "and triggers. The API keeps the React frontend working while surfacing the "
        "operational workflows required for project review."
    ),
    version="2.1.0",
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_origin_regex=get_env("CORS_ORIGIN_REGEX", default=r"https://.*\.up\.railway\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
if (FRONTEND_DIST / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )

app.include_router(case.router)
app.include_router(document.router)
app.include_router(access.router)
app.include_router(operations.router)


@app.exception_handler(MySQLError)
async def database_exception_handler(_request: Request, exc: MySQLError):
    return JSONResponse(
        status_code=503,
        content={
            "status": "error",
            "database": "unreachable",
            "error_type": exc.__class__.__name__,
            "detail": str(exc),
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error_type": exc.__class__.__name__,
            "detail": str(exc),
            "traceback": traceback.format_exc()
        },
    )


def frontend_index():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return None


@app.get("/", tags=["platform"], summary="Serve the frontend or describe the API surface")
def root():
    index_response = frontend_index()
    if index_response:
        return index_response

    return {
        "name": app.title,
        "status": "online",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
        "summary": (
            "Use this API to explore the MySQL-backed law-firm project, inspect reports, "
            "and power the React workspace."
        ),
        "routes": ROUTE_INDEX,
    }


@app.get("/health", tags=["platform"], summary="Check API and database connectivity")
def health_check():
    try:
        connection_info = get_connection_info()
        database_time = fetch_one("SELECT NOW() AS database_time")
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "unreachable",
                "error_type": exc.__class__.__name__,
                "detail": str(exc),
            },
        )

    return {
        "status": "ok",
        "database": "reachable",
        "database_time": str(database_time["database_time"]) if database_time else None,
        "config_source": connection_info["source"],
        "database_name": connection_info["database"],
    }


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    requested_file = (FRONTEND_DIST / full_path).resolve()
    if FRONTEND_DIST.exists() and requested_file.is_file():
        try:
            requested_file.relative_to(FRONTEND_DIST.resolve())
        except ValueError:
            pass
        else:
            return FileResponse(requested_file)

    index_response = frontend_index()
    if index_response:
        return index_response

    return JSONResponse(
        status_code=404,
        content={
            "detail": "Frontend build not found. Run `npm run build` before serving the app."
        },
    )
