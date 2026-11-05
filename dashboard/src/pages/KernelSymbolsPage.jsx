import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Cpu, Database, Search, RefreshCw, Copy, X, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, Trash2, Shield, ShieldOff, ChevronDown, Check,
  Download, Zap, Monitor, TrendingUp, Filter, Sparkles,
} from 'lucide-react';
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
  if (n == null) return 'null';
  return '0x' + Number(n).toString(16).toUpperCase().padStart(8, '0');
}

// Parse Windows version from build string like "10.0.26100.9549"
function parseWindowsVersion(build) {
  if (!build) return { label: 'Unknown', short: '?', color: '#6b7280' };
  const parts = build.split('.');
  const major = parts[2];
  const map = {
    '26100': { label: 'Windows 11 24H2', short: '11 24H2', color: '#8b5cf6' },
    '22631': { label: 'Windows 11 23H2', short: '11 23H2', color: '#a855f7' },
    '22621': { label: 'Windows 11 22H2', short: '11 22H2', color: '#c084fc' },
    '22000': { label: 'Windows 11 21H2', short: '11 21H2', color: '#d8b4fe' },
    '19045': { label: 'Windows 10 22H2', short: '10 22H2', color: '#3b82f6' },
    '19044': { label: 'Windows 10 21H2', short: '10 21H2', color: '#60a5fa' },
    '19043': { label: 'Windows 10 21H1', short: '10 21H1', color: '#93c5fd' },
    '19042': { label: 'Windows 10 20H2', short: '10 20H2', color: '#bfdbfe' },
    '19041': { label: 'Windows 10 2004', short: '10 2004', color: '#dbeafe' },
  };
  return map[major] || { label: `Build ${major}`, short: major, color: '#6b7280' };
}

// ── Tiny components ──

function Tile({ label, value, color = '#c45cff', icon: Icon, sub, onClick, highlight }) {
  return (
    <div className={`relative bg-gray-900 border rounded-xl p-5 flex items-start gap-4 transition-colors ${
      highlight ? 'border-orange-500/50 shadow-lg shadow-orange-500/5' : 'border-gray-800'
    } ${onClick ? 'cursor-pointer hover:border-gray-600' : ''}`} onClick={onClick}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white truncate">{value ?? '—'}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-gray-600 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued:  'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    running: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    failed:  'bg-red-500/10 border-red-500/30 text-red-400',
    done:    'bg-green-500/10 border-green-500/30 text-green-400',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[status] || map.queued}`}>{status}</span>;
}

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
      <AlertTriangle className="w-3 h-3" /> Unvalidated
    </span>
  );
}

function WinVersionPill({ build }) {
  const v = parseWindowsVersion(build);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ background: v.color + '18', color: v.color, border: `1px solid ${v.color}40` }}>
      <Monitor className="w-2.5 h-2.5" /> {v.short}
    </span>
  );
}

function SymbolsCount({ symbols, expected }) {
  if (!symbols || typeof symbols !== 'object') {
    return <span className="text-gray-600 text-xs">—</span>;
  }
  const keys = Object.keys(symbols);
  const nulls = keys.filter(k => symbols[k] == null).length;
  const good = keys.length - nulls;
  const complete = good >= expected && nulls === 0;
  const cls = complete
    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
    : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${cls}`}>
      {good}/{expected}
      {nulls > 0 && <span className="text-red-400">· {nulls} null</span>}
    </span>
  );
}

// ── Action dropdown ──

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

// ── Modals ──

function ValidateModal({ row, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await onConfirm(row.id, notes); onClose(); } finally { setBusy(false); }
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
        <div className="mt-2 mb-4"><WinVersionPill build={row.build} /></div>
        <label className="block text-xs text-gray-500 mb-1">Notes (e.g. "Tested on VM 20min game OK")</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 resize-none"
          placeholder="Optional test notes..." />
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

function UnvalidateModal({ row, isBsod, onClose, onConfirm }) {
  const [reason, setReason] = useState(isBsod ? 'BSOD reported by client' : '');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try { await onConfirm(row.id, reason, isBsod); onClose(); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {isBsod
              ? <><AlertTriangle className="w-5 h-5 text-red-400" /> Report BSOD</>
              : <><ShieldOff className="w-5 h-5 text-orange-400" /> Unvalidate Build</>}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-2">
          {isBsod
            ? <>Client BSOD on <span className="text-white font-mono font-bold">{row.build}</span>. Auto-unvalidate + bump counter.</>
            : <>Unvalidate <span className="text-white font-mono font-bold">{row.build}</span>. Clients see "not supported".</>}
        </p>
        <label className="block text-xs text-gray-500 mb-1 mt-4">Reason *</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
          placeholder="Why is this build unsafe..." />
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

function SymbolsModal({ row, expected, udtAliases, onClose, onInvalidate }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!row) return null;

  const symbols = row.symbols || {};
  const allEntries = Object.entries(symbols).sort((a, b) => a[0].localeCompare(b[0]));
  const udt = udtAliases || new Set();
  const udtEntries = allEntries.filter(([k]) => udt.has(k));
  const entries = allEntries.filter(([k]) => !udt.has(k));
  const nulls = allEntries.filter(([, v]) => v == null).length;
  const winVersion = parseWindowsVersion(row.build);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(symbols, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleInvalidate = async () => {
    if (!confirm('Force re-extract this build? The cache entry will be deleted.')) return;
    setBusy(true);
    try { await onInvalidate(row.id); onClose(); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-white font-mono">{row.build}</h3>
                <WinVersionPill build={row.build} />
                <ValidatedBadge validated={row.validated} bsodReports={row.bsodReports} />
              </div>
              <div className="text-xs text-gray-500 font-mono">{row.pdbName} · {row.pdbGuid}:{row.age}</div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Extracted</div>
              <div className="text-white mt-0.5" title={isoDate(row.extractedAt)}>{timeAgo(row.extractedAt)}</div>
            </div>
            <div>
              <div className="text-gray-500">Last hit</div>
              <div className="text-white mt-0.5" title={isoDate(row.lastHit)}>{timeAgo(row.lastHit)}</div>
            </div>
            <div>
              <div className="text-gray-500">Hits</div>
              <div className="text-white font-bold mt-0.5">{row.hitCount || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Symbol version</div>
              <div className="text-white font-mono mt-0.5">v{row.symbolVersion ?? 1}</div>
            </div>
            {row.validatedBy && (
              <div className="col-span-2 md:col-span-4">
                <div className="text-gray-500">Validated by</div>
                <div className="text-green-400 mt-0.5">{row.validatedBy} ({isoDate(row.validatedAt)})</div>
              </div>
            )}
            {row.bsodReports > 0 && (
              <div className="col-span-2 md:col-span-4">
                <div className="text-gray-500">BSOD reports</div>
                <div className="text-red-400 font-bold mt-0.5">{row.bsodReports} (last: {isoDate(row.lastBsodAt)})</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Public symbols — RVA ({entries.length})
              </div>
              {nulls > 0 && (
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {nulls} not resolved
                </div>
              )}
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm font-mono">
                <tbody>
                  {entries.map(([name, rva]) => (
                    <tr key={name} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40">
                      <td className="px-3 py-2 text-gray-300">{name}</td>
                      <td className="px-3 py-2 text-right">
                        {rva == null
                          ? <span className="text-red-400">null</span>
                          : <span className="text-purple-400 font-medium">{hex(rva)}</span>}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td className="px-3 py-4 text-center text-gray-600" colSpan={2}>No public symbols</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {udtEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-2">
                  Struct field offsets — UDT ({udtEntries.length})
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-800/50 rounded">
                    UDT
                  </span>
                </div>
              </div>
              <div className="bg-gray-950 border border-amber-900/30 rounded-lg overflow-hidden">
                <table className="w-full text-sm font-mono">
                  <tbody>
                    {udtEntries.map(([name, off]) => (
                      <tr key={name} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40">
                        <td className="px-3 py-2 text-gray-300">{name}</td>
                        <td className="px-3 py-2 text-right">
                          {off == null ? (
                            <span className="text-red-400">null</span>
                          ) : (
                            <span>
                              <span className="text-amber-400 font-medium">{hex(off)}</span>
                              <span className="text-gray-600 ml-2">({off})</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-gray-800 flex gap-3">
          <button onClick={copyJson}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-medium">
            {copied ? <><Check className="w-4 h-4 text-green-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy JSON</>}
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

// ── Pending panel ──

function PendingPanel({ items, onRefresh, onDelete, onPurge }) {
  if (!items || items.length === 0) return null;
  const hasFailed = items.some(e => e.status === 'failed');
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
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

// ── Windows versions breakdown ──

function WindowsVersionsPanel({ data, onFilter }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Monitor className="w-4 h-4" /> Windows versions
        </h2>
        <span className="text-xs text-gray-600">{data.reduce((s, d) => s + d.total, 0)} builds total</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.map(row => {
          const v = parseWindowsVersion(row.version.startsWith('Windows') ? row.version.includes('24H2') ? '10.0.26100.0' : row.version.includes('23H2') ? '10.0.22631.0' : row.version.includes('22H2') && row.version.includes('11') ? '10.0.22621.0' : row.version.includes('21H2') && row.version.includes('11') ? '10.0.22000.0' : row.version.includes('22H2') ? '10.0.19045.0' : '10.0.19041.0' : null);
          const pct = row.total > 0 ? Math.round((row.validated / row.total) * 100) : 0;
          return (
            <button key={row.version} onClick={() => onFilter(row.version)}
              className="group relative text-left bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-white">{row.version}</div>
                {row.bsod > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                    {row.bsod} BSOD
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-2xl font-bold" style={{ color: v?.color || '#c45cff' }}>{row.total}</div>
                  <div className="text-[11px] text-gray-500">
                    {row.validated} validated · {row.hits.toLocaleString()} hits
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${pct === 100 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
                    {pct}%
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: v?.color || '#c45cff' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini bar ──

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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'validated', label: 'Validated' },
  { key: 'unvalidated', label: 'Unvalidated' },
  { key: 'bsod', label: 'BSOD' },
];

// ── Main page ──

export default function KernelSymbolsPage() {
  const [overview, setOverview] = useState(null);
  const [cache, setCache] = useState({ rows: [], total: 0 });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastHit');
  const [order, setOrder] = useState('desc');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const [pending, setPending] = useState([]);
  const [modalRow, setModalRow] = useState(null);
  const [newBuild, setNewBuild] = useState(null);
  const [validateRow, setValidateRow] = useState(null);
  const [unvalidateRow, setUnvalidateRow] = useState(null);
  const [unvalidateIsBsod, setUnvalidateIsBsod] = useState(false);
  const [reextracting, setReextracting] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const expectedSymbols = overview?.wantedSymbolsCount ?? 12;
  const udtAliases = useMemo(() => {
    const set = new Set();
    for (const spec of overview?.wantedSymbols || []) {
      const i = spec.indexOf('=udt:');
      if (i > 0) set.add(spec.slice(0, i));
    }
    return set;
  }, [overview?.wantedSymbols]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadOverview = useCallback(async () => {
    try { setOverview(await api.symbolsOverview()); } catch {}
  }, []);

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: pageSize, offset: page * pageSize, sortBy, order };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filter !== 'all') params.filter = filter;
      const data = await api.symbolsCache(params);
      setCache(data);
    } catch {}
    setLoading(false);
  }, [page, debouncedSearch, sortBy, order, filter]);

  const loadPending = useCallback(async () => {
    try { setPending(await api.symbolsPending()); } catch {}
  }, []);

  useEffect(() => { loadOverview(); }, []);
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
      if (age < 5 * 60 * 1000) setNewBuild(newest); else setNewBuild(null);
    }
  }, [cache.rows]);

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

  const handleFilterChange = (f) => { setFilter(f); setPage(0); };

  const handleDeleteExtraction = async (id) => {
    if (!confirm('Delete this extraction record?')) return;
    try {
      await api.symbolsDeleteExtraction(id);
      showToast('Extraction deleted'); loadPending();
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
      showToast(`Purged ${res.deleted} failed extraction(s)`); loadPending();
    } catch (err) { showToast(err.message || 'Purge failed', 'error'); }
  };

  const handleValidateConfirm = async (id, notes) => {
    try {
      await api.symbolsValidate(id, 'admin', notes || undefined);
      showToast('Build validated'); loadCache(); loadOverview();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleUnvalidateConfirm = async (id, reason, wasBsod) => {
    try {
      await api.symbolsUnvalidate(id, reason, wasBsod);
      showToast(wasBsod ? 'BSOD reported — build unvalidated' : 'Build unvalidated');
      loadCache(); loadOverview();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleReextractOutdated = async () => {
    if (!overview?.outdatedCount) return;
    if (!confirm(`Re-queue extraction for ${overview.outdatedCount} outdated build(s)?`)) return;
    setReextracting(true);
    try {
      const res = await api.symbolsReextractOutdated();
      showToast(`${res.queued} build(s) queued for re-extraction`);
      loadCache(); loadOverview(); loadPending();
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setReextracting(false); }
  };

  const exportCsv = () => {
    const rows = cache.rows || [];
    if (rows.length === 0) return;
    const headers = ['build', 'windowsVersion', 'pdbGuid', 'age', 'pdbName', 'validated', 'bsodReports', 'hitCount', 'lastHit', 'extractedAt'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const win = parseWindowsVersion(r.build).label;
      lines.push([
        r.build, `"${win}"`, r.pdbGuid, r.age, r.pdbName,
        r.validated, r.bsodReports || 0, r.hitCount || 0,
        r.lastHit || '', r.extractedAt || '',
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kernel-symbols-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  };

  const openValidateModal = (row) => setValidateRow(row);
  const openUnvalidateModal = (row, isBsod) => { setUnvalidateRow(row); setUnvalidateIsBsod(isBsod); };

  const totalPages = Math.ceil(cache.total / pageSize);
  const maxHitCount = cache.rows?.length > 0 ? Math.max(...cache.rows.map(r => r.hitCount || 0), 1) : 1;

  const Th = ({ col, children, className = '' }) => (
    <th className={`px-3 py-2.5 cursor-pointer select-none hover:text-gray-200 transition-colors ${className}`} onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === col && <span className="text-purple-400">{order === 'desc' ? '↓' : '↑'}</span>}
      </span>
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kernel Symbols</h1>
            <div className="text-xs text-gray-500">
              Cache PDB extraction · v{overview?.requiredSymbolVersion ?? '?'} ·
              {' '}{overview?.wantedSymbolsCount ?? '?'} symbols per build
              {udtAliases.size > 0 && (
                <span className="ml-1 text-amber-400">
                  ({overview.wantedSymbolsCount - udtAliases.size} RVA + {udtAliases.size} UDT)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {overview?.outdatedCount > 0 && (
            <button onClick={handleReextractOutdated} disabled={reextracting}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Zap className={`w-4 h-4 ${reextracting ? 'animate-pulse' : ''}`} />
              Re-extract {overview.outdatedCount} outdated
            </button>
          )}
          <button onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => { loadOverview(); loadCache(); loadPending(); }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Warnings */}
      {overview && overview.unvalidatedWithHits > 0 && (
        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-400">
                {overview.unvalidatedWithHits} client{overview.unvalidatedWithHits > 1 ? 's tournent' : ' tourne'} sur des builds non-validées
              </div>
              <div className="text-xs text-red-400/70 mt-1">
                Le loader refuse de map chez eux (protection anti-BSOD). Valide leurs builds pour débloquer.
                {overview.totalBsodReports > 0 && <span className="font-bold"> ({overview.totalBsodReports} BSOD report{overview.totalBsodReports > 1 ? 's' : ''} total)</span>}
              </div>
              <button onClick={() => handleFilterChange('unvalidated')}
                className="mt-2 text-xs text-red-400 underline underline-offset-2 hover:text-red-300">
                Voir les builds non-validées
              </button>
            </div>
          </div>
        </div>
      )}

      {newBuild && (
        <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/30 rounded-xl px-4 py-3 text-sm">
          <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
          <span className="text-pink-400 font-medium">New build cached {timeAgo(newBuild.extractedAt)}:</span>
          <span className="text-white font-mono font-bold">{newBuild.build}</span>
          <WinVersionPill build={newBuild.build} />
          {!newBuild.validated && <span className="text-orange-400 text-xs">· needs validation</span>}
        </div>
      )}

      {/* Overview tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Cached Builds" value={overview?.totalCachedBuilds} color="#c45cff" icon={Database} />
        <Tile label="Total Lookups" value={overview?.totalLookupsServed?.toLocaleString()} color="#22c55e" icon={TrendingUp} />
        <Tile label="Unvalidated" value={overview?.unvalidatedCount} color="#f97316" icon={ShieldOff}
          sub={overview?.unvalidatedWithHits > 0 ? `${overview.unvalidatedWithHits} with active clients` : undefined}
          onClick={() => handleFilterChange('unvalidated')} />
        <Tile label="BSOD Reports" value={overview?.totalBsodReports} color="#ef4444" icon={AlertTriangle}
          highlight={overview?.totalBsodReports > 0}
          onClick={overview?.totalBsodReports > 0 ? () => handleFilterChange('bsod') : undefined} />
      </div>

      {/* Windows versions breakdown */}
      <WindowsVersionsPanel data={overview?.byWindowsVersion} onFilter={(v) => setSearch(v.includes('24H2') ? '26100' : v.includes('23H2') ? '22631' : v.includes('22H2') && v.includes('11') ? '22621' : v.includes('21H2') && v.includes('11') ? '22000' : v.includes('22H2') ? '19045' : v.includes('2004') ? '19041' : '')} />

      {/* Pending */}
      <PendingPanel items={pending} onRefresh={loadPending} onDelete={handleDeleteExtraction} onPurge={handlePurgeFailed} />

      {/* Cache table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Symbol Cache</h2>
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search build (e.g. 26100) or GUID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-9 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">{cache.total} entries</div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-gray-600 mr-1" />
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
            {debouncedSearch || filter !== 'all' ? 'No builds match these filters.' : 'No builds cached yet.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <Th col="build">Build</Th>
                    <th className="px-3 py-2.5">Windows</th>
                    <th className="px-3 py-2.5">Status</th>
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
                    const outdated = (r.symbolVersion ?? 1) < (overview?.requiredSymbolVersion ?? 1);
                    return (
                      <tr key={r.id} className={`border-t hover:bg-gray-800/30 transition-colors ${
                        r.bsodReports > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-gray-800/40'
                      }`}>
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-white font-medium">{r.build}</div>
                          {outdated && (
                            <div className="text-[10px] text-orange-400 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> v{r.symbolVersion ?? 1} outdated
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <WinVersionPill build={r.build} />
                        </td>
                        <td className="px-3 py-2.5">
                          <ValidatedBadge validated={r.validated} bsodReports={r.bsodReports} />
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
                          {r.bsodReports > 0
                            ? <span className="text-red-400 font-bold">{r.bsodReports}</span>
                            : <span className="text-gray-600">0</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => setModalRow(r)}>
                            <SymbolsCount symbols={r.symbols} expected={expectedSymbols} />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <ActionDropdown row={r}
                            onValidate={openValidateModal} onUnvalidate={openUnvalidateModal}
                            onInvalidate={handleInvalidate} onDelete={handleDeleteCache} />
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
        <SymbolsModal row={modalRow} expected={expectedSymbols} udtAliases={udtAliases} onClose={() => setModalRow(null)} onInvalidate={handleInvalidate} />
      )}
      {validateRow && (
        <ValidateModal row={validateRow} onClose={() => setValidateRow(null)} onConfirm={handleValidateConfirm} />
      )}
      {unvalidateRow && (
        <UnvalidateModal row={unvalidateRow} isBsod={unvalidateIsBsod} onClose={() => setUnvalidateRow(null)} onConfirm={handleUnvalidateConfirm} />
      )}

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
