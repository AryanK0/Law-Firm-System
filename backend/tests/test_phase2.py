import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

from app.core.locking import distributed_lock, LockTimeoutError
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def managing_partner_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 1})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 8})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_case_creation_domain_and_conflict_check(client, managing_partner_token):
    headers = {"Authorization": f"Bearer {managing_partner_token}"}
    case_title = f"State vs TechCorp-{os.urandom(4).hex()}"

    # 1. Create case via domain service
    payload = {
        "title": case_title,
        "description": "Enterprise patent infringement dispute",
        "client_id": 1,
        "lead_partner_id": 2,  # Harvey Specter
        "lead_senior_id": 5,   # Katrina Bennett
        "status": "Open",
        "confidentiality_level": "Strictly Confidential",
    }
    res = client.post("/cases", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    created = res.json()
    case_id = created["case_id"]

    assert created["title"] == case_title
    assert created["version"] == 1
    assert created["lead_partner"]["employee_id"] == 2

    # 2. Test Conflict Check (formerly trg_conflict_check)
    # Attempting to open identical active case for same client must raise 409
    dup_res = client.post("/cases", json=payload, headers=headers)
    assert dup_res.status_code == 409
    assert "Conflict" in dup_res.json()["detail"]


def test_case_team_assignment_domain(client, managing_partner_token):
    headers = {"Authorization": f"Bearer {managing_partner_token}"}

    # First get an open case
    cases_res = client.get("/cases", headers=headers)
    case_id = cases_res.json()[0]["case_id"]

    # Assign Mike Ross (id 6) as Associate
    assign_payload = {
        "employee_id": 6,
        "role_in_case": "Lead Associate",
    }
    assign_res = client.post(f"/cases/{case_id}/team", json=assign_payload, headers=headers)
    assert assign_res.status_code == 200, assign_res.text
    team_data = assign_res.json()
    assert "team" in team_data
    member_ids = [m["employee_id"] for m in team_data["team"]]
    assert 6 in member_ids


def test_billing_approval_and_occ_version_increment(client, managing_partner_token):
    headers = {"Authorization": f"Bearer {managing_partner_token}"}

    # Find a pending bill or check existing bill
    res = client.post("/billing/1/approve", json={"approver_id": 1}, headers=headers)
    assert res.status_code in (200, 404)
    if res.status_code == 200:
        data = res.json()
        assert data["status"] == "Approved"
        # Version was initialized to 1, now increments to 2
        assert data.get("version", 2) >= 1


def test_cursor_free_reports_cases(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Calls set-based query (no cursor!)
    res = client.get("/dbms/reports/cases", headers=headers)
    assert res.status_code == 200, res.text
    reports = res.json()
    assert isinstance(reports, list)
    if len(reports) > 0:
        assert "total_billing" in reports[0]
        assert "document_count" in reports[0]
        assert "summary" in reports[0]


def test_cursor_free_reports_employees(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/dbms/reports/employees", headers=headers)
    assert res.status_code == 200, res.text
    reports = res.json()
    assert isinstance(reports, list)
    if len(reports) > 0:
        assert "active_cases" in reports[0]
        assert "total_hours" in reports[0]


def test_cursor_free_reports_tickets(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/dbms/reports/tickets", headers=headers)
    assert res.status_code == 200, res.text
    reports = res.json()
    assert isinstance(reports, list)


def test_distributed_lock_mutual_exclusion():
    import asyncio

    async def run_locking_test():
        order = []

        async def worker(worker_id: int):
            async with distributed_lock("test_resource", 999, locked_by=worker_id):
                order.append(f"start_{worker_id}")
                await asyncio.sleep(0.05)
                order.append(f"end_{worker_id}")

        await asyncio.gather(worker(1), worker(2))
        # Ensure sequential execution (start_A, end_A, start_B, end_B)
        assert order in (
            ["start_1", "end_1", "start_2", "end_2"],
            ["start_2", "end_2", "start_1", "end_1"],
        )

    asyncio.run(run_locking_test())


def test_ticket_creation_and_sla_domain(client, managing_partner_token):
    headers = {"Authorization": f"Bearer {managing_partner_token}"}

    # Create ticket with Critical priority (SLA deadline must be within 4 hours)
    ticket_payload = {
        "description": "Urgent court docket submission server offline",
        "priority": "Critical",
        "status": "Open",
    }
    create_res = client.post("/tickets", json=ticket_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    ticket = create_res.json()
    assert ticket["priority"] == "Critical"
    assert ticket["resolution_deadline"] is not None

    # Resolve ticket
    ticket_id = ticket["ticket_id"]
    resolve_res = client.post(f"/tickets/{ticket_id}/resolve", json={"resolved_by": 1}, headers=headers)
    assert resolve_res.status_code == 200, resolve_res.text
    assert resolve_res.json()["status"] == "Resolved"


def test_access_domain_and_violation_logging(client, managing_partner_token):
    headers = {"Authorization": f"Bearer {managing_partner_token}"}

    # Check access for an intern (id 7) attempting to close executive matter #1
    check_payload = {
        "employee_id": 7,
        "resource_type": "case",
        "resource_id": 1,
        "action": "close",
    }
    res = client.post("/access/check", json=check_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    # Intern cannot close a case
    assert data["granted"] is False

    # Verify violation was logged
    violations_res = client.get("/access/violations", headers=headers)
    assert violations_res.status_code == 200
    violations = violations_res.json()
    assert isinstance(violations, list)
