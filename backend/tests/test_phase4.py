from datetime import date
from decimal import Decimal
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

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
def partner_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 2})
    assert res.status_code == 200
    return res.json()["access_token"]


# ==============================================================================
# 1. Trust Accounting (IOLTA) Tests
# ==============================================================================

def test_trust_accounts_initialization_and_listing(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}
    res = client.get("/trust/accounts", headers=headers)
    assert res.status_code == 200, res.text
    accounts = res.json()
    assert len(accounts) >= 2

    iolta = next((a for a in accounts if a["account_type"] == "IOLTA_TRUST"), None)
    operating = next((a for a in accounts if a["account_type"] == "OPERATING"), None)

    assert iolta is not None
    assert operating is not None
    assert iolta["current_balance"] >= 0
    assert operating["current_balance"] >= 0


def test_trust_deposit_and_overdraft_prevention(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Get IOLTA account
    accts_res = client.get("/trust/accounts", headers=headers)
    iolta = next(a for a in accts_res.json() if a["account_type"] == "IOLTA_TRUST")
    iolta_id = iolta["account_id"]

    # 2. Deposit retainer for Client #1
    dep_payload = {
        "account_id": iolta_id,
        "client_id": 1,
        "amount": 25000.00,
        "payee_or_payor": "TechCorp Escrow Deposit",
        "description": "Litigation retainer escrow",
    }
    dep_res = client.post("/trust/deposit", json=dep_payload, headers=headers)
    assert dep_res.status_code == 200, dep_res.text
    dep_data = dep_res.json()
    assert dep_data["transaction_type"] == "DEPOSIT"
    assert dep_data["amount"] == 25000.00
    assert dep_data["client_running_balance"] >= 25000.00

    # 3. Disburse allowed amount (e.g. $5,000 for expert witness fee)
    disb_payload = {
        "account_id": iolta_id,
        "client_id": 1,
        "amount": 5000.00,
        "payee_or_payor": "Forensic Tech Expert Witness LLC",
        "description": "Retained expert witness fee payment",
    }
    disb_res = client.post("/trust/disburse", json=disb_payload, headers=headers)
    assert disb_res.status_code == 200, disb_res.text
    disb_data = disb_res.json()
    assert disb_data["transaction_type"] == "DISBURSEMENT"
    assert disb_data["amount"] == 5000.00

    # 4. Strict Overdraft Prevention (ABA Model Rule 1.15):
    # Attempting to disburse more than client's remaining balance MUST be rejected with HTTP 400
    overdraft_payload = {
        "account_id": iolta_id,
        "client_id": 1,
        "amount": 99999999.00,  # Far exceeds client balance
        "payee_or_payor": "Illegal Overdraft Payee",
    }
    overdraft_res = client.post("/trust/disburse", json=overdraft_payload, headers=headers)
    assert overdraft_res.status_code == 400
    assert "Overdraft Prohibited" in overdraft_res.json()["detail"]


def test_earned_fee_transfer_from_trust_to_operating(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Get accounts
    accts_res = client.get("/trust/accounts", headers=headers)
    iolta = next(a for a in accts_res.json() if a["account_type"] == "IOLTA_TRUST")
    operating = next(a for a in accts_res.json() if a["account_type"] == "OPERATING")

    # 2. Transfer earned fee from IOLTA Trust to Operating
    transfer_payload = {
        "iolta_account_id": iolta["account_id"],
        "operating_account_id": operating["account_id"],
        "client_id": 1,
        "amount": 3500.00,
        "invoice_number": "INV-000101",
    }
    xfr_res = client.post("/trust/transfer-earned-fee", json=transfer_payload, headers=headers)
    assert xfr_res.status_code == 200, xfr_res.text
    xfr_data = xfr_res.json()
    assert xfr_data["amount"] == 3500.00
    assert "Successfully transferred" in xfr_data["message"]


def test_automated_three_way_reconciliation(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Get IOLTA account
    accts_res = client.get("/trust/accounts", headers=headers)
    iolta = next(a for a in accts_res.json() if a["account_type"] == "IOLTA_TRUST")
    iolta_id = iolta["account_id"]
    gl_balance = iolta["current_balance"]

    # 2. Balanced reconciliation scenario (Bank balance equals General Ledger balance)
    recon_payload = {
        "account_id": iolta_id,
        "statement_date": str(date.today()),
        "bank_statement_balance": gl_balance,
        "notes": "Monthly IOLTA compliance audit",
    }
    recon_res = client.post("/trust/reconciliation/three-way", json=recon_payload, headers=headers)
    assert recon_res.status_code == 200, recon_res.text
    recon_data = recon_res.json()
    assert recon_data["status"] == "BALANCED"
    assert recon_data["variance"] == 0.0
    assert recon_data["is_balanced"] is True
    assert isinstance(recon_data["client_breakdown"], list)

    # 3. Discrepancy scenario (Bank statement differs from General Ledger)
    discrepancy_payload = {
        "account_id": iolta_id,
        "statement_date": str(date.today()),
        "bank_statement_balance": gl_balance + 2500.00,  # $2,500 unexplained variance
        "notes": "Testing bank variance alert",
    }
    disc_res = client.post("/trust/reconciliation/three-way", json=discrepancy_payload, headers=headers)
    assert disc_res.status_code == 200
    disc_data = disc_res.json()
    assert disc_data["status"] == "DISCREPANCY"
    assert disc_data["variance"] > 0
    assert disc_data["is_balanced"] is False


def test_client_trust_ledger_summary(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}
    res = client.get("/trust/clients/1", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["client_id"] == 1
    assert data["trust_balance"] >= 0
    assert "transactions" in data
    assert len(data["transactions"]) >= 1


# ==============================================================================
# 2. LEDES 1998B Billing Standard Tests
# ==============================================================================

def test_utbms_reference_codes(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}
    res = client.get("/billing/utbms-codes", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "task_codes" in data
    assert "activity_codes" in data
    assert "expense_codes" in data

    # Check common codes
    task_codes = [t["code"] for t in data["task_codes"]]
    assert "L110" in task_codes
    assert "L120" in task_codes
    assert "L210" in task_codes

    activity_codes = [a["code"] for a in data["activity_codes"]]
    assert "A101" in activity_codes
    assert "A104" in activity_codes


def test_ledes_1998b_invoice_generation_and_validation(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # Fetch bill ID 1 (or available bill)
    res = client.get("/billing/1/ledes", headers=headers)
    assert res.status_code in (200, 404)
    if res.status_code == 200:
        data = res.json()
        assert data["bill_id"] == 1
        assert "file_content" in data
        assert data["is_valid"] is True
        assert data["validation_errors"] == []

        content = data["file_content"]
        lines = content.strip().split("\n")
        assert len(lines) >= 2  # Header + at least 1 line item

        # Check Header
        header = lines[0]
        assert "INVOICE_DATE[]" in header
        assert "TIMEKEEPER_CLASSIFICATION[]" in header
        assert "LINE_ITEM_TASK_CODE[]" in header

        # Check Line Item fields
        item_fields = lines[1].split("[]")
        assert len(item_fields) >= 24
        # Field 9 is Fee/Expense type ('F' or 'E')
        assert item_fields[9] in ("F", "E")
        # Field 21 is classification
        assert item_fields[21] in ("PT", "AS", "PL", "OC", "OT")


def test_ledes_1998b_invoice_download(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}
    res = client.get("/billing/1/ledes/download", headers=headers)
    assert res.status_code in (200, 404)
    if res.status_code == 200:
        assert res.headers["content-type"].startswith("text/plain")
        assert "LEDES1998B" in res.headers["content-disposition"]
        assert len(res.text) > 50


# ==============================================================================
# 3. Conflict of Interest Checking Engine Tests
# ==============================================================================

def test_register_adverse_party_for_matter(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # Get case #1
    cases_res = client.get("/cases", headers=headers)
    case_id = cases_res.json()[0]["case_id"]

    party_payload = {
        "party_name": "Specter Adversary Holdings LLC",
        "party_type": "OPPOSING_PARTY",
        "corporate_affiliate": "Global Holdings Conglomerate",
    }
    add_res = client.post(f"/conflicts/cases/{case_id}/adverse-parties", json=party_payload, headers=headers)
    assert add_res.status_code == 200, add_res.text
    data = add_res.json()
    assert data["party_name"] == "Specter Adversary Holdings LLC"

    # List adverse parties
    list_res = client.get(f"/conflicts/cases/{case_id}/adverse-parties", headers=headers)
    assert list_res.status_code == 200
    parties = list_res.json()
    assert any(p["party_name"] == "Specter Adversary Holdings LLC" for p in parties)


def test_conflict_check_direct_adverse_representation(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # Query for registered adverse party
    check_payload = {
        "query": "Specter Adversary Holdings",
        "proposed_client_name": "New Client Corp",
    }
    res = client.post("/conflicts/check", json=check_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] in ("CONFLICT_DETECTED", "REVIEW_RECOMMENDED")
    assert data["match_count"] >= 1
    assert any("Specter Adversary" in m["matched_name"] for m in data["matches"])


def test_conflict_check_boolean_query_and_clean_clearance(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Clean query with no overlap -> CLEARED
    clean_res = client.post(
        "/conflicts/check",
        json={"query": "CompletelyUnknownEntity123984"},
        headers=headers,
    )
    assert clean_res.status_code == 200, clean_res.text
    clean_data = clean_res.json()
    assert clean_data["status"] == "CLEARED"
    assert clean_data["risk_level"] == "CLEARED"
    assert clean_data["risk_score"] == 0
    assert clean_data["match_count"] == 0

    # 2. Boolean query with AND / NOT operators
    bool_res = client.post(
        "/conflicts/check",
        json={"query": '"Specter" AND NOT "NonExistentTerm999"'},
        headers=headers,
    )
    assert bool_res.status_code == 200, bool_res.text
    bool_data = bool_res.json()
    assert bool_data["match_count"] >= 1
