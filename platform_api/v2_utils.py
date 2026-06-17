from __future__ import annotations

import uuid
from typing import Any

from platform_api.exceptions import ValidationError

JOB_ID_PREFIX = "job_"
DOC_ID_PREFIX = "doc_"


def to_job_id(raw_id: str | uuid.UUID) -> str:
    return f"{JOB_ID_PREFIX}{raw_id}"


def to_doc_id(raw_id: str | uuid.UUID) -> str:
    return f"{DOC_ID_PREFIX}{raw_id}"


def parse_job_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value.removeprefix(JOB_ID_PREFIX))
    except ValueError as exc:
        raise ValidationError("Invalid job id") from exc


def parse_doc_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value.removeprefix(DOC_ID_PREFIX))
    except ValueError as exc:
        raise ValidationError("Invalid document id") from exc


def envelope(
    *,
    object_type: str,
    id: str | None,
    created_at: str | None,
    request_id: str | None,
    data: dict[str, Any],
) -> dict[str, Any]:
    return {
        "object": object_type,
        "id": id,
        "created_at": created_at,
        "request_id": request_id,
        "data": data,
    }
