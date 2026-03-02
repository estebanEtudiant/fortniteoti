import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

export default function BlockedIPsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getBlockedIps({ page, limit: 50 }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = async (id) => {
    setUnblocking(id);
    try {
      await api.unblockIp(id);
      load();
    } catch (err) { alert(err.message); }
    finally { setUnblocking(''); }
  };

  const activeCount = data?.data?.filter(ip => !ip.expired).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">IPs Bloquées</h1>
        {data && (
          <div className="text-sm text-gray-400">
            <span className="text-red-400 font-medium">{activeCount}</span> actives /
            <span className="ml-1">{data.pagination.total} total</span>
          </div>
        )}
      </div>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucune IP bloquée</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3">Adresse IP</th>
                    <th className="px-4 py-3">Raison</th>
                    <th className="px-4 py-3 text-center">Tentatives</th>
                    <th className="px-4 py-3">Bloquée le</th>
                    <th className="px-4 py-3">Expire le</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(ip => (
                    <tr key={ip.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-mono text-cyan-400">{ip.ipAddress}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{ip.reason || '—'}</td>
                      <td className="px-4 py-3 text-center">{ip.attempts}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ip.blockedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ip.expiresAt)}</td>
                      <td className="px-4 py-3">
                        {ip.expired
                          ? <span className="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-400">Expirée</span>
                          : <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Active</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleUnblock(ip.id)} disabled={unblocking === ip.id}
                          className="text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                          {unblocking === ip.id ? '...' : 'Débloquer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Page {page}/{data.pagination.totalPages}</span>
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
