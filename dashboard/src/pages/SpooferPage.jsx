import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const labels = { '1d': '1 jour', '1w': '7 jours', '14d': '14 jours', '1m': '30 jours' };
const planLabels = { DAYS_1: '1 jour', DAYS_7: '7 jours', DAYS_14: '14 jours', DAYS_30: '30 jours' };
const inputClass = 'bg-gray-950 border border-gray-700 rounded-lg px-3 py-2';
const buttonClass = 'bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg px-4 py-2';

const keyStatuses = { available: 'Disponible', reserved: 'Réservée', delivered: 'Livrée' };
const dateLabel = (value) => value ? new Date(value).toLocaleString('fr-FR') : '—';

function SpooferKeys({ revision }) {
  const [status, setStatus] = useState('');
  const [duration, setDuration] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ status, plan: duration, search, page: String(page) });
      api.get(`/shop/admin/spoofer/keys?${params}`).then((data) => {
        if (!cancelled) setResult(data);
      }).catch((failure) => { if (!cancelled) setError(failure.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [status, duration, search, page, revision]);
  return <section className="space-y-3 border-t border-gray-800 pt-5">
    <h3 className="font-semibold">Inventaire des clés et livraisons</h3>
    <div className="flex flex-wrap gap-3">
      <select aria-label="Filtrer par statut" className={inputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">Tous les statuts</option>{Object.entries(keyStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Filtrer par durée" className={inputClass} value={duration} onChange={(event) => { setDuration(event.target.value); setPage(1); }}>
        <option value="">Toutes les durées</option>{Object.entries(labels).map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
      </select>
      <input aria-label="Rechercher une clé ou un client" className={`${inputClass} flex-1 min-w-[220px]`} placeholder="Clé, email, pseudo ou ID commande" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    </div>
    {error && <p className="text-red-400" role="alert">{error}</p>}
    {loading ? <p className="text-gray-400">Chargement des clés…</p> : !error && <>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead><tr>{['Clé / durée', 'Statut', 'Client', 'Commande', 'Dates'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{result?.data.map((entry) => <tr key={entry.id} className="border-t border-gray-800 align-top">
          <td className="p-3"><code className="select-all whitespace-nowrap">{entry.key}</code><div className="text-gray-400 mt-1">{planLabels[entry.plan] || entry.plan}</div></td>
          <td className="p-3"><span className={entry.status === 'available' ? 'text-green-400' : entry.status === 'reserved' ? 'text-amber-400' : 'text-cyan-400'}>{keyStatuses[entry.status]}</span>{entry.license && <div className="text-xs text-gray-400 mt-1">Licence : {entry.license.status}</div>}</td>
          <td className="p-3">{entry.order?.customer ? <><div>{entry.order.customer.displayName || entry.order.customer.username}</div><div className="text-xs text-gray-400">{entry.order.customer.email}</div><div className="text-xs text-gray-500">@{entry.order.customer.username}</div></> : <span className="text-gray-500">Non attribuée</span>}</td>
          <td className="p-3">{entry.order ? <><code className="text-xs select-all break-all">{entry.order.id}</code><div className="text-xs text-gray-400 mt-1">{entry.order.status} · {(entry.order.amount / 100).toFixed(2)} {entry.order.currency} (commande)</div></> : '—'}</td>
          <td className="p-3 text-xs text-gray-400 whitespace-nowrap"><div>Ajout : {dateLabel(entry.createdAt)}</div>{entry.order && <div>Commande : {dateLabel(entry.order.createdAt)}</div>}{entry.soldAt && <div>Livraison : {dateLabel(entry.soldAt)}</div>}</td>
        </tr>)}</tbody>
      </table></div>
      {!result?.data.length && <p className="text-gray-500">Aucune clé pour ces filtres.</p>}
    </>}
    <div className="flex items-center justify-between text-sm text-gray-400">
      <span>{result?.pagination.total ?? 0} clé(s) · page {page} / {Math.max(1, result?.pagination.totalPages || 1)}</span>
      <div className="flex gap-2"><button className={buttonClass} disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Précédent</button><button className={buttonClass} disabled={loading || page >= (result?.pagination.totalPages || 1)} onClick={() => setPage(page + 1)}>Suivant</button></div>
    </div>
  </section>;
}

export function SpooferStock() {
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState('1d');
  const [keys, setKeys] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const load = () => api.get('/shop/admin/spoofer').then(setPlans);
  useEffect(() => { load().catch((failure) => setError(failure.message)); }, []);
  const run = async (operation) => {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); await load(); setRevision((value) => value + 1); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <div className="flex justify-between items-center gap-3"><p className="text-sm text-gray-400">Clés fournisseur Temp Spoofer · prix en euros. Les clés vendues ne sont jamais remises en stock.</p><button type="button" disabled={busy} className={buttonClass} onClick={() => run(async () => {})}>Actualiser</button></div>
    {error && <p className="text-red-400" role="alert">{error}</p>}
    {message && <p className="text-green-400" role="status">{message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr>{['Durée', 'Disponibles', 'Réservées', 'Livrées', 'Prix (€)', 'En vente', ''].map((label, index) => <th className="p-2" key={index}>{label}</th>)}</tr></thead>
      <tbody>{plans.map((entry) => <tr key={entry.slug}>
        <td className="p-2">{labels[entry.slug]}</td><td className="p-2">{entry.available}</td><td className="p-2">{entry.reserved}</td><td className="p-2">{entry.sold}</td>
        <td className="p-2"><input aria-label={`Prix ${labels[entry.slug]}`} type="number" min="0" step="0.01" className={`${inputClass} w-28`} value={entry.price / 100} onChange={(event) => setPlans(plans.map((row) => row.slug === entry.slug ? { ...row, price: Math.round(Number(event.target.value) * 100) } : row))} /></td>
        <td className="p-2"><input aria-label={`Activer ${labels[entry.slug]}`} type="checkbox" checked={entry.enabled} onChange={(event) => setPlans(plans.map((row) => row.slug === entry.slug ? { ...row, enabled: event.target.checked } : row))} /></td>
        <td className="p-2"><button disabled={busy} className={buttonClass} onClick={() => run(async () => { await api.patch(`/shop/admin/spoofer/plans/${entry.slug}`, { price: entry.price, enabled: entry.enabled }); setMessage('Offre enregistrée'); })}>Enregistrer</button></td>
      </tr>)}</tbody>
    </table></div>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); run(async () => {
      const result = await api.post('/shop/admin/spoofer/keys', { plan, keys });
      setKeys(''); setMessage(`${result.imported} clé(s) importée(s), ${result.duplicates} doublon(s) ignoré(s)`);
    }); }}>
      <h3 className="font-semibold">Ajouter des clés</h3>
      <select aria-label="Durée des clés" className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value)}>{Object.entries(labels).map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}</select>
      <textarea aria-label="Clés fournisseur" required rows={6} value={keys} onChange={(event) => setKeys(event.target.value)} placeholder="Une clé fournisseur 404-… par ligne" className={`${inputClass} w-full font-mono`} />
      <button disabled={busy || !keys.trim()} className={buttonClass}>Importer les clés</button>
    </form>
    <SpooferKeys revision={revision} />
  </div>;
}

export default function SpooferUpload() {
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const load = () => api.get('/software/spoofer/versions').then(setVersions);
  useEffect(() => { load().catch((failure) => setError(failure.message)); }, []);
  const upload = async (event) => {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setError(''); setMessage(''); setProgress(0);
    try {
      const data = new FormData(form); data.set('product', 'SHOP_SPOOFER');
      await api.uploadSoftware(data, setProgress); await load(); form.reset(); setMessage('Spoofer disponible dans le profil des acheteurs.');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <p className="text-gray-400 text-sm">Le téléchargement est réservé aux clients ayant acheté une clé Temp Spoofer.</p>
    {error && <p className="text-red-400" role="alert">{error}</p>}{message && <p className="text-green-400">{message}</p>}
    <form onSubmit={upload} className="space-y-3">
      <input aria-label="Version" name="version" placeholder="Version (ex. 1.0.0)" required className={inputClass} />
      <textarea aria-label="Notes de version" name="changelog" placeholder="Notes de version" required className={`${inputClass} w-full`} />
      <input aria-label="Fichier spoofer" name="file" type="file" accept=".exe,.zip" required className="block" />
      <button disabled={busy} className={buttonClass}>{busy ? `Envoi… ${typeof progress === 'number' ? progress : progress?.percent || 0}%` : 'Uploader le spoofer'}</button>
    </form>
    {versions.map((entry, index) => <div key={entry.version} className="p-3 border border-gray-800 rounded-lg"><strong>v{entry.version}{index === 0 ? ' · Version actuelle' : ''}</strong><p className="text-sm text-gray-400">{entry.filename} · {(entry.size / 1048576).toFixed(1)} Mo</p><p className="text-sm">{entry.changelog}</p></div>)}
  </div>;
}
