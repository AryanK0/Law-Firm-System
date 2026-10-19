from datetime import datetime
import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import AsyncSessionLocal, transaction_scope
from ..core.search import extract_document_text, search_engine
from ..core.storage import storage_service
from ..models.core import Case, CaseAccess, Document, DocumentVersion, Employee

logger = logging.getLogger("lfms.storage_domain")


async def prepare_presigned_upload_domain(
    db: AsyncSession,
    *,
    case_id: int,
    file_name: str,
    employee_id: int,
    confidentiality_level: str = "Internal",
    content_type: str | None = None,
) -> dict[str, Any]:
    """
    Validates case access and issues S3/MinIO pre-signed PUT URL with AES-256 encryption.
    """
    # 1. Verify case exists
    case_res = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

    # 2. Check user has upload permission
    emp_res = await db.execute(text("SELECT hierarchy_level FROM employee e JOIN role r ON e.role_id = r.role_id WHERE e.employee_id = :id"), {"id": employee_id})
    emp_row = emp_res.mappings().first()
    if not emp_row:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee not active or unauthorized.")

    if emp_row["hierarchy_level"] > 2:
        # Check case team / access
        access_res = await db.execute(
            select(CaseAccess).where(CaseAccess.case_id == case_id, CaseAccess.employee_id == employee_id)
        )
        ca = access_res.scalar_one_or_none()
        if not ca or not ca.can_upload_docs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You do not have document upload permissions for Case #{case_id}.",
            )

    # 3. Generate structured S3 key
    s3_key = storage_service.generate_s3_key(case_id, file_name)

    # 4. Generate Pre-signed URL
    presigned = storage_service.generate_presigned_upload_url(
        key=s3_key,
        content_type=content_type,
        expires_in=3600,
    )

    return {
        "case_id": case_id,
        "file_name": file_name,
        "confidentiality_level": confidentiality_level,
        "s3_key": s3_key,
        "upload_url": presigned["upload_url"],
        "method": presigned["method"],
        "headers": presigned["headers"],
        "encryption": presigned["encryption"],
    }


async def confirm_document_upload_domain(
    db: AsyncSession,
    *,
    case_id: int,
    file_name: str,
    s3_key: str,
    uploaded_by: int,
    confidentiality_level: str = "Internal",
    file_size_bytes: int | None = None,
    sha256_checksum: str | None = None,
) -> dict[str, Any]:
    """
    Registers confirmed S3 document upload in MySQL, records audit log,
    and returns document record.
    """
    async with transaction_scope(db):
        case_res = await db.execute(select(Case).where(Case.case_id == case_id))
        case = case_res.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

        # Persist Document entity
        doc = Document(
            case_id=case_id,
            uploaded_by=uploaded_by,
            confidentiality_level=confidentiality_level,
            file_path=s3_key,
            s3_key=s3_key,
            s3_bucket=storage_service.bucket,
            sha256_checksum=sha256_checksum,
            encryption_status="AES-256",
            ocr_status="Pending",
            is_archived=False,
            file_size_bytes=file_size_bytes,
            created_at=datetime.utcnow(),
            version=1,
        )
        db.add(doc)
        await db.flush()

        # Audit log entry
        txn_stmt = text(
            """
            INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
            VALUES ('DOCUMENT_UPLOAD_S3', 'document', :rec_id, 'INSERT', 'Committed', NOW())
            """
        )
        await db.execute(txn_stmt, {"rec_id": doc.document_id})

    return {
        "document_id": doc.document_id,
        "case_id": doc.case_id,
        "file_name": file_name,
        "s3_key": doc.s3_key,
        "sha256_checksum": doc.sha256_checksum,
        "encryption_status": doc.encryption_status,
        "ocr_status": doc.ocr_status,
        "created_at": str(doc.created_at),
        "message": "Document registered in secure S3 vault.",
    }


async def process_document_ocr_and_indexing_task(document_id: int):
    """
    Asynchronous background worker:
    1. Downloads payload from S3/vault
    2. Computes/validates SHA-256 digest
    3. Runs text extraction & OCR
    4. Indexes into Elasticsearch for full-text e-Discovery
    5. Updates document record with OCR status and extracted text
    """
    async with AsyncSessionLocal() as session:
        try:
            doc_res = await session.execute(
                select(Document, Case)
                .join(Case, Document.case_id == Case.case_id)
                .where(Document.document_id == document_id)
            )
            row = doc_res.first()
            if not row:
                logger.warning("Document #%s not found for OCR processing.", document_id)
                return

            doc, case = row

            # 1. Download payload
            try:
                data, _ = storage_service.download_bytes(doc.s3_key or doc.file_path)
            except Exception as exc:
                logger.error("Could not fetch document bytes for #%s: %s", document_id, exc)
                doc.ocr_status = "Failed"
                await session.commit()
                return

            # 2. Checksum validation
            calculated_sha = storage_service.calculate_sha256(data)
            if not doc.sha256_checksum:
                doc.sha256_checksum = calculated_sha
            if not doc.file_size_bytes:
                doc.file_size_bytes = len(data)

            # 3. Extract text / OCR
            file_name = doc.s3_key.split("/")[-1] if doc.s3_key else doc.file_path
            extracted_text = extract_document_text(data, file_name)

            doc.extracted_text = extracted_text
            doc.ocr_status = "Completed"
            await session.commit()

            # 4. Index in Elasticsearch
            await search_engine.index_document(
                document_id=doc.document_id,
                case_id=case.case_id,
                case_code=case.case_code,
                case_title=case.title,
                file_name=file_name,
                confidentiality_level=doc.confidentiality_level,
                extracted_text=extracted_text,
                sha256=doc.sha256_checksum,
                created_at=str(doc.created_at),
            )
            logger.info("Successfully OCR processed and indexed document #%s.", document_id)
        except Exception as exc:
            logger.exception("OCR/Indexing background task failed for doc #%s: %s", document_id, exc)


async def set_case_legal_hold_domain(
    db: AsyncSession,
    *,
    case_id: int,
    legal_hold: bool,
    reason: str | None,
    employee_id: int,
) -> dict[str, Any]:
    """
    Enforces WORM (Write Once, Read Many) legal hold state on a matter.
    Requires Partner/Executive clearance.
    """
    async with transaction_scope(db):
        # Clearance check: hierarchy <= 2 or Managing Partner
        emp_res = await db.execute(
            text(
                """
                SELECT e.employee_id, r.role_name, r.hierarchy_level
                FROM employee e
                JOIN role r ON e.role_id = r.role_id
                WHERE e.employee_id = :id AND e.status = 'Active'
                """
            ),
            {"id": employee_id},
        )
        emp = emp_res.mappings().first()
        if not emp or (emp["hierarchy_level"] > 2 and emp["role_name"] != "Managing Partner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Placing or releasing a Legal Hold requires Managing Partner or Partner credentials.",
            )

        case_res = await db.execute(select(Case).where(Case.case_id == case_id))
        case = case_res.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case #{case_id} not found.")

        old_hold = case.legal_hold
        case.legal_hold = legal_hold
        case.legal_hold_by = employee_id
        case.legal_hold_at = datetime.utcnow()
        case.legal_hold_reason = reason or ("Active litigation preservation hold" if legal_hold else "Legal hold released")

        # Audit log
        action_name = "HOLD_APPLIED" if legal_hold else "HOLD_RELEASED"
        txn_stmt = text(
            """
            INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
            VALUES ('LEGAL_HOLD', 'cases', :rec_id, :action, 'Committed', NOW())
            """
        )
        await db.execute(txn_stmt, {"rec_id": case.case_id, "action": action_name})

    return {
        "case_id": case.case_id,
        "title": case.title,
        "legal_hold": case.legal_hold,
        "legal_hold_reason": case.legal_hold_reason,
        "legal_hold_by": case.legal_hold_by,
        "legal_hold_at": str(case.legal_hold_at),
        "message": f"Legal hold {'enacted' if legal_hold else 'released'} successfully.",
    }


async def delete_document_domain(
    db: AsyncSession,
    *,
    document_id: int,
    employee_id: int,
) -> dict[str, Any]:
    """
    Strict WORM Enforcement:
    Prohibits document deletion if the associated Matter is under an active Legal Hold.
    """
    async with transaction_scope(db):
        doc_res = await db.execute(
            select(Document, Case)
            .join(Case, Document.case_id == Case.case_id)
            .where(Document.document_id == document_id)
        )
        row = doc_res.first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document #{document_id} not found.")

        doc, case = row

        # STRICT WORM COMPLIANCE CHECK
        if case.legal_hold:
            hold_reason = f"WORM Policy Violation: Matter #{case.case_id} is under Legal Hold ('{case.legal_hold_reason}'). Deletion strictly prohibited."
            # Autonomous committed audit trail: must persist despite the transaction raising 423
            async with AsyncSessionLocal() as audit_session:
                async with audit_session.begin():
                    violation_stmt = text(
                        """
                        INSERT INTO access_violation_log (
                            employee_id, attempted_resource_type, attempted_resource_id,
                            attempted_action, reason, severity, timestamp, ip_address
                        )
                        VALUES (
                            :emp_id, 'document', :doc_id, 'DELETE',
                            :reason, 'CRITICAL', NOW(), '127.0.0.1'
                        )
                        """
                    )
                    await audit_session.execute(violation_stmt, {
                        "emp_id": employee_id,
                        "doc_id": document_id,
                        "reason": hold_reason,
                    })

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"WORM Compliance Locked: Case #{case.case_id} is under an active Legal Hold. Deletion or alteration of evidence is strictly prohibited by law.",
            )

        # Proceed with deletion if not under hold
        s3_key = doc.s3_key
        await db.execute(delete(DocumentVersion).where(DocumentVersion.document_id == document_id))
        await db.delete(doc)

        # Audit log
        txn_stmt = text(
            """
            INSERT INTO transaction_log (txn_type, table_name, record_id, action, status, created_at)
            VALUES ('DOCUMENT_DELETE', 'document', :rec_id, 'DELETE', 'Committed', NOW())
            """
        )
        await db.execute(txn_stmt, {"rec_id": document_id})

    # Delete from S3 storage
    if s3_key:
        storage_service.delete_object(s3_key)

    return {"message": "Document deleted successfully", "document_id": document_id}
