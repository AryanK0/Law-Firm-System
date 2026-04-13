from fastapi import APIRouter, File, UploadFile

from ..services import case_service, document_service

router = APIRouter(tags=["documents"])


@router.get("/documents", summary="List documents in the register")
def get_documents(employee_id: int | None = None):
    return document_service.list_documents(employee_id)


@router.post(
    "/upload-document/",
    summary="Register a file upload against an existing case",
)
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    uploaded_by: int | None = None,
    confidentiality_level: str = "Internal",
):
    if uploaded_by is not None:
        case_service.ensure_case_access(uploaded_by, case_id)

    return await document_service.save_document_upload(
        case_id=case_id,
        file=file,
        uploaded_by=uploaded_by,
        confidentiality_level=confidentiality_level,
    )
