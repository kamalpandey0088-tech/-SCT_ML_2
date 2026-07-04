# ============================================================
# ml_engine.py  —  Core Machine Learning Pipeline
# K-Means Clustering | Auto-Scaling | Elbow Method | Silhouette
# ============================================================
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from app.core.config import get_settings
from app.schemas.schemas import (
    ClusterAssignment,
    CentroidPoint,
    CustomerRecord,
    ElbowDataPoint,
    ElbowResponse,
    SegmentationMetrics,
    SegmentResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Thread pool for running blocking scikit-learn operations without blocking the
# FastAPI event loop. ML training is CPU-bound, so we offload it here.
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ml_worker")


# ── Feature Extraction ────────────────────────────────────────────────────────
def _customers_to_dataframe(customers: List[CustomerRecord]) -> pd.DataFrame:
    """
    Convert a list of validated CustomerRecord Pydantic models into a
    clean Pandas DataFrame. Handles optional fields gracefully.
    """
    rows = []
    for idx, c in enumerate(customers):
        rows.append(
            {
                "customer_id": c.customer_id if c.customer_id is not None else idx + 1,
                "age": float(c.age) if c.age is not None else np.nan,
                "annual_income": float(c.annual_income),
                "spending_score": float(c.spending_score),
                "gender": c.gender or "",
            }
        )
    return pd.DataFrame(rows)


def _build_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Build a 2D feature matrix for K-Means.
    Always uses [annual_income, spending_score] as the primary axes
    (matching the classic Mall Customers problem space).
    Age is included as a third feature if available and non-NaN.
    """
    features = ["annual_income", "spending_score"]
    if "age" in df.columns and df["age"].notna().all():
        features.append("age")
    return df[features].values.astype(np.float64)


def _get_scaler(scaler_type: str):
    """Factory for feature scalers."""
    if scaler_type == "minmax":
        return MinMaxScaler(feature_range=(0, 1))
    return StandardScaler()


# ── Core K-Means Training (runs in thread pool) ───────────────────────────────
def _run_kmeans_sync(
    X_raw: np.ndarray,
    k: int,
    scaler_type: str,
    feature_cols: List[str],
) -> Dict[str, Any]:
    """
    Synchronous (blocking) K-Means training.
    This function runs inside a ThreadPoolExecutor, keeping the event loop free.

    Steps:
      1. Scale features using StandardScaler or MinMaxScaler
      2. Run K-Means with k-means++ initialisation (deterministic via random_state)
      3. Compute Silhouette Score for model quality assessment
      4. Inverse-transform centroids back to original feature space
      5. Package results into a clean dict

    Returns a dict that the async wrapper converts to a SegmentResponse.
    """
    logger.info("K-Means training started | k=%d | n_samples=%d", k, len(X_raw))

    scaler = _get_scaler(scaler_type)
    X_scaled = scaler.fit_transform(X_raw)

    kmeans = KMeans(
        n_clusters=k,
        init="k-means++",       # Superior initialisation over random
        n_init=10,               # 10 restarts to find global optimum
        max_iter=300,
        random_state=42,         # Reproducible results
        algorithm="lloyd",       # Classic Lloyd's algorithm
    )
    labels = kmeans.fit_predict(X_scaled)

    # ── Metrics ──────────────────────────────────────────────
    inertia = float(kmeans.inertia_)

    # Silhouette requires at least 2 unique labels
    if len(np.unique(labels)) >= 2:
        sil_score = float(silhouette_score(X_scaled, labels, sample_size=min(len(X_raw), 5000)))
    else:
        sil_score = 0.0

    # ── Inverse-transform centroids ──────────────────────────
    centroids_original = scaler.inverse_transform(kmeans.cluster_centers_)

    logger.info(
        "K-Means complete | k=%d | inertia=%.2f | silhouette=%.4f",
        k, inertia, sil_score,
    )

    return {
        "labels": labels.tolist(),
        "centroids_original": centroids_original.tolist(),
        "inertia": inertia,
        "silhouette_score": sil_score,
        "feature_cols": feature_cols,
        "scaler_type": scaler_type,
    }


# ── Async Wrapper ─────────────────────────────────────────────────────────────
async def run_kmeans(
    customers: List[CustomerRecord],
    k: int,
    scaler_type: str = "standard",
) -> SegmentResponse:
    """
    Async entry-point for K-Means clustering.
    Delegates CPU-bound work to the thread pool so FastAPI stays responsive.
    """
    df = _customers_to_dataframe(customers)
    X_raw = _build_feature_matrix(df)
    feature_cols = ["annual_income", "spending_score"]
    if "age" in df.columns and df["age"].notna().all():
        feature_cols.append("age")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _executor,
        _run_kmeans_sync,
        X_raw,
        k,
        scaler_type,
        feature_cols,
    )

    # ── Build response objects ────────────────────────────────
    labels: List[int] = result["labels"]
    centroids_raw: List[List[float]] = result["centroids_original"]
    feat_cols: List[str] = result["feature_cols"]

    centroids = []
    for idx, centroid in enumerate(centroids_raw):
        cp = CentroidPoint(
            cluster_id=idx,
            annual_income=round(centroid[0], 4),
            spending_score=round(centroid[1], 4),
            age=round(centroid[2], 2) if len(feat_cols) > 2 else None,
        )
        centroids.append(cp)

    assignments = []
    for row_idx, (_, row) in enumerate(df.iterrows()):
        ca = ClusterAssignment(
            customer_id=int(row["customer_id"]),
            age=float(row["age"]) if not np.isnan(row["age"]) else None,
            annual_income=round(float(row["annual_income"]), 4),
            spending_score=round(float(row["spending_score"]), 4),
            gender=str(row["gender"]) or None,
            cluster=int(labels[row_idx]),
        )
        assignments.append(ca)

    metrics = SegmentationMetrics(
        inertia=round(result["inertia"], 4),
        silhouette_score=round(result["silhouette_score"], 6),
        k=k,
    )

    return SegmentResponse(
        k=k,
        total_customers=len(customers),
        metrics=metrics,
        centroids=centroids,
        assignments=assignments,
        scaler_used=scaler_type,
    )


# ── Elbow Method Pipeline ─────────────────────────────────────────────────────
def _run_elbow_sync(X_raw: np.ndarray, max_k: int, scaler_type: str) -> dict[str, Any]:
    """
    Compute WCSS and Silhouette for k in range [2, max_k].
    Used to drive the Elbow Method visualisation and auto-select optimal K.

    Optimal K Selection Strategy:
      - Primary: Maximum Silhouette Score (higher = more distinct clusters)
      - Secondary: Elbow Point (largest second-derivative of WCSS curve)
    We favour Silhouette as it's more mathematically rigorous.
    """
    scaler = _get_scaler(scaler_type)
    X_scaled = scaler.fit_transform(X_raw)

    k_range = range(2, max_k + 1)
    wcss_values: list[float] = []
    silhouette_values: list[float] = []

    for k in k_range:
        km = KMeans(
            n_clusters=k, init="k-means++", n_init=5,
            max_iter=200, random_state=42, algorithm="lloyd"
        )
        labels = km.fit_predict(X_scaled)
        wcss_values.append(float(km.inertia_))

        if len(np.unique(labels)) >= 2:
            sil = float(silhouette_score(X_scaled, labels, sample_size=min(len(X_raw), 3000)))
        else:
            sil = 0.0
        silhouette_values.append(sil)

    # Determine optimal K by maximum silhouette score
    optimal_idx = int(np.argmax(silhouette_values))
    optimal_k = list(k_range)[optimal_idx]

    data = [
        {"k": k, "wcss": round(w, 4), "silhouette": round(s, 6)}
        for k, w, s in zip(k_range, wcss_values, silhouette_values)
    ]

    logger.info("Elbow analysis complete | optimal_k=%d", optimal_k)
    return {"optimal_k": optimal_k, "data": data}


async def run_elbow_analysis(
    customers: List[CustomerRecord],
    max_k: int,
    scaler_type: str = "standard",
) -> ElbowResponse:
    """Async wrapper for the elbow method computation."""
    df = _customers_to_dataframe(customers)
    X_raw = _build_feature_matrix(df)

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _executor,
        _run_elbow_sync,
        X_raw,
        max_k,
        scaler_type,
    )

    return ElbowResponse(
        optimal_k=result["optimal_k"],
        data=[ElbowDataPoint(**pt) for pt in result["data"]],
    )


# ── CSV Parsing Engine ────────────────────────────────────────────────────────
def parse_csv_to_customers(
    content: bytes,
    income_col: str,
    score_col: str,
    age_col: Optional[str] = None,
    id_col: Optional[str] = None,
) -> List[CustomerRecord]:
    """
    Safely parse a CSV byte payload into a list of validated CustomerRecord models.

    Security measures:
      - Hard limit on file size (enforced upstream at the API layer)
      - Hard limit on row count (MAX_ROWS from settings)
      - Column name validation (enforced by ColumnMapping schema)
      - Numeric type coercion with strict bounds (via Pydantic)
      - Non-numeric rows are dropped with a warning, not rejected
    """
    try:
        df = pd.read_csv(
            pd.io.common.BytesIO(content),
            nrows=settings.MAX_ROWS + 1,   # +1 to detect overflow
            encoding="utf-8",
            on_bad_lines="skip",           # Skip malformed lines safely
        )
    except Exception as exc:
        raise ValueError(f"Failed to parse CSV: {exc}") from exc

    if len(df) > settings.MAX_ROWS:
        raise ValueError(
            f"Dataset exceeds maximum allowed rows ({settings.MAX_ROWS:,}). "
            f"Please upload a smaller file."
        )

    # Validate required columns exist
    missing = {income_col, score_col} - set(df.columns)
    if missing:
        raise ValueError(
            f"Required columns not found in CSV: {missing}. "
            f"Available columns: {list(df.columns)}"
        )

    # Coerce to numeric, drop rows where primary features are non-numeric
    df[income_col] = pd.to_numeric(df[income_col], errors="coerce")
    df[score_col] = pd.to_numeric(df[score_col], errors="coerce")

    n_before = len(df)
    df.dropna(subset=[income_col, score_col], inplace=True)
    n_dropped = n_before - len(df)
    if n_dropped:
        logger.warning("Dropped %d rows with non-numeric values in CSV", n_dropped)

    customers = []
    for idx, row in df.iterrows():
        try:
            record = CustomerRecord(
                customer_id=int(row[id_col]) if id_col and id_col in df.columns and pd.notna(row.get(id_col)) else None,
                age=int(row[age_col]) if age_col and age_col in df.columns and pd.notna(row.get(age_col)) else None,
                annual_income=float(row[income_col]),
                spending_score=float(row[score_col]),
                gender=str(row.get("Gender", row.get("gender", ""))).strip() or None,
            )
            customers.append(record)
        except Exception as exc:
            logger.debug("Skipping row %d due to validation error: %s", idx, exc)
            continue

    if not customers:
        raise ValueError("No valid customer records found after validation. Check column types.")

    return customers
