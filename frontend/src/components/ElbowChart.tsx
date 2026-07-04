// ============================================================
// ElbowChart.tsx — Elbow Method + Silhouette Score dual chart
// ============================================================
import { motion } from 'framer-motion';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from 'recharts';
import type { ElbowResponse } from '../types';

interface Props {
  data: ElbowResponse;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-white/10 text-xs">
      <p className="text-white/70 font-semibold mb-2">k = {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/50">{p.name}:</span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? p.value.toFixed(p.dataKey === 'silhouette' ? 4 : 1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ElbowChart({ data }: Props) {
  const optK = data.optimal_k;

  return (
    <div className="flex flex-col gap-6">
      {/* Optimal K banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 border border-[#00f5ff]/30 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Mathematically Optimal K</p>
          <p className="text-white/70 text-sm">Determined by <span className="text-[#00f5ff]">maximum Silhouette Score</span> — the gold standard for cluster quality</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[#00f5ff] text-5xl font-black font-mono" style={{ textShadow: '0 0 30px rgba(0,245,255,0.6)' }}>
              {optK}
            </p>
            <p className="text-white/40 text-xs mt-1">optimal clusters</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="glass px-3 py-1.5 rounded-lg text-xs border border-[#10b981]/30">
              <span className="text-[#10b981] font-mono font-bold">
                SIL: {data.data.find(d => d.k === optK)?.silhouette.toFixed(4) ?? '—'}
              </span>
            </div>
            <div className="glass px-3 py-1.5 rounded-lg text-xs border border-[#a855f7]/30">
              <span className="text-[#a855f7] font-mono font-bold">
                WCSS: {data.data.find(d => d.k === optK)?.wcss.toFixed(1) ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dual axis chart */}
      <div className="glass rounded-2xl p-6 border border-white/08">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold">Elbow Method Analysis</h3>
            <p className="text-white/40 text-xs mt-1">WCSS decrease rate + Silhouette Score maximization</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#a855f7] rounded" />
              <span className="text-white/50">WCSS (Inertia)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#00f5ff] rounded" />
              <span className="text-white/50">Silhouette</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data.data} margin={{ top: 10, right: 40, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="k"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              label={{ value: 'Number of Clusters (K)', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            />
            <YAxis
              yAxisId="wcss"
              orientation="left"
              tick={{ fill: 'rgba(168,85,247,0.7)', fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="sil"
              orientation="right"
              domain={[0, 1]}
              tick={{ fill: 'rgba(0,245,255,0.7)', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Optimal K reference line */}
            <ReferenceLine
              yAxisId="wcss"
              x={optK}
              stroke="rgba(0,245,255,0.5)"
              strokeDasharray="6 3"
              label={{ value: `K=${optK}`, fill: '#00f5ff', fontSize: 11, fontWeight: 700 }}
            />
            {/* WCSS area */}
            <Area
              yAxisId="wcss"
              type="monotone"
              dataKey="wcss"
              fill="rgba(168,85,247,0.08)"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ fill: '#a855f7', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
              name="WCSS"
            />
            {/* Silhouette line */}
            <Line
              yAxisId="sil"
              type="monotone"
              dataKey="silhouette"
              stroke="#00f5ff"
              strokeWidth={2.5}
              dot={{ fill: '#00f5ff', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#00f5ff', stroke: '#fff', strokeWidth: 2 }}
              name="Silhouette"
              filter="drop-shadow(0 0 6px rgba(0,245,255,0.5))"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretation table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.data.map((d) => (
          <motion.div
            key={d.k}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: d.k * 0.05 }}
            className={`glass rounded-xl p-3 border transition-all cursor-default ${
              d.k === optK
                ? 'border-[#00f5ff]/50 bg-[#00f5ff]/05'
                : 'border-white/08 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-mono font-bold text-lg ${d.k === optK ? 'text-[#00f5ff]' : 'text-white/70'}`}>
                K={d.k}
              </span>
              {d.k === optK && (
                <span className="text-[10px] text-[#00f5ff] bg-[#00f5ff]/15 border border-[#00f5ff]/40 rounded-full px-2 py-0.5 font-semibold">
                  BEST
                </span>
              )}
            </div>
            <p className="text-white/40 text-[10px]">SIL: <span className="font-mono text-[#10b981]">{d.silhouette.toFixed(4)}</span></p>
            <p className="text-white/40 text-[10px]">WCSS: <span className="font-mono text-[#a855f7]">{d.wcss.toFixed(0)}</span></p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
