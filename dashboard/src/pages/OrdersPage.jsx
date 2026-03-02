import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { formatPlan, formatDate } from '../lib/utils';

export default function OrdersPage({ navigate }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (status) params.status = status;
    if (plan) params.plan = plan;
    api.getOrders(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, status, plan]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data?.data?.reduce((a, o) => a + (o.status === 'COMPLETED' ? o.amount : 0), 0) || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Commandes</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-44">
          <option value="">Tous les statuts</option>
          <option value="COMPLETED">Complétée</option>
          <option value="PENDING">En attente</option>
          <option value="FAILED">Échouée</option>
          <option value="REFUNDED">Remboursée</option>
        </select>
        <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }} className="w-36">
          <option value="">Tous les plans</option>
          <option value="DAYS_30">30 jours</option>
          <option value="DAYS_90">90 jours</option>
          <option value="DAYS_365">1 an</option>
          <option value="LIFETIME">Lifetime</option>
        </select>
        {data && (
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
            <span>{data.pagination.total} commande(s)</span>
            <span className="text-green-400 font-mono font-bold">
              {(totalRevenue / 100).toFixed(2)}€ (page)
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
                      <td className="px-4 py-3 font-mono text-green-400">{(o.amount / 100).toFixed(2)}€</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {o.stripeSessionId ? o.stripeSessionId.slice(0, 20) + '…' : '—'}
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
