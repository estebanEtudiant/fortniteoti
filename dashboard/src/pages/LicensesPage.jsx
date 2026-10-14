import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Plus, Download, Ban, Trash2,
  Calendar, Clock, Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import ProductBadge from '../components/ProductBadge';
import { formatPlan, formatDate } from '../lib/utils';

const PRODUCTS = [
  { key: '', label: 'Tous produits' },
  { key: 'FTN_OPTIMIZER', label: 'FTN Optimizer' },
  { key: 'FORTNITE_CLIENT', label: 'Fortnite Client' },
  { key: 'MARVEL_RIVALS_CLIENT', label: 'Marvel Rivals Client' },
  { key: 'NG_RECUBE_CLIENT', label: 'NG Recube Client' },
  { key: 'RUST_CLIENT', label: 'Rust Client' },
  { key: 'NG_LOADER', label: 'NG Loader' },
  { key: 'MENORIA', label: 'Menoria' },
  { key: 'VELTHAR_LOADER', label: 'Velthar' },
];

export default function LicensesPage({ navigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [product, setProduct] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState('');

  // Bulk extend modal
  const [showBulkExtend, setShowBulkExtend] = useState(false);
  const [bulkDays, setBulkDays] = useState(1);
  const [bulkProduct, setBulkProduct] = useState('');
  const [bulkStatus, setBulkStatus] = useState('ACTIVE');
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkExtendLoading, setBulkExtendLoading] = useState(false);
  // Preview count
  const [previewCount, setPreviewCount] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (plan) params.plan = plan;
    if (product) params.product = product;
    api.getLicenses(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, search, status, plan, product]);

  useEffect(() => { load(); }, [load]);
  const doSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  // Preview: count matching licenses when bulk modal filters change
  useEffect(() => {
    if (!showBulkExtend) return;
    setPreviewCount(null);
    const params = { limit: 1 };
    if (bulkProduct) params.product = bulkProduct;
    if (bulkStatus) params.status = bulkStatus;
    api.getLicenses(params).then(r => setPreviewCount(r.pagination?.total ?? 0)).catch(() => setPreviewCount(null));
  }, [showBulkExtend, bulkProduct, bulkStatus]);

  const exportCsv = () => {
    if (!data?.data?.length) return;
    const header = 'Clé,Produit,Plan,Statut,Email,HWID,Expire,Dernier HB';
    const rows = data.data.map(l =>
      `${l.licenseKey},${l.product || ''},${l.plan},${l.status},${l.email || ''},${l.hwid || ''},${l.expiresAt || (l.metadata?.startOnActivation ? `${l.metadata.durationDays}d from activation` : 'Lifetime')},${l.lastHeartbeat || ''}`
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

  const bulkExtendSelected = async () => {
    const days = parseInt(prompt(`Nombre de jours à ajouter aux ${selected.size} licence(s) sélectionnée(s) :`, '1'));
    if (!days || days < 1) return;
    setBulkLoading('extend');
    await Promise.all([...selected].map(id => api.extendLicense(id, days).catch(() => {})));
    setBulkLoading('');
    setSelected(new Set());
    load();
  };

  const doBulkExtend = async () => {
    if (!bulkDays || bulkDays < 1) return;
    const label = bulkProduct ? PRODUCTS.find(p => p.key === bulkProduct)?.label || bulkProduct : 'tous les produits';
    if (!confirm(`Ajouter ${bulkDays} jour(s) à toutes les licences ${bulkStatus || 'ACTIVE'} de "${label}" ?\n\n${previewCount ?? '?'} licence(s) seront affectées.`)) return;
    setBulkExtendLoading(true);
    setBulkResult(null);
    try {
      const body = { days: bulkDays };
      if (bulkProduct) body.product = bulkProduct;
      if (bulkStatus) body.status = bulkStatus;
      const res = await api.bulkExtendLicenses(body);
      setBulkResult({ ok: true, affected: res.affected });
      load();
    } catch (err) {
      setBulkResult({ ok: false, msg: err.message });
    } finally {
      setBulkExtendLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Licences
          {data && <span className="ml-2 text-base text-gray-500 font-normal">({data.pagination.total})</span>}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => { setBulkResult(null); setBulkProduct(''); setBulkStatus('ACTIVE'); setBulkDays(1); setShowBulkExtend(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" /> Bulk Extend
          </button>
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
        <select value={product} onChange={e => { setProduct(e.target.value); setPage(1); }} className="w-44">
          {PRODUCTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expirée</option>
          <option value="BANNED">Bannie</option>
          <option value="SUSPENDED">Suspendue</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous plans</option>
          <option value="DAYS_1">1 jour</option>
          <option value="DAYS_3">3 jours</option>
          <option value="DAYS_7">7 jours</option>
          <option value="DAYS_14">14 jours</option>
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
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox"
                        checked={!!data?.data?.length && selected.size === data.data.length}
                        onChange={toggleAll} className="cursor-pointer accent-cyan-500" />
                    </th>
                    <th className="px-4 py-3">Clé</th>
                    <th className="px-4 py-3">Produit</th>
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
                        <input type="checkbox" checked={selected.has(lic.id)}
                          onChange={() => toggleSelect(lic.id)} className="cursor-pointer accent-cyan-500" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-400">{lic.licenseKey}</td>
                      <td className="px-4 py-3"><ProductBadge product={lic.product} /></td>
                      <td className="px-4 py-3">{formatPlan(lic.plan)}</td>
                      <td className="px-4 py-3"><StatusBadge status={lic.status} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{lic.hwid ? lic.hwid.substring(0, 12) + '...' : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(lic.lastHeartbeat)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{lic.expiresAt ? formatDate(lic.expiresAt) : (lic.metadata?.startOnActivation ? `${lic.metadata.durationDays} j dès l'activation` : 'Lifetime')}</td>
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
              <button onClick={bulkExtendSelected} disabled={!!bulkLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {bulkLoading === 'extend' ? '...' : 'Étendre'}
              </button>
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

      {/* Bulk Extend Modal */}
      {showBulkExtend && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowBulkExtend(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Bulk Extend
            </h2>
            <p className="text-gray-500 text-sm mb-5">Ajouter des jours à toutes les licences correspondant aux filtres.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Produit</label>
                <select value={bulkProduct} onChange={e => setBulkProduct(e.target.value)} className="w-full">
                  {PRODUCTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Statut</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="w-full">
                  <option value="">Tous</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expirée</option>
                  <option value="SUSPENDED">Suspendue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Jours à ajouter</label>
                <input type="number" value={bulkDays} onChange={e => setBulkDays(parseInt(e.target.value) || 0)}
                  min="1" max="3650" className="w-full" />
              </div>

              {previewCount !== null && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm">
                  <span className="text-gray-400">Licences correspondantes : </span>
                  <span className="font-bold text-white">{previewCount}</span>
                </div>
              )}

              {bulkResult && (
                <div className={`rounded-lg px-4 py-3 text-sm ${bulkResult.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                  {bulkResult.ok
                    ? `${bulkResult.affected} licence(s) étendue(s) de ${bulkDays} jour(s)`
                    : `Erreur : ${bulkResult.msg}`}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBulkExtend(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg text-sm">
                  Annuler
                </button>
                <button onClick={doBulkExtend} disabled={bulkExtendLoading || !bulkDays || bulkDays < 1}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {bulkExtendLoading ? 'En cours...' : `Étendre +${bulkDays}j`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
