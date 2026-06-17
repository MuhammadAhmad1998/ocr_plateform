from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from platform_api.database import get_db
from platform_api.schemas import V2Envelope
from platform_api.seed import build_models_list
from platform_api.v2_utils import envelope

router = APIRouter(prefix="/models", tags=["V2"])


@router.get("/", response_model=V2Envelope)
def list_models(request: Request, db: Session = Depends(get_db)):
    request_id = getattr(request.state, "request_id", None)
    return envelope(
        object_type="model_catalog",
        id=None,
        created_at=None,
        request_id=request_id,
        data=build_models_list(db),
    )
