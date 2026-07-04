// ============================================================
// CsvDropzone.tsx — Drag-and-drop CSV upload with column picker
// ============================================================
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '../api';
import type { CSVUploadResponse } from '../types';

interface Props {
  onSuccess: (result: CSVUploadResponse) => void;
  k: number;
}

export function CsvDropzone({ onSuccess, k }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [incomeCol, setIncomeCol] = useState('');
  const [scoreCol, setScoreCol] = useState('');
  const [ageCol, setAgeCol] = useState('');
  const [idCol, setIdCol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setError(null);

    // Preview first line to extract column names
    const text = await f.text();
    const firstLine = text.split('\n')[0];
    const cols = firstLine.split(',').map(c => c.trim().replace(/["']/g, ''));
    setColumns(cols);

    // Auto-detect common column names
    const lower = cols.map(c => c.toLowerCase());
    const incomeGuess = cols.find((_, i) => lower[i].includes('income') || lower[i].includes('annual')) ?? '';
    const scoreGuess  = cols.find((_, i) => lower[i].includes('spend') || lower[i].includes('score')) ?? '';
    const ageGuess    = cols.find((_, i) => lower[i].includes('age')) ?? '';
    const idGuess     = cols.find((_, i) => lower[i].includes('id') || lower[i].includes('customer')) ?? '';
    setIncomeCol(incomeGuess);
    setScoreCol(scoreGuess);
    setAgeCol(ageGuess);
    setIdCol(idGuess);
    setStep('map');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      setError(err?.code === 'file-too-large' ? 'File exceeds 10 MB limit.' : err?.message ?? 'Invalid file.');
    },
  });

  const handleSubmit = async () => {
    if (!file || !incomeCol || !scoreCol) {
      setError('Please select Income and Score columns.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.uploadCSV(
        file,
        { income_col: incomeCol, score_col: scoreCol, age_col: ageCol || undefined, id_col: idCol || undefined },
        k
      );
      setStep('done');
      onSuccess(result);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setColumns([]); setStep('upload');
    setError(null);
    setIncomeCol(''); setScoreCol(''); setAgeCol(''); setIdCol('');
  };

  const ColSelect = ({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-white/50 font-medium">
        {label} {required && <span className="text-[#ff2d78]">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/05 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f5ff]/50 transition-all pr-8"
        >
          <option value="">— Select column —</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={`relative rounded-2xl p-12 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-4 ${
                isDragActive ? 'dropzone-active border-[#00f5ff]/70' : 'border-white/15 hover:border-white/30 hover:bg-white/02'
              }`}
            >
              <input {...getInputProps()} id="csv-upload" />
              <motion.div
                animate={isDragActive ? { scale: 1.2, y: -8 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <UploadCloud className={`w-16 h-16 ${isDragActive ? 'text-[#00f5ff]' : 'text-white/30'} transition-colors`} />
              </motion.div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">
                  {isDragActive ? 'Drop your CSV here' : 'Drag & Drop your CSV'}
                </p>
                <p className="text-white/40 text-sm mt-1">or click to browse — max 10 MB, .csv format</p>
              </div>
              <div className="flex gap-2 text-xs text-white/30">
                <span className="px-2 py-1 bg-white/05 rounded-lg">.csv</span>
                <span className="px-2 py-1 bg-white/05 rounded-lg">.txt</span>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[#ef4444] text-sm mt-3 glass p-3 rounded-xl border border-[#ef4444]/30">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'map' && file && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-5"
          >
            {/* File info */}
            <div className="glass rounded-xl p-4 border border-[#10b981]/30 flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#10b981]" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{file.name}</p>
                <p className="text-white/40 text-xs">{(file.size / 1024).toFixed(1)} KB · {columns.length} columns detected</p>
              </div>
              <button onClick={reset} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detected columns preview */}
            <div className="flex flex-wrap gap-1.5">
              {columns.map(c => (
                <span key={c} className="text-[10px] font-mono px-2 py-1 bg-white/05 border border-white/10 rounded-lg text-white/60">{c}</span>
              ))}
            </div>

            {/* Column mapper */}
            <div className="glass rounded-2xl p-5 border border-white/08">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#00f5ff]/20 text-[#00f5ff] flex items-center justify-center text-xs font-bold">2</span>
                Map Columns to Features
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColSelect label="Annual Income Column" value={incomeCol} onChange={setIncomeCol} required />
                <ColSelect label="Spending Score Column" value={scoreCol} onChange={setScoreCol} required />
                <ColSelect label="Age Column (optional)" value={ageCol} onChange={setAgeCol} />
                <ColSelect label="Customer ID Column (optional)" value={idCol} onChange={setIdCol} />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[#ef4444] text-sm glass p-3 rounded-xl border border-[#ef4444]/30">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm font-medium">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !incomeCol || !scoreCol}
                className="flex-1 py-3 rounded-xl btn-neon text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-[#00f5ff]/30 border-t-[#00f5ff] rounded-full" />
                    Analyzing…
                  </span>
                ) : '⚡ Run Segmentation'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <CheckCircle className="w-20 h-20 text-[#10b981]" style={{ filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.5))' }} />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-bold text-xl">Segmentation Complete!</p>
              <p className="text-white/50 text-sm mt-1">Results loaded in the dashboard.</p>
            </div>
            <button onClick={reset} className="btn-neon px-6 py-2.5 rounded-xl text-sm font-semibold">
              Upload Another File
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
