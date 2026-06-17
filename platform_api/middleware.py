from __future__ import annotations

import time
import uuid
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

INFERENCE_PATH_PREFIXES = (
    "/api/v1/ocr/jobs/",
    "/api/v2/ocr/jobs/",
    "/api/v1/vlm/",
    "/api/v1/paddle-ocr/",
    "/api/v1/got-ocr/",
    "/api/v1/qianfan-ocr/",
    "/api/v1/testing/run/",
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class ProcessingTimeMiddleware(BaseHTTPMiddleware):
    header_name = "X-Processing-Time-Ms"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not any(request.url.path.startswith(prefix) for prefix in INFERENCE_PATH_PREFIXES):
            return await call_next(request)
        start = time.perf_counter()
        response = await call_next(request)
        response.headers[self.header_name] = str(round((time.perf_counter() - start) * 1000, 2))
        return response
