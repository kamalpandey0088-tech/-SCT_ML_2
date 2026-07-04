// ============================================================
// DataGrid.tsx — Paginated glassmorphic customer table
// ============================================================
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ClusterAssignment } from '../types';
import { CLUSTER_COLORS, CLUSTER_PERSONAS } from '../types';

interface DataGridProps {
  data: ClusterAssignment[];
  pageSize?: number;
}

export function DataGrid({ data, pageSize = 12 }: DataGridProps) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState<keyof ClusterAssignment>('cluster');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.filter((r) =>
      !q ||
      String(r.customer_id).includes(q) ||
      String(r.annual_income).includes(q) ||
      String(r.spending_score).includes(q) ||
      (r.gender ?? '').toLowerCase().includes(q) ||
      CLUSTER_PERSONAS[r.cluster]?.name.toLowerCase().includes(q)
    );
  }, [data, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: keyof ClusterAssignment) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: keyof ClusterAssignment }) => (
    <span className={`ml-1 text-xs transition-colors ${sortCol === col ? 'text-[#00f5ff]' : 'text-white/20'}`}>
      {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const cols: { key: keyof ClusterAssignment; label: string }[] = [
    { key: 'customer_id', label: 'ID' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age' },
    { key: 'annual_income', label: 'Income (k$)' },
    { key: 'spending_score', label: 'Score' },
    { key: 'cluster', label: 'Cluster' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search customers, clusters, personas…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00f5ff]/50 focus:bg-white/8 transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/08">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/08 bg-white/03">
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className="px-4 py-3 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 transition-colors select-none whitespace-nowrap"
                >
                  {c.label}<SortIcon col={c.key} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-white/50 font-medium">Persona</th>
            </tr>
          </thead>
          <AnimatePresence mode="wait">
            <motion.tbody
              key={`${page}-${sortCol}-${sortDir}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/30">
                    No matching records found
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => {
                  const clr = CLUSTER_COLORS[row.cluster % CLUSTER_COLORS.length];
                  const persona = CLUSTER_PERSONAS[row.cluster];
                  return (
                    <motion.tr
                      key={row.customer_id ?? i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="table-row-hover border-b border-white/04 last:border-0"
                    >
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">#{row.customer_id ?? i + 1}</td>
                      <td className="px-4 py-3 text-white/70">{row.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-white/70">{row.age ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-white/80">{row.annual_income.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${row.spending_score}%`, background: clr, boxShadow: `0 0 6px ${clr}` }}
                            />
                          </div>
                          <span className="font-mono text-white/80 text-xs">{row.spending_score.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="badge font-mono"
                          style={{ background: `${clr}20`, color: clr, border: `1px solid ${clr}40` }}
                        >
                          C{row.cluster}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/50 text-xs">
                          {persona?.emoji} {persona?.name ?? `Cluster ${row.cluster}`}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/05 border border-white/10 text-white/60 hover:text-white hover:border-[#00f5ff]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    pg === page
                      ? 'bg-[#00f5ff]/20 border border-[#00f5ff]/60 text-[#00f5ff]'
                      : 'bg-white/05 border border-white/10 text-white/50 hover:text-white hover:border-white/30'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/05 border border-white/10 text-white/60 hover:text-white hover:border-[#00f5ff]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
