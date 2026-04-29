import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pymysql import MySQLError

from .db import fetch_one, get_connection_info
from .routes import case, document, employee, ticket

REPO_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", REPO_ROOT / "uploads")).resolve()
UPLOAD_DIR.mkdir(exist_ok=True)
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"


def parse_cors_origins():
    raw = os.getenv("CORS_ORIGINS", "")
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
}

app = FastAPI(
    title="Law Firm DBMS API",
    summary="Academic MySQL backend for legal matter, billing, document, and access-control workflows.",
    description=(
        "This FastAPI service exposes a DBMS-focused legal operations dataset backed by "
        "MySQL tables, views, stored procedures, stored functions, cursor procedures, "
        "and triggers. The API keeps the React frontend working while surfacing the "
        "database-centric workflows required for an academic project review."
    ),
    version="2.1.0",
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.up\.railway\.app"),
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
app.include_router(employee.router)
app.include_router(ticket.router)


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


@app.get("/", tags=["platform"], summary="Describe the API surface")
def root():
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

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return JSONResponse(
        status_code=404,
        content={
            "detail": "Frontend build not found. Run `npm run build` before serving the app."
        },
    )
