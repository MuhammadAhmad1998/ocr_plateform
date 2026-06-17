import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from platform_api.accounts import get_default_account
from platform_api.database import get_db
from platform_api.exceptions import NotFoundError
from platform_api.models import Account, Document
from platform_api.ocr_bridge import (
    check_payload_size,
    fingerprint_document,
    storage,
    validate_advisor_upload,
)
from platform_api.schemas import DocumentListResponse, DocumentResponse

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        filename=doc.filename,
        content_type=doc.content_type,
        fingerprint=doc.fingerprint_json,
        page_count=doc.page_count,
        preview_url=storage.get_url(doc.s3_key),
    )


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    file: UploadFile = File(...),
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    content_type = file.content_type or "application/octet-stream"
    validate_advisor_upload(file.filename, content_type)
    content = await file.read()
    check_payload_size(content)
    s3_key = storage.upload(content, "uploads", file.filename, content_type)
    fingerprint = fingerprint_document(content, content_type, file.filename)
    doc = Document(
        account_id=account.id,
        filename=file.filename,
        content_type=content_type,
        s3_key=s3_key,
        fingerprint_json=fingerprint,
        page_count=fingerprint.get("page_count", 1),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_response(doc)


@router.get("/", response_model=DocumentListResponse)
def list_documents(
    limit: int = Query(20, ge=1, le=100),
    starting_after: str | None = Query(None),
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(Document.account_id == account.id)
    if starting_after:
        cursor = (
            db.query(Document)
            .filter(Document.id == uuid.UUID(starting_after), Document.account_id == account.id)
            .first()
        )
        if not cursor:
            raise NotFoundError("Document not found")
        query = query.filter(Document.created_at > cursor.created_at)
    docs = query.order_by(Document.created_at.asc()).limit(limit + 1).all()
    has_more = len(docs) > limit
    if has_more:
        docs = docs[:limit]
    return DocumentListResponse(data=[_to_response(d) for d in docs], has_more=has_more)


@router.get("/{document_id}/", response_model=DocumentResponse)
def get_document(
    document_id: str,
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(document_id), Document.account_id == account.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    return _to_response(doc)
