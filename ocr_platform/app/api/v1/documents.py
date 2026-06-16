"""Public document API — upload alias and read/list endpoints."""

import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.advisor.models import Document
from app.advisor.schemas import DocumentListResponse, DocumentResponse
from app.api.v1.advisor import upload_document
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.core.storage import storage

router = APIRouter(prefix="/documents", tags=["documents"])


def document_to_response(doc: Document) -> DocumentResponse:
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
    session_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document (alias for /advisor/upload/)."""
    return await upload_document(file=file, session_id=session_id, user=user, db=db)


@router.get("/", response_model=DocumentListResponse)
def list_documents(
    limit: int = Query(20, ge=1, le=100),
    starting_after: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(Document.user_id == user.id)

    if starting_after:
        try:
            cursor_id = uuid.UUID(starting_after)
        except ValueError as exc:
            raise NotFoundError("Document not found") from exc
        cursor_doc = (
            db.query(Document)
            .filter(Document.id == cursor_id, Document.user_id == user.id)
            .first()
        )
        if not cursor_doc:
            raise NotFoundError("Document not found")
        query = query.filter(Document.created_at > cursor_doc.created_at)

    docs = query.order_by(Document.created_at.asc()).limit(limit + 1).all()
    has_more = len(docs) > limit
    if has_more:
        docs = docs[:limit]

    return DocumentListResponse(
        data=[document_to_response(doc) for doc in docs],
        has_more=has_more,
    )


@router.get("/{document_id}/", response_model=DocumentResponse)
def get_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(document_id), Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    return document_to_response(doc)
