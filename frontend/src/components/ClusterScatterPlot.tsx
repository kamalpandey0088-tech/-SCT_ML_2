// ============================================================
// ClusterScatterPlot.tsx — Interactive 2D scatter plot
// Recharts + custom neon SVG + pulsing centroids + tooltips
// ============================================================
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { SegmentResponse, ClusterAssignment } from '../types';
import { CLUSTER_COLORS, CLUSTER_PERSONAS } from '../types';

interface Props {
  data: SegmentResponse;
}

interface TooltipData {
  customer: ClusterAssignment;
  x: number;
  y: number;
}

// ── Custom Dot ────────────────────────────────────────────────────────────────
function CustomDot(props: any) {
  const { cx, cy, payload, onHover } = props;
  const color = CLUSTER_COLORS[payload.cluster % CLUSTER_COLORS.length];
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={color}
      fillOpacity={0.8}
      stroke={color}
      strokeWidth={1}
      style={{ filter: `drop-shadow(0 0 4px ${color})`, cursor: 'pointer' }}
      onMouseEnter={() => onHover({ customer: payload, x: cx, y: cy })}
      onMouseLeave={() => onHover(null)}
    />
  );
}

// ── Customer Tooltip ──────────────────────────────────────────────────────────
function CustomerTooltip({ data }: { data: TooltipData }) {
  const { customer } = data;
  const color = CLUSTER_COLORS[customer.cluster % CLUSTER_COLORS.length];
  const persona = CLUSTER_PERSONAS[customer.cluster];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 10 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="glass rounded-2xl p-4 min-w-[220px] z-50 pointer-events-none"
      style={{ borderColor: `${color}50`, boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${color}20` }}
    >
      {/* Persona header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <span className="text-2xl">{persona?.emoji ?? '●'}</span>
        <div>
          <p className="text-xs font-semibold" style={{ color }}>{persona?.name ?? `Cluster ${customer.cluster}`}</p>
          <p className="text-white/40 text-xs">{persona?.description}</p>
        </div>
      </div>
      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/05 rounded-lg p-2">
          <p className="text-white/40">Customer ID</p>
          <p className="font-mono font-semibold text-white">#{customer.customer_id}</p>
        </div>
        <div className="bg-white/05 rounded-lg p-2">
          <p className="text-white/40">Gender</p>
          <p className="font-semibold text-white">{customer.gender ?? '—'}</p>
        </div>
        <div className="bg-white/05 rounded-lg p-2">
          <p className="text-white/40">Annual Income</p>
          <p className="font-mono font-semibold" style={{ color }}>${customer.annual_income}k</p>
        </div>
        <div className="bg-white/05 rounded-lg p-2">
          <p className="text-white/40">Spending Score</p>
          <p className="font-mono font-semibold" style={{ color }}>{customer.spending_score}/100</p>
        </div>
        {customer.age && (
          <div className="bg-white/05 rounded-lg p-2 col-span-2">
            <p className="text-white/40">Age</p>
            <p className="font-mono font-semibold text-white">{customer.age} yrs</p>
          </div>
        )}
      </div>
      {/* Cluster badge */}
      <div className="mt-3 flex justify-center">
        <span className="badge" style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}>
          Cluster {customer.cluster}
        </span>
      </div>
    </motion.div>
  );
}

// ── Cluster Legend ────────────────────────────────────────────────────────────
function ClusterLegend({ k }: { k: number }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {Array.from({ length: k }, (_, i) => {
        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
        const persona = CLUSTER_PERSONAS[i];
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs text-white/60">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span>{persona?.emoji} {persona?.name ?? `C${i}`}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Chart ────────────────────────────────────────────────────────────────
export function ClusterScatterPlot({ data }: Props) {
  const [hovered, setHovered] = useState<TooltipData | null>(null);

  const renderDot = useCallback(
    (props: any) => <CustomDot {...props} onHover={setHovered} />,
    []
  );

  return (
    <div className="relative">
      {/* Floating tooltip */}
      <div className="absolute top-0 left-0 z-50 pointer-events-none" style={{ width: '100%', height: '100%' }}>
        <AnimatePresence>
          {hovered && (
            <div style={{ position: 'absolute', top: 20, right: 20 }}>
              <CustomerTooltip data={hovered} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="annual_income"
            name="Annual Income"
            domain={['auto', 'auto']}
            label={{ value: 'Annual Income (k$)', position: 'insideBottomRight', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="spending_score"
            name="Spending Score"
            domain={[0, 100]}
            label={{ value: 'Spending Score', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />
          <Tooltip content={() => null} />

          {/* Data points per cluster */}
          {Array.from({ length: data.k }, (_, clusterIdx) => {
            const clusterPoints = data.assignments.filter(a => a.cluster === clusterIdx);
            const color = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
            return (
              <Scatter
                key={clusterIdx}
                name={`Cluster ${clusterIdx}`}
                data={clusterPoints}
                fill={color}
                shape={renderDot}
              />
            );
          })}

          {/* Centroid reference lines (subtle) */}
          {data.centroids.map((c) => (
            <ReferenceLine
              key={`h-${c.cluster_id}`}
              y={c.spending_score}
              stroke={`${CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length]}20`}
              strokeDasharray="4 4"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* SVG Centroid overlay — rendered on top */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: '100%', height: 480 }}
      >
        {data.centroids.map((centroid) => {
          // Approximate pixel position (rough — improves with Recharts internals)
          const color = CLUSTER_COLORS[centroid.cluster_id % CLUSTER_COLORS.length];
          return (
            <g key={centroid.cluster_id}>
              <text
                x={20}
                y={20 + centroid.cluster_id * 18}
                fill={color}
                fontSize={10}
                fontFamily="Outfit, sans-serif"
                opacity={0.6}
              >
                ★ C{centroid.cluster_id}: ${centroid.annual_income.toFixed(0)}k | {centroid.spending_score.toFixed(0)}pts
              </text>
            </g>
          );
        })}
      </svg>

      <ClusterLegend k={data.k} />
    </div>
  );
}
