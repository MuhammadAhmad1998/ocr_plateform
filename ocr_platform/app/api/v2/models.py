"""V2 model registry endpoint — envelope response."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.api.v1.testing import build_models_list
from app.api.v2.schemas import V2Envelope
from app.api.v2.utils import envelope
from app.core.database import get_db
from app.core.dependencies import get_inference_auth, require_api_key_scope

router = APIRouter(prefix="/models", tags=["V2"])


@router.get("/", response_model=V2Envelope)
def list_models(
    request: Request,
    user: User = Depends(get_inference_auth),
    db: Session = Depends(get_db),
):
    require_api_key_scope(request, "ocr:read")
    request_id = getattr(request.state, "request_id", None)
    models_payload = build_models_list(db)
    return envelope(
        object_type="model_catalog",
        id=None,
        created_at=None,
        request_id=request_id,
        data=models_payload,
    )
