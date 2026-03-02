import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Plus, Download, Ban, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import { formatPlan, formatDate } from '../lib/utils';

export default function LicensesPage({ navigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (plan) params.plan = plan;
    api.getLicenses(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, search, status, plan]);

  useEffect(() => { load(); }, [load]);
  const doSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const exportCsv = () => {
    if (!data?.data?.length) return;
    const header = 'Clé,Plan,Statut,Email,HWID,Expire,Dernier HB';
    const rows = data.data.map(l =>
      `${l.licenseKey},${l.plan},${l.status},${l.email || ''},${l.hwid || ''},${l.expiresAt || 'Lifetime'},${l.lastHeartbeat || ''}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'licences.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data?.data) return;
    setSelected(selected.size === data.data.length ? new Set() : new Set(data.data.map(l => l.id)));
  };

  const bulkBan = async () => {
    if (!confirm(`Bannir ${selected.size} licence(s) ?`)) return;
    setBulkLoading('ban');
    await Promise.all([...selected].map(id => api.banLicense(id, 'Bulk ban').catch(() => {})));
    setBulkLoading('');
    setSelected(new Set());
    load();
  };

  const bulkDelete = async () => {
    if (!confirm(`Supprimer définitivement ${selected.size} licence(s) ? Action irréversible.`)) return;
    setBulkLoading('delete');
    await Promise.all([...selected].map(id => api.deleteLicense(id).catch(() => {})));
    setBulkLoading('');
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Licences
          {data && <span className="ml-2 text-base text-gray-500 font-normal">({data.pagination.total})</span>}
        </h1>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => navigate('/generate')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Générer
          </button>
        </div>
      </div>

      <form onSubmit={doSearch} className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10" placeholder="Clé, email, HWID..." />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expirée</option>
          <option value="BANNED">Bannie</option>
          <option value="SUSPENDED">Suspendue</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous plans</option>
          <option value="DAYS_30">30 jours</option>
          <option value="DAYS_90">90 jours</option>
          <option value="DAYS_365">1 an</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
      </form>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune licence trouvée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={!!data?.data?.length && selected.size === data.data.length}
                        onChange={toggleAll}
                        className="cursor-pointer accent-cyan-500"
                      />
                    </th>
                    <th className="px-4 py-3">Clé</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">HWID</th>
                    <th className="px-4 py-3">Dernier HB</th>
                    <th className="px-4 py-3">Expire</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(lic => (
                    <tr key={lic.id} onClick={() => navigate(`/licenses/${lic.id}`)}
                      className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer">
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(lic.id)}
                          onChange={() => toggleSelect(lic.id)}
                          className="cursor-pointer accent-cyan-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-400">{lic.licenseKey}</td>
                      <td className="px-4 py-3">{formatPlan(lic.plan)}</td>
                      <td className="px-4 py-3"><StatusBadge status={lic.status} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{lic.hwid ? lic.hwid.substring(0, 12) + '...' : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(lic.lastHeartbeat)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{lic.expiresAt ? formatDate(lic.expiresAt) : 'Lifetime'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} licences — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Bulk action floating toolbar */}
          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 shadow-2xl z-50">
              <span className="text-sm text-gray-400">{selected.size} sélectionné(s)</span>
              <button onClick={bulkBan} disabled={!!bulkLoading}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Ban className="w-4 h-4" /> {bulkLoading === 'ban' ? '...' : 'Bannir'}
              </button>
              <button onClick={bulkDelete} disabled={!!bulkLoading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> {bulkLoading === 'delete' ? '...' : 'Supprimer'}
              </button>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-white text-lg px-1">✕</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
