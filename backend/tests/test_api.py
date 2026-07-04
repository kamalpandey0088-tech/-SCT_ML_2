# ============================================================
# test_api.py  —  Async API Integration Tests
# Tests all endpoints including edge-cases and security paths
# ============================================================
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Import the app factory
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import create_app

app = create_app()


@pytest_asyncio.fixture
async def client():
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# ── Health Check ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


# ── Mall Dataset Retrieval ────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_mall_dataset(client: AsyncClient):
    response = await client.get("/api/dataset/mall")
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 200
    assert "customers" in data
    assert len(data["customers"]) == 200


# ── Segmentation Happy Path ───────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_mall_dataset(client: AsyncClient):
    response = await client.post("/api/segment/mall", params={"k": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["k"] == 5
    assert data["total_customers"] == 200
    assert len(data["centroids"]) == 5
    assert len(data["assignments"]) == 200
    assert data["metrics"]["silhouette_score"] > 0


# ── Elbow Method ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_elbow_mall_dataset(client: AsyncClient):
    response = await client.get("/api/elbow/mall", params={"max_k": 8})
    assert response.status_code == 200
    data = response.json()
    assert 2 <= data["optimal_k"] <= 8
    assert len(data["data"]) == 7  # k=2..8


# ── Security: Invalid K ───────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_invalid_k_too_high(client: AsyncClient):
    """K=11 exceeds MAX_K=10; should be rejected with 422."""
    payload = {
        "customers": [
            {"annual_income": 50.0, "spending_score": 60.0},
            {"annual_income": 80.0, "spending_score": 20.0},
        ],
        "k": 11,  # INVALID: exceeds MAX_K
    }
    response = await client.post("/api/segment", json=payload)
    assert response.status_code == 422


# ── Security: String in Numeric Field ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_injection_in_numeric_field(client: AsyncClient):
    """Injecting a string into annual_income should be rejected with 422."""
    payload = {
        "customers": [
            {"annual_income": "'; DROP TABLE customers; --", "spending_score": 50},
        ],
        "k": 2,
    }
    response = await client.post("/api/segment", json=payload)
    assert response.status_code == 422


# ── Security: Negative Spending Score ────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_out_of_bounds_score(client: AsyncClient):
    """spending_score=-5 is out of bounds [0, 100]; should be rejected."""
    payload = {
        "customers": [
            {"annual_income": 50.0, "spending_score": -5},  # INVALID
            {"annual_income": 80.0, "spending_score": 60},
        ],
        "k": 2,
    }
    response = await client.post("/api/segment", json=payload)
    assert response.status_code == 422


# ── Security: Too Few Customers for K ────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_customers_less_than_k(client: AsyncClient):
    """Sending 2 customers but k=5 should be rejected."""
    payload = {
        "customers": [
            {"annual_income": 50.0, "spending_score": 60.0},
            {"annual_income": 80.0, "spending_score": 20.0},
        ],
        "k": 5,  # k > len(customers)
    }
    response = await client.post("/api/segment", json=payload)
    assert response.status_code == 422


# ── Valid Inline Segmentation ─────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_segment_inline_data(client: AsyncClient):
    """Valid inline segmentation with 20 records and k=3."""
    customers = [
        {"annual_income": float(i * 5 + 10), "spending_score": float((i % 10) * 10 + 5)}
        for i in range(20)
    ]
    payload = {"customers": customers, "k": 3, "scaler": "minmax"}
    response = await client.post("/api/segment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["k"] == 3
    assert data["scaler_used"] == "minmax"
    assert len(data["assignments"]) == 20


# ── 404 Handler ───────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_404_response(client: AsyncClient):
    response = await client.get("/api/nonexistent-endpoint-xyz")
    assert response.status_code == 404
    assert response.json()["status"] == "error"
