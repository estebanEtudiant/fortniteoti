import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, Database, Search, RefreshCw, Copy, X, AlertTriangle, Clock, ChevronLeft, ChevronRight, Trash2, Shield, ShieldOff, ChevronDown, Check } from 'lucide-react';
import { api } from '../lib/api';

// ── Helpers ──

function timeAgo(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isoDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function hex(n) {
  if (n == null) return '—';
  return '0x' + Number(n).toString(16).toUpperCase().padStart(8, '0');
}

// ── Stat Tile ──

function Tile({ label, value, color = '#c45cff', icon: Icon, sub, onClick }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:border-gray-600 transition-colors' : ''}`} onClick={onClick}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-gray-600 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ── Status Badge ──

function StatusBadge({ status }) {
  const map = {
    queued:  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    running: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    failed:  { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    done:    { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  };
  const s = map[status] || map.queued;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${s.bg} ${s.border} ${s.text}`}>
      {status}
    </span>
  );
}

// ── Validated Badge ──

function ValidatedBadge({ validated, bsodReports }) {
  if (validated) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-green-500/10 border-green-500/30 text-green-400">
        <Check className="w-3 h-3" /> Validated
      </span>
    );
  }
  if (bsodReports > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-400">
        <ShieldOff className="w-3 h-3" /> BSOD ({bsodReports})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-orange-500/10 border-orange-500/30 text-orange-400">
      <AlertTriangle className="w-3 h-3" /> Not validated
    </span>
  );
}

// ── Action Dropdown ──

function ActionDropdown({ row, onValidate, onUnvalidate, onInvalidate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1 text-sm">
          {!row.validated && (
            <button onClick={() => { setOpen(false); onValidate(row); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Validate
            </button>
          )}
          {row.validated && (
            <button onClick={() => { setOpen(false); onUnvalidate(row, false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-orange-400 flex items-center gap-2">
              <ShieldOff className="w-4 h-4" /> Unvalidate
            </button>
          )}
          <button onClick={() => { setOpen(false); onUnvalidate(row, true); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Unvalidate (BSOD)
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button onClick={() => { setOpen(false); onInvalidate(row.id); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-yellow-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Invalidate & re-extract
          </button>
          <button onClick={() => { setOpen(false); onDelete(row.id); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-red-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete permanently
          </button>
        </div>
      )}
    </div>
  );
}

// ── Validate Modal ──

function ValidateModal({ row, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await onConfirm(row.id, notes); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" /> Validate Build
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-2">
          Mark <span className="text-white font-mono font-bold">{row.build}</span> as safe for all clients.
        </p>
        <label className="block text-xs text-gray-500 mb-1 mt-4">Notes (e.g. "Tested on VM 20min game OK")</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
          placeholder="Optional test notes..."
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {busy ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unvalidate Modal ──

function UnvalidateModal({ row, isBsod, onClose, onConfirm }) {
  const [reason, setReason] = useState(isBsod ? 'BSOD reported by client' : '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try { await onConfirm(row.id, reason, isBsod); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {isBsod
              ? <><AlertTriangle className="w-5 h-5 text-red-400" /> Report BSOD</>
              : <><ShieldOff className="w-5 h-5 text-orange-400" /> Unvalidate Build</>
            }
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-2">
          {isBsod
            ? <>Client BSOD on <span className="text-white font-mono font-bold">{row.build}</span>. This will auto-unvalidate and increment BSOD count.</>
            : <>Unvalidate <span className="text-white font-mono font-bold">{row.build}</span>. Clients on this build will see "not supported".</>
          }
        </p>
        <label className="block text-xs text-gray-500 mb-1 mt-4">Reason *</label>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)} rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
          placeholder="Why is this build unsafe..."
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={busy || !reason.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {isBsod ? <AlertTriangle className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            {busy ? 'Saving...' : isBsod ? 'Report BSOD' : 'Unvalidate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Symbols Detail Modal ──

function SymbolsModal({ row, onClose, onInvalidate }) {
  const [busy, setBusy] = useState(false);
  if (!row) return null;

  const symbols = row.symbols || {};
  const entries = Object.entries(symbols).sort((a, b) => a[0].localeCompare(b[0]));

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(symbols, null, 2)).catch(() => {});
  };

  const handleInvalidate = async () => {
    if (!confirm('Force re-extract this build? The cache entry will be deleted.')) return;
    setBusy(true);
    try {
      await onInvalidate(row.id);
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Symbol Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div>
            <div className="text-gray-500 text-xs">Build</div>
            <div className="text-white font-mono font-medium">{row.build}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Status</div>
            <div className="mt-0.5"><ValidatedBadge validated={row.validated} bsodReports={row.bsodReports} /></div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">PDB</div>
            <div className="text-white font-mono">{row.pdbName}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">GUID + Age</div>
            <div className="text-white font-mono text-[11px] break-all">{row.pdbGuid}:{row.age}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Extracted</div>
            <div className="text-white">{isoDate(row.extractedAt)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Hit Count</div>
            <div className="text-white font-bold">{row.hitCount}</div>
          </div>
          {row.validatedBy && (
            <div>
              <div className="text-gray-500 text-xs">Validated by</div>
              <div className="text-green-400">{row.validatedBy} ({isoDate(row.validatedAt)})</div>
            </div>
          )}
          {row.bsodReports > 0 && (
            <div>
              <div className="text-gray-500 text-xs">BSOD Reports</div>
              <div className="text-red-400 font-bold">{row.bsodReports} (last: {isoDate(row.lastBsodAt)})</div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
          Symbols ({entries.length})
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden mb-5">
          <table className="w-full text-sm font-mono">
            <tbody>
              {entries.map(([name, rva]) => (
                <tr key={name} className="border-b border-gray-800/60 last:border-0">
                  <td className="px-3 py-2 text-gray-300">{name}</td>
                  <td className="px-3 py-2 text-right text-purple-400 font-medium">{hex(rva)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td className="px-3 py-4 text-center text-gray-600" colSpan={2}>No symbols</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <button onClick={copyJson}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-medium">
            <Copy className="w-4 h-4" /> Copy JSON
          </button>
          <button onClick={handleInvalidate} disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Force Re-extract
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pending Extractions Panel ──

function PendingPanel({ items, onRefresh, onDelete, onPurge }) {
  if (!items || items.length === 0) return null;
  const hasFailed = items.some(e => e.status === 'failed');
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">Pending Extractions ({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {hasFailed && (
            <button onClick={onPurge}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium">
              <Trash2 className="w-3 h-3" /> Purge Failed
            </button>
          )}
          <button onClick={onRefresh} className="text-gray-500 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-2">PDB</th>
              <th className="px-3 py-2">GUID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Attempts</th>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id} className="border-t border-gray-800/40">
                <td className="px-3 py-2 font-mono text-gray-300">{e.pdbName}</td>
                <td className="px-3 py-2 font-mono text-gray-400 text-xs" title={`${e.pdbGuid}:${e.age}`}>
                  {e.pdbGuid?.slice(0, 12)}...
                </td>
                <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                <td className="px-3 py-2 text-gray-400">{e.attemptCount}/3</td>
                <td className="px-3 py-2 text-gray-400">{timeAgo(e.startedAt)}</td>
                <td className="px-3 py-2 text-red-400 text-xs max-w-[200px] truncate" title={e.error || ''}>
                  {e.error || '—'}
                </td>
                <td className="px-3 py-2">
                  {e.status !== 'running' && (
                    <button onClick={() => onDelete(e.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete extraction">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mini Bar Chart ──

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-white w-10 text-right">{value}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #c45cff, #e040a0)' }} />
      </div>
    </div>
  );
}

// ── Filter Tabs ──

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'validated', label: 'Validated' },
  { key: 'unvalidated', label: 'Not validated' },
  { key: 'bsod', label: 'Has BSOD' },
];

// ── Main Page ──

export default function KernelSymbolsPage() {
  const [overview, setOverview] = useState(null);
  const [cache, setCache] = useState({ rows: [], total: 0 });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastHit');
  const [order, setOrder] = useState('desc');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const [pending, setPending] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [modalRow, setModalRow] = useState(null);
  const [newBuild, setNewBuild] = useState(null);

  // Validate / Unvalidate modals
  const [validateRow, setValidateRow] = useState(null);
  const [unvalidateRow, setUnvalidateRow] = useState(null);
  const [unvalidateIsBsod, setUnvalidateIsBsod] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Loaders ──

  const loadOverview = useCallback(async () => {
    try { setOverview(await api.symbolsOverview()); } catch {}
  }, []);

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: pageSize, offset: page * pageSize, sortBy, order };
      if (search) params.search = search;
      if (filter !== 'all') params.filter = filter;
      const data = await api.symbolsCache(params);
      setCache(data);
    } catch {}
    setLoading(false);
  }, [page, search, sortBy, order, filter]);

  const loadPending = useCallback(async () => {
    try { setPending(await api.symbolsPending()); } catch {}
  }, []);

  const loadTimeline = useCallback(async () => {
    try { setTimeline(await api.symbolsTimeline(30)); } catch {}
  }, []);

  // ── Effects ──

  useEffect(() => { loadOverview(); loadTimeline(); }, []);
  useEffect(() => { loadCache(); }, [loadCache]);
  useEffect(() => {
    loadPending();
    const iv = setInterval(loadPending, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (cache.rows?.length > 0) {
      const newest = cache.rows.reduce((a, b) =>
        new Date(a.extractedAt) > new Date(b.extractedAt) ? a : b
      );
      const age = Date.now() - new Date(newest.extractedAt).getTime();
      if (age < 5 * 60 * 1000) setNewBuild(newest);
      else setNewBuild(null);
    }
  }, [cache.rows]);

  // ── Handlers ──

  const handleSort = (col) => {
    if (sortBy === col) setOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setOrder('desc'); }
    setPage(0);
  };

  const handleInvalidate = async (id) => {
    if (!confirm('Invalidate & re-extract this build?')) return;
    try {
      await api.symbolsInvalidate(id);
      showToast('Invalidated — re-extraction queued');
      loadCache(); loadOverview(); loadPending();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadCache();
  };

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(0);
  };

  const handleDeleteExtraction = async (id) => {
    if (!confirm('Delete this extraction record?')) return;
    try {
      await api.symbolsDeleteExtraction(id);
      showToast('Extraction deleted');
      loadPending();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  };

  const handleDeleteCache = async (id) => {
    if (!confirm('Permanently delete this cache entry?')) return;
    try {
      await api.symbolsDeleteCache(id);
      showToast('Cache entry deleted');
      loadCache(); loadOverview();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  };

  const handlePurgeFailed = async () => {
    if (!confirm('Purge all failed extractions older than 1 hour?')) return;
    try {
      const res = await api.symbolsPurgeFailedExtractions(60);
      showToast(`Purged ${res.deleted} failed extraction(s)`);
      loadPending();
    } catch (err) { showToast(err.message || 'Purge failed', 'error'); }
  };

  const handleValidateConfirm = async (id, notes) => {
    try {
      await api.symbolsValidate(id, 'admin', notes || undefined);
      showToast('Build validated');
      loadCache(); loadOverview();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleUnvalidateConfirm = async (id, reason, wasBsod) => {
    try {
      await api.symbolsUnvalidate(id, reason, wasBsod);
      showToast(wasBsod ? 'BSOD reported — build unvalidated' : 'Build unvalidated');
      loadCache(); loadOverview();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const openValidateModal = (row) => setValidateRow(row);
  const openUnvalidateModal = (row, isBsod) => { setUnvalidateRow(row); setUnvalidateIsBsod(isBsod); };

  const totalPages = Math.ceil(cache.total / pageSize);
  const maxHitCount = cache.rows?.length > 0 ? Math.max(...cache.rows.map(r => r.hitCount || 0)) : 1;

  const Th = ({ col, children, className = '' }) => (
    <th
      className={`px-3 py-2.5 cursor-pointer select-none hover:text-gray-200 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === col && <span className="text-purple-400">{order === 'desc' ? '↓' : '↑'}</span>}
      </span>
    </th>
  );

  const TimelineChart = () => {
    if (timeline.length === 0) return <div className="text-center text-gray-600 py-8 text-sm">No data yet</div>;
    const maxB = Math.max(...timeline.map(t => t.newBuilds), 1);
    const maxL = Math.max(...timeline.map(t => t.totalLookups), 1);

    return (
      <div className="h-32 flex items-end gap-px">
        {timeline.map((t, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative" title={`${t.date}\n${t.newBuilds} new builds\n${t.totalLookups} lookups`}>
            <div className="w-full rounded-t" style={{ height: `${(t.totalLookups / maxL) * 80}%`, minHeight: 2, background: '#c45cff30' }} />
            <div className="w-full rounded-t" style={{ height: `${(t.newBuilds / maxB) * 80}%`, minHeight: 2, background: '#c45cff' }} />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-300 whitespace-nowrap z-10">
              {t.date}: {t.newBuilds} builds, {t.totalLookups} lookups
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Kernel Symbols</h1>
        </div>
        <button onClick={() => { loadOverview(); loadCache(); loadPending(); loadTimeline(); }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* BSOD / Unvalidated warning banner */}
      {overview && overview.unvalidatedWithHits > 0 && (
        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-400">
                {overview.unvalidatedWithHits} client{overview.unvalidatedWithHits > 1 ? 's tournent' : ' tourne'} sur des builds non-validees
              </div>
              <div className="text-xs text-red-400/70 mt-1">
                Le loader refuse de map chez eux (protection anti-BSOD). Valide leurs builds pour debloquer.
                {overview.totalBsodReports > 0 && <span className="font-bold"> ({overview.totalBsodReports} BSOD report{overview.totalBsodReports > 1 ? 's' : ''} total)</span>}
              </div>
              <button onClick={() => handleFilterChange('unvalidated')}
                className="mt-2 text-xs text-red-400 underline underline-offset-2 hover:text-red-300">
                Voir les builds non-validees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New build banner */}
      {newBuild && (
        <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/30 rounded-xl px-4 py-3 text-sm">
          <span className="text-pink-400 font-medium">New build cached {timeAgo(newBuild.extractedAt)}:</span>
          <span className="text-white font-mono font-bold">{newBuild.build}</span>
          {!newBuild.validated && <span className="text-orange-400 text-xs">(needs validation)</span>}
        </div>
      )}

      {/* Overview Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Cached Builds" value={overview?.totalCachedBuilds} color="#c45cff" icon={Database} />
        <Tile label="Total Lookups" value={overview?.totalLookupsServed?.toLocaleString()} color="#22c55e" icon={Search} />
        <Tile label="Unvalidated" value={overview?.unvalidatedCount} color="#f97316" icon={ShieldOff}
          sub={overview?.unvalidatedWithHits > 0 ? `${overview.unvalidatedWithHits} with active clients` : undefined}
          onClick={() => handleFilterChange('unvalidated')} />
        <Tile label="BSOD Reports" value={overview?.totalBsodReports} color="#ef4444" icon={AlertTriangle}
          onClick={overview?.totalBsodReports > 0 ? () => handleFilterChange('bsod') : undefined} />
      </div>

      {/* Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">New Builds (30d)</h2>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Builds</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#c45cff30' }} /> Lookups</span>
          </div>
        </div>
        <TimelineChart />
      </div>

      {/* Pending */}
      <PendingPanel items={pending} onRefresh={loadPending} onDelete={handleDeleteExtraction} onPurge={handlePurgeFailed} />

      {/* Cache Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Symbol Cache</h2>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" placeholder="Search build or GUID..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium">
                Search
              </button>
            </form>
            <div className="text-xs text-gray-500">{cache.total} entries</div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => handleFilterChange(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-600">Loading...</div>
        ) : cache.rows?.length === 0 ? (
          <div className="p-12 text-center text-gray-600 text-sm">
            {filter !== 'all' ? 'No builds match this filter.' : 'No builds cached yet. The first client loader request will trigger an extraction.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <Th col="build">Build</Th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">GUID</th>
                    <Th col="extractedAt">Extracted</Th>
                    <Th col="lastHit">Last Hit</Th>
                    <Th col="hitCount">Hits</Th>
                    <th className="px-3 py-2.5">BSOD</th>
                    <th className="px-3 py-2.5">Symbols</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cache.rows.map(r => {
                    const stale = r.lastHit && (Date.now() - new Date(r.lastHit).getTime() > 30 * 86400_000);
                    return (
                      <tr key={r.id} className={`border-t hover:bg-gray-800/30 transition-colors ${
                        r.bsodReports > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-gray-800/40'
                      }`}>
                        <td className="px-3 py-2.5 font-mono text-white font-medium">{r.build}</td>
                        <td className="px-3 py-2.5">
                          <ValidatedBadge validated={r.validated} bsodReports={r.bsodReports} />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-500 text-xs cursor-help" title={`${r.pdbGuid} : age ${r.age}`}>
                          {r.pdbGuid?.slice(0, 12)}...
                        </td>
                        <td className="px-3 py-2.5 text-gray-400" title={isoDate(r.extractedAt)}>{timeAgo(r.extractedAt)}</td>
                        <td className="px-3 py-2.5" title={isoDate(r.lastHit)}>
                          <span className={stale ? 'text-red-400' : 'text-gray-400'}>{timeAgo(r.lastHit)}</span>
                          {stale && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 border border-red-500/30 text-red-400">stale</span>}
                        </td>
                        <td className="px-3 py-2.5 w-36">
                          <MiniBar value={r.hitCount || 0} max={maxHitCount} />
                        </td>
                        <td className="px-3 py-2.5">
                          {r.bsodReports > 0 ? (
                            <span className="text-red-400 font-bold">{r.bsodReports}</span>
                          ) : (
                            <span className="text-gray-600">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setModalRow(r)}
                            className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                          >
                            {r.symbols ? `${Object.keys(r.symbols).length}/8` : '—'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <ActionDropdown
                            row={r}
                            onValidate={openValidateModal}
                            onUnvalidate={openUnvalidateModal}
                            onInvalidate={handleInvalidate}
                            onDelete={handleDeleteCache}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <div className="text-xs text-gray-500">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, cache.total)} of {cache.total}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-default">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i;
                    else if (page < 3) p = i;
                    else if (page > totalPages - 4) p = totalPages - 5 + i;
                    else p = page - 2 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded text-xs font-medium ${page === p ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        {p + 1}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-30 disabled:cursor-default">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modalRow && (
        <SymbolsModal row={modalRow} onClose={() => setModalRow(null)} onInvalidate={handleInvalidate} />
      )}
      {validateRow && (
        <ValidateModal row={validateRow} onClose={() => setValidateRow(null)} onConfirm={handleValidateConfirm} />
      )}
      {unvalidateRow && (
        <UnvalidateModal row={unvalidateRow} isBsod={unvalidateIsBsod} onClose={() => setUnvalidateRow(null)} onConfirm={handleUnvalidateConfirm} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 border ${
          toast.type === 'error'
            ? 'bg-red-700 border-red-500/40 text-white'
            : 'bg-green-700 border-green-500/40 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
