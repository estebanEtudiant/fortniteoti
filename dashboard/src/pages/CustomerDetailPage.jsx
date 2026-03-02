import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, UserCheck, UserX, Mail, XCircle, Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import OrderStatusBadge from '../components/OrderStatusBadge';
import InfoCard from '../components/InfoCard';
import { formatPlan, formatDate } from '../lib/utils';

export default function CustomerDetailPage({ id, navigate }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getCustomer(id).then(setCustomer).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action) => {
    setActionLoading(action); setActionMsg('');
    try {
      if (action === 'ban')    await api.banCustomer(id);
      if (action === 'unban')  await api.unbanCustomer(id);
      if (action === 'reset-email') {
        await api.sendPasswordReset(id);
        setActionMsg('Email de réinitialisation envoyé !');
        setTimeout(() => setActionMsg(''), 3000);
        return;
      }
      if (action === 'revoke') {
        if (!confirm('Révoquer toutes les licences actives de ce compte ?')) return;
        const res = await api.revokeCustomerLicenses(id);
        setActionMsg(`${res.revoked} licence(s) révoquée(s)`);
        setTimeout(() => setActionMsg(''), 3000);
        load(); return;
      }
      if (action === 'delete') {
        if (!confirm('Supprimer définitivement ce compte ?')) return;
        await api.deleteCustomer(id);
        navigate('/customers'); return;
      }
      load();
    } catch (err) { alert(err.message); }
    finally { setActionLoading(''); }
  };

  if (loading) return <Loading />;
  if (!customer) return <p className="text-gray-500">Utilisateur introuvable</p>;

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
          {(customer.displayName || customer.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{customer.displayName || customer.username}</h1>
          <p className="text-gray-400 text-sm">{customer.email}</p>
        </div>
        {customer.banned && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Banni</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Username" value={customer.username} />
        <InfoCard label="Discord" value={customer.discordId || '—'} />
        <InfoCard label="Inscrit le" value={formatDate(customer.createdAt)} />
        <InfoCard label="Dernière connexion" value={formatDate(customer.lastLogin)} />
        <InfoCard label="Email vérifié" value={customer.emailVerified ? 'Oui' : 'Non'} />
        <InfoCard label="Commandes" value={customer.orders?.length ?? 0} />
      </div>

      {/* Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        {actionMsg && (
          <div className="mb-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
            {actionMsg}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {customer.banned ? (
            <button onClick={() => doAction('unban')} disabled={!!actionLoading}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> {actionLoading === 'unban' ? '...' : 'Débannir'}
            </button>
          ) : (
            <button onClick={() => doAction('ban')} disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <UserX className="w-4 h-4" /> {actionLoading === 'ban' ? '...' : 'Bannir'}
            </button>
          )}
          <button onClick={() => doAction('reset-email')} disabled={!!actionLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> {actionLoading === 'reset-email' ? '...' : 'Envoyer reset email'}
          </button>
          <button onClick={() => doAction('revoke')} disabled={!!actionLoading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {actionLoading === 'revoke' ? '...' : 'Révoquer licences'}
          </button>
          <button onClick={() => doAction('delete')} disabled={!!actionLoading}
            className="bg-gray-700 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> {actionLoading === 'delete' ? '...' : 'Supprimer le compte'}
          </button>
        </div>
      </div>

      {/* Licences */}
      {customer.licenses?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Licences</h2>
          <div className="space-y-2">
            {customer.licenses.map(lic => (
              <div key={lic.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-mono text-xs text-cyan-400">{lic.licenseKey}</span>
                  <span className="ml-3 text-gray-400 text-xs">{formatPlan(lic.plan)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={lic.status} />
                  <button onClick={() => navigate(`/licenses/${lic.id}`)}
                    className="text-xs text-gray-400 hover:text-white underline">Détail</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {customer.orders?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Commandes</h2>
          <div className="space-y-2">
            {customer.orders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 text-sm">
                <div>
                  <span>{formatPlan(o.plan)}</span>
                  <span className="text-gray-500 text-xs ml-3">{formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-green-400">{(o.amount / 100).toFixed(2)}€</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
