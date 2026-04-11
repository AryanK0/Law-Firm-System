from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import fetch_one
from .routes import case, document, employee, overview, ticket

REPO_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = REPO_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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
        "list": "/cases",
        "detail": "/cases/{case_id}",
        "team": "/cases/{case_id}/team",
        "documents": "/cases/{case_id}/documents",
        "status_history": "/cases/{case_id}/status-history",
        "billing": "/cases/{case_id}/billing",
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
    title="Precision Legal Management API",
    summary="Operational backend for a premium legal-management demo workspace.",
    description=(
        "This FastAPI service powers the legal-management dashboard with matter data, "
        "employee directory information, support tickets, analytics, and document intake. "
        "The API is organized so product demos, frontend developers, and reviewers can "
        "quickly understand what each section of the system is doing."
    ),
    version="2.0.0",
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(case.router)
app.include_router(document.router)
app.include_router(employee.router)
app.include_router(overview.router)
app.include_router(ticket.router)


@app.get("/", tags=["platform"], summary="Describe the API surface")
def root():
    return {
        "name": app.title,
        "status": "online",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
        "summary": (
            "Use this API to explore legal-management operations, seed rich demo data, "
            "and power the React workspace."
        ),
        "routes": ROUTE_INDEX,
    }


@app.get("/health", tags=["platform"], summary="Check API and database connectivity")
def health_check():
    database_time = fetch_one("SELECT NOW() AS database_time")
    return {
        "status": "ok",
        "database": "reachable",
        "database_time": database_time["database_time"] if database_time else None,
    }
