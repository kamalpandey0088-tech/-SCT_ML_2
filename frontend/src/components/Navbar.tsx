// ============================================================
// Navbar.tsx — Cyberpunk navigation bar
// ============================================================
import { motion } from 'framer-motion';
import { LayoutDashboard, ScatterChart, Sparkles } from 'lucide-react';
import type { ViewTab } from '../types';

interface NavbarProps {
  view: ViewTab;
  onView: (v: ViewTab) => void;
  datasetName: string;
}

const TABS: { id: ViewTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'dashboard',  label: 'Telemetry',   icon: <LayoutDashboard className="w-4 h-4" />, color: '#00f5ff' },
  { id: 'clusters',   label: 'Clusters',    icon: <ScatterChart className="w-4 h-4" />,    color: '#a855f7' },
  { id: 'innovation', label: 'Innovation',  icon: <Sparkles className="w-4 h-4" />,        color: '#ff2d78' },
];

export function Navbar({ view, onView, datasetName }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/08" style={{ backdropFilter: 'blur(20px)', background: 'rgba(5,8,22,0.85)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f5ff] to-[#a855f7] flex items-center justify-center shadow-neon">
              <span className="text-black text-lg font-black">N</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight gradient-text">NexusSegment</p>
              <p className="text-white/30 text-[10px] leading-tight">AI Customer Intelligence</p>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <nav className="flex items-center" role="navigation" aria-label="Main navigation">
            <div className="flex bg-white/04 rounded-xl p-1 border border-white/08 gap-1">
              {TABS.map((tab, i) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => onView(tab.id)}
                  id={`nav-${tab.id}`}
                  aria-current={view === tab.id ? 'page' : undefined}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    view === tab.id
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {view === tab.id && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}40` }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative" style={view === tab.id ? { color: tab.color } : {}}>{tab.icon}</span>
                  <span className="relative hidden sm:inline">{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </nav>

          {/* Dataset badge + GitHub */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-white/04 border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-white/50 text-xs font-medium truncate max-w-24">{datasetName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
