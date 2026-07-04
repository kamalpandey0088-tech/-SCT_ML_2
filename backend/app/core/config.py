# ============================================================
# config.py  —  Environment & Application Settings
# Zero-Trust: all secrets via env vars, never hardcoded
# ============================================================
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """
    Centralised application configuration.
    All values are overridable via environment variables or a .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ──────────────────────────────────────────
    APP_NAME: str = "Customer Segmentation API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── CORS — Strict Origin Whitelist ────────────────────────
    # Only local dev + production origins are permitted.
    # Wildcards ("*") are explicitly banned in production.
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",       # Vite dev server (default port)
        "http://localhost:5174",       # Vite alt port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",       # Alternate React dev server
        "http://127.0.0.1:3000",
    ]

    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 20    # 20 requests / minute / IP
    RATE_LIMIT_STORAGE: str = "memory://"  # In-process; swap to redis:// in prod

    # ── ML Pipeline Constraints ───────────────────────────────
    MAX_ROWS: int = 50_000             # Max rows per dataset ingestion
    MAX_COLS: int = 50                 # Max columns per dataset
    MAX_K: int = 10                    # Maximum K clusters allowed
    MIN_K: int = 2                     # Minimum K clusters allowed
    CSV_MAX_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB hard limit

    # ── Logging ───────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"


@lru_cache()
def get_settings() -> Settings:
    """Return cached singleton settings instance."""
    return Settings()
