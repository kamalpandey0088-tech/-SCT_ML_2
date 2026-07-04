// ============================================================
// App.tsx — Main Application Shell
// State management | Data fetching | View routing
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Database } from 'lucide-react';

import { api } from './api';
import type { AppState, CSVUploadResponse } from './types';
import { ParticleField } from './components/ParticleField';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ClustersView } from './components/ClustersView';
import { InnovationView } from './components/InnovationView';

const INITIAL_STATE: AppState = {
  view: 'dashboard',
  k: 5,
  scaler: 'standard',
  dataset: [],
  segmentation: null,
  elbowData: null,
  loading: false,
  elbowLoading: false,
  error: null,
  datasetName: 'Mall Customers',
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  const update = useCallback((patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadInitial = async () => {
      update({ loading: true, elbowLoading: true, error: null });

      try {
        // Parallel: load dataset + run segmentation + run elbow
        const [mallData, segResult, elbowResult] = await Promise.all([
          api.getMallDataset(),
          api.segmentMall(INITIAL_STATE.k, INITIAL_STATE.scaler),
          api.elbowMall(10),
        ]);

        update({
          dataset: mallData.customers,
          segmentation: segResult,
          elbowData: elbowResult,
          loading: false,
          elbowLoading: false,
          error: null,
        });
      } catch (e: any) {
        update({
          loading: false,
          elbowLoading: false,
          error: e.message ?? 'Failed to connect to the backend. Is it running on port 8000?',
        });
      }
    };

    loadInitial();
  }, [update]);

  // ── K change handler (debounced 400ms) ───────────────────────────────────
  const handleKChange = useCallback((k: number) => {
    update({ k, loading: true });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = state.dataset.length > 0
          ? await api.segment(state.dataset, k, state.scaler)
          : await api.segmentMall(k, state.scaler);
        update({ segmentation: result, loading: false });
      } catch (e: any) {
        update({ loading: false, error: e.message });
      }
    }, 400);
  }, [state.dataset, state.scaler, update]);

  // ── CSV Upload success handler ────────────────────────────────────────────
  const handleCSVSuccess = useCallback(async (result: CSVUploadResponse) => {
    const customers = result.segmentation.assignments.map(a => ({
      customer_id: a.customer_id,
      age: a.age,
      annual_income: a.annual_income,
      spending_score: a.spending_score,
      gender: a.gender,
    }));

    update({
      dataset: customers,
      segmentation: result.segmentation,
      datasetName: result.filename,
      loading: true,
      elbowLoading: true,
    });

    // Run elbow on new dataset
    try {
      const elbowResult = await api.elbow(customers, 10);
      update({ elbowData: elbowResult, elbowLoading: false });
    } catch {
      update({ elbowLoading: false });
    }

    update({ loading: false });
    update({ view: 'dashboard' });
  }, [update]);

  // ── Retry handler ─────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    initialized.current = false;
    setState(INITIAL_STATE);
  }, []);

  // ── Error Screen ─────────────────────────────────────────────────────────
  if (state.error && !state.segmentation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <ParticleField />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-10 border border-[#ef4444]/30 max-w-md w-full text-center relative z-10"
          style={{ boxShadow: '0 0 60px rgba(239,68,68,0.1)' }}
        >
          <AlertCircle className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h2 className="text-white font-bold text-2xl mb-2">Connection Failed</h2>
          <p className="text-white/60 text-sm mb-2">{state.error}</p>
          <div className="glass rounded-xl p-4 border border-white/08 text-left mb-6 mt-4">
            <p className="text-white/50 text-xs font-mono">
              cd customer-segmentation/backend<br/>
              source venv/bin/activate<br/>
              uvicorn main:app --reload --port 8000
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="btn-neon px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (state.loading && !state.segmentation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ParticleField />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6 relative z-10"
        >
          {/* Animated logo rings */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-[#00f5ff]"
                style={{ width: 40 + i * 28, height: 40 + i * 28, opacity: 0.4 - i * 0.1 }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.05, 1] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear' }}
              />
            ))}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f5ff] to-[#a855f7] flex items-center justify-center shadow-neon z-10">
              <Database className="w-6 h-6 text-black" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl">Initializing NexusSegment</p>
            <p className="text-white/40 text-sm mt-1">Loading Mall Customers · Training K-Means · Computing Elbow Curve</p>
          </div>
          {/* Shimmer progress bar */}
          <div className="w-64 h-1.5 bg-white/08 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00f5ff, #a855f7, #ff2d78)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main App ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative">
      <ParticleField />

      <div className="relative z-10">
        <Navbar
          view={state.view}
          onView={(v) => update({ view: v })}
          datasetName={state.datasetName}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
          {/* Non-blocking error toast */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="mb-6 glass rounded-xl p-4 border border-[#ef4444]/30 flex items-center gap-3 text-sm"
              >
                <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                <span className="text-white/70">{state.error}</span>
                <button onClick={() => update({ error: null })} className="ml-auto text-white/40 hover:text-white">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View Router */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.view}
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              {state.view === 'dashboard' && <DashboardView state={state} />}
              {state.view === 'clusters' && <ClustersView state={state} />}
              {state.view === 'innovation' && (
                <InnovationView
                  state={state}
                  onKChange={handleKChange}
                  onCSVSuccess={handleCSVSuccess}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/05 mt-4 py-6 text-center">
          <p className="text-white/20 text-xs font-mono">
            NexusSegment · Built with FastAPI + React + K-Means · 
            <span className="text-[#00f5ff]/40"> Zero-Trust Security</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
