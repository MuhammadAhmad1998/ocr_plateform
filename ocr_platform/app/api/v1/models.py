"""Public model registry alias — delegates to testing.models logic."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.api.v1.testing import build_models_list
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/")
def list_models(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List available OCR and VLM models (alias for /testing/models/)."""
    return build_models_list(db)
