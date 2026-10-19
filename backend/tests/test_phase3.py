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


@pytest.fixture(scope="module")
def associate_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 6})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_presigned_s3_upload_pipeline(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Fetch available case
    cases_res = client.get("/cases", headers=headers)
    assert cases_res.status_code == 200
    case_id = cases_res.json()[0]["case_id"]

    # 2. Request S3 Pre-Signed Upload URL
    test_filename = f"test_contract_{os.urandom(4).hex()}.txt"
    presign_res = client.post(
        "/documents/presign-upload",
        json={
            "case_id": case_id,
            "file_name": test_filename,
            "content_type": "text/plain",
            "confidentiality_level": "Confidential",
        },
        headers=headers,
    )
    assert presign_res.status_code == 200, presign_res.text
    presign_data = presign_res.json()
    assert "upload_url" in presign_data
    assert "s3_key" in presign_data
    assert presign_data["encryption"] in ("AES256", "AES-256")

    # 3. Direct client-to-S3 binary PUT upload
    sample_content = b"Confidential Settlement Agreement: The defendant agrees to pay damages of 5,000,000 USD for patent infringement."
    put_res = client.put(
        presign_data["upload_url"],
        content=sample_content,
        headers={"Content-Type": "text/plain"},
    )
    assert put_res.status_code == 200, put_res.text

    # 4. Confirm S3 Upload with backend to register document record
    confirm_res = client.post(
        "/documents/confirm-upload",
        json={
            "case_id": case_id,
            "file_name": test_filename,
            "s3_key": presign_data["s3_key"],
            "confidentiality_level": "Confidential",
            "file_size_bytes": len(sample_content),
        },
        headers=headers,
    )
    assert confirm_res.status_code == 200, confirm_res.text
    doc_info = confirm_res.json()
    assert doc_info["document_id"] > 0
    assert "AES-256" in doc_info["encryption_status"]
    assert doc_info["s3_key"] == presign_data["s3_key"]


def test_ocr_extraction_and_ediscovery_search(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Fetch available case
    cases_res = client.get("/cases", headers=headers)
    case_id = cases_res.json()[0]["case_id"]

    # 2. Upload document containing specific searchable legal keywords
    searchable_name = f"ediscovery_deposition_{os.urandom(4).hex()}.txt"
    unique_keyword = f"antigravitypatent{os.urandom(3).hex()}"
    secret_text = f"Deposition Transcript: Under oath, the executive acknowledged {unique_keyword} technology licensing violations."

    presign_res = client.post(
        "/documents/presign-upload",
        json={
            "case_id": case_id,
            "file_name": searchable_name,
            "content_type": "text/plain",
        },
        headers=headers,
    )
    assert presign_res.status_code == 200
    presign_data = presign_res.json()

    # Direct S3 upload
    put_res = client.put(
        presign_data["upload_url"],
        content=secret_text.encode("utf-8"),
        headers={"Content-Type": "text/plain"},
    )
    assert put_res.status_code == 200

    # Confirm S3 upload (this triggers background OCR & search indexing)
    confirm_res = client.post(
        "/documents/confirm-upload",
        json={
            "case_id": case_id,
            "file_name": searchable_name,
            "s3_key": presign_data["s3_key"],
            "file_size_bytes": len(secret_text),
        },
        headers=headers,
    )
    assert confirm_res.status_code == 200
    doc_id = confirm_res.json()["document_id"]

    # 3. Perform e-Discovery search for the unique keyword
    search_res = client.get(f"/documents/search?q={unique_keyword}", headers=headers)
    assert search_res.status_code == 200, search_res.text
    results = search_res.json()
    assert results["total_matches"] >= 1
    hit = next((h for h in results["hits"] if h["document_id"] == doc_id), None)
    assert hit is not None, f"Document #{doc_id} not found in search results"
    assert unique_keyword in hit["snippet"].lower()


def test_legal_hold_partner_authorization_check(client, associate_token, partner_token):
    # 1. Non-Partner (Associate, hierarchy 4) attempt should be rejected with 403 Forbidden
    assoc_headers = {"Authorization": f"Bearer {associate_token}"}
    cases_res = client.get("/cases", headers=assoc_headers)
    case_id = cases_res.json()[0]["case_id"]

    res_assoc = client.post(
        f"/cases/{case_id}/legal-hold",
        json={"legal_hold": True, "reason": "Unauthorized attempt to hold"},
        headers=assoc_headers,
    )
    assert res_assoc.status_code == 403
    assert "Forbidden" in res_assoc.json()["detail"]

    # 2. Partner (hierarchy 2) should successfully place Legal Hold
    partner_headers = {"Authorization": f"Bearer {partner_token}"}
    res_partner = client.post(
        f"/cases/{case_id}/legal-hold",
        json={"legal_hold": True, "reason": "DOJ Federal Subpoena #8820"},
        headers=partner_headers,
    )
    assert res_partner.status_code == 200, res_partner.text
    hold_data = res_partner.json()
    assert hold_data["legal_hold"] is True
    assert hold_data["legal_hold_reason"] == "DOJ Federal Subpoena #8820"

    # Verify GET legal-hold returns active status
    status_res = client.get(f"/cases/{case_id}/legal-hold", headers=partner_headers)
    assert status_res.status_code == 200
    assert status_res.json()["legal_hold"] is True


def test_worm_compliance_blocks_deletion_and_logs_violation(client, partner_token):
    headers = {"Authorization": f"Bearer {partner_token}"}

    # 1. Get an existing case
    cases_res = client.get("/cases", headers=headers)
    case_id = cases_res.json()[0]["case_id"]

    # 2. Enforce Legal Hold on the case
    client.post(
        f"/cases/{case_id}/legal-hold",
        json={"legal_hold": True, "reason": "SEC Preservation Mandate"},
        headers=headers,
    )

    # 3. Upload a document to this case
    presign_res = client.post(
        "/documents/presign-upload",
        json={"case_id": case_id, "file_name": "evidence_vault.txt"},
        headers=headers,
    )
    presign_data = presign_res.json()
    client.put(
        presign_data["upload_url"],
        content=b"Protected evidence item under legal hold.",
        headers={"Content-Type": "text/plain"},
    )
    confirm_res = client.post(
        "/documents/confirm-upload",
        json={"case_id": case_id, "file_name": "evidence_vault.txt", "s3_key": presign_data["s3_key"]},
        headers=headers,
    )
    doc_id = confirm_res.json()["document_id"]

    # 4. Attempt to delete document under Legal Hold -> MUST FAIL with HTTP 423 Locked
    del_res = client.delete(f"/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 423, f"Expected 423 Locked, got {del_res.status_code}: {del_res.text}"
    assert "WORM Compliance Locked" in del_res.json()["detail"]

    # 5. Verify SOC-2 access violation log entry was recorded via access service
    violations_res = client.get("/access/violations", headers=headers)
    assert violations_res.status_code == 200
    violations = violations_res.json()
    matching_violation = next(
        (v for v in violations if v.get("attempted_resource_type") == "document" and v.get("attempted_resource_id") == doc_id),
        None,
    )
    assert matching_violation is not None, "Critical access violation log was not recorded!"
    assert matching_violation["attempted_action"] == "DELETE"
    assert matching_violation["severity"] == "CRITICAL"
    assert "WORM" in matching_violation["reason"]

    # 6. Release Legal Hold and successfully delete
    release_res = client.post(
        f"/cases/{case_id}/legal-hold",
        json={"legal_hold": False, "reason": "Case settled and hold lifted"},
        headers=headers,
    )
    assert release_res.status_code == 200
    assert release_res.json()["legal_hold"] is False

    # Now deletion must succeed with HTTP 200
    del_success_res = client.delete(f"/documents/{doc_id}", headers=headers)
    assert del_success_res.status_code == 200
    assert "Document deleted successfully" in del_success_res.json()["message"]
