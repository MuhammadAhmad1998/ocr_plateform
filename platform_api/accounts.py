from __future__ import annotations

import uuid

from fastapi import Depends
from sqlalchemy.orm import Session

from platform_api.database import get_db
from platform_api.models import Account

DEFAULT_PLATFORM_ACCOUNT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def get_or_create_default_account(db: Session) -> Account:
    account = (
        db.query(Account)
        .filter(Account.platform_account_id == DEFAULT_PLATFORM_ACCOUNT_ID)
        .first()
    )
    if not account:
        account = Account(
            platform_account_id=DEFAULT_PLATFORM_ACCOUNT_ID,
            display_name="Default",
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    return account


def get_default_account(db: Session = Depends(get_db)) -> Account:
    return get_or_create_default_account(db)
