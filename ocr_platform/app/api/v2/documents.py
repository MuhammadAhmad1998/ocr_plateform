"""V2 document endpoints — envelope responses with prefixed doc_ ids."""

import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.advisor.models import Document
from app.advisor.schemas import DocumentResponse
from app.api.v1.advisor import upload_document
from app.api.v2.schemas import V2Envelope
from app.api.v2.utils import envelope, parse_doc_id, to_doc_id
from app.core.database import get_db
from app.core.dependencies import get_inference_auth, require_api_key_scope
from app.core.exceptions import NotFoundError
from app.core.storage import storage

router = APIRouter(prefix="/documents", tags=["V2"])


def _document_data(doc: Document) -> dict:
    return {
        "filename": doc.filename,
        "content_type": doc.content_type,
        "fingerprint": doc.fingerprint_json,
        "page_count": doc.page_count,
        "preview_url": storage.get_url(doc.s3_key),
    }


def _document_envelope(doc: Document, *, request_id: str | None = None) -> dict:
    created_at = doc.created_at.isoformat() if doc.created_at else None
    return envelope(
        object_type="document",
        id=to_doc_id(doc.id),
        created_at=created_at,
        request_id=request_id,
        data=_document_data(doc),
    )


@router.post("/", response_model=V2Envelope, status_code=status.HTTP_201_CREATED)
async def create_document(
    request: Request,
    file: UploadFile = File(...),
    session_id: str | None = Query(None),
    user: User = Depends(get_inference_auth),
    db: Session = Depends(get_db),
):
    require_api_key_scope(request, "ocr:write")
    v1_response: DocumentResponse = await upload_document(
        file=file,
        session_id=session_id,
        user=user,
        db=db,
    )
    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(v1_response.id), Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    request_id = getattr(request.state, "request_id", None)
    return _document_envelope(doc, request_id=request_id)


@router.get("/", response_model=V2Envelope)
def list_documents(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    starting_after: str | None = Query(None),
    user: User = Depends(get_inference_auth),
    db: Session = Depends(get_db),
):
    require_api_key_scope(request, "ocr:read")
    query = db.query(Document).filter(Document.user_id == user.id)

    if starting_after:
        cursor_id = parse_doc_id(starting_after)
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

    request_id = getattr(request.state, "request_id", None)
    items = [_document_envelope(doc, request_id=request_id) for doc in docs]
    return envelope(
        object_type="document_list",
        id=None,
        created_at=None,
        request_id=request_id,
        data={"items": items, "has_more": has_more},
    )


@router.get("/{document_id}/", response_model=V2Envelope)
def get_document(
    document_id: str,
    request: Request,
    user: User = Depends(get_inference_auth),
    db: Session = Depends(get_db),
):
    require_api_key_scope(request, "ocr:read")
    doc_uuid = parse_doc_id(document_id)
    doc = (
        db.query(Document)
        .filter(Document.id == doc_uuid, Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    request_id = getattr(request.state, "request_id", None)
    return _document_envelope(doc, request_id=request_id)
