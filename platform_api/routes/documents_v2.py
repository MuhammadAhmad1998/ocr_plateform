import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from platform_api.accounts import get_default_account
from platform_api.database import get_db
from platform_api.exceptions import NotFoundError
from platform_api.models import Account, Document
from platform_api.ocr_bridge import storage
from platform_api.routes.documents_v1 import create_document as v1_create
from platform_api.schemas import V2Envelope
from platform_api.v2_utils import envelope, parse_doc_id, to_doc_id

router = APIRouter(prefix="/documents", tags=["V2"])


def _doc_data(doc: Document) -> dict:
    return {
        "filename": doc.filename,
        "content_type": doc.content_type,
        "fingerprint": doc.fingerprint_json,
        "page_count": doc.page_count,
        "preview_url": storage.get_url(doc.s3_key),
    }


@router.post("/", response_model=V2Envelope, status_code=status.HTTP_201_CREATED)
async def create_document(
    request: Request,
    file: UploadFile = File(...),
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    v1_resp = await v1_create(file=file, account=account, db=db)
    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(v1_resp.id), Document.account_id == account.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    rid = getattr(request.state, "request_id", None)
    return envelope(
        object_type="document",
        id=to_doc_id(doc.id),
        created_at=doc.created_at.isoformat() if doc.created_at else None,
        request_id=rid,
        data=_doc_data(doc),
    )


@router.get("/", response_model=V2Envelope)
def list_documents(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    starting_after: str | None = Query(None),
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(Document.account_id == account.id)
    if starting_after:
        cursor_id = parse_doc_id(starting_after)
        cursor = db.query(Document).filter(Document.id == cursor_id, Document.account_id == account.id).first()
        if not cursor:
            raise NotFoundError("Document not found")
        query = query.filter(Document.created_at > cursor.created_at)
    docs = query.order_by(Document.created_at.asc()).limit(limit + 1).all()
    has_more = len(docs) > limit
    if has_more:
        docs = docs[:limit]
    rid = getattr(request.state, "request_id", None)
    items = [
        envelope(
            object_type="document",
            id=to_doc_id(d.id),
            created_at=d.created_at.isoformat() if d.created_at else None,
            request_id=rid,
            data=_doc_data(d),
        )
        for d in docs
    ]
    return envelope(object_type="document_list", id=None, created_at=None, request_id=rid, data={"items": items, "has_more": has_more})


@router.get("/{document_id}/", response_model=V2Envelope)
def get_document(
    document_id: str,
    request: Request,
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == parse_doc_id(document_id), Document.account_id == account.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")
    rid = getattr(request.state, "request_id", None)
    return envelope(
        object_type="document",
        id=to_doc_id(doc.id),
        created_at=doc.created_at.isoformat() if doc.created_at else None,
        request_id=rid,
        data=_doc_data(doc),
    )
