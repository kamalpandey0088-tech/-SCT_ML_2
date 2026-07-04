# SCT_ML_2 — Production-Grade Customer Segmentation Platform

A cyberpunk-themed, glassmorphic full-stack application built for real-time customer behavioral intelligence. It uses machine learning to segment retail customers based on annual income and spending habits.

---

## 🚀 Key Features

*   **Interactive 2D/3D Cluster Visualisation:** Dynamic Recharts scatter plot with custom neon styling, pulsing centroid stars, and responsive tooltips detailing customer profiles and behavioral persona archetypes.
*   **Dynamic K-Means Selector:** Live debounced slider (2 to 10 clusters) that recalculates and re-renders cluster boundaries without reloading.
*   **Optimal-K Engine:** Automated mathematical validation via the Elbow Method (WCSS curve) and Silhouette Score maximization.
*   **Custom CSV Ingestion:** Drag-and-drop file uploader with headers preview and a visual column mapper to ingest and analyze any retail dataset.
*   **Zero-Trust Security:** Strict Pydantic input validation, secure HTTP response headers, sliding-window rate limiting, and CORS whitelist protections.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Framer Motion, Recharts, Axios, React Dropzone.
*   **Backend:** Python 3.9+, FastAPI, Scikit-Learn, Pandas, NumPy, Pydantic, SlowAPI.

---

## 📁 Repository Directory Structure

```
SCT_ML_2/
├── backend/
│   ├── main.py                # FastAPI Application instance & middlewares
│   ├── pytest.ini             # Testing configuration
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment variable template
│   ├── app/
│   │   ├── api/routes.py      # REST controllers (health, dataset, segment, elbow, upload)
│   │   ├── core/config.py     # Pydantic-settings config
│   │   ├── core/security.py   # Rate limiting & HTTP headers security middleware
│   │   ├── ml/ml_engine.py    # K-Means clustering, scaling & CSV parsing functions
│   │   ├── schemas/schemas.py # Strict Pydantic v2 validation models
│   │   └── utils/mall_data.py # 200 Mall Customers benchmark dataset
│   └── tests/
│       └── test_api.py        # 10 integration tests (all pass)
│
└── frontend/
    ├── index.html             # HTML entry point with outfit fonts preloaded
    ├── vite.config.ts         # Vite server proxy config (127.0.0.1:5175)
    ├── tailwind.config.js     # Cyberpunk theme design tokens & neon shadows
    ├── package.json           # npm dependencies
    └── src/
        ├── App.tsx            # Main shell & state orchestrator
        ├── api.ts             # Axios HTTP client
        ├── index.css          # Custom glassmorphic styling
        ├── types.ts           # Shared TypeScript models
        └── components/
            ├── ParticleField.tsx     # Ambient floating canvas particles
            ├── Navbar.tsx            # Navigation header with layouts
            ├── KpiCard.tsx           # Telemetry metrics KPI cards
            ├── DataGrid.tsx          # Paginated customer table
            ├── ClusterScatterPlot.tsx# Scatter plot chart
            ├── ElbowChart.tsx        # WCSS & Silhouette chart
            ├── KSlider.tsx           # Cluster count slider
            ├── CsvDropzone.tsx       # CSV uploader mapper
            ├── DashboardView.tsx     # View 1: Telemetry Dashboard
            ├── ClustersView.tsx      # View 2: Clusters scatter plot & radar
            └── InnovationView.tsx    # View 3: Live re-clustering & upload
```

---

## 🚦 Local Startup Instructions

### 1. Start the Backend API Server
Navigate to the `backend` directory, set up a virtual environment, install dependencies, and launch:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*   **Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start the Frontend Dev Server
Navigate to the `frontend` directory, install packages, and launch:
```bash
cd frontend
npm install
npm run dev
```
*   **Development Access URL:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:5175` depending on port availability)

---

## 🧪 Running Automated Tests
Run integration tests to verify health checking, ML clustering limits, parameter boundaries, and security rate limiting:
```bash
cd backend
source venv/bin/activate
pytest tests/test_api.py -v
```

---

## 🛡️ Zero-Trust Security Configuration
The application integrates several enterprise-grade security layers to protect the engine:
1.  **Strict Data Constraints:** Negative values, out-of-bounds parameters, and SQL strings in numeric columns are rejected instantly at the schema boundary with explicit HTTP 422 errors.
2.  **Rate Limiting:** Starlette-native middleware blocks request loops by limiting traffic to 20 requests/minute per client IP.
3.  **HTTP Security Headers:** Injects `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection` to prevent browser-based attacks.
4.  **Graceful Errors:** Clean JSON responses are returned for errors. System tracebacks are never exposed to public users.
