// ============================================================
// ClustersView.tsx — View 2: Interactive Cluster Visualisation
// ============================================================
import { motion } from 'framer-motion';
import { ScatterChart as ScatterIcon, Star, BarChart2 } from 'lucide-react';
import { ClusterScatterPlot } from './ClusterScatterPlot';
import { CLUSTER_COLORS, CLUSTER_PERSONAS } from '../types';
import type { AppState } from '../types';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface Props { state: AppState }

function CentroidTable({ data }: { data: AppState['segmentation'] }) {
  if (!data) return null;
  return (
    <div className="glass rounded-2xl p-5 border border-white/08">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Star className="w-4 h-4 text-[#fbbf24]" />
        Cluster Centroids
        <span className="text-xs text-white/40 font-normal">(original feature space)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/08">
              <th className="pb-2 text-left text-white/40 pr-4">Cluster</th>
              <th className="pb-2 text-left text-white/40 pr-4">Persona</th>
              <th className="pb-2 text-right text-white/40 pr-4">Income (k$)</th>
              <th className="pb-2 text-right text-white/40 pr-4">Score</th>
              <th className="pb-2 text-right text-white/40">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.centroids.map((c) => {
              const color = CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length];
              const persona = CLUSTER_PERSONAS[c.cluster_id];
              const count = data.assignments.filter(a => a.cluster === c.cluster_id).length;
              return (
                <tr key={c.cluster_id} className="border-b border-white/04 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="badge" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                      C{c.cluster_id}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-white/60">{persona?.emoji} {persona?.name}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-white/80">{c.annual_income.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono" style={{ color }}>{c.spending_score.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-mono text-white/60">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RadarAnalysis({ data }: { data: AppState['segmentation'] }) {
  if (!data) return null;
  const radarData = data.centroids.map(c => {
    const avgAge = data.assignments
      .filter(a => a.cluster === c.cluster_id && a.age != null)
      .reduce((s, a) => s + (a.age ?? 0), 0) /
      Math.max(1, data.assignments.filter(a => a.cluster === c.cluster_id && a.age != null).length);
    return {
      cluster: `C${c.cluster_id}`,
      Income: Math.round(c.annual_income),
      Score: Math.round(c.spending_score),
      Age: Math.round(avgAge) || 35,
    };
  });

  return (
    <div className="glass rounded-2xl p-5 border border-white/08">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#a855f7]" />
        Centroid Radar Analysis
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="cluster" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
          <Radar name="Income" dataKey="Income" stroke="#00f5ff" fill="#00f5ff" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="Score" dataKey="Score" stroke="#ff2d78" fill="#ff2d78" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip
            contentStyle={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
            labelStyle={{ color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClustersView({ state }: Props) {
  const { segmentation } = state;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
        <h1 className="text-4xl sm:text-5xl font-black mb-3">
          <span className="gradient-text">Cluster Visualisation</span>
        </h1>
        <p className="text-white/40 text-lg max-w-2xl mx-auto">
          Interactive 2D scatter plot — hover any point to reveal its full profile
        </p>
      </motion.div>

      {!segmentation ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass rounded-2xl p-16 border border-white/08 flex flex-col items-center gap-4 text-center"
        >
          <ScatterIcon className="w-16 h-16 text-white/20" />
          <p className="text-white/50 text-lg">No segmentation data yet.</p>
          <p className="text-white/30 text-sm">Go to the Dashboard tab to load data first.</p>
        </motion.div>
      ) : (
        <>
          {/* Main scatter plot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6 border border-white/08"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl">Annual Income vs Spending Score</h2>
                <p className="text-white/40 text-sm mt-1">
                  {segmentation.total_customers} customers · K={segmentation.k} clusters · {segmentation.scaler_used} scaling
                </p>
              </div>
              <div className="glass px-4 py-2 rounded-xl border border-[#10b981]/30 text-xs">
                <span className="text-white/40">Quality: </span>
                <span className="text-[#10b981] font-mono font-bold">{segmentation.metrics.silhouette_score.toFixed(4)}</span>
              </div>
            </div>
            <ClusterScatterPlot data={segmentation} />
          </motion.div>

          {/* Bottom analytics row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <CentroidTable data={segmentation} />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <RadarAnalysis data={segmentation} />
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
