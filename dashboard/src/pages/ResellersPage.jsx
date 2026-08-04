import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronRight,
  DollarSign, Package, Key, Eye, Ban, ArrowUpCircle, CreditCard, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const c = type === 'error'
    ? 'bg-red-500/10 border-red-500/30 text-red-400'
    : 'bg-green-500/10 border-green-500/30 text-green-400';
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium ${c} flex items-center gap-3`}>
      {msg}<button onClick={onClose} className="opacity-70 hover:opacity-100">x</button>
    </div>
  );
}

function Modal({ title, onCancel, onConfirm, children, confirmLabel = 'Confirmer', confirmColor = 'bg-violet-600 hover:bg-violet-500' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>
        {children}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-medium">Annuler</button>
          <button onClick={onConfirm} className={`flex-1 ${confirmColor} text-white py-2.5 rounded-lg text-sm font-bold`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const TIER_COLORS = {
  bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  silver: 'bg-gray-400/10 text-gray-300 border-gray-500/30',
  gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  diamond: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  pending_approval: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function Badge({ label, colors }) {
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>{label}</span>;
}

function Card({ children, className = '' }) {
  return <div className={`bg-gray-900/80 border border-gray-800 rounded-xl p-5 ${className}`}>{children}</div>;
}

export default function ResellersPage() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [batches, setBatches] = useState({});
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.resellerList({ status: filterStatus || undefined, tier: filterTier || undefined });
      setResellers(data);
    } catch (e) {
      setToast({ msg: e.message, type: 'error' });
    }
    setLoading(false);
  }, [filterStatus, filterTier]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadBatches = async (resellerId) => {
    try {
      const data = await api.resellerBatches(resellerId);
      setBatches(prev => ({ ...prev, [resellerId]: data }));
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!batches[id]) loadBatches(id);
  };

  const handleApprove = async (id) => {
    try {
      await api.resellerApprove(id);
      showToast('Reseller approuve');
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSuspend = async (id, reason) => {
    try {
      await api.resellerSuspend(id, reason);
      showToast('Reseller suspendu');
      setModal(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSetTier = async (id, tier) => {
    try {
      await api.resellerSetTier(id, tier);
      showToast(`Tier mis a jour: ${tier}`);
      setModal(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleCredit = async (id, amountCents, reason) => {
    try {
      await api.resellerCredit(id, amountCents, reason);
      showToast(`Wallet credite de ${(amountCents / 100).toFixed(2)}EUR`);
      setModal(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleRevokeBatch = async (batchId, reason) => {
    try {
      await api.resellerRevokeBatch(batchId, reason);
      showToast('Batch revoke');
      setModal(null);
      if (expandedId) loadBatches(expandedId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const stats = {
    total: resellers.length,
    active: resellers.filter(r => r.status === 'active').length,
    pending: resellers.filter(r => r.status === 'pending' || r.status === 'pending_approval').length,
    totalWallet: resellers.reduce((s, r) => s + (r.walletCents || 0), 0),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-7 h-7 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Resellers</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Wallets total</p>
          <p className="text-2xl font-bold text-violet-400">{(stats.totalWallet / 100).toFixed(2)} EUR</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
          <option value="">Tous les statuts</option>
          <option value="pending_approval">En attente</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
          <option value="">Tous les tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="diamond">Diamond</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-3 font-medium"></th>
              <th className="pb-3 font-medium">ID</th>
              <th className="pb-3 font-medium">Customer</th>
              <th className="pb-3 font-medium">Tier</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Wallet</th>
              <th className="pb-3 font-medium">Keys total</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {resellers.map(r => (
              <React.Fragment key={r.id}>
                <tr className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-3 pr-2">
                    <button onClick={() => toggleExpand(r.id)} className="text-gray-500 hover:text-white">
                      {expandedId === r.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="py-3 font-mono text-xs text-gray-400">{r.id.slice(0, 8)}</td>
                  <td className="py-3">
                    <div className="text-white text-sm">{r.companyName || r.customer?.username || '-'}</div>
                    <div className="text-xs text-gray-500">{r.customer?.email || r.customerId?.slice(0, 10)}</div>
                  </td>
                  <td className="py-3"><Badge label={r.tier?.name || 'bronze'} colors={TIER_COLORS[r.tier?.name] || TIER_COLORS.bronze} /></td>
                  <td className="py-3"><Badge label={r.status} colors={STATUS_COLORS[r.status] || STATUS_COLORS.pending} /></td>
                  <td className="py-3 font-mono text-sm text-white">{((r.walletCents || 0) / 100).toFixed(2)} EUR</td>
                  <td className="py-3 text-gray-300">{r.totalKeysGenerated || 0}</td>
                  <td className="py-3 text-gray-500 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(r.status === 'pending' || r.status === 'pending_approval') && (
                        <button onClick={() => handleApprove(r.id)} title="Approuver"
                          className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      {r.status !== 'suspended' && (
                        <button onClick={() => setModal({ type: 'suspend', id: r.id })} title="Suspendre"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Ban className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => setModal({ type: 'tier', id: r.id, currentTier: r.tier?.name })} title="Changer tier"
                        className="p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400"><ArrowUpCircle className="w-4 h-4" /></button>
                      <button onClick={() => setModal({ type: 'credit', id: r.id })} title="Crediter wallet"
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"><CreditCard className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr>
                    <td colSpan={9} className="bg-gray-800/30 p-4">
                      <BatchesPanel batches={batches[r.id] || []} onRevoke={(bId) => setModal({ type: 'revoke', batchId: bId })} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!loading && resellers.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-gray-500">Aucun reseller</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modals */}
      {modal?.type === 'suspend' && <SuspendModal onCancel={() => setModal(null)} onConfirm={(reason) => handleSuspend(modal.id, reason)} />}
      {modal?.type === 'tier' && <TierModal current={modal.currentTier} onCancel={() => setModal(null)} onConfirm={(tier) => handleSetTier(modal.id, tier)} />}
      {modal?.type === 'credit' && <CreditModal onCancel={() => setModal(null)} onConfirm={(amt, reason) => handleCredit(modal.id, amt, reason)} />}
      {modal?.type === 'revoke' && <RevokeModal onCancel={() => setModal(null)} onConfirm={(reason) => handleRevokeBatch(modal.batchId, reason)} />}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />
    </div>
  );
}

function BatchesPanel({ batches, onRevoke }) {
  if (!batches.length) return <p className="text-gray-500 text-sm">Aucun batch</p>;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Batches</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="pb-2 text-left font-medium">ID</th>
              <th className="pb-2 text-left font-medium">Produit</th>
              <th className="pb-2 text-left font-medium">Plan</th>
              <th className="pb-2 text-left font-medium">Keys</th>
              <th className="pb-2 text-left font-medium">Active</th>
              <th className="pb-2 text-left font-medium">Cout</th>
              <th className="pb-2 text-left font-medium">Expire</th>
              <th className="pb-2 text-left font-medium">Status</th>
              <th className="pb-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {batches.map(b => (
              <tr key={b.id} className="hover:bg-gray-700/30">
                <td className="py-2 font-mono text-gray-400">{b.id.slice(0, 8)}</td>
                <td className="py-2 text-gray-300">{b.product}</td>
                <td className="py-2 text-gray-300">{b.plan}</td>
                <td className="py-2 text-white font-medium">{b.keyCount}</td>
                <td className="py-2 text-green-400">{b.activatedCount || 0}</td>
                <td className="py-2 text-gray-300">{((b.totalCostCents || 0) / 100).toFixed(2)} EUR</td>
                <td className="py-2 text-gray-500">{b.expiresAt ? formatDate(b.expiresAt) : '-'}</td>
                <td className="py-2">
                  {b.revokedAt
                    ? <Badge label="Revoke" colors="bg-red-500/10 text-red-400 border-red-500/30" />
                    : <Badge label="Actif" colors="bg-green-500/10 text-green-400 border-green-500/30" />
                  }
                </td>
                <td className="py-2">
                  {!b.revokedAt && (
                    <button onClick={() => onRevoke(b.id)} className="text-red-400 hover:text-red-300" title="Revoquer batch">
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

function SuspendModal({ onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Suspendre le reseller" onCancel={onCancel} onConfirm={() => onConfirm(reason)} confirmLabel="Suspendre" confirmColor="bg-red-600 hover:bg-red-500">
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison de la suspension..."
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
    </Modal>
  );
}

function TierModal({ current, onCancel, onConfirm }) {
  const [tier, setTier] = useState(current || 'bronze');
  return (
    <Modal title="Changer le tier" onCancel={onCancel} onConfirm={() => onConfirm(tier)}>
      <select value={tier} onChange={e => setTier(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
        <option value="bronze">Bronze (25%)</option>
        <option value="silver">Silver (35%)</option>
        <option value="gold">Gold (45%)</option>
        <option value="diamond">Diamond (55%)</option>
      </select>
    </Modal>
  );
}

function CreditModal({ onCancel, onConfirm }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  return (
    <Modal title="Crediter le wallet" onCancel={onCancel}
      onConfirm={() => onConfirm(Math.round(parseFloat(amount) * 100), reason)} confirmLabel="Crediter" confirmColor="bg-blue-600 hover:bg-blue-500">
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Montant (EUR)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            placeholder="100.00" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Raison</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            placeholder="Credit manuel, compensation..." />
        </div>
      </div>
    </Modal>
  );
}

function RevokeModal({ onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Revoquer le batch" onCancel={onCancel} onConfirm={() => onConfirm(reason)} confirmLabel="Revoquer" confirmColor="bg-red-600 hover:bg-red-500">
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison de la revocation..."
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
    </Modal>
  );
}
