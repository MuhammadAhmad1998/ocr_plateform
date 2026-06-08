import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.advisor.fingerprint import fingerprint_document
from app.advisor.models import ChatMessage, ChatSession, Document
from app.advisor.schemas import DocumentResponse, MessageRequest, SessionCreate, SessionResponse
from app.advisor.service import advisor_service
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import storage
from sse_starlette.sse import EventSourceResponse

router = APIRouter(prefix="/advisor", tags=["advisor"])
settings = get_settings()


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
            raise HTTPException(status_code=404, detail="Document not found")
        session.document_id = doc.id
    db.add(session)
    db.commit()
    db.refresh(session)

    greeting = (
        "Hello! I'm your OCR advisor. Upload a sample document and I'll help you find the perfect tier."
        if not session.document_id
        else f"I see your document is ready. Let's discuss your OCR needs."
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
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    allowed = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
    content_type = file.content_type or "application/octet-stream"
    if content_type not in allowed and not file.filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
        raise HTTPException(status_code=400, detail="Only PDF, PNG, JPG allowed")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == uuid.UUID(session_id), ChatSession.user_id == user.id)
            .first()
        )
        if session and session.document_id:
            raise HTTPException(status_code=400, detail="Session already has a document")

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
        raise HTTPException(status_code=404, detail="Session not found")

    db.add(ChatMessage(session_id=session.id, role="user", content=data.content))
    db.commit()

    async def event_generator():
        async for chunk in advisor_service.stream_response(db, session, data.content):
            yield {"event": "message", "data": chunk}

        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id, ChatMessage.role == "assistant")
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        if last_msg and last_msg.metadata_json:
            import json
            yield {"event": "recommendation", "data": json.dumps(last_msg.metadata_json)}

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
        raise HTTPException(status_code=404, detail="Session not found")
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
