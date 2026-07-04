// ============================================================
// InnovationView.tsx — View 3: Innovation Center
// K-Slider + Elbow Analysis + CSV Upload
// ============================================================
import { motion } from 'framer-motion';
import { Sparkles, Brain, UploadCloud } from 'lucide-react';
import { KSlider } from './KSlider';
import { ElbowChart } from './ElbowChart';
import { CsvDropzone } from './CsvDropzone';
import type { AppState, CSVUploadResponse } from '../types';
import { ClusterScatterPlot } from './ClusterScatterPlot';

interface Props {
  state: AppState;
  onKChange: (k: number) => void;
  onCSVSuccess: (result: CSVUploadResponse) => void;
}

export function InnovationView({ state, onKChange, onCSVSuccess }: Props) {
  const { k, loading, elbowLoading, segmentation, elbowData } = state;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
        <h1 className="text-4xl sm:text-5xl font-black mb-3">
          <span className="gradient-text">Innovation Center</span>
        </h1>
        <p className="text-white/40 text-lg max-w-2xl mx-auto">
          Live K manipulation · Optimal-K engine · Custom dataset ingestion
        </p>
      </motion.div>

      {/* Feature callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '⚡', title: 'Live Re-clustering', desc: 'Change K and watch clusters update in real-time without a page reload', color: '#fbbf24' },
          { icon: '🧮', title: 'Optimal-K Engine', desc: 'Silhouette Score + Elbow Method to mathematically prove the best K', color: '#00f5ff' },
          { icon: '📊', title: 'Bring Your Data', desc: 'Upload any CSV retail dataset and our ML pipeline segments it instantly', color: '#ff2d78' },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 border border-white/08 flex gap-3"
          >
            <span className="text-3xl">{f.icon}</span>
            <div>
              <p className="text-white font-semibold text-sm" style={{ color: f.color }}>{f.title}</p>
              <p className="text-white/40 text-xs mt-1">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Section 1: Live K Slider ────────────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#fbbf24]/15 border border-[#fbbf24]/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#fbbf24]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Dynamic K Selector</h2>
            <p className="text-white/40 text-sm">Move the slider — clusters re-compute live</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <KSlider
              k={k}
              onChange={onKChange}
              loading={loading}
              metrics={segmentation?.metrics ?? null}
            />
          </div>

          {/* Live scatter preview */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="glass rounded-2xl border border-white/08 h-full min-h-[360px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-4 border-[#00f5ff]/20 border-t-[#00f5ff]"
                  />
                  <div className="text-center">
                    <p className="text-white font-semibold">Re-clustering with K={k}</p>
                    <p className="text-white/40 text-sm">Running K-Means algorithm…</p>
                  </div>
                </div>
              </div>
            ) : segmentation ? (
              <div className="glass rounded-2xl p-5 border border-white/08">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-semibold">Live Cluster View · K={segmentation.k}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="glass px-2 py-1 rounded-lg text-[#10b981] border border-[#10b981]/30 font-mono">
                      SIL: {segmentation.metrics.silhouette_score.toFixed(4)}
                    </span>
                    <span className="glass px-2 py-1 rounded-lg text-[#a855f7] border border-[#a855f7]/30 font-mono">
                      WCSS: {segmentation.metrics.inertia.toFixed(0)}
                    </span>
                  </div>
                </div>
                <ClusterScatterPlot data={segmentation} />
              </div>
            ) : (
              <div className="glass rounded-2xl border border-white/08 h-full min-h-[360px] flex items-center justify-center text-white/30">
                Load data to see the live chart
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Section 2: Elbow Method ──────────────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#00f5ff]/15 border border-[#00f5ff]/40 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#00f5ff]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Automated Optimal-K Engine</h2>
            <p className="text-white/40 text-sm">Elbow Method + Silhouette Score — mathematical proof of the best cluster count</p>
          </div>
        </div>

        {elbowLoading ? (
          <div className="glass rounded-2xl border border-white/08 p-16 flex flex-col items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-14 h-14 rounded-full border-4 border-[#00f5ff]/20 border-t-[#00f5ff]"
            />
            <p className="text-white/60 font-semibold">Running K=2..10 analysis…</p>
            <p className="text-white/30 text-sm">Computing WCSS + Silhouette for each K value</p>
          </div>
        ) : elbowData ? (
          <ElbowChart data={elbowData} />
        ) : (
          <div className="glass rounded-2xl border border-white/08 p-12 flex flex-col items-center gap-3 text-center">
            <Brain className="w-12 h-12 text-white/20" />
            <p className="text-white/50">Elbow analysis will appear here</p>
            <p className="text-white/30 text-sm">Load the Mall Customers dataset to begin</p>
          </div>
        )}
      </motion.section>

      {/* ── Section 3: CSV Upload ────────────────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#ff2d78]/15 border border-[#ff2d78]/40 flex items-center justify-center">
            <UploadCloud className="w-4 h-4 text-[#ff2d78]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Custom CSV Ingestion</h2>
            <p className="text-white/40 text-sm">Upload any retail dataset · Auto-column detection · Instant segmentation</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/08">
          <CsvDropzone onSuccess={onCSVSuccess} k={k} />
        </div>
      </motion.section>
    </div>
  );
}
