// ============================================================
// KpiCard.tsx — Animated metric cards with neon glow
// ============================================================
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color: 'neon' | 'pink' | 'purple' | 'gold' | 'green';
  delay?: number;
  trend?: number;
}

const COLOR_MAP = {
  neon:   { text: 'text-[#00f5ff]', glow: 'rgba(0,245,255,0.3)',   border: 'rgba(0,245,255,0.2)',   bg: 'rgba(0,245,255,0.05)' },
  pink:   { text: 'text-[#ff2d78]', glow: 'rgba(255,45,120,0.3)',  border: 'rgba(255,45,120,0.2)',  bg: 'rgba(255,45,120,0.05)' },
  purple: { text: 'text-[#a855f7]', glow: 'rgba(168,85,247,0.3)',  border: 'rgba(168,85,247,0.2)',  bg: 'rgba(168,85,247,0.05)' },
  gold:   { text: 'text-[#fbbf24]', glow: 'rgba(251,191,36,0.3)',  border: 'rgba(251,191,36,0.2)',  bg: 'rgba(251,191,36,0.05)' },
  green:  { text: 'text-[#10b981]', glow: 'rgba(16,185,129,0.3)',  border: 'rgba(16,185,129,0.2)',  bg: 'rgba(16,185,129,0.05)' },
};

export function KpiCard({ label, value, sub, icon, color, delay = 0, trend }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
      style={{ borderColor: c.border }}
    >
      {/* Background glow spot */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: c.glow }}
      />

      {/* Icon + label row */}
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-sm font-medium tracking-wide uppercase">{label}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <span className={`${c.text} text-xl`}>{icon}</span>
        </div>
      </div>

      {/* Primary value */}
      <div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: delay + 0.3 }}
          className={`text-3xl font-bold font-mono ${c.text}`}
        >
          {value}
        </motion.span>
        {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
      </div>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs font-medium">
          <span className={trend >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-white/30">vs baseline</span>
        </div>
      )}

      {/* Bottom shimmer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl">
        <div
          className="h-full w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${c.glow}, transparent)` }}
        />
      </div>
    </motion.div>
  );
}
