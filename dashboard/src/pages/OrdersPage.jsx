import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { formatPlan, formatDate } from '../lib/utils';

// Bridge for the Cmd+K command palette: it can't pass a query string through
// the hash router, so it stashes the term here before navigating to /orders.
const PREFILL_KEY = 'orders_prefill_search';

export default function OrdersPage({ navigate }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [search, setSearch] = useState(() => {
    try {
      const pending = sessionStorage.getItem(PREFILL_KEY);
      if (pending) sessionStorage.removeItem(PREFILL_KEY);
      return pending || '';
    } catch { return ''; }
  });
  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Debounce the free-text search box
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (status) params.status = status;
    if (plan) params.plan = plan;
    if (search) params.search = search;
    api.getOrders(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, status, plan, search]);

  useEffect(() => { load(); }, [load]);

  const cancelSpooferOrder = async (order) => {
    if (!window.confirm('Annuler cette commande Spoofer en attente et libérer sa clé ? Le paiement Stripe sera expiré.')) return;
    setCancellingId(order.id);
    setActionError('');
    try {
      await api.cancelSpooferOrder(order.id);
      load();
    } catch (error) {
      setActionError(error.message || 'Impossible d’annuler cette commande.');
    } finally {
      setCancellingId(null);
    }
  };

  const totalRevenue = (data?.data || []).filter((order) => order.status === 'COMPLETED').reduce((totals, order) => {
    const currency = order.currency || 'EUR';
    totals[currency] = (totals[currency] || 0) + order.amount;
    return totals;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Commandes</h1>
      {actionError && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{actionError}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Client, email, Stripe ID..."
            className="w-full pl-9 pr-8"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">Tous les statuts</option>
          <option value="COMPLETED">Complétée</option>
          <option value="PENDING">En attente</option>
          <option value="FAILED">Échouée</option>
          <option value="REFUNDED">Remboursée</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous les plans</option>
          <option value="DAYS_1">1 jour</option>
          <option value="DAYS_7">7 jours</option>
          <option value="DAYS_14">14 jours</option>
          <option value="DAYS_30">30 jours</option>
          <option value="DAYS_90">90 jours</option>
          <option value="DAYS_365">1 an</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
        {data && (
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
            <span>{data.pagination.total} commande(s)</span>
            <span className="text-green-400 font-mono font-bold">
              {Object.entries(totalRevenue).map(([currency, amount]) => `${(amount / 100).toFixed(2)} ${currency}`).join(' · ') || '0'} (page)
            </span>
          </div>
        )}
      </div>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune commande trouvée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Stripe Session</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(o => (
                    <tr key={o.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                      onClick={() => o.customer?.id && navigate(`/customers/${o.customer.id}`)}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer?.username || '—'}</div>
                        <div className="text-xs text-gray-500">{o.customer?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3">{formatPlan(o.plan)}</td>
                      <td className="px-4 py-3 font-mono text-green-400">{(o.amount / 100).toFixed(2)} {o.currency || 'EUR'}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {o.stripeSessionId ? o.stripeSessionId.slice(0, 20) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        {o.status === 'PENDING' && Array.isArray(o.items) && o.items.some((item) => item.game === 'spoofer') && (
                          <button
                            type="button"
                            disabled={cancellingId === o.id}
                            onClick={() => cancelSpooferOrder(o)}
                            className="rounded-md border border-red-800 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                          >
                            {cancellingId === o.id ? 'Annulation…' : 'Annuler'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} commandes — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
