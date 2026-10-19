import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, decode_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_jwt_issuance_and_decoding():
    token = create_access_token(
        employee_id=2,
        name="Harvey Specter",
        role_name="Partner",
        hierarchy_level=2,
        clearance_rank=4,
    )
    assert token is not None
    payload = decode_access_token(token)
    assert payload["employee_id"] == 2
    assert payload["role_name"] == "Partner"


def test_login_endpoint(client):
    # Test valid persona login by employee_id
    res = client.post("/auth/login", json={"employee_id": 2, "password": "Password123!"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["employee_id"] == 2
    assert data["user"]["name"] == "Harvey Specter"


def test_switch_persona_endpoint(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 1})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["employee_id"] == 1
    assert data["user"]["role_name"] == "Managing Partner"


def test_get_cases_without_idor_query_param(client):
    # Log in as Harvey Specter (id 2)
    login_res = client.post("/auth/switch-persona", json={"employee_id": 2})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Request /cases with Bearer token and NO ?employee_id query param
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/cases", headers=headers)
    assert res.status_code == 200, res.text
    cases = res.json()
    assert isinstance(cases, list)


def test_unauthenticated_request_rejected():
    # Fresh client with no cookies or headers must receive 401
    with TestClient(app) as fresh_client:
        res = fresh_client.get("/cases")
        assert res.status_code == 401


def test_dbms_access_enforces_systems_admin_pbac(client):
    # Non-admin persona: Mike Ross (id 6)
    mike_res = client.post("/auth/switch-persona", json={"employee_id": 6})
    assert mike_res.status_code == 200
    mike_token = mike_res.json()["access_token"]

    res = client.get("/dbms/reports/cases", headers={"Authorization": f"Bearer {mike_token}"})
    assert res.status_code == 403
    assert "Forbidden" in res.text

    # Systems Admin persona: Benjamin (id 8)
    ben_res = client.post("/auth/switch-persona", json={"employee_id": 8})
    assert ben_res.status_code == 200
    ben_token = ben_res.json()["access_token"]

    res_admin = client.get("/dbms/reports/cases", headers={"Authorization": f"Bearer {ben_token}"})
    assert res_admin.status_code == 200, res_admin.text
    reports = res_admin.json()
    assert isinstance(reports, list)


def test_document_list_with_auth(client):
    login_res = client.post("/auth/switch-persona", json={"employee_id": 1})
    token = login_res.json()["access_token"]

    res = client.get("/documents", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    docs = res.json()
    assert isinstance(docs, list)
