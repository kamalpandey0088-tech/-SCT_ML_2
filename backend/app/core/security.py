# ============================================================
# security.py  —  Zero-Trust Security Middleware
# Rate Limiting | CORS | XSS Headers | Request Logging
# ============================================================
import logging
import time
from collections import defaultdict
from threading import Lock

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── In-Process Rate Limiter ───────────────────────────────────────────────────
class InMemoryRateLimiter:
    """
    Thread-safe sliding-window rate limiter.
    Tracks requests per IP with automatic window expiry.
    Production note: swap this for Redis-backed storage for multi-worker setups.
    """

    def __init__(self, max_requests: int, window_seconds: int = 60):
        self._max_requests = max_requests
        self._window = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, client_ip: str) -> tuple[bool, int]:
        """
        Returns (allowed: bool, retry_after_seconds: int).
        Uses a sliding window: only counts requests within the last `window` seconds.
        """
        now = time.monotonic()
        with self._lock:
            timestamps = self._store[client_ip]
            # Prune timestamps outside the current window
            cutoff = now - self._window
            self._store[client_ip] = [ts for ts in timestamps if ts > cutoff]
            count = len(self._store[client_ip])

            if count >= self._max_requests:
                oldest = self._store[client_ip][0]
                retry_after = int(self._window - (now - oldest)) + 1
                return False, retry_after

            self._store[client_ip].append(now)
            return True, 0


# Module-level singleton limiter
_rate_limiter = InMemoryRateLimiter(
    max_requests=settings.RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)


# ── Rate Limiting Middleware ──────────────────────────────────────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies per-IP rate limiting to all API routes.
    Returns HTTP 429 with Retry-After header when limit exceeded.
    Health-check and docs endpoints are exempt.
    """

    EXEMPT_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        allowed, retry_after = _rate_limiter.is_allowed(client_ip)

        if not allowed:
            logger.warning(
                "Rate limit exceeded | ip=%s path=%s",
                client_ip,
                request.url.path,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Maximum 20 requests per minute.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """
        Safely extract client IP.
        Handles X-Forwarded-For for reverse-proxy deployments (e.g., Nginx, Cloudflare).
        """
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP (originating client), strip whitespace
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"


# ── Security Headers Middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects industry-standard HTTP security headers into every response.
    Prevents XSS, clickjacking, MIME sniffing, and information disclosure.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.update(
            {
                # Prevent MIME type sniffing
                "X-Content-Type-Options": "nosniff",
                # Prevent clickjacking via iframes
                "X-Frame-Options": "DENY",
                # Enable browser XSS filter (legacy browsers)
                "X-XSS-Protection": "1; mode=block",
                # Strict CSP: only allow same-origin resources
                "Content-Security-Policy": (
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data:; "
                    "connect-src 'self';"
                ),
                # HSTS: enforce HTTPS for 1 year (enable when behind TLS)
                # "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                # Don't leak referrer to external origins
                "Referrer-Policy": "strict-origin-when-cross-origin",
                # Remove server fingerprint
                "Server": "CustomerSegAPI",
                # Restrict browser feature access
                "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            }
        )
        return response


# ── Request Logging Middleware ────────────────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured request/response logging for observability.
    Logs: method, path, status, duration, client IP.
    """

    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        client_ip = RateLimitMiddleware._get_client_ip(request)

        logger.info(
            "→ %s %s | ip=%s",
            request.method,
            request.url.path,
            client_ip,
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception("Unhandled exception during request: %s", exc)
            raise

        duration_ms = (time.monotonic() - start) * 1000
        logger.info(
            "← %s %s | status=%d | %.1fms | ip=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            client_ip,
        )
        return response
