"""HTTP middleware for request tracing, logging, and inference timing."""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.error_responses import build_error_body

logger = logging.getLogger(__name__)
settings = get_settings()

INFERENCE_PATH_PREFIXES = (
    "/api/v1/ocr/jobs/",
    "/api/v1/vlm/",
    "/api/v1/paddle-ocr/",
    "/api/v1/got-ocr/",
    "/api/v1/qianfan-ocr/",
)

DEPRECATED_PATHS: dict[str, str] = {
    "/api/v1/testing/models/": "/api/v1/models/",
    "/api/v1/advisor/upload/": "/api/v1/documents/",
}


class RequestIdMiddleware(BaseHTTPMiddleware):
    header_name = "X-Request-ID"

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get(self.header_name) or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[self.header_name] = request_id
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Emit one JSON log line per request (no tokens or API keys)."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        log_entry = {
            "event": "http_request",
            "request_id": getattr(request.state, "request_id", None),
            "user_id": getattr(request.state, "user_id", None),
            "path": request.url.path,
            "method": request.method,
            "status": response.status_code,
            "duration_ms": duration_ms,
        }
        logger.info(json.dumps(log_entry, separators=(",", ":")))
        return response


class ProcessingTimeMiddleware(BaseHTTPMiddleware):
    """Add X-Processing-Time-Ms on ML inference routes."""

    header_name = "X-Processing-Time-Ms"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not any(request.url.path.startswith(prefix) for prefix in INFERENCE_PATH_PREFIXES):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers[self.header_name] = str(duration_ms)
        return response


class DeprecationMiddleware(BaseHTTPMiddleware):
    """Mark legacy alias routes with Deprecation and Link headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        successor = DEPRECATED_PATHS.get(request.url.path)
        if successor is not None:
            response.headers["Deprecation"] = "true"
            response.headers["Link"] = f'<{successor}>; rel="successor-version"'
        return response


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds MAX_UPLOAD_SIZE_MB."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
            except ValueError:
                size = 0
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            if size > max_bytes:
                request_id = getattr(request.state, "request_id", None)
                body = build_error_body(
                    code="PAYLOAD_TOO_LARGE",
                    message=f"Request body exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit",
                    request_id=request_id,
                )
                return JSONResponse(status_code=413, content=body)
        return await call_next(request)
