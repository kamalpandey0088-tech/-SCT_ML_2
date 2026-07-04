# ============================================================
# routes.py  —  FastAPI API Routes
# /api/segment | /api/elbow | /api/upload-csv | /api/dataset/mall
# ============================================================
from __future__ import annotations

import json
import logging
from io import BytesIO
from typing import Annotated, List, Optional

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.ml.ml_engine import (
    parse_csv_to_customers,
    run_elbow_analysis,
    run_kmeans,
)
from app.schemas.schemas import (
    ColumnMapping,
    DatasetSummary,
    ElbowRequest,
    ElbowResponse,
    HealthResponse,
    SegmentRequest,
    SegmentResponse,
)
from app.utils.mall_data import MALL_CUSTOMERS

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api", tags=["Segmentation Engine"])


# ── Health Check ──────────────────────────────────────────────────────────────
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API Health Check",
    description="Returns service status and version. Used by load balancers and monitoring.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment="development" if settings.DEBUG else "production",
    )


# ── Built-in Mall Dataset ─────────────────────────────────────────────────────
@router.get(
    "/dataset/mall",
    response_class=ORJSONResponse,
    summary="Get Mall Customers Dataset",
    description="Returns the built-in Mall Customers dataset for immediate analysis.",
)
async def get_mall_dataset() -> ORJSONResponse:
    """
    Serves the pre-loaded Mall Customers dataset.
    Returns full dataset + summary statistics in a single response.
    """
    df = pd.DataFrame(MALL_CUSTOMERS)

    summary = {
        "status": "success",
        "total_rows": len(df),
        "columns": list(df.columns),
        "avg_income": round(df["annual_income"].mean(), 2),
        "avg_spending_score": round(df["spending_score"].mean(), 2),
        "avg_age": round(df["age"].mean(), 2),
        "income_range": [df["annual_income"].min(), df["annual_income"].max()],
        "score_range": [df["spending_score"].min(), df["spending_score"].max()],
        "preview": df.head(10).to_dict(orient="records"),
        "customers": MALL_CUSTOMERS,
    }
    return ORJSONResponse(content=summary)


# ── Core Segmentation Endpoint ────────────────────────────────────────────────
@router.post(
    "/segment",
    response_model=SegmentResponse,
    response_class=ORJSONResponse,
    summary="Run K-Means Segmentation",
    description=(
        "Accepts a JSON payload of customer records + desired K, "
        "scales features, runs K-Means clustering, and returns "
        "cluster assignments, centroids, and performance metrics."
    ),
    status_code=status.HTTP_200_OK,
)
async def segment(request_body: SegmentRequest) -> ORJSONResponse:
    """
    Primary segmentation endpoint.

    Security guarantees (enforced by Pydantic before this function is called):
      - All fields are strictly typed and bounded
      - k ∈ [MIN_K, MAX_K]
      - annual_income ∈ [0, 1,000,000]
      - spending_score ∈ [0, 100]
      - List length ∈ [MIN_K, MAX_ROWS]

    If validation fails, FastAPI returns a 422 Unprocessable Entity automatically.
    """
    logger.info(
        "Segmentation request | n=%d | k=%d | scaler=%s",
        len(request_body.customers),
        request_body.k,
        request_body.scaler,
    )

    try:
        result = await run_kmeans(
            customers=request_body.customers,
            k=request_body.k,
            scaler_type=request_body.scaler,
        )
    except ValueError as exc:
        logger.error("Segmentation validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during segmentation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during clustering. Please try again.",
        )

    return ORJSONResponse(content=result.model_dump())


# ── Elbow Method Endpoint ─────────────────────────────────────────────────────
@router.post(
    "/elbow",
    response_model=ElbowResponse,
    response_class=ORJSONResponse,
    summary="Elbow Method + Silhouette Analysis",
    description=(
        "Computes WCSS and Silhouette Score for k in [2, max_k]. "
        "Returns the optimal K and curve data for the Innovation Center chart."
    ),
    status_code=status.HTTP_200_OK,
)
async def elbow_analysis(request_body: ElbowRequest) -> ORJSONResponse:
    logger.info(
        "Elbow analysis request | n=%d | max_k=%d",
        len(request_body.customers),
        request_body.max_k,
    )

    try:
        result = await run_elbow_analysis(
            customers=request_body.customers,
            max_k=request_body.max_k,
            scaler_type=request_body.scaler,
        )
    except ValueError as exc:
        logger.error("Elbow analysis error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during elbow analysis: %s", exc)
        raise HTTPException(status_code=500, detail="Internal error during elbow analysis.")

    return ORJSONResponse(content=result.model_dump())


# ── CSV Upload Endpoint ───────────────────────────────────────────────────────
@router.post(
    "/upload-csv",
    response_class=ORJSONResponse,
    summary="Upload Custom CSV Dataset",
    description=(
        "Accepts a CSV file upload (max 10 MB) and a JSON column mapping. "
        "Parses, validates, and returns a DatasetSummary for preview. "
        "Segmentation is then performed via POST /api/segment."
    ),
    status_code=status.HTTP_200_OK,
)
async def upload_csv(
    file: Annotated[UploadFile, File(description="CSV file, max 10 MB")],
    column_mapping: Annotated[
        str,
        Form(
            description=(
                "JSON string specifying column names. "
                '{"income_col": "Annual Income (k$)", '
                '"score_col": "Spending Score (1-100)", "age_col": "Age", "id_col": "CustomerID"}'
            )
        ),
    ],
    k: Annotated[int, Form(ge=2, le=10, description="Number of clusters")] = 5,
) -> ORJSONResponse:
    """
    CSV Upload + Immediate Segmentation.

    Security measures:
      - Content-Type validation (must be text/csv or text/plain)
      - File size hard limit (CSV_MAX_SIZE_BYTES from settings)
      - Filename sanitisation
      - Column name injection prevention (via ColumnMapping Pydantic model)
      - Encoding enforcement (UTF-8)
    """
    # ── Content-Type Validation ───────────────────────────────
    allowed_types = {"text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"}
    if file.content_type and file.content_type.split(";")[0].strip() not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Please upload a CSV file.",
        )

    # ── File Size Validation ──────────────────────────────────
    content = await file.read()
    if len(content) > settings.CSV_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.CSV_MAX_SIZE_BYTES // (1024*1024)} MB.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── Column Mapping Validation ─────────────────────────────
    try:
        mapping_dict = json.loads(column_mapping)
        col_map = ColumnMapping(**mapping_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="column_mapping must be valid JSON.")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid column mapping: {exc}")

    # ── Parse CSV ──────────────────────────────────────────────
    try:
        customers = parse_csv_to_customers(
            content=content,
            income_col=col_map.income_col,
            score_col=col_map.score_col,
            age_col=col_map.age_col,
            id_col=col_map.id_col,
        )
    except ValueError as exc:
        logger.error("CSV parsing failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected CSV parsing error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")

    # ── Generate Summary Statistics ───────────────────────────
    incomes = [c.annual_income for c in customers]
    scores = [c.spending_score for c in customers]
    ages = [c.age for c in customers if c.age is not None]

    # ── Run Segmentation ───────────────────────────────────────
    try:
        segment_result = await run_kmeans(customers=customers, k=k, scaler_type="standard")
    except Exception as exc:
        logger.exception("Segmentation failed for uploaded CSV: %s", exc)
        raise HTTPException(status_code=500, detail="Clustering failed after CSV parse.")

    # ── Detect all CSV columns for frontend column-picker ─────
    try:
        df_cols = list(pd.read_csv(BytesIO(content), nrows=0).columns)
    except Exception:
        df_cols = [col_map.income_col, col_map.score_col]

    response = {
        "status": "success",
        "filename": file.filename,
        "total_rows": len(customers),
        "columns_detected": df_cols,
        "avg_income": round(sum(incomes) / len(incomes), 2),
        "avg_spending_score": round(sum(scores) / len(scores), 2),
        "avg_age": round(sum(ages) / len(ages), 2) if ages else None,
        "income_range": [min(incomes), max(incomes)],
        "score_range": [min(scores), max(scores)],
        "preview": [c.model_dump() for c in customers[:10]],
        "segmentation": segment_result.model_dump(),
    }

    logger.info(
        "CSV upload processed | file=%s | rows=%d | k=%d",
        file.filename,
        len(customers),
        k,
    )

    return ORJSONResponse(content=response)


# ── Segmentation from Mall Dataset (convenience endpoint) ─────────────────────
@router.post(
    "/segment/mall",
    response_model=SegmentResponse,
    response_class=ORJSONResponse,
    summary="Segment Built-in Mall Dataset",
    description="Runs K-Means on the built-in Mall Customers dataset with specified K.",
    status_code=status.HTTP_200_OK,
)
async def segment_mall(k: int = 5, scaler: str = "standard") -> ORJSONResponse:
    """Convenience endpoint: segments the Mall Customers dataset directly."""
    if not (settings.MIN_K <= k <= settings.MAX_K):
        raise HTTPException(
            status_code=422,
            detail=f"k must be between {settings.MIN_K} and {settings.MAX_K}",
        )
    if scaler not in {"standard", "minmax"}:
        raise HTTPException(status_code=422, detail="scaler must be 'standard' or 'minmax'")

    from app.schemas.schemas import CustomerRecord as CR
    customers = [CR(**row) for row in MALL_CUSTOMERS]

    try:
        result = await run_kmeans(customers=customers, k=k, scaler_type=scaler)
    except Exception as exc:
        logger.exception("Mall dataset segmentation error: %s", exc)
        raise HTTPException(status_code=500, detail="Clustering failed.")

    return ORJSONResponse(content=result.model_dump())


# ── Elbow on Mall Dataset ─────────────────────────────────────────────────────
@router.get(
    "/elbow/mall",
    response_model=ElbowResponse,
    response_class=ORJSONResponse,
    summary="Elbow Analysis on Mall Dataset",
    description="Computes optimal K for the built-in Mall Customers dataset.",
)
async def elbow_mall(max_k: int = 10, scaler: str = "standard") -> ORJSONResponse:
    if not (2 <= max_k <= settings.MAX_K):
        raise HTTPException(status_code=422, detail=f"max_k must be between 2 and {settings.MAX_K}")

    from app.schemas.schemas import CustomerRecord as CR
    customers = [CR(**row) for row in MALL_CUSTOMERS]

    try:
        result = await run_elbow_analysis(customers=customers, max_k=max_k, scaler_type=scaler)
    except Exception as exc:
        logger.exception("Elbow analysis error on mall dataset: %s", exc)
        raise HTTPException(status_code=500, detail="Elbow analysis failed.")

    return ORJSONResponse(content=result.model_dump())
