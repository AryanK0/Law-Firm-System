from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from pymysql import MySQLError

from ..db import execute, fetch_all
from ..paths import upload_dir


def list_documents(employee_id: int | None = None):
    params: list[int] = []
    access_filter = ""

    if employee_id is not None:
        access_filter = """
        WHERE (
          EXISTS (
            SELECT 1
            FROM Employee e
            INNER JOIN Role r ON e.role_id = r.role_id
            WHERE e.employee_id = %s
              AND r.hierarchy_level <= 2
          )
          OR EXISTS (
            SELECT 1
            FROM Case_Team ct
            WHERE ct.case_id = d.case_id
              AND ct.employee_id = %s
          )
        )
        """
        params.extend([employee_id, employee_id])

    return fetch_all(
        f"""
        SELECT
          d.document_id,
          d.case_id,
          d.uploaded_by,
          d.confidentiality_level,
          d.file_path,
          CONCAT('/', TRIM(LEADING '/' FROM d.file_path)) AS file_url,
          SUBSTRING_INDEX(d.file_path, '/', -1) AS file_name,
          d.created_at,
          COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
          c.title AS case_title,
          uploader.name AS uploaded_by_name,
          COALESCE(version_data.latest_version, 1) AS latest_version,
          COALESCE(version_data.version_count, 1) AS version_count,
          version_data.last_modified_at
        FROM Document d
        LEFT JOIN Cases c ON d.case_id = c.case_id
        LEFT JOIN Employee uploader ON d.uploaded_by = uploader.employee_id
        LEFT JOIN (
          SELECT
            document_id,
            MAX(version_number) AS latest_version,
            COUNT(*) + 1 AS version_count,
            MAX(modified_at) AS last_modified_at
          FROM Document_Version
          GROUP BY document_id
        ) version_data ON version_data.document_id = d.document_id
        {access_filter}
        ORDER BY d.created_at DESC, d.document_id DESC
        """,
        tuple(params),
    )


def list_case_documents(case_id: int):
    return {
        "case_id": case_id,
        "documents": fetch_all(
            """
            SELECT
              d.document_id,
              d.case_id,
              d.uploaded_by,
              uploader.name AS uploaded_by_name,
              d.confidentiality_level,
              d.file_path,
              CONCAT('/', TRIM(LEADING '/' FROM d.file_path)) AS file_url,
              SUBSTRING_INDEX(d.file_path, '/', -1) AS file_name,
              d.created_at,
              COALESCE(version_data.latest_version, 1) AS latest_version,
              COALESCE(version_data.version_count, 1) AS version_count,
              version_data.last_modified_at
            FROM Document d
            LEFT JOIN Employee uploader ON d.uploaded_by = uploader.employee_id
            LEFT JOIN (
              SELECT
                document_id,
                MAX(version_number) AS latest_version,
                COUNT(*) + 1 AS version_count,
                MAX(modified_at) AS last_modified_at
              FROM Document_Version
              GROUP BY document_id
            ) version_data ON version_data.document_id = d.document_id
            WHERE d.case_id = %s
            ORDER BY d.created_at DESC, d.document_id DESC
            """,
            (case_id,),
        ),
    }


async def save_document_upload(
    *,
    case_id: int,
    file: UploadFile,
    uploaded_by: int | None,
    confidentiality_level: str,
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please choose a file to upload.")

    safe_name = Path(file.filename).name
    stored_name = f"{uuid4().hex}_{safe_name}"
    stored_path = upload_dir() / stored_name

    with stored_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    try:
        document_id = execute(
            """
            INSERT INTO Document(case_id, uploaded_by, confidentiality_level, file_path)
            VALUES (%s, %s, %s, %s)
            """,
            (case_id, uploaded_by, confidentiality_level, f"uploads/{stored_name}"),
        )
    except MySQLError as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": "Uploaded",
        "document_id": document_id,
        "file_name": safe_name,
        "file_path": f"uploads/{stored_name}",
        "file_url": f"/uploads/{stored_name}",
    }
