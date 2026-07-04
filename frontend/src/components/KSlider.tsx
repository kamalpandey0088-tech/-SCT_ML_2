// ============================================================
// KSlider.tsx — Live K selector with real-time re-clustering
// ============================================================
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface KSliderProps {
  k: number;
  onChange: (k: number) => void;
  loading: boolean;
  metrics?: { silhouette_score: number; inertia: number } | null;
}

const K_DESCRIPTIONS: Record<number, string> = {
  2: 'Broad segmentation — 2 major groups',
  3: 'Basic trichotomy — low/mid/high',
  4: 'Quadrant model — 4-way split',
  5: 'Classic mall segmentation — recommended',
  6: 'Fine-grained — 6 behavioral types',
  7: 'Detailed — emerging micro-segments',
  8: 'High precision — 8 distinct personas',
  9: 'Expert mode — granular targeting',
  10: 'Maximum — hyperlocal segmentation',
};

export function KSlider({ k, onChange, loading, metrics }: KSliderProps) {
  const silhouette = metrics?.silhouette_score ?? 0;
  const silColor = silhouette > 0.5 ? '#10b981' : silhouette > 0.3 ? '#fbbf24' : '#ef4444';
  const silLabel = silhouette > 0.5 ? 'Excellent' : silhouette > 0.3 ? 'Good' : 'Fair';

  return (
    <div className="glass rounded-2xl p-6 border border-white/08">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#fbbf24]" />
            Dynamic K Selector
          </h3>
          <p className="text-white/40 text-sm mt-1">Drag to change cluster count — re-clustering happens live</p>
        </div>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-[#00f5ff]/30 border-t-[#00f5ff] rounded-full"
          />
        )}
      </div>

      {/* K display */}
      <div className="flex items-center gap-6 mb-6">
        <motion.div
          key={k}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-[#00f5ff]/50 bg-[#00f5ff]/08 flex flex-col items-center justify-center"
          style={{ boxShadow: '0 0 20px rgba(0,245,255,0.2)' }}
        >
          <span className="text-[#00f5ff] text-4xl font-black font-mono">{k}</span>
          <span className="text-white/40 text-xs">clusters</span>
        </motion.div>
        <div className="flex-1">
          <p className="text-white/60 text-sm mb-1">{K_DESCRIPTIONS[k]}</p>
          {metrics && (
            <div className="flex gap-3 mt-2">
              <div className="text-xs">
                <span className="text-white/40">Silhouette: </span>
                <span className="font-mono font-semibold" style={{ color: silColor }}>
                  {silhouette.toFixed(4)} ({silLabel})
                </span>
              </div>
              <div className="text-xs">
                <span className="text-white/40">WCSS: </span>
                <span className="font-mono font-semibold text-[#a855f7]">{metrics.inertia.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={2}
          max={10}
          step={1}
          value={k}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={loading}
          className="w-full disabled:opacity-50"
          id="k-slider"
          aria-label="Number of clusters"
        />
        {/* Tick marks */}
        <div className="flex justify-between mt-2 px-1">
          {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
            <button
              key={n}
              onClick={() => !loading && onChange(n)}
              className={`text-xs font-mono transition-all cursor-pointer ${
                n === k ? 'text-[#00f5ff] font-bold' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Silhouette quality bar */}
      {metrics && (
        <div className="mt-6 p-3 glass rounded-xl border border-white/06">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-white/50">Cluster Quality (Silhouette)</span>
            <span className="font-mono" style={{ color: silColor }}>{(silhouette * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-white/08 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, silhouette * 100))}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${silColor}80, ${silColor})`, boxShadow: `0 0 8px ${silColor}` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>Poor (−1)</span><span>Mediocre (0)</span><span>Excellent (+1)</span>
          </div>
        </div>
      )}
    </div>
  );
}
