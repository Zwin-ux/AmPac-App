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


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Extremely simple in-memory rate limiter for production stability.
    Limit: 100 requests per minute per IP.
    """
    def __init__(self, app):
        super().__init__(app)
        self.request_counts = {}  # {ip: [(timestamp, count)]}
        self.limit = 100
        self.window = 60 # seconds

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        
        # Clean up old window data
        history = self.request_counts.get(client_ip, [])
        history = [t for t in history if now - t < self.window]
        
        if len(history) >= self.limit:
            return Response(
                content="Rate limit exceeded. Try again in a minute.", 
                status_code=429
            )
            
        history.append(now)
        self.request_counts[client_ip] = history
        
        return await call_next(request)


class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Optional API key validation middleware.
    When BRAIN_API_KEY is set, requires X-API-Key header OR valid Authorization Bearer token for non-public endpoints.
    """
    # Paths that don't require API key (public endpoints)
    PUBLIC_PATHS = {
        "/",
        "/health",
        "/docs",
        "/redoc", 
        "/openapi.json",
        "/api/v1/openapi.json",
        "/static",
        "/api/v1/health",
    }
    
    def __init__(self, app, api_key: str | None = None):
        super().__init__(app)
        self.api_key = api_key
    
    async def dispatch(self, request: Request, call_next):
        # Skip if no API key configured (dev mode)
        if not self.api_key:
            return await call_next(request)
        
        # Skip for public paths
        path = request.url.path
        if any(path.startswith(p) for p in self.PUBLIC_PATHS):
            return await call_next(request)
        
        # Check API key header first
        provided_key = request.headers.get("X-API-Key")
        if provided_key == self.api_key:
            return await call_next(request)
        
        # Check Authorization header for Bearer token (Firebase or JWT)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if token:
                # Token validation will be done by the route handlers
                return await call_next(request)
        
        logger.warning(f"Invalid API key/token attempt from {request.client.host}")
        return Response(
            content="Invalid or missing API key/token",
            status_code=401
        )
