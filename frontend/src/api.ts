// ============================================================
// api.ts — Typed API client with axios
// ============================================================
import axios from 'axios';
import type {
  SegmentResponse,
  ElbowResponse,
  MallDatasetResponse,
  CSVUploadResponse,
  CustomerRecord,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptors ──────────────────────────────────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail ?? err.message ?? 'Unknown error';
    return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)));
  }
);

// ── API Methods ───────────────────────────────────────────────────────────────
export const api = {
  /** Fetch the built-in Mall Customers dataset */
  getMallDataset: (): Promise<MallDatasetResponse> =>
    client.get('/api/dataset/mall').then((r) => r.data),

  /** Run K-Means on the built-in mall dataset */
  segmentMall: (k: number, scaler: 'standard' | 'minmax' = 'standard'): Promise<SegmentResponse> =>
    client.post(`/api/segment/mall`, null, { params: { k, scaler } }).then((r) => r.data),

  /** Run K-Means on arbitrary customer data */
  segment: (
    customers: CustomerRecord[],
    k: number,
    scaler: 'standard' | 'minmax' = 'standard'
  ): Promise<SegmentResponse> =>
    client.post('/api/segment', { customers, k, scaler }).then((r) => r.data),

  /** Get elbow method data for mall dataset */
  elbowMall: (max_k: number = 10): Promise<ElbowResponse> =>
    client.get('/api/elbow/mall', { params: { max_k } }).then((r) => r.data),

  /** Run elbow analysis on arbitrary data */
  elbow: (
    customers: CustomerRecord[],
    max_k: number = 10
  ): Promise<ElbowResponse> =>
    client.post('/api/elbow', { customers, max_k }).then((r) => r.data),

  /** Upload custom CSV and run segmentation */
  uploadCSV: (
    file: File,
    columnMapping: { income_col: string; score_col: string; age_col?: string; id_col?: string },
    k: number = 5
  ): Promise<CSVUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    form.append('column_mapping', JSON.stringify(columnMapping));
    form.append('k', String(k));
    return client.post('/api/upload-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
