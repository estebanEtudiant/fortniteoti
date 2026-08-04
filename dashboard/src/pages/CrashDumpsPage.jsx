import React, { useState, useEffect } from 'react';
import { Bug, FileText, ChevronLeft, ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

function formatBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CrashDumpsPage() {
  const [tab, setTab]           = useState('dumps');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hwidFilter, setHwidFilter] = useState('');
  const [hwidQuery, setHwidQuery]   = useState('');
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const [error, setError]       = useState('');

  const reload = () => {
    setLoading(true);
    setError('');
    const params = { page, limit: 25, ...(hwidQuery ? { hwid: hwidQuery } : {}) };
    const call = tab === 'dumps' ? api.getCrashDumps(params) : api.getTelemetryLogs(params);
    return call.then(setData).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [tab, page, hwidQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setHwidQuery(hwidFilter.trim());
  };

  const handleDownload = async (id, filename) => {
    setDownloading(id);
    try {
      const blob = tab === 'dumps' ? await api.downloadCrashDump(id) : await api.downloadTelemetryLog(id);
      saveBlob(blob, filename);
    } catch (err) { setError(err.message); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement ce fichier ?')) return;
    setDeleting(id);
    try {
      if (tab === 'dumps') await api.deleteCrashDump(id);
      else await api.deleteTelemetryLog(id);
      await reload();
    } catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  const items = data?.items || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const TABS = [
    { id: 'dumps', label: 'Minidumps (BSOD)', icon: Bug },
    { id: 'logs',  label: 'Logs loader',      icon: FileText },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Bug className="w-6 h-6 text-red-400" /> Crash Reports
      </h1>

      <div className="flex items-center justify-between mb-6 border-b border-gray-800">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2 pb-2">
          <input type="text" value={hwidFilter} onChange={e => setHwidFilter(e.target.value)}
            placeholder="Filtrer par HWID (64 hex)" className="w-64 text-sm" />
          <button type="submit" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
            <Search className="w-4 h-4 text-gray-300" />
          </button>
          {hwidQuery && (
            <button type="button" onClick={() => { setHwidFilter(''); setHwidQuery(''); setPage(1); }}
              className="text-xs text-gray-500 hover:text-red-400">Effacer</button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? <Loading /> : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{tab === 'dumps' ? 'Aucun minidump reçu.' : 'Aucun log reçu.'}</p>
          <p className="text-xs mt-1">Les uploads du loader après un crash apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">{tab === 'dumps' ? 'Fichier' : 'Type'}</th>
                    <th className="px-4 py-3">OS</th>
                    <th className="px-4 py-3">Taille</th>
                    <th className="px-4 py-3">HWID</th>
                    <th className="px-4 py-3">Propriétaire</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-200">
                        {tab === 'dumps' ? row.filename : row.kind}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">{row.os || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">{formatBytes(row.bytes)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500" title={row.hwid}>
                        {row.hwid.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {row.owner ? (
                          <a href={`#/licenses`} className="text-cyan-400 hover:text-cyan-300" title={row.owner.licenseKey}>
                            {row.owner.email || row.owner.licenseKey}
                          </a>
                        ) : (
                          <span className="text-gray-600">Inconnu</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleDownload(row.id, tab === 'dumps' ? row.filename : `${row.kind}-${row.id}.log`)}
                            disabled={downloading === row.id}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300
                              disabled:opacity-40 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded transition-colors">
                            <Download className="w-3 h-3" />
                            {downloading === row.id ? '...' : 'Télécharger'}
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deleting === row.id}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300
                              disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Page {page}/{totalPages} — {data.total} résultat(s)</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
