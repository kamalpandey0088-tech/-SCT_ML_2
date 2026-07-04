// ============================================================
// DashboardView.tsx — View 1: Global Telemetry Dashboard
// ============================================================
import { motion } from 'framer-motion';
import { Users, DollarSign, Target, Layers } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { DataGrid } from './DataGrid';
import type { AppState } from '../types';

interface Props {
  state: AppState;
}

export function DashboardView({ state }: Props) {
  const { segmentation, dataset, elbowData } = state;

  const avgIncome = dataset.length
    ? (dataset.reduce((s, c) => s + c.annual_income, 0) / dataset.length).toFixed(1)
    : '—';
  const avgScore = dataset.length
    ? (dataset.reduce((s, c) => s + c.spending_score, 0) / dataset.length).toFixed(1)
    : '—';

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <h1 className="text-4xl sm:text-5xl font-black mb-3">
          <span className="gradient-text">Global Intelligence</span>
        </h1>
        <p className="text-white/40 text-lg max-w-2xl mx-auto">
          Real-time customer analytics powered by K-Means machine learning
        </p>
      </motion.div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Customers"
          value={segmentation ? segmentation.total_customers.toLocaleString() : dataset.length.toLocaleString()}
          sub="Active records analyzed"
          icon={<Users className="w-5 h-5" />}
          color="neon"
          delay={0}
        />
        <KpiCard
          label="Avg Annual Income"
          value={`$${avgIncome}k`}
          sub="Across all segments"
          icon={<DollarSign className="w-5 h-5" />}
          color="gold"
          delay={0.1}
        />
        <KpiCard
          label="Avg Spending Score"
          value={`${avgScore}/100`}
          sub="Mall scoring system"
          icon={<Target className="w-5 h-5" />}
          color="pink"
          delay={0.2}
        />
        <KpiCard
          label="Optimal K"
          value={elbowData ? `${elbowData.optimal_k}` : state.k}
          sub={elbowData ? `Silhouette: ${elbowData.data.find(d => d.k === elbowData.optimal_k)?.silhouette.toFixed(3)}` : 'Pending analysis'}
          icon={<Layers className="w-5 h-5" />}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Cluster Summary Cards */}
      {segmentation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 border border-white/08"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-bold text-xl">Cluster Distribution</h2>
              <p className="text-white/40 text-sm mt-1">K={segmentation.k} segments · {segmentation.scaler_used} scaling</p>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="glass px-3 py-2 rounded-lg border border-[#10b981]/30">
                <span className="text-white/40">Silhouette: </span>
                <span className="text-[#10b981] font-mono font-bold">{segmentation.metrics.silhouette_score.toFixed(4)}</span>
              </div>
              <div className="glass px-3 py-2 rounded-lg border border-[#a855f7]/30">
                <span className="text-white/40">WCSS: </span>
                <span className="text-[#a855f7] font-mono font-bold">{segmentation.metrics.inertia.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Cluster rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {segmentation.centroids.map((centroid) => {
              const count = segmentation.assignments.filter(a => a.cluster === centroid.cluster_id).length;
              const pct = ((count / segmentation.total_customers) * 100).toFixed(1);
              const COLORS = ['#00f5ff','#ff2d78','#a855f7','#fbbf24','#10b981','#f97316','#3b82f6','#ec4899','#84cc16','#06b6d4'];
              const color = COLORS[centroid.cluster_id % COLORS.length];
              const PERSONAS: Record<number, { name: string; emoji: string }> = {
                0: { name: 'Budget Hunters', emoji: '🎯' },
                1: { name: 'Impulsive Shoppers', emoji: '🔥' },
                2: { name: 'Mid-Market', emoji: '⚖️' },
                3: { name: 'Careful Elite', emoji: '💎' },
                4: { name: 'Premium VIPs', emoji: '👑' },
                5: { name: 'Emerging Stars', emoji: '⭐' },
                6: { name: 'Deal Seekers', emoji: '🏷️' },
                7: { name: 'Loyalists', emoji: '🤝' },
                8: { name: 'Seasonal Buyers', emoji: '🌊' },
                9: { name: 'Wildcards', emoji: '🎲' },
              };
              const persona = PERSONAS[centroid.cluster_id];

              return (
                <motion.div
                  key={centroid.cluster_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: centroid.cluster_id * 0.06 }}
                  className="glass-hover rounded-xl p-4 border transition-all"
                  style={{ borderColor: `${color}25` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                        {persona?.emoji}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">{persona?.name}</p>
                        <p className="text-white/40 text-[10px]">Cluster {centroid.cluster_id}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color }}>{pct}%</span>
                  </div>

                  {/* Distribution bar */}
                  <div className="h-1 bg-white/08 rounded-full mb-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: centroid.cluster_id * 0.08 + 0.5, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-white/40">Customers</p>
                      <p className="font-mono text-white font-semibold">{count}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Income</p>
                      <p className="font-mono text-white font-semibold">${centroid.annual_income.toFixed(0)}k</p>
                    </div>
                    <div>
                      <p className="text-white/40">Score</p>
                      <p className="font-mono text-white font-semibold">{centroid.spending_score.toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Dataset Preview Grid */}
      {segmentation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6 border border-white/08"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-bold text-xl">Customer Intelligence Grid</h2>
              <p className="text-white/40 text-sm mt-1">Searchable, sortable — all {segmentation.total_customers} records with cluster assignments</p>
            </div>
          </div>
          <DataGrid data={segmentation.assignments} pageSize={12} />
        </motion.div>
      )}
    </div>
  );
}
