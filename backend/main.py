# ============================================================
# main.py  —  FastAPI Application Factory
# Production-Grade | Zero-Trust | Async | ORJSON
# ============================================================
from __future__ import annotations

import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.security import (
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)

settings = get_settings()


# ── Logging Configuration ─────────────────────────────────────────────────────
def configure_logging() -> None:
    """
    Configures structured logging for the application.
    Format: timestamp | level | logger | message
    In production, swap the handler for a JSON formatter + log aggregator.
    """
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "stream": "ext://sys.stdout",
                },
            },
            "root": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"],
            },
            # Suppress noisy third-party loggers
            "loggers": {
                "uvicorn.access": {"level": "WARNING"},
                "uvicorn.error": {"level": "INFO"},
                "multipart": {"level": "WARNING"},
            },
        }
    )


configure_logging()
logger = logging.getLogger(__name__)


# ── Application Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup/shutdown lifecycle manager.
    Runs startup tasks before the server begins accepting requests,
    and teardown tasks after it stops.
    """
    # ── Startup ──────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("🚀 %s v%s starting up", settings.APP_NAME, settings.APP_VERSION)
    logger.info("   Debug mode : %s", settings.DEBUG)
    logger.info("   Rate limit : %d req/min/IP", settings.RATE_LIMIT_PER_MINUTE)
    logger.info("   Max rows   : %s", f"{settings.MAX_ROWS:,}")
    logger.info("   CORS origins: %s", settings.ALLOWED_ORIGINS)
    logger.info("=" * 60)

    yield  # ← Server is running; handle requests here

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("🛑 %s shutting down gracefully", settings.APP_NAME)


# ── FastAPI Application Factory ───────────────────────────────────────────────
def create_app() -> FastAPI:
    """
    Creates and fully configures the FastAPI application instance.
    Using a factory pattern makes the app easily testable and composable.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Production-grade Customer Segmentation API. "
            "K-Means clustering with real-time feature scaling, "
            "Elbow Method analysis, and CSV upload support."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        default_response_class=ORJSONResponse,  # 10x faster JSON serialisation
        lifespan=lifespan,
    )

    # ── CORS Middleware ───────────────────────────────────────
    # Must be registered FIRST (outermost middleware) to handle preflight requests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],   # Only needed HTTP methods
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
        expose_headers=["X-Process-Time", "Retry-After"],
        max_age=3600,   # Cache preflight for 1 hour
    )

    # ── Security Headers ──────────────────────────────────────
    app.add_middleware(SecurityHeadersMiddleware)

    # ── Rate Limiting ─────────────────────────────────────────
    app.add_middleware(RateLimitMiddleware)

    # ── Request/Response Logging ──────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)

    # ── API Routes ────────────────────────────────────────────
    app.include_router(router)

    # ── Global Exception Handlers ─────────────────────────────
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=404,
            content={"detail": f"Endpoint '{request.url.path}' not found.", "status": "error"},
        )

    @app.exception_handler(405)
    async def method_not_allowed_handler(request: Request, exc) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=405,
            content={
                "detail": f"Method '{request.method}' not allowed on '{request.url.path}'.",
                "status": "error",
            },
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception) -> ORJSONResponse:
        """
        Catches unhandled 500 errors.
        NEVER exposes the stack trace to the client.
        Always logs full exception server-side for debugging.
        """
        logger.exception("Unhandled 500 error on %s: %s", request.url.path, exc)
        return ORJSONResponse(
            status_code=500,
            content={
                "detail": "An unexpected server error occurred. Our team has been notified.",
                "status": "error",
            },
        )

    # ── Root Endpoint ─────────────────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root() -> ORJSONResponse:
        return ORJSONResponse(
            content={
                "service": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "status": "operational",
                "docs": "/docs",
                "health": "/api/health",
            }
        )

    return app


# ── Application Instance ──────────────────────────────────────────────────────
app = create_app()


# ── Development Entry Point ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,           # Hot-reload for development
        log_level="info",
        access_log=False,      # We handle logging ourselves
        workers=1,             # Single worker for dev; use gunicorn for prod
    )
