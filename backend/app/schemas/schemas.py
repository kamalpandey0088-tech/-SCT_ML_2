# ============================================================
# schemas.py  —  Pydantic v2 Validation Schemas
# Python 3.9 compatible | Zero-Trust validated | Strict bounds
# ============================================================
from __future__ import annotations

import re
from typing import Annotated, Any, Dict, List, Optional, Tuple

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ConfigDict,
)

from app.core.config import get_settings

settings = get_settings()

# ── Shared Constraints ────────────────────────────────────────────────────────
# Bounded numeric types prevent integer overflow / resource exhaustion attacks
K_VALUE = Annotated[int, Field(ge=settings.MIN_K, le=settings.MAX_K)]
INCOME_VALUE = Annotated[float, Field(ge=0.0, le=1_000_000.0)]
SCORE_VALUE = Annotated[float, Field(ge=0.0, le=100.0)]
AGE_VALUE = Annotated[int, Field(ge=0, le=120)]

# Allowed column name pattern: alphanumeric + underscores, no injection vectors
_SAFE_COL_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_ ]{0,63}$")


def _sanitise_string(v: str) -> str:
    """Strip leading/trailing whitespace; reject HTML/script injection patterns."""
    v = v.strip()
    if re.search(r"[<>\"'%;()&+]", v):
        raise ValueError(f"Field contains forbidden characters: {v!r}")
    return v


# ── Customer Record Schema ────────────────────────────────────────────────────
class CustomerRecord(BaseModel):
    """
    Single customer data point.
    Used when sending inline JSON data (no file upload).
    All numeric bounds enforced strictly.
    """

    model_config = ConfigDict(str_strip_whitespace=True, strict=False)

    customer_id: Optional[int] = Field(
        default=None,
        ge=1,
        le=10_000_000,
        description="Optional customer identifier",
    )
    age: Optional[int] = Field(
        default=None,
        ge=0,
        le=120,
        description="Customer age in years",
    )
    annual_income: float = Field(
        ge=0.0,
        le=1_000_000.0,
        description="Annual income in thousands USD (0–1,000,000)",
    )
    spending_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Spending score assigned by mall (0–100)",
    )
    gender: Optional[str] = Field(default=None, max_length=10)

    @field_validator("gender", mode="before")
    @classmethod
    def validate_gender(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        v = str(v).strip()
        if v.lower() not in {"male", "female", "m", "f", "other", ""}:
            raise ValueError(f"Invalid gender value: {v!r}")
        return v


# ── Inline Segmentation Request ───────────────────────────────────────────────
class SegmentRequest(BaseModel):
    """
    Payload for POST /api/segment with inline JSON data.
    Validates both the customer list and the requested K value.
    """

    model_config = ConfigDict(strict=False)

    customers: List[CustomerRecord] = Field(
        min_length=settings.MIN_K,
        max_length=settings.MAX_ROWS,
        description="List of customer records to segment",
    )
    k: int = Field(
        default=5,
        ge=settings.MIN_K,
        le=settings.MAX_K,
        description=f"Number of clusters (between {settings.MIN_K} and {settings.MAX_K})",
    )
    scaler: str = Field(
        default="standard",
        description="Feature scaling method: 'standard' (z-score) or 'minmax'",
    )

    @field_validator("scaler", mode="before")
    @classmethod
    def validate_scaler(cls, v: Any) -> str:
        allowed = {"standard", "minmax"}
        v_clean = str(v).strip().lower()
        if v_clean not in allowed:
            raise ValueError(f"scaler must be one of {allowed}, got {v!r}")
        return v_clean

    @model_validator(mode="after")
    def validate_min_samples_for_k(self) -> "SegmentRequest":
        if len(self.customers) < self.k:
            raise ValueError(
                f"Number of customers ({len(self.customers)}) must be ≥ k ({self.k})"
            )
        return self


# ── Elbow Method Request ──────────────────────────────────────────────────────
class ElbowRequest(BaseModel):
    """
    Payload for POST /api/elbow — computes WCSS for k=2..max_k.
    """

    model_config = ConfigDict(strict=False)

    customers: List[CustomerRecord] = Field(
        min_length=4,
        max_length=settings.MAX_ROWS,
    )
    max_k: int = Field(
        default=settings.MAX_K,
        ge=settings.MIN_K,
        le=settings.MAX_K,
        description="Upper bound for K in the elbow search",
    )
    scaler: str = Field(default="standard")

    @field_validator("scaler", mode="before")
    @classmethod
    def validate_scaler(cls, v: Any) -> str:
        allowed = {"standard", "minmax"}
        v_clean = str(v).strip().lower()
        if v_clean not in allowed:
            raise ValueError(f"scaler must be one of {allowed}, got {v!r}")
        return v_clean


# ── CSV Column Mapping Request ────────────────────────────────────────────────
class ColumnMapping(BaseModel):
    """
    Tells the backend which CSV columns to use for income and spending score.
    Protects against malicious column names being injected.
    """

    income_col: str = Field(max_length=64)
    score_col: str = Field(max_length=64)
    age_col: Optional[str] = Field(default=None, max_length=64)
    id_col: Optional[str] = Field(default=None, max_length=64)

    @field_validator("income_col", "score_col", "age_col", "id_col", mode="before")
    @classmethod
    def validate_column_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        v = str(v).strip()
        if not _SAFE_COL_PATTERN.match(v):
            raise ValueError(
                f"Column name {v!r} contains forbidden characters. "
                "Only alphanumerics and underscores are allowed."
            )
        return v


# ── Response Schemas ──────────────────────────────────────────────────────────
class CentroidPoint(BaseModel):
    """Coordinates of a cluster centroid in original (unscaled) feature space."""

    cluster_id: int
    annual_income: float
    spending_score: float
    age: Optional[float] = None
    marketing: Optional[Dict[str, str]] = None


class ClusterAssignment(BaseModel):
    """Single customer with their assigned cluster label."""

    customer_id: Optional[int]
    age: Optional[float]
    annual_income: float
    spending_score: float
    gender: Optional[str]
    cluster: int


class SegmentationMetrics(BaseModel):
    """ML performance metrics returned alongside cluster assignments."""

    inertia: float = Field(description="Within-cluster sum of squares (WCSS)")
    silhouette_score: float = Field(description="Silhouette coefficient (−1 to 1)")
    k: int


class SegmentResponse(BaseModel):
    """Full response payload for a segmentation request."""

    status: str = "success"
    k: int
    total_customers: int
    metrics: SegmentationMetrics
    centroids: List[CentroidPoint]
    assignments: List[ClusterAssignment]
    scaler_used: str


class ElbowDataPoint(BaseModel):
    k: int
    wcss: float
    silhouette: float


class ElbowResponse(BaseModel):
    """Elbow curve data for the frontend Optimal-K visualisation."""

    status: str = "success"
    optimal_k: int
    data: List[ElbowDataPoint]


class DatasetSummary(BaseModel):
    """Summary statistics returned after a CSV is parsed."""

    total_rows: int
    columns_detected: List[str]
    avg_income: float
    avg_spending_score: float
    avg_age: Optional[float] = None
    income_range: Tuple[float, float]
    score_range: Tuple[float, float]
    preview: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
