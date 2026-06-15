import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.accounts.models import User
from app.advisor.fingerprint import fingerprint_document
from app.advisor.models import ChatMessage, ChatSession, Document
from app.advisor.schemas import DocumentResponse, MessageRequest, SessionCreate, SessionResponse
from app.advisor.service import advisor_service
from app.rag.retriever import rag_retriever
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError, NotFoundError
from app.core.storage import storage
from app.core.uploads import check_payload_size, validate_advisor_upload

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.get("/capabilities/")
def get_advisor_capabilities():
    """Expose RAG/LLM mode for UI indicators."""
    settings = get_settings()
    rag_info = rag_retriever.describe_mode()
    return {
        "rag_mode": rag_info["rag_mode"],
        "llm_mode": advisor_service.describe_llm_mode(),
        "indexed_chunks": rag_info["indexed_chunks"],
        "use_mock_rag": rag_info["use_mock_rag_setting"],
        "llm_provider": settings.LLM_PROVIDER,
    }


@router.post("/session/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    data: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(user_id=user.id)
    if data.document_id:
        doc = (
            db.query(Document)
            .filter(Document.id == uuid.UUID(data.document_id), Document.user_id == user.id)
            .first()
        )
        if not doc:
            raise NotFoundError("Document not found")
        session.document_id = doc.id
    db.add(session)
    db.commit()
    db.refresh(session)

    greeting = (
        "Hello! I'm your OCR advisor. Tell me about your document processing needs—what types of documents will you be working with, and what's your use case?"
    )
    db.add(ChatMessage(session_id=session.id, role="assistant", content=greeting))
    db.commit()

    return _session_response(session, db)


@router.post("/upload/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = file.content_type or "application/octet-stream"
    validate_advisor_upload(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)

    session = None
    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == uuid.UUID(session_id), ChatSession.user_id == user.id)
            .first()
        )
        if session and session.document_id:
            raise ConflictError("Session already has a document")

    s3_key = storage.upload(content, "uploads", file.filename, content_type)
    fingerprint = fingerprint_document(content, content_type, file.filename)

    doc = Document(
        user_id=user.id,
        filename=file.filename,
        content_type=content_type,
        s3_key=s3_key,
        fingerprint_json=fingerprint,
        page_count=fingerprint.get("page_count", 1),
    )
    db.add(doc)
    db.flush()

    if session_id and session:
        session.document_id = doc.id
        session.phase = "GREETING"

    db.commit()
    db.refresh(doc)

    return DocumentResponse(
        id=str(doc.id),
        filename=doc.filename,
        content_type=doc.content_type,
        fingerprint=doc.fingerprint_json,
        page_count=doc.page_count,
        preview_url=storage.get_url(doc.s3_key),
    )


@router.post("/message/")
async def send_message(
    data: MessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == uuid.UUID(data.session_id), ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise NotFoundError("Session not found")

    db.add(ChatMessage(session_id=session.id, role="user", content=data.content))
    db.commit()

    async def event_generator():
        import json

        async for chunk in advisor_service.stream_response(db, session, data.content):
            if isinstance(chunk, dict):
                event = chunk.get("event")
                if event in {"meta", "recommendation"}:
                    yield {"event": event, "data": json.dumps(chunk["data"])}
                continue
            yield {"event": "message", "data": chunk}

        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())


@router.get("/session/{session_id}/", response_model=SessionResponse)
def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == uuid.UUID(session_id), ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise NotFoundError("Session not found")
    return _session_response(session, db)


def _session_response(session: ChatSession, db: Session) -> SessionResponse:
    recommendation = None
    last_rec = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id, ChatMessage.metadata_json.isnot(None))
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    if last_rec and last_rec.metadata_json:
        recommendation = last_rec.metadata_json.get("recommendation")

    return SessionResponse(
        id=str(session.id),
        phase=session.phase,
        document_id=str(session.document_id) if session.document_id else None,
        demo_run_count=session.demo_run_count,
        recommendation=recommendation,
    )
