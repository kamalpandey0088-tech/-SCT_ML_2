// ============================================================
// types.ts — Shared TypeScript type definitions
// ============================================================

export interface CustomerRecord {
  customer_id: number | null;
  age: number | null;
  annual_income: number;
  spending_score: number;
  gender: string | null;
}

export interface CentroidPoint {
  cluster_id: number;
  annual_income: number;
  spending_score: number;
  age: number | null;
  marketing?: Record<string, string>;
}

export interface ClusterAssignment extends CustomerRecord {
  cluster: number;
}

export interface SegmentationMetrics {
  inertia: number;
  silhouette_score: number;
  k: number;
}

export interface SegmentResponse {
  status: string;
  k: number;
  total_customers: number;
  metrics: SegmentationMetrics;
  centroids: CentroidPoint[];
  assignments: ClusterAssignment[];
  scaler_used: string;
}

export interface ElbowDataPoint {
  k: number;
  wcss: number;
  silhouette: number;
}

export interface ElbowResponse {
  status: string;
  optimal_k: number;
  data: ElbowDataPoint[];
}

export interface MallDatasetResponse {
  status: string;
  total_rows: number;
  columns: string[];
  avg_income: number;
  avg_spending_score: number;
  avg_age: number;
  income_range: [number, number];
  score_range: [number, number];
  preview: CustomerRecord[];
  customers: CustomerRecord[];
}

export interface CSVUploadResponse {
  status: string;
  filename: string;
  total_rows: number;
  columns_detected: string[];
  avg_income: number;
  avg_spending_score: number;
  avg_age: number | null;
  income_range: [number, number];
  score_range: [number, number];
  preview: CustomerRecord[];
  segmentation: SegmentResponse;
}

// ── UI State ─────────────────────────────────────────────────────────────────
export type ViewTab = 'dashboard' | 'clusters' | 'innovation';

export interface AppState {
  view: ViewTab;
  k: number;
  scaler: 'standard' | 'minmax';
  dataset: CustomerRecord[];
  segmentation: SegmentResponse | null;
  elbowData: ElbowResponse | null;
  loading: boolean;
  elbowLoading: boolean;
  error: string | null;
  datasetName: string;
}

// ── Cluster Personas ─────────────────────────────────────────────────────────
export const CLUSTER_PERSONAS: Record<number, { name: string; emoji: string; description: string }> = {
  0: { name: 'Budget Hunters', emoji: '🎯', description: 'Low income, low spending — price-sensitive' },
  1: { name: 'Impulsive Shoppers', emoji: '🔥', description: 'Low income, high spending — thrill seekers' },
  2: { name: 'Mid-Market', emoji: '⚖️', description: 'Average income, average spending — stable core' },
  3: { name: 'Careful Elite', emoji: '💎', description: 'High income, low spending — conservative savers' },
  4: { name: 'Premium VIPs', emoji: '👑', description: 'High income, high spending — top-tier loyalists' },
  5: { name: 'Emerging Stars', emoji: '⭐', description: 'Mid-income, above-avg spending — growth segment' },
  6: { name: 'Deal Seekers', emoji: '🏷️', description: 'Mixed income, selective spending — value-driven' },
  7: { name: 'Loyalists', emoji: '🤝', description: 'Consistent spenders — brand advocates' },
  8: { name: 'Seasonal Buyers', emoji: '🌊', description: 'Sporadic, high-value purchases' },
  9: { name: 'Wildcards', emoji: '🎲', description: 'Unpredictable patterns — diverse profiles' },
};

// ── Cluster Color Palette — Neon ─────────────────────────────────────────────
export const CLUSTER_COLORS = [
  '#00f5ff', // neon cyan
  '#ff2d78', // hot pink
  '#a855f7', // electric purple
  '#fbbf24', // cyber gold
  '#10b981', // matrix green
  '#f97316', // neon orange
  '#3b82f6', // electric blue
  '#ec4899', // magenta
  '#84cc16', // lime
  '#06b6d4', // sky cyan
];
