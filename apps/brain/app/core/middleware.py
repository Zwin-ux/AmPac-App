import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging_config import request_id_ctx_var

logger = logging.getLogger("app.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Assigns a request id, stamps it on logs, and returns it to the caller.
    """
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_ctx_var.set(request_id)
        start = time.time()
        response: Response | None = None

        try:
            response = await call_next(request)
            return response
        except Exception:
            logger.exception("request_failed path=%s method=%s", request.url.path, request.method)
            raise
        finally:
            duration_ms = int((time.time() - start) * 1000)
            status = response.status_code if response else 500
            logger.info(
                "request_complete path=%s method=%s status=%s ms=%s",
                request.url.path,
                request.method,
                status,
                duration_ms,
            )
            if response:
                response.headers["x-request-id"] = request_id
            request_id_ctx_var.reset(token)
