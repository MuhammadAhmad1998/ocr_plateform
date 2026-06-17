from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from platform_api.database import get_db
from platform_api.seed import build_models_list

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/")
def list_models(db: Session = Depends(get_db)):
    return build_models_list(db)
