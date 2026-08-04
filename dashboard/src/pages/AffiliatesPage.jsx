import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, ShieldAlert, CheckCircle, XCircle, Clock, RefreshCw, Trash2, Settings, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { api } from '../lib/api';

const TIERS = ['all', 'bronze', 'silver', 'gold', 'diamond'];
const TIER_COLORS = { bronze: 'text-amber-600', silver: 'text-gray-300', gold: 'text-yellow-400', diamond: 'text-cyan-300' };
const STATUS_COLORS = { active: 'text-emerald-400', suspended: 'text-red-400' };

function Badge({ children, color = 'gray' }) {
  const map = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    gray: 'bg-gray-700/50 text-gray-400 border-gray-600/30',
    amber: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${map[color] || map.gray}`}>{children}</span>;
}

function statusBadge(s) {
  if (s === 'approved') return <Badge color="green">Approved</Badge>;
  if (s === 'rejected') return <Badge color="red">Rejected</Badge>;
  if (s === 'pending') return <Badge color="yellow">Pending</Badge>;
  if (s === 'refunded') return <Badge color="purple">Refunded</Badge>;
  if (s === 'requested') return <Badge color="yellow">Requested</Badge>;
  if (s === 'paid') return <Badge color="green">Paid</Badge>;
  if (s === 'failed') return <Badge color="red">Failed</Badge>;
  return <Badge>{s}</Badge>;
}

function tierBadge(t) {
  if (t === 'bronze') return <Badge color="amber">Bronze</Badge>;
  if (t === 'silver') return <Badge color="gray">Silver</Badge>;
  if (t === 'gold') return <Badge color="yellow">Gold</Badge>;
  if (t === 'diamond') return <Badge color="cyan">Diamond</Badge>;
  return <Badge>{t}</Badge>;
}

function cents(c) { return (c / 100).toFixed(2) + '€'; }

function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const c = type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border ${c} shadow-xl flex items-center gap-3 text-sm`}>
      {msg}
      <button onClick={onClose} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ── Tier Config Panel ──
const METHOD_LABELS = {
  crypto_btc: 'BTC', crypto_xmr: 'Monero', crypto_usdt: 'USDT TRC20',
  sepa: 'SEPA', stripe_balance: 'Stripe', store_credit: 'Store Credit',
};

function TierConfigPanel({ toast, setToast }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [mp, setMp] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.affiliateGetTierConfig();
      setCfg(data.tiers);
      setMp(data.minPayout);
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  useEffect(() => { if (open && !cfg) load(); }, [open]);

  const update = (tier, field, val) => {
    setCfg(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: parseFloat(val) || 0 } }));
  };

  const updateMp = (method, val) => {
    setMp(prev => ({ ...prev, [method]: Math.round((parseFloat(val) || 0) * 100) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const tiersToSend = {};
      for (const t of ['bronze', 'silver', 'gold', 'diamond']) {
        tiersToSend[t] = {
          minRevenueCents: Math.round(cfg[t].minRevenueCents),
          rate: parseFloat(cfg[t].rate.toFixed(4)),
          approvalDays: Math.round(cfg[t].approvalDays),
        };
      }
      await api.affiliateUpdateTierConfig(tiersToSend, mp);
      setToast({ msg: 'Configuration sauvegardée' });
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
    finally { setSaving(false); }
  };

  const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };
  const TIER_BG = { bronze: 'border-amber-600/30', silver: 'border-gray-400/30', gold: 'border-yellow-400/30', diamond: 'border-cyan-400/30' };

  return (
    <div className="mb-5 bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
        <Settings className="w-4 h-4 text-cyan-400" />
        Configuration des tiers & payouts
        {open ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
      </button>
      {open && cfg && mp && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-3">Commission : 100% du taux sur le 1er achat + 50% sur les 3 renewals suivants. Tiers basés sur le revenu généré (30j glissants). Downgrade après 60j sous le seuil.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {['bronze', 'silver', 'gold', 'diamond'].map(t => (
              <div key={t} className={`bg-gray-800/60 rounded-lg p-3 border ${TIER_BG[t]}`}>
                <div className="text-xs font-semibold mb-2 text-gray-400">{TIER_LABELS[t]}</div>
                <label className="block text-xs text-gray-500 mb-1">Revenu min. (€, 30j)</label>
                <input type="number" min="0" step="10" value={Math.round(cfg[t].minRevenueCents / 100)}
                  onChange={e => update(t, 'minRevenueCents', parseFloat(e.target.value) * 100)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm mb-2" />
                <label className="block text-xs text-gray-500 mb-1">Taux 1er achat (%)</label>
                <input type="number" min="0" max="100" step="1" value={Math.round(cfg[t].rate * 100)}
                  onChange={e => update(t, 'rate', parseFloat(e.target.value) / 100)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm mb-2" />
                <div className="text-xs text-gray-600 mb-2">Renewals: {Math.round(cfg[t].rate * 50)}%</div>
                <label className="block text-xs text-gray-500 mb-1">Jours auto-approbation</label>
                <input type="number" min="1" max="90" value={cfg[t].approvalDays}
                  onChange={e => update(t, 'approvalDays', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm" />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 mb-2">Payout minimum par méthode (€)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <div key={key} className="bg-gray-800/60 rounded-lg p-2 border border-gray-700/50">
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" min="1" step="1" value={Math.round((mp[key] || 0) / 100)}
                    onChange={e => updateMp(key, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">
              <Save className="w-4 h-4" />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Affiliates Tab ──
function AffiliatesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [tierModal, setTierModal] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.affiliateList({ tier: tierFilter, status: statusFilter });
      setRows(data || []);
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tierFilter, statusFilter]);

  const suspend = async (id) => {
    const reason = prompt('Raison de la suspension:');
    if (!reason) return;
    try { await api.affiliateSuspend(id, reason); setToast({ msg: 'Affilié suspendu' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const unsuspend = async (id) => {
    try { await api.affiliateUnsuspend(id); setToast({ msg: 'Affilié réactivé' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const deleteAff = async (id, code) => {
    if (!confirm(`Supprimer l'affilié "${code}" et toutes ses données ?`)) return;
    try { await api.affiliateDelete(id); setToast({ msg: 'Affilié supprimé' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const applyTier = async () => {
    if (!tierModal) return;
    try {
      await api.affiliateSetTier(tierModal.id, tierModal.tier, tierModal.rate ? parseFloat(tierModal.rate) : undefined);
      setToast({ msg: `Tier → ${tierModal.tier}` }); setTierModal(null); load();
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  return (
    <>
      <TierConfigPanel toast={toast} setToast={setToast} />

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
          {TIERS.map(t => <option key={t} value={t}>{t === 'all' ? 'Tous tiers' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Tous statuts</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={load} className="ml-auto text-gray-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Aucun affilié</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="pb-2 pr-3">Code</th>
                <th className="pb-2 pr-3">Utilisateur</th>
                <th className="pb-2 pr-3">Tier</th>
                <th className="pb-2 pr-3">Rate</th>
                <th className="pb-2 pr-3">Clics</th>
                <th className="pb-2 pr-3">Conv.</th>
                <th className="pb-2 pr-3">Total gagné</th>
                <th className="pb-2 pr-3">Pending</th>
                <th className="pb-2 pr-3">Statut</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3 font-mono text-cyan-400">{r.code}</td>
                  <td className="py-2 pr-3">{r.customer?.username || r.customer?.email || '—'}</td>
                  <td className="py-2 pr-3">{tierBadge(r.tier)}</td>
                  <td className="py-2 pr-3">{(r.commissionRate * 100).toFixed(0)}%</td>
                  <td className="py-2 pr-3">{r.clickCount}</td>
                  <td className="py-2 pr-3">{r.conversionCount}</td>
                  <td className="py-2 pr-3 text-emerald-400">{cents(r.totalEarnedCents)}</td>
                  <td className="py-2 pr-3">{cents(r.pendingCents)}</td>
                  <td className="py-2 pr-3"><span className={STATUS_COLORS[r.status] || 'text-gray-400'}>{r.status}</span></td>
                  <td className="py-2 flex gap-2">
                    {r.status === 'active' ? (
                      <button onClick={() => suspend(r.id)} className="text-xs text-red-400 hover:text-red-300">Suspendre</button>
                    ) : (
                      <button onClick={() => unsuspend(r.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Réactiver</button>
                    )}
                    <button onClick={() => setTierModal({ id: r.id, tier: r.tier, rate: '' })} className="text-xs text-cyan-400 hover:text-cyan-300">Tier</button>
                    <button onClick={() => deleteAff(r.id, r.code)} className="text-red-500/60 hover:text-red-400" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tier modal */}
      {tierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTierModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Changer le tier</h3>
            <select value={tierModal.tier} onChange={e => setTierModal({ ...tierModal, tier: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mb-3">
              {['bronze', 'silver', 'gold', 'diamond'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input type="number" step="0.01" min="0" max="1" placeholder="Commission rate (optionnel, ex: 0.25)"
              value={tierModal.rate} onChange={e => setTierModal({ ...tierModal, rate: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mb-4" />
            <div className="flex gap-3">
              <button onClick={applyTier} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg py-2 text-sm font-medium">Appliquer</button>
              <button onClick={() => setTierModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </>
  );
}

// ── Conversions Tab ──
function ConversionsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.affiliateConversions(filter === 'all' ? undefined : filter);
      setRows(data || []);
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const deleteConv = async (id) => {
    if (!confirm('Supprimer cette conversion ?')) return;
    try { await api.affiliateDeleteConversion(id); setToast({ msg: 'Conversion supprimée' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const approve = async (id) => {
    try { await api.affiliateApproveConversion(id); setToast({ msg: 'Conversion approuvée' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const reject = async (id) => {
    const reason = prompt('Raison du rejet:');
    if (!reason) return;
    try { await api.affiliateRejectConversion(id, reason); setToast({ msg: 'Conversion rejetée' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        {['all', 'pending', 'approved', 'rejected', 'refunded'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${filter === s ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            {s === 'all' ? 'Toutes' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-gray-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Aucune conversion</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="pb-2 pr-3">Affilié</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Montant</th>
                <th className="pb-2 pr-3">Commission</th>
                <th className="pb-2 pr-3">Rate</th>
                <th className="pb-2 pr-3">Statut</th>
                <th className="pb-2 pr-3">Fraud</th>
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const fraud = r.fraudFlags || {};
                const hasFraud = fraud.sameHwid || fraud.sameIp || fraud.sameEmailDomain || fraud.affiliateRecentConvBurst;
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-3 font-mono text-cyan-400">{r.affiliate?.code || '—'}</td>
                    <td className="py-2 pr-3 text-xs">{r.renewalIndex === 0 ? <Badge color="cyan">1er achat</Badge> : <Badge color="gray">Renewal #{r.renewalIndex}</Badge>}</td>
                    <td className="py-2 pr-3">{cents(r.amountCents)}</td>
                    <td className="py-2 pr-3 text-emerald-400">{cents(r.commissionCents)}</td>
                    <td className="py-2 pr-3">{(r.commissionRate * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-2 pr-3">
                      {hasFraud ? (
                        <span className="text-red-400 text-xs" title={JSON.stringify(fraud, null, 2)}>
                          <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
                          {[fraud.sameHwid && 'HWID', fraud.sameIp && 'IP', fraud.sameEmailDomain && 'Email', fraud.affiliateRecentConvBurst && 'Burst'].filter(Boolean).join(', ')}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString('fr')}</td>
                    <td className="py-2 flex gap-2">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => approve(r.id)} className="text-emerald-400 hover:text-emerald-300" title="Approuver"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => reject(r.id)} className="text-red-400 hover:text-red-300" title="Rejeter"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => deleteConv(r.id)} className="text-red-500/60 hover:text-red-400" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </>
  );
}

// ── Payouts Tab ──
function PayoutsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.affiliatePayouts(filter === 'all' ? undefined : filter);
      setRows(data || []);
    } catch (e) { setToast({ msg: e.message, type: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const approvePayout = async (id) => {
    try { await api.affiliateApprovePayout(id); setToast({ msg: 'Payout approuvé' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const markPaid = async (id) => {
    const txHash = prompt('TX Hash / référence:');
    if (!txHash) return;
    try { await api.affiliateMarkPaid(id, txHash); setToast({ msg: 'Payout marqué payé' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const rejectPayout = async (id) => {
    const reason = prompt('Raison du rejet:');
    if (!reason) return;
    try { await api.affiliateRejectPayout(id, reason); setToast({ msg: 'Payout rejeté' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  const deletePay = async (id) => {
    if (!confirm('Supprimer ce payout ?')) return;
    try { await api.affiliateDeletePayout(id); setToast({ msg: 'Payout supprimé' }); load(); }
    catch (e) { setToast({ msg: e.message, type: 'error' }); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        {['all', 'requested', 'approved', 'paid', 'failed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${filter === s ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
            {s === 'all' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-gray-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Aucun payout</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="pb-2 pr-3">Affilié</th>
                <th className="pb-2 pr-3">Montant</th>
                <th className="pb-2 pr-3">Méthode</th>
                <th className="pb-2 pr-3">Destination</th>
                <th className="pb-2 pr-3">Statut</th>
                <th className="pb-2 pr-3">Demandé le</th>
                <th className="pb-2 pr-3">TX</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3 font-mono text-cyan-400">{r.affiliate?.code || '—'}</td>
                  <td className="py-2 pr-3 font-medium">{cents(r.amountCents)}</td>
                  <td className="py-2 pr-3 text-gray-400">{r.method}</td>
                  <td className="py-2 pr-3 text-gray-500 max-w-[180px] truncate" title={r.destination}>{r.destination}</td>
                  <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                  <td className="py-2 pr-3 text-gray-500">{new Date(r.requestedAt).toLocaleDateString('fr')}</td>
                  <td className="py-2 pr-3 text-gray-600 max-w-[120px] truncate font-mono text-xs" title={r.txHash}>{r.txHash || '—'}</td>
                  <td className="py-2 flex gap-2">
                    {r.status === 'requested' && (
                      <>
                        <button onClick={() => approvePayout(r.id)} className="text-emerald-400 hover:text-emerald-300" title="Approuver"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => rejectPayout(r.id)} className="text-red-400 hover:text-red-300" title="Rejeter"><XCircle className="w-4 h-4" /></button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => markPaid(r.id)} className="text-cyan-400 hover:text-cyan-300 text-xs">Marquer payé</button>
                    )}
                    <button onClick={() => deletePay(r.id)} className="text-red-500/60 hover:text-red-400" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
    </>
  );
}

// ── Main Page ──
export default function AffiliatesPage() {
  const [tab, setTab] = useState('affiliates');

  const tabs = [
    { key: 'affiliates', label: 'Affiliés', icon: Users },
    { key: 'conversions', label: 'Conversions', icon: TrendingUp },
    { key: 'payouts', label: 'Payouts', icon: DollarSign },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-cyan-400" /> Programme Affiliés
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gérer les affiliés, conversions et payouts</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 border border-gray-800 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        {tab === 'affiliates' && <AffiliatesTab />}
        {tab === 'conversions' && <ConversionsTab />}
        {tab === 'payouts' && <PayoutsTab />}
      </div>
    </div>
  );
}
